"""
Telegram Integration Celery Tasks
telegram_integration/tasks.py

Async tasks for Telegram bot operations.
Created: 2026-02-02
"""
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
from django.utils import timezone
from django.db import transaction
from asgiref.sync import async_to_sync

logger = logging.getLogger('flowcube.telegram.tasks')


# ==================== BOT MANAGEMENT TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
    queue='telegram'
)
def verify_telegram_bot(self, bot_id: str):
    """
    Verify a Telegram bot token and update bot info.
    
    Args:
        bot_id: UUID of the TelegramBot to verify
    """
    from telegram_integration.models import TelegramBot
    from telegram_integration.client import get_telegram_client, TelegramAPIError
    
    try:
        bot = TelegramBot.objects.get(id=bot_id)
    except TelegramBot.DoesNotExist:
        logger.error(f"Bot not found: {bot_id}")
        return {'status': 'error', 'message': 'Bot not found'}
    
    async def _verify():
        client = get_telegram_client(bot)
        try:
            me = await client.get_me()
            return me
        finally:
            await client.close()
    
    try:
        me = async_to_sync(_verify)()
        
        # Update bot info
        bot.bot_id = me.get('id')
        bot.username = me.get('username', '')
        bot.first_name = me.get('first_name', '')
        bot.is_verified = True
        bot.last_error = ''
        bot.last_error_at = None
        bot.save(update_fields=[
            'bot_id', 'username', 'first_name', 
            'is_verified', 'last_error', 'last_error_at'
        ])
        
        logger.info(f"Bot verified: @{bot.username}")
        return {
            'status': 'success',
            'bot_id': str(bot.id),
            'username': bot.username
        }
        
    except TelegramAPIError as e:
        bot.mark_error(str(e))
        logger.error(f"Bot verification failed: {e}")
        raise self.retry(exc=e)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    retry_jitter=True,
    max_retries=3,
    queue='telegram'
)
def setup_telegram_webhook(
    self,
    bot_id: str,
    webhook_url: str,
    secret_token: str,
    allowed_updates: List[str] = None,
    drop_pending: bool = False
):
    """
    Set up webhook for a Telegram bot.
    
    Args:
        bot_id: UUID of the TelegramBot
        webhook_url: HTTPS URL for the webhook
        secret_token: Secret token for verification
        allowed_updates: List of update types to receive
        drop_pending: Whether to drop pending updates
    """
    from telegram_integration.models import TelegramBot
    from telegram_integration.client import get_telegram_client, TelegramAPIError
    
    if allowed_updates is None:
        allowed_updates = ['message', 'callback_query', 'edited_message']
    
    try:
        bot = TelegramBot.objects.get(id=bot_id)
    except TelegramBot.DoesNotExist:
        logger.error(f"Bot not found: {bot_id}")
        return {'status': 'error', 'message': 'Bot not found'}
    
    async def _setup():
        client = get_telegram_client(bot)
        try:
            result = await client.set_webhook(
                url=webhook_url,
                secret_token=secret_token,
                allowed_updates=allowed_updates,
                drop_pending_updates=drop_pending
            )
            return result
        finally:
            await client.close()
    
    try:
        async_to_sync(_setup)()
        
        # Update bot
        bot.webhook_url = webhook_url
        bot.webhook_secret = secret_token
        bot.webhook_set_at = timezone.now()
        bot.last_error = ''
        bot.save(update_fields=[
            'webhook_url', 'webhook_secret', 'webhook_set_at', 'last_error'
        ])
        
        logger.info(f"Webhook set for @{bot.username}: {webhook_url}")
        return {
            'status': 'success',
            'bot_id': str(bot.id),
            'webhook_url': webhook_url
        }
        
    except TelegramAPIError as e:
        bot.mark_error(str(e))
        logger.error(f"Webhook setup failed: {e}")
        raise self.retry(exc=e)


