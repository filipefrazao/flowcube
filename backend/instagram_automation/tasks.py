"""
Instagram Automation Celery Tasks
instagram_automation/tasks.py

Async tasks for Instagram DM operations.
Created: 2026-02-02
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
from django.utils import timezone
from django.db import transaction
from asgiref.sync import async_to_sync

logger = logging.getLogger('flowcube.instagram.tasks')


# ==================== ACCOUNT MANAGEMENT TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def verify_instagram_account(self, account_id: str):
    """
    Verify an Instagram account and update info from API.
    
    Args:
        account_id: UUID of the InstagramAccount to verify
    """
    from instagram_automation.models import InstagramAccount
    from instagram_automation.client import get_instagram_client, InstagramAPIError
    
    try:
        account = InstagramAccount.objects.get(id=account_id)
    except InstagramAccount.DoesNotExist:
        logger.error(f"Account not found: {account_id}")
        return {'status': 'error', 'message': 'Account not found'}
    
    async def _verify():
        client = get_instagram_client(account)
        try:
            info = await client.get_account_info()
            return info
        finally:
            await client.close()
    
    try:
        info = async_to_sync(_verify)()
        
        # Update account info
        account.username = info.get('username', '')
        account.name = info.get('name', '')
        account.profile_picture_url = info.get('profile_picture_url', '')
        account.biography = info.get('biography', '')
        account.is_verified = True
        account.clear_error()
        account.save(update_fields=[
            'username', 'name', 'profile_picture_url',
            'biography', 'is_verified', 'consecutive_errors', 'last_error'
        ])
        
        logger.info(f"Account verified: @{account.username}")
        return {
            'status': 'success',
            'account_id': str(account.id),
            'username': account.username
        }
        
    except InstagramAPIError as e:
        account.mark_error(str(e))
        logger.error(f"Account verification failed: {e}")
        raise self.retry(exc=e)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def sync_instagram_conversations(self, account_id: str, limit: int = 50):
    """
    Sync conversations from Instagram API.
    
    Args:
        account_id: UUID of the InstagramAccount
        limit: Maximum conversations to sync
    """
    from instagram_automation.models import (
        InstagramAccount, InstagramConversation, InstagramMessage
    )
    from instagram_automation.client import get_instagram_client, InstagramAPIError
    
    try:
        account = InstagramAccount.objects.get(id=account_id)
    except InstagramAccount.DoesNotExist:
        logger.error(f"Account not found: {account_id}")
        return {'status': 'error', 'message': 'Account not found'}
    
    async def _sync():
        client = get_instagram_client(account)
        try:
            return await client.get_conversations(limit=limit)
        finally:
            await client.close()
    
    try:
        data = async_to_sync(_sync)()
        conversations = data.get('data', [])
        synced_count = 0
        
        for conv_data in conversations:
            # Get participant info
            participants = conv_data.get('participants', {}).get('data', [])
            participant = None
            for p in participants:
                if p.get('id') != account.instagram_id:
                    participant = p
                    break
            
            if not participant:
                continue
            
            # Get or create conversation
            conversation, created = InstagramConversation.objects.get_or_create(
                account=account,
                participant_id=participant.get('id'),
                defaults={
                    'participant_username': participant.get('username', ''),
                    'participant_name': participant.get('name', ''),
                }
            )
            
            if not created:
                # Update participant info
                conversation.participant_username = participant.get(
                    'username', conversation.participant_username
                )
                conversation.participant_name = participant.get(
                    'name', conversation.participant_name
                )
            
            # Sync messages
            messages = conv_data.get('messages', {}).get('data', [])
            for msg_data in messages:
                InstagramMessage.objects.get_or_create(
                    conversation=conversation,
                    mid=msg_data.get('id', ''),
                    defaults={
                        'direction': (
                            InstagramMessage.Direction.OUTBOUND
                            if msg_data.get('from', {}).get('id') == account.instagram_id
                            else InstagramMessage.Direction.INBOUND
                        ),
                        'content': msg_data.get('message', ''),
                        'instagram_timestamp': timezone.make_aware(
                            datetime.fromtimestamp(
                                int(msg_data.get('created_time', 0)) / 1000
                            )
                        ) if msg_data.get('created_time') else None,
                        'send_status': InstagramMessage.SendStatus.SENT
                    }
                )
            
            # Update conversation stats
            conversation.message_count = conversation.messages.count()
            last_msg = conversation.messages.order_by('-created_at').first()
            if last_msg:
                conversation.last_message_at = last_msg.created_at
            conversation.save(update_fields=['message_count', 'last_message_at'])
            
            synced_count += 1
        
        logger.info(f"Synced {synced_count} conversations for @{account.username}")
        return {
            'status': 'success',
            'synced_count': synced_count
        }
        
    except InstagramAPIError as e:
        account.mark_error(str(e))
        logger.error(f"Conversation sync failed: {e}")
        raise self.retry(exc=e)


# ==================== MESSAGE SENDING TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def send_instagram_message_async(
    self,
    account_id: str,
    recipient_id: str,
    text: str,
    quick_replies: Optional[List[Dict]] = None,
    message_tag: Optional[str] = None
):
    """
    Send a text message via Instagram.
    
    Args:
        account_id: UUID of the InstagramAccount
        recipient_id: Instagram-scoped user ID
        text: Message text (max 2000 chars)
        quick_replies: Optional quick reply buttons
        message_tag: Tag for sending outside 24-hour window
    """
    from instagram_automation.models import (
        InstagramAccount, InstagramConversation, InstagramMessage
    )
    from instagram_automation.client import (
        get_instagram_client, InstagramAPIError, MessageTag
    )
    
    try:
        account = InstagramAccount.objects.get(id=account_id)
    except InstagramAccount.DoesNotExist:
        logger.error(f"Account not found: {account_id}")
        return {'status': 'error', 'message': 'Account not found'}
    
    # Check rate limit
    if not account.can_send_message():
        logger.warning(f"Rate limit reached for @{account.username}")
        return {
            'status': 'rate_limited',
            'message': 'Daily message limit reached'
        }
    
    # Create pending message record
    conversation, _ = InstagramConversation.objects.get_or_create(
        account=account,
        participant_id=recipient_id
    )
    
    message = InstagramMessage.objects.create(
        conversation=conversation,
        direction=InstagramMessage.Direction.OUTBOUND,
        message_type=InstagramMessage.MessageType.TEXT,
        content=text,
        send_status=InstagramMessage.SendStatus.PENDING,
        metadata={
            'quick_replies': quick_replies,
            'message_tag': message_tag
        }
    )
    
    async def _send():
        client = get_instagram_client(account)
        try:
            # Convert message tag
            tag = MessageTag(message_tag) if message_tag else None
            
            if quick_replies:
                result = await client.send_message_with_quick_replies(
                    recipient_id=recipient_id,
                    text=text,
                    quick_replies=quick_replies,
                    message_tag=tag
                )
            else:
                result = await client.send_text_message(
                    recipient_id=recipient_id,
                    text=text,
                    message_tag=tag
                )
            return result
        finally:
            await client.close()
    
    try:
        result = async_to_sync(_send)()
        
        # Update message record
        message.mark_sent(mid=result.get('message_id'))
        
        # Update account stats
        account.increment_message_count()
        account.clear_error()
        
        # Update conversation
        conversation.message_count = conversation.messages.count()
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=['message_count', 'last_message_at'])
        
        logger.info(f"Message sent to {recipient_id} via @{account.username}")
        return {
            'status': 'success',
            'message_id': result.get('message_id'),
            'recipient_id': recipient_id
        }
        
    except InstagramAPIError as e:
        message.mark_failed(str(e))
        account.mark_error(str(e))
        
        # Check if window closed
        if e.is_window_closed():
            logger.warning(f"24-hour window closed for {recipient_id}")
            conversation.messaging_window_open = False
            conversation.save(update_fields=['messaging_window_open'])
            return {
                'status': 'window_closed',
                'message': '24-hour messaging window is closed'
            }
        
        logger.error(f"Failed to send message: {e}")
        raise self.retry(exc=e)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def send_instagram_image_async(
    self,
    account_id: str,
    recipient_id: str,
    image_url: str,
    message_tag: Optional[str] = None
):
    """Send an image via Instagram."""
    from instagram_automation.models import (
        InstagramAccount, InstagramConversation, InstagramMessage,
        InstagramMediaAttachment
    )
    from instagram_automation.client import (
        get_instagram_client, InstagramAPIError, MessageTag
    )
    
    try:
        account = InstagramAccount.objects.get(id=account_id)
    except InstagramAccount.DoesNotExist:
        return {'status': 'error', 'message': 'Account not found'}
    
    if not account.can_send_message():
        return {'status': 'rate_limited', 'message': 'Daily limit reached'}
    
    conversation, _ = InstagramConversation.objects.get_or_create(
        account=account,
        participant_id=recipient_id
    )
    
    message = InstagramMessage.objects.create(
        conversation=conversation,
        direction=InstagramMessage.Direction.OUTBOUND,
        message_type=InstagramMessage.MessageType.IMAGE,
        send_status=InstagramMessage.SendStatus.PENDING
    )
    
    # Create attachment record
    InstagramMediaAttachment.objects.create(
        message=message,
        media_type=InstagramMediaAttachment.MediaType.IMAGE,
        url=image_url
    )
    
    async def _send():
        client = get_instagram_client(account)
        try:
            tag = MessageTag(message_tag) if message_tag else None
            return await client.send_image(
                recipient_id=recipient_id,
                image_url=image_url,
                message_tag=tag
            )
        finally:
            await client.close()
    
    try:
        result = async_to_sync(_send)()
        
        message.mark_sent(mid=result.get('message_id'))
        account.increment_message_count()
        account.clear_error()
        
        conversation.message_count = conversation.messages.count()
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=['message_count', 'last_message_at'])
        
        return {
            'status': 'success',
            'message_id': result.get('message_id')
        }
        
    except InstagramAPIError as e:
        message.mark_failed(str(e))
        account.mark_error(str(e))
        raise self.retry(exc=e)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def send_instagram_video_async(
    self,
    account_id: str,
    recipient_id: str,
    video_url: str,
    message_tag: Optional[str] = None
):
    """Send a video via Instagram."""
    from instagram_automation.models import (
        InstagramAccount, InstagramConversation, InstagramMessage,
        InstagramMediaAttachment
    )
    from instagram_automation.client import (
        get_instagram_client, InstagramAPIError, MessageTag
    )
    
    try:
        account = InstagramAccount.objects.get(id=account_id)
    except InstagramAccount.DoesNotExist:
        return {'status': 'error', 'message': 'Account not found'}
    
    if not account.can_send_message():
        return {'status': 'rate_limited', 'message': 'Daily limit reached'}
    
    conversation, _ = InstagramConversation.objects.get_or_create(
        account=account,
        participant_id=recipient_id
    )
    
    message = InstagramMessage.objects.create(
        conversation=conversation,
        direction=InstagramMessage.Direction.OUTBOUND,
        message_type=InstagramMessage.MessageType.VIDEO,
        send_status=InstagramMessage.SendStatus.PENDING
    )
    
    InstagramMediaAttachment.objects.create(
        message=message,
        media_type=InstagramMediaAttachment.MediaType.VIDEO,
        url=video_url
    )
    
    async def _send():
        client = get_instagram_client(account)
        try:
            tag = MessageTag(message_tag) if message_tag else None
            return await client.send_video(
                recipient_id=recipient_id,
                video_url=video_url,
                message_tag=tag
            )
        finally:
            await client.close()
    
    try:
        result = async_to_sync(_send)()
        
        message.mark_sent(mid=result.get('message_id'))
        account.increment_message_count()
        
        conversation.message_count = conversation.messages.count()
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=['message_count', 'last_message_at'])
        
        return {'status': 'success', 'message_id': result.get('message_id')}
        
    except InstagramAPIError as e:
        message.mark_failed(str(e))
        raise self.retry(exc=e)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def send_instagram_generic_template_async(
    self,
    account_id: str,
    recipient_id: str,
    elements: List[Dict[str, Any]],
    message_tag: Optional[str] = None
):
    """Send a generic template message via Instagram."""
    from instagram_automation.models import (
        InstagramAccount, InstagramConversation, InstagramMessage
    )
    from instagram_automation.client import (
        get_instagram_client, InstagramAPIError, MessageTag
    )
    
    try:
        account = InstagramAccount.objects.get(id=account_id)
    except InstagramAccount.DoesNotExist:
        return {'status': 'error', 'message': 'Account not found'}
    
    if not account.can_send_message():
        return {'status': 'rate_limited', 'message': 'Daily limit reached'}
    
    conversation, _ = InstagramConversation.objects.get_or_create(
        account=account,
        participant_id=recipient_id
    )
    
    message = InstagramMessage.objects.create(
        conversation=conversation,
        direction=InstagramMessage.Direction.OUTBOUND,
        message_type=InstagramMessage.MessageType.GENERIC_TEMPLATE,
        send_status=InstagramMessage.SendStatus.PENDING,
        metadata={'elements': elements}
    )
    
    async def _send():
        client = get_instagram_client(account)
        try:
            tag = MessageTag(message_tag) if message_tag else None
            return await client.send_generic_template(
                recipient_id=recipient_id,
                elements=elements,
                message_tag=tag
            )
        finally:
            await client.close()
    
    try:
        result = async_to_sync(_send)()
        
        message.mark_sent(mid=result.get('message_id'))
        account.increment_message_count()
        
        conversation.message_count = conversation.messages.count()
        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=['message_count', 'last_message_at'])
        
        return {'status': 'success', 'message_id': result.get('message_id')}
        
    except InstagramAPIError as e:
        message.mark_failed(str(e))
        raise self.retry(exc=e)


# ==================== WEBHOOK PROCESSING ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def process_instagram_webhook(self, webhook_log_id: str):
    """
    Process an Instagram webhook event.
    
    Args:
        webhook_log_id: UUID of the InstagramWebhookLog
    """
    from instagram_automation.models import (
        InstagramWebhookLog, InstagramAccount, InstagramConversation,
        InstagramMessage, InstagramMediaAttachment
    )
    
    try:
        webhook_log = InstagramWebhookLog.objects.select_related('account').get(
            id=webhook_log_id
        )
    except InstagramWebhookLog.DoesNotExist:
        logger.error(f"Webhook log not found: {webhook_log_id}")
        return {'status': 'error', 'message': 'Webhook log not found'}
    
    if webhook_log.processed:
        logger.debug(f"Webhook already processed: {webhook_log_id}")
        return {'status': 'skipped', 'message': 'Already processed'}
    
    account = webhook_log.account
    payload = webhook_log.payload
    event_type = webhook_log.event_type
    
    try:
        with transaction.atomic():
            if event_type == InstagramWebhookLog.EventType.MESSAGE:
                conversation, message = _process_message_event(account, payload)
                webhook_log.mark_processed(conversation=conversation, message=message)
                
                # Trigger workflow if configured and not human agent
                if (account.workflow_id and 
                    account.auto_reply_enabled and
                    conversation and 
                    not conversation.is_human_agent_active):
                    _trigger_workflow(account, conversation, message)
                
            elif event_type == InstagramWebhookLog.EventType.MESSAGE_READS:
                _process_read_event(account, payload)
                webhook_log.mark_processed()
                
            elif event_type == InstagramWebhookLog.EventType.MESSAGE_DELIVERIES:
                _process_delivery_event(account, payload)
                webhook_log.mark_processed()
                
            elif event_type == InstagramWebhookLog.EventType.MESSAGE_REACTIONS:
                _process_reaction_event(account, payload)
                webhook_log.mark_processed()
                
            elif event_type == InstagramWebhookLog.EventType.MESSAGING_POSTBACKS:
                conversation, message = _process_postback_event(account, payload)
                webhook_log.mark_processed(conversation=conversation, message=message)
                
                if (account.workflow_id and 
                    conversation and 
                    not conversation.is_human_agent_active):
                    _trigger_postback_workflow(account, conversation, payload)
                
            elif event_type == InstagramWebhookLog.EventType.MESSAGE_ECHOES:
                # Echo events are our own outbound messages
                webhook_log.mark_processed()
                
            else:
                webhook_log.mark_processed()
                logger.debug(f"Unhandled event type: {event_type}")
        
        logger.info(f"Processed webhook {webhook_log_id}: {event_type}")
        return {'status': 'success', 'event_type': event_type}
        
    except Exception as e:
        webhook_log.mark_error(str(e))
        logger.error(f"Failed to process webhook: {e}")
        raise self.retry(exc=e)


def _process_message_event(account, payload: Dict) -> tuple:
    """Process an incoming message event."""
    from instagram_automation.models import (
        InstagramConversation, InstagramMessage, InstagramMediaAttachment
    )
    
    sender_id = payload.get('sender', {}).get('id')
    message_data = payload.get('message', {})
    timestamp = payload.get('timestamp')
    
    # Get or create conversation
    conversation, created = InstagramConversation.objects.get_or_create(
        account=account,
        participant_id=sender_id,
        defaults={
            'status': InstagramConversation.ConversationStatus.ACTIVE
        }
    )
    
    # Update messaging window (user messaged, so window is open)
    conversation.last_user_message_at = timezone.now()
    conversation.messaging_window_open = True
    conversation.unread_count += 1
    
    # Determine message type
    message_type = InstagramMessage.MessageType.TEXT
    content = message_data.get('text', '')
    
    if message_data.get('attachments'):
        attachments = message_data['attachments']
        if attachments:
            att_type = attachments[0].get('type', '').lower()
            if att_type == 'image':
                message_type = InstagramMessage.MessageType.IMAGE
            elif att_type == 'video':
                message_type = InstagramMessage.MessageType.VIDEO
            elif att_type == 'audio':
                message_type = InstagramMessage.MessageType.AUDIO
            elif att_type == 'file':
                message_type = InstagramMessage.MessageType.FILE
            elif att_type == 'share':
                message_type = InstagramMessage.MessageType.SHARE
    
    if message_data.get('quick_reply'):
        message_type = InstagramMessage.MessageType.QUICK_REPLY
        content = message_data['quick_reply'].get('payload', content)
    
    if message_data.get('reply_to'):
        reply_to = message_data['reply_to']
        if reply_to.get('story'):
            message_type = InstagramMessage.MessageType.STORY_REPLY
    
    # Check if it's an unsend event
    is_deleted = message_data.get('is_deleted', False)
    
    # Create message record
    message = InstagramMessage.objects.create(
        conversation=conversation,
        mid=message_data.get('mid', ''),
        direction=InstagramMessage.Direction.INBOUND,
        message_type=message_type,
        content=content,
        send_status=InstagramMessage.SendStatus.DELIVERED,
        reply_to_mid=message_data.get('reply_to', {}).get('mid', ''),
        metadata={
            'quick_reply': message_data.get('quick_reply'),
            'referral': message_data.get('referral'),
            'attachments_raw': message_data.get('attachments', [])
        },
        is_deleted=is_deleted,
        instagram_timestamp=timezone.make_aware(
            datetime.fromtimestamp(timestamp / 1000)
        ) if timestamp else None
    )
    
    # Create attachment records
    for att in message_data.get('attachments', []):
        att_type = att.get('type', '').lower()
        media_type = InstagramMediaAttachment.MediaType.IMAGE
        
        if att_type == 'video':
            media_type = InstagramMediaAttachment.MediaType.VIDEO
        elif att_type == 'audio':
            media_type = InstagramMediaAttachment.MediaType.AUDIO
        elif att_type == 'file':
            media_type = InstagramMediaAttachment.MediaType.FILE
        elif att_type == 'share':
            media_type = InstagramMediaAttachment.MediaType.SHARE
        
        InstagramMediaAttachment.objects.create(
            message=message,
            media_type=media_type,
            url=att.get('payload', {}).get('url', ''),
            share_type=att.get('payload', {}).get('share_type', ''),
            share_id=att.get('payload', {}).get('id', '')
        )
    
    # Update conversation stats
    conversation.message_count = conversation.messages.count()
    conversation.last_message_at = timezone.now()
    conversation.save(update_fields=[
        'message_count', 'last_message_at', 'last_user_message_at',
        'messaging_window_open', 'unread_count'
    ])
    
    return conversation, message


def _process_read_event(account, payload: Dict):
    """Process a message read event."""
    from instagram_automation.models import InstagramConversation, InstagramMessage
    
    sender_id = payload.get('sender', {}).get('id')
    watermark = payload.get('read', {}).get('watermark')
    
    if not sender_id:
        return
    
    try:
        conversation = InstagramConversation.objects.get(
            account=account,
            participant_id=sender_id
        )
        
        # Mark messages as read
        if watermark:
            read_time = timezone.make_aware(
                datetime.fromtimestamp(watermark / 1000)
            )
            conversation.messages.filter(
                direction=InstagramMessage.Direction.OUTBOUND,
                send_status=InstagramMessage.SendStatus.DELIVERED,
                created_at__lte=read_time
            ).update(
                send_status=InstagramMessage.SendStatus.READ,
                is_read=True,
                read_at=timezone.now()
            )
    except InstagramConversation.DoesNotExist:
        pass


def _process_delivery_event(account, payload: Dict):
    """Process a message delivery event."""
    from instagram_automation.models import InstagramConversation, InstagramMessage
    
    sender_id = payload.get('sender', {}).get('id')
    mids = payload.get('delivery', {}).get('mids', [])
    
    if not sender_id:
        return
    
    try:
        conversation = InstagramConversation.objects.get(
            account=account,
            participant_id=sender_id
        )
        
        # Mark messages as delivered
        conversation.messages.filter(
            mid__in=mids,
            direction=InstagramMessage.Direction.OUTBOUND,
            send_status=InstagramMessage.SendStatus.SENT
        ).update(
            send_status=InstagramMessage.SendStatus.DELIVERED,
            delivered_at=timezone.now()
        )
    except InstagramConversation.DoesNotExist:
        pass


def _process_reaction_event(account, payload: Dict):
    """Process a message reaction event."""
    from instagram_automation.models import InstagramConversation, InstagramMessage
    
    sender_id = payload.get('sender', {}).get('id')
    reaction = payload.get('reaction', {})
    mid = reaction.get('mid')
    action = reaction.get('action')  # 'react' or 'unreact'
    emoji = reaction.get('emoji') or reaction.get('reaction')
    
    if not sender_id or not mid:
        return
    
    try:
        conversation = InstagramConversation.objects.get(
            account=account,
            participant_id=sender_id
        )
        
        message = conversation.messages.filter(mid=mid).first()
        if message:
            reactions = message.metadata.get('reactions', [])
            
            if action == 'react':
                reactions.append({
                    'user_id': sender_id,
                    'emoji': emoji,
                    'timestamp': timezone.now().isoformat()
                })
            elif action == 'unreact':
                reactions = [r for r in reactions if r.get('user_id') != sender_id]
            
            message.metadata['reactions'] = reactions
            message.save(update_fields=['metadata'])
            
    except InstagramConversation.DoesNotExist:
        pass


def _process_postback_event(account, payload: Dict) -> tuple:
    """Process a postback event (button click)."""
    from instagram_automation.models import InstagramConversation, InstagramMessage
    
    sender_id = payload.get('sender', {}).get('id')
    postback = payload.get('postback', {})
    
    conversation, _ = InstagramConversation.objects.get_or_create(
        account=account,
        participant_id=sender_id
    )
    
    # Update messaging window
    conversation.last_user_message_at = timezone.now()
    conversation.messaging_window_open = True
    
    # Create message record for postback
    message = InstagramMessage.objects.create(
        conversation=conversation,
        mid=postback.get('mid', ''),
        direction=InstagramMessage.Direction.INBOUND,
        message_type=InstagramMessage.MessageType.QUICK_REPLY,
        content=postback.get('payload', ''),
        metadata={
            'postback': postback,
            'title': postback.get('title')
        }
    )
    
    conversation.message_count = conversation.messages.count()
    conversation.last_message_at = timezone.now()
    conversation.save(update_fields=[
        'message_count', 'last_message_at', 
        'last_user_message_at', 'messaging_window_open'
    ])
    
    return conversation, message


def _trigger_workflow(account, conversation, message):
    """Trigger workflow processing for a new message."""
    logger.info(
        f"Workflow trigger for @{account.username}: "
        f"conversation={conversation.id}, workflow={account.workflow_id}"
    )
    
    # TODO: Integrate with flowcube.engine.runtime
    # from flowcube.engine.runtime import ChatbotRuntime
    # runtime = ChatbotRuntime(str(account.workflow_id))
    # async_to_sync(runtime.process_instagram_message)(conversation, message)


def _trigger_postback_workflow(account, conversation, payload):
    """Trigger workflow processing for a postback."""
    logger.info(
        f"Postback workflow trigger for @{account.username}: "
        f"conversation={conversation.id}, payload={payload.get('postback', {}).get('payload')}"
    )


# ==================== ICE BREAKER MANAGEMENT ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='instagram'
)
def set_instagram_ice_breakers(
    self,
    account_id: str,
    ice_breakers: List[Dict[str, str]]
):
    """
    Set ice breaker questions for an account.
    
    Args:
        account_id: UUID of the InstagramAccount
        ice_breakers: List of {question, payload} (max 4)
    """
    from instagram_automation.models import InstagramAccount, InstagramIceBreaker
    from instagram_automation.client import get_instagram_client, InstagramAPIError
    
    try:
        account = InstagramAccount.objects.get(id=account_id)
    except InstagramAccount.DoesNotExist:
        return {'status': 'error', 'message': 'Account not found'}
    
    async def _set():
        client = get_instagram_client(account)
        try:
            return await client.set_ice_breakers(ice_breakers)
        finally:
            await client.close()
    
    try:
        async_to_sync(_set)()
        
        # Update local records
        InstagramIceBreaker.objects.filter(account=account).update(is_active=False)
        
        for i, ib in enumerate(ice_breakers[:4]):
            InstagramIceBreaker.objects.update_or_create(
                account=account,
                order=i,
                defaults={
                    'question': ib['question'],
                    'payload': ib['payload'],
                    'is_active': True
                }
            )
        
        return {'status': 'success', 'count': len(ice_breakers)}
        
    except InstagramAPIError as e:
        account.mark_error(str(e))
        raise self.retry(exc=e)


# ==================== BULK OPERATIONS ====================

@shared_task(
    bind=True,
    max_retries=1,
    queue='instagram'
)
def send_bulk_instagram_messages(
    self,
    account_id: str,
    messages: List[Dict]
):
    """
    Send multiple messages in bulk.
    
    Args:
        account_id: UUID of the InstagramAccount
        messages: List of message dicts with recipient_id and text
    """
    results = []
    
    for msg in messages:
        try:
            task = send_instagram_message_async.delay(
                account_id=account_id,
                recipient_id=msg.get('recipient_id'),
                text=msg.get('text'),
                quick_replies=msg.get('quick_replies'),
                message_tag=msg.get('message_tag')
            )
            results.append({
                'recipient_id': msg.get('recipient_id'),
                'task_id': str(task.id),
                'status': 'queued'
            })
        except Exception as e:
            results.append({
                'recipient_id': msg.get('recipient_id'),
                'status': 'error',
                'error': str(e)
            })
    
    return {
        'status': 'bulk_queued',
        'total': len(messages),
        'results': results
    }


# ==================== SCHEDULED TASKS ====================

@shared_task(queue='instagram')
def update_messaging_windows():
    """
    Update messaging window status for all conversations.
    Should run every hour.
    """
    from instagram_automation.models import InstagramConversation
    
    # Find conversations where window should be closed
    cutoff = timezone.now() - timedelta(hours=24)
    
    updated = InstagramConversation.objects.filter(
        messaging_window_open=True,
        last_user_message_at__lt=cutoff
    ).update(messaging_window_open=False)
    
    logger.info(f"Updated {updated} conversations: window closed")
    return {'updated': updated}


@shared_task(queue='instagram')
def reset_daily_message_counts():
    """
    Reset daily message counts for all accounts.
    Should run at midnight.
    """
    from instagram_automation.models import InstagramAccount
    
    updated = InstagramAccount.objects.filter(
        daily_message_count__gt=0
    ).update(
        daily_message_count=0,
        daily_message_reset_at=timezone.now()
    )
    
    logger.info(f"Reset daily message count for {updated} accounts")
    return {'updated': updated}


@shared_task(queue='instagram')
def cleanup_old_webhook_logs(days: int = 30):
    """
    Clean up old webhook logs.
    
    Args:
        days: Delete logs older than this many days
    """
    from instagram_automation.models import InstagramWebhookLog
    
    cutoff = timezone.now() - timedelta(days=days)
    
    deleted, _ = InstagramWebhookLog.objects.filter(
        created_at__lt=cutoff,
        processed=True
    ).delete()
    
    logger.info(f"Deleted {deleted} old webhook logs")
    return {'deleted': deleted}