# ==================== MESSAGE SENDING TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='telegram'
)
def send_telegram_message_async(
    self,
    bot_id: str,
    chat_id: int,
    text: str,
    parse_mode: Optional[str] = None,
    reply_to_message_id: Optional[int] = None,
    reply_markup: Optional[Dict] = None,
    disable_notification: bool = False
):
    """
    Send a text message via Telegram.
    
    Args:
        bot_id: UUID of the TelegramBot
        chat_id: Telegram chat ID
        text: Message text
        parse_mode: HTML, Markdown, or MarkdownV2
        reply_to_message_id: Message ID to reply to
        reply_markup: Keyboard markup
        disable_notification: Send silently
    """
    from telegram_integration.models import TelegramBot, TelegramChat, TelegramMessage
    from telegram_integration.client import get_telegram_client, TelegramAPIError
    
    try:
        bot = TelegramBot.objects.get(id=bot_id)
    except TelegramBot.DoesNotExist:
        logger.error(f"Bot not found: {bot_id}")
        return {'status': 'error', 'message': 'Bot not found'}
    
    async def _send():
        client = get_telegram_client(bot)
        try:
            result = await client.send_message(
                chat_id=chat_id,
                text=text,
                parse_mode=parse_mode,
                reply_to_message_id=reply_to_message_id,
                reply_markup=reply_markup,
                disable_notification=disable_notification
            )
            return result
        finally:
            await client.close()
    
    try:
        result = async_to_sync(_send)()
        
        # Get or create chat
        chat, _ = TelegramChat.objects.get_or_create(
            bot=bot,
            chat_id=chat_id,
            defaults={
                'chat_type': result.get('chat', {}).get('type', 'private'),
                'first_name': result.get('chat', {}).get('first_name', ''),
                'last_name': result.get('chat', {}).get('last_name', ''),
                'username': result.get('chat', {}).get('username', ''),
                'title': result.get('chat', {}).get('title', ''),
            }
        )
        
        # Create message record
        TelegramMessage.objects.create(
            chat=chat,
            message_id=result.get('message_id'),
            direction=TelegramMessage.Direction.OUTBOUND,
            message_type=TelegramMessage.MessageType.TEXT,
            content=text,
            metadata={
                'parse_mode': parse_mode,
                'reply_markup': reply_markup
            },
            telegram_date=timezone.now()
        )
        
        # Update chat stats
        chat.message_count = chat.messages.count()
        chat.last_message_at = timezone.now()
        chat.save(update_fields=['message_count', 'last_message_at'])
        
        logger.info(f"Message sent to {chat_id} via @{bot.username}")
        return {
            'status': 'success',
            'message_id': result.get('message_id'),
            'chat_id': chat_id
        }
        
    except TelegramAPIError as e:
        logger.error(f"Failed to send message: {e}")
        raise self.retry(exc=e)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='telegram'
)
def send_telegram_photo_async(
    self,
    bot_id: str,
    chat_id: int,
    photo_url: str,
    caption: Optional[str] = None,
    parse_mode: Optional[str] = None,
    reply_markup: Optional[Dict] = None
):
    """Send a photo via Telegram."""
    from telegram_integration.models import TelegramBot, TelegramChat, TelegramMessage
    from telegram_integration.client import get_telegram_client, TelegramAPIError
    
    try:
        bot = TelegramBot.objects.get(id=bot_id)
    except TelegramBot.DoesNotExist:
        return {'status': 'error', 'message': 'Bot not found'}
    
    async def _send():
        client = get_telegram_client(bot)
        try:
            return await client.send_photo(
                chat_id=chat_id,
                photo_url=photo_url,
                caption=caption,
                parse_mode=parse_mode,
                reply_markup=reply_markup
            )
        finally:
            await client.close()
    
    try:
        result = async_to_sync(_send)()
        
        # Get or create chat
        chat, _ = TelegramChat.objects.get_or_create(
            bot=bot,
            chat_id=chat_id,
            defaults={'chat_type': 'private'}
        )
        
        # Create message record
        TelegramMessage.objects.create(
            chat=chat,
            message_id=result.get('message_id'),
            direction=TelegramMessage.Direction.OUTBOUND,
            message_type=TelegramMessage.MessageType.PHOTO,
            content=caption or '',
            media_url=photo_url,
            telegram_date=timezone.now()
        )
        
        chat.message_count = chat.messages.count()
        chat.last_message_at = timezone.now()
        chat.save(update_fields=['message_count', 'last_message_at'])
        
        return {'status': 'success', 'message_id': result.get('message_id')}
        
    except TelegramAPIError as e:
        raise self.retry(exc=e)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='telegram'
)
def send_telegram_document_async(
    self,
    bot_id: str,
    chat_id: int,
    document_url: str,
    caption: Optional[str] = None,
    filename: Optional[str] = None,
    reply_markup: Optional[Dict] = None
):
    """Send a document via Telegram."""
    from telegram_integration.models import TelegramBot, TelegramChat, TelegramMessage
    from telegram_integration.client import get_telegram_client, TelegramAPIError
    
    try:
        bot = TelegramBot.objects.get(id=bot_id)
    except TelegramBot.DoesNotExist:
        return {'status': 'error', 'message': 'Bot not found'}
    
    async def _send():
        client = get_telegram_client(bot)
        try:
            return await client.send_document(
                chat_id=chat_id,
                document_url=document_url,
                filename=filename,
                caption=caption,
                reply_markup=reply_markup
            )
        finally:
            await client.close()
    
    try:
        result = async_to_sync(_send)()
        
        chat, _ = TelegramChat.objects.get_or_create(
            bot=bot,
            chat_id=chat_id,
            defaults={'chat_type': 'private'}
        )
        
        TelegramMessage.objects.create(
            chat=chat,
            message_id=result.get('message_id'),
            direction=TelegramMessage.Direction.OUTBOUND,
            message_type=TelegramMessage.MessageType.DOCUMENT,
            content=caption or '',
            media_url=document_url,
            telegram_date=timezone.now()
        )
        
        chat.message_count = chat.messages.count()
        chat.last_message_at = timezone.now()
        chat.save(update_fields=['message_count', 'last_message_at'])
        
        return {'status': 'success', 'message_id': result.get('message_id')}
        
    except TelegramAPIError as e:
        raise self.retry(exc=e)


# ==================== UPDATE PROCESSING TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    queue='telegram'
)
def process_telegram_update(self, webhook_log_id: str):
    """
    Process a Telegram update from webhook.
    
    This task handles:
    - message: New text/media messages
    - edited_message: Edited messages
    - callback_query: Inline button clicks
    
    Args:
        webhook_log_id: UUID of the TelegramWebhookLog
    """
    from telegram_integration.models import (
        TelegramWebhookLog, TelegramBot, TelegramChat,
        TelegramMessage, TelegramCallback
    )
    from telegram_integration.client import get_telegram_client, TelegramAPIError
    
    try:
        webhook_log = TelegramWebhookLog.objects.select_related('bot').get(
            id=webhook_log_id
        )
    except TelegramWebhookLog.DoesNotExist:
        logger.error(f"Webhook log not found: {webhook_log_id}")
        return {'status': 'error', 'message': 'Webhook log not found'}
    
    if webhook_log.processed:
        logger.debug(f"Webhook already processed: {webhook_log_id}")
        return {'status': 'skipped', 'message': 'Already processed'}
    
    bot = webhook_log.bot
    payload = webhook_log.payload
    event_type = webhook_log.event_type
    
    try:
        with transaction.atomic():
            if event_type == 'message':
                chat, message = _process_message(bot, payload.get('message', {}))
                webhook_log.mark_processed(chat=chat, message=message)
                
                # Trigger workflow if configured
                if bot.workflow_id:
                    _trigger_workflow(bot, chat, message)
                
            elif event_type == 'edited_message':
                chat, message = _process_edited_message(bot, payload.get('edited_message', {}))
                webhook_log.mark_processed(chat=chat, message=message)
                
            elif event_type == 'callback_query':
                chat, callback = _process_callback_query(bot, payload.get('callback_query', {}))
                webhook_log.mark_processed(chat=chat)
                
                # Answer callback query
                _answer_callback(bot, callback)
                
                # Trigger workflow if configured
                if bot.workflow_id and chat:
                    _trigger_callback_workflow(bot, chat, callback)
                
            else:
                # Just mark as processed for unsupported types
                webhook_log.mark_processed()
                logger.debug(f"Unsupported event type: {event_type}")
        
        logger.info(f"Processed update {webhook_log.update_id} for @{bot.username}")
        return {'status': 'success', 'update_id': webhook_log.update_id}
        
    except Exception as e:
        webhook_log.mark_error(str(e))
        logger.error(f"Failed to process update: {e}")
        raise self.retry(exc=e)


def _process_message(bot, message_data: Dict) -> tuple:
    """Process an incoming message update."""
    from telegram_integration.models import TelegramChat, TelegramMessage
    
    # Extract chat info
    chat_data = message_data.get('chat', {})
    chat_id = chat_data.get('id')
    chat_type = chat_data.get('type', 'private')
    
    # Get or create chat
    chat, created = TelegramChat.objects.get_or_create(
        bot=bot,
        chat_id=chat_id,
        defaults={
            'chat_type': chat_type,
            'title': chat_data.get('title', ''),
            'username': chat_data.get('username', ''),
            'first_name': chat_data.get('first_name', ''),
            'last_name': chat_data.get('last_name', ''),
        }
    )
    
    # Update chat info if not created
    if not created:
        chat.first_name = chat_data.get('first_name', chat.first_name)
        chat.last_name = chat_data.get('last_name', chat.last_name)
        chat.username = chat_data.get('username', chat.username)
        chat.title = chat_data.get('title', chat.title)
        chat.save(update_fields=['first_name', 'last_name', 'username', 'title'])
    
    # Determine message type and content
    message_type = TelegramMessage.MessageType.TEXT
    content = ''
    media_url = ''
    media_file_id = ''
    
    if 'text' in message_data:
        message_type = TelegramMessage.MessageType.TEXT
        content = message_data['text']
    elif 'photo' in message_data:
        message_type = TelegramMessage.MessageType.PHOTO
        photos = message_data['photo']
        if photos:
            media_file_id = photos[-1].get('file_id', '')  # Largest photo
        content = message_data.get('caption', '')
    elif 'video' in message_data:
        message_type = TelegramMessage.MessageType.VIDEO
        media_file_id = message_data['video'].get('file_id', '')
        content = message_data.get('caption', '')
    elif 'audio' in message_data:
        message_type = TelegramMessage.MessageType.AUDIO
        media_file_id = message_data['audio'].get('file_id', '')
        content = message_data.get('caption', '')
    elif 'voice' in message_data:
        message_type = TelegramMessage.MessageType.VOICE
        media_file_id = message_data['voice'].get('file_id', '')
    elif 'document' in message_data:
        message_type = TelegramMessage.MessageType.DOCUMENT
        media_file_id = message_data['document'].get('file_id', '')
        content = message_data.get('caption', '')
    elif 'sticker' in message_data:
        message_type = TelegramMessage.MessageType.STICKER
        media_file_id = message_data['sticker'].get('file_id', '')
    elif 'location' in message_data:
        message_type = TelegramMessage.MessageType.LOCATION
        loc = message_data['location']
        content = f"{loc.get('latitude')},{loc.get('longitude')}"
    elif 'contact' in message_data:
        message_type = TelegramMessage.MessageType.CONTACT
        contact = message_data['contact']
        content = f"{contact.get('first_name', '')} {contact.get('phone_number', '')}"
    elif 'poll' in message_data:
        message_type = TelegramMessage.MessageType.POLL
        content = message_data['poll'].get('question', '')
    
    # Create message record
    message = TelegramMessage.objects.create(
        chat=chat,
        message_id=message_data.get('message_id'),
        direction=TelegramMessage.Direction.INBOUND,
        message_type=message_type,
        content=content,
        media_file_id=media_file_id,
        reply_to_message_id=message_data.get('reply_to_message', {}).get('message_id'),
        metadata={
            'from': message_data.get('from', {}),
            'entities': message_data.get('entities', []),
        },
        telegram_date=timezone.make_aware(
            datetime.fromtimestamp(message_data.get('date', 0))
        ) if message_data.get('date') else None
    )
    
    # Update chat stats
    chat.message_count = chat.messages.count()
    chat.last_message_at = timezone.now()
    chat.save(update_fields=['message_count', 'last_message_at'])
    
    return chat, message


def _process_edited_message(bot, message_data: Dict) -> tuple:
    """Process an edited message update."""
    from telegram_integration.models import TelegramChat, TelegramMessage
    
    chat_data = message_data.get('chat', {})
    chat_id = chat_data.get('id')
    message_id = message_data.get('message_id')
    
    try:
        chat = TelegramChat.objects.get(bot=bot, chat_id=chat_id)
        message = TelegramMessage.objects.get(chat=chat, message_id=message_id)
        
        # Update message
        message.content = message_data.get('text', message_data.get('caption', message.content))
        message.is_edited = True
        message.edited_at = timezone.make_aware(
            datetime.fromtimestamp(message_data.get('edit_date', 0))
        ) if message_data.get('edit_date') else timezone.now()
        message.save(update_fields=['content', 'is_edited', 'edited_at'])
        
        return chat, message
        
    except (TelegramChat.DoesNotExist, TelegramMessage.DoesNotExist):
        # Create as new message if not found
        return _process_message(bot, message_data)


def _process_callback_query(bot, callback_data: Dict) -> tuple:
    """Process a callback query (inline button click)."""
    from telegram_integration.models import TelegramChat, TelegramCallback
    
    message_data = callback_data.get('message', {})
    chat_data = message_data.get('chat', {})
    chat_id = chat_data.get('id')
    from_user = callback_data.get('from', {})
    
    chat = None
    if chat_id:
        chat, _ = TelegramChat.objects.get_or_create(
            bot=bot,
            chat_id=chat_id,
            defaults={
                'chat_type': chat_data.get('type', 'private'),
                'first_name': from_user.get('first_name', ''),
                'last_name': from_user.get('last_name', ''),
                'username': from_user.get('username', ''),
            }
        )
    
    # Create callback record
    callback = TelegramCallback.objects.create(
        chat=chat,
        callback_query_id=callback_data.get('id'),
        data=callback_data.get('data', ''),
        message_id=message_data.get('message_id'),
        inline_message_id=callback_data.get('inline_message_id', ''),
        from_user_id=from_user.get('id', 0)
    )
    
    return chat, callback


def _answer_callback(bot, callback):
    """Answer a callback query."""
    from telegram_integration.client import get_telegram_client
    
    async def _answer():
        client = get_telegram_client(bot)
        try:
            await client.answer_callback_query(
                callback_query_id=callback.callback_query_id
            )
            callback.answered = True
            callback.answered_at = timezone.now()
            callback.save(update_fields=['answered', 'answered_at'])
        finally:
            await client.close()
    
    try:
        async_to_sync(_answer)()
    except Exception as e:
        logger.warning(f"Failed to answer callback: {e}")


def _trigger_workflow(bot, chat, message):
    """Trigger workflow processing for a new message."""
    # This will integrate with the FlowCube workflow engine
    # For now, just log
    logger.info(
        f"Workflow trigger for @{bot.username}: "
        f"chat={chat.chat_id}, workflow={bot.workflow_id}"
    )
    
    # TODO: Integrate with flowcube.engine.runtime
    # from flowcube.engine.runtime import ChatbotRuntime
    # runtime = ChatbotRuntime(str(bot.workflow_id))
    # async_to_sync(runtime.process_telegram_message)(chat, message)


def _trigger_callback_workflow(bot, chat, callback):
    """Trigger workflow processing for a callback query."""
    logger.info(
        f"Callback workflow trigger for @{bot.username}: "
        f"chat={chat.chat_id}, data={callback.data}"
    )
    
    # TODO: Integrate with flowcube.engine.runtime


# ==================== BULK OPERATIONS ====================

@shared_task(
    bind=True,
    max_retries=1,
    queue='telegram'
)
def send_bulk_telegram_messages(
    self,
    bot_id: str,
    messages: List[Dict]
):
    """
    Send multiple messages in bulk.
    
    Args:
        bot_id: UUID of the TelegramBot
        messages: List of message dicts with chat_id and text
    
    Example:
        send_bulk_telegram_messages.delay(
            bot_id='...',
            messages=[
                {'chat_id': 123, 'text': 'Hello'},
                {'chat_id': 456, 'text': 'Hi there'}
            ]
        )
    """
    results = []
    
    for msg in messages:
        try:
            task = send_telegram_message_async.delay(
                bot_id=bot_id,
                chat_id=msg.get('chat_id'),
                text=msg.get('text'),
                parse_mode=msg.get('parse_mode'),
                reply_markup=msg.get('reply_markup')
            )
            results.append({
                'chat_id': msg.get('chat_id'),
                'task_id': str(task.id),
                'status': 'queued'
            })
        except Exception as e:
            results.append({
                'chat_id': msg.get('chat_id'),
                'status': 'error',
                'error': str(e)
            })
    
    return {
        'status': 'bulk_queued',
        'total': len(messages),
        'results': results
    }


@shared_task(
    bind=True,
    queue='telegram'
)
def cleanup_old_webhook_logs(self, days: int = 30):
    """
    Clean up old webhook logs.
    
    Args:
        days: Delete logs older than this many days
    """
    from telegram_integration.models import TelegramWebhookLog
    from datetime import timedelta
    
    cutoff = timezone.now() - timedelta(days=days)
    
    deleted, _ = TelegramWebhookLog.objects.filter(
        created_at__lt=cutoff,
        processed=True
    ).delete()
    
    logger.info(f"Deleted {deleted} old webhook logs")
    return {'deleted': deleted}
