"""
Instagram Automation Views
instagram_automation/views.py

DRF ViewSets and Views for Instagram DM automation.
Created: 2026-02-02
"""
import logging
import hashlib
import hmac
from typing import Optional

from django.conf import settings
from django.utils import timezone
from django.db import transaction, models
from django.http import HttpResponse

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from asgiref.sync import async_to_sync

from instagram_automation.models import (
    InstagramAccount,
    InstagramConversation,
    InstagramMessage,
    InstagramQuickReply,
    InstagramIceBreaker,
    InstagramMessageTemplate,
    InstagramWebhookLog
)
from instagram_automation.serializers import (
    InstagramAccountSerializer,
    InstagramAccountCreateSerializer,
    InstagramAccountListSerializer,
    InstagramConversationSerializer,
    InstagramConversationListSerializer,
    InstagramMessageSerializer,
    InstagramMessageListSerializer,
    InstagramMessageCreateSerializer,
    InstagramQuickReplySerializer,
    InstagramQuickReplyListSerializer,
    InstagramIceBreakerSerializer,
    InstagramMessageTemplateSerializer,
    InstagramWebhookLogSerializer,
    InstagramWebhookLogListSerializer,
    InstagramWebhookPayloadSerializer,
    SendMessageRequestSerializer,
    HandoverRequestSerializer,
    ConversationStatsSerializer,
)
from instagram_automation.client import (
    InstagramGraphClient,
    InstagramAPIError,
    get_instagram_client
)
from instagram_automation.tasks import (
    process_instagram_webhook,
    send_instagram_message_async,
    send_instagram_image_async,
    verify_instagram_account,
    sync_instagram_conversations,
    set_instagram_ice_breakers
)

logger = logging.getLogger('flowcube.instagram')


class InstagramAccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Instagram accounts.
    
    Endpoints:
    - GET /api/instagram/accounts/ - List user's accounts
    - POST /api/instagram/accounts/ - Create new account
    - GET /api/instagram/accounts/{id}/ - Get account details
    - PUT/PATCH /api/instagram/accounts/{id}/ - Update account
    - DELETE /api/instagram/accounts/{id}/ - Delete account
    - POST /api/instagram/accounts/{id}/verify/ - Verify account
    - POST /api/instagram/accounts/{id}/sync_conversations/ - Sync conversations
    - POST /api/instagram/accounts/{id}/send_message/ - Send message
    - GET /api/instagram/accounts/{id}/stats/ - Get account stats
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return InstagramAccount.objects.filter(owner=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InstagramAccountCreateSerializer
        if self.action == 'list':
            return InstagramAccountListSerializer
        return InstagramAccountSerializer
    
    def perform_create(self, serializer):
        account = serializer.save(owner=self.request.user)
        # Trigger async verification
        verify_instagram_account.delay(str(account.id))
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Verify Instagram account credentials.
        Updates account info from Instagram API.
        """
        account = self.get_object()
        
        # Trigger async verification
        verify_instagram_account.delay(str(account.id))
        
        return Response({
            'status': 'verification_started',
            'message': 'Account verification in progress'
        })
    
    @action(detail=True, methods=['post'])
    def sync_conversations(self, request, pk=None):
        """
        Sync conversations from Instagram.
        """
        account = self.get_object()
        
        # Trigger async sync
        sync_instagram_conversations.delay(str(account.id))
        
        return Response({
            'status': 'sync_started',
            'message': 'Conversation sync in progress'
        })
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """
        Send a message through this account.
        
        Request body:
        - recipient_id: Instagram-scoped user ID (required)
        - text: Message text (required)
        - quick_replies: List of quick reply options (optional)
        - message_tag: Tag for sending outside 24h window (optional)
        """
        account = self.get_object()
        
        recipient_id = request.data.get('recipient_id')
        text = request.data.get('text')
        
        if not recipient_id or not text:
            return Response({
                'error': 'recipient_id and text are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check rate limit
        if not account.can_send_message():
            return Response({
                'error': 'Daily message limit reached (200 messages)',
                'daily_count': account.daily_message_count
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Trigger async send
        send_instagram_message_async.delay(
            account_id=str(account.id),
            recipient_id=recipient_id,
            text=text,
            quick_replies=request.data.get('quick_replies'),
            message_tag=request.data.get('message_tag')
        )
        
        return Response({
            'status': 'message_queued',
            'message': 'Message send task created'
        })
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get account statistics."""
        account = self.get_object()
        
        from datetime import timedelta
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        
        conversations = account.conversations
        messages = InstagramMessage.objects.filter(
            conversation__account=account
        )
        
        stats = {
            'account_id': str(account.id),
            'username': account.username,
            'total_conversations': conversations.count(),
            'total_messages_sent': messages.filter(
                direction=InstagramMessage.Direction.OUTBOUND
            ).count(),
            'total_messages_received': messages.filter(
                direction=InstagramMessage.Direction.INBOUND
            ).count(),
            'daily_message_count': account.daily_message_count,
            'daily_message_limit': 200,
            'messages_remaining_today': max(0, 200 - account.daily_message_count),
            'active_conversations': conversations.filter(
                status='active'
            ).count(),
            'unread_messages': conversations.aggregate(
                total=models.Sum('unread_count')
            )['total'] or 0
        }
        
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def set_ice_breakers(self, request, pk=None):
        """
        Set ice breaker questions for this account.
        
        Request body:
        - ice_breakers: List of {question, payload} (max 4)
        """
        account = self.get_object()
        
        ice_breakers = request.data.get('ice_breakers', [])
        if len(ice_breakers) > 4:
            return Response({
                'error': 'Maximum 4 ice breakers allowed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Trigger async update
        set_instagram_ice_breakers.delay(
            str(account.id),
            ice_breakers
        )
        
        return Response({
            'status': 'update_queued',
            'message': 'Ice breakers update in progress'
        })
    
    @action(detail=True, methods=['get'])
    def ice_breakers(self, request, pk=None):
        """Get ice breakers for this account."""
        account = self.get_object()
        
        ice_breakers = account.ice_breakers.filter(is_active=True)
        serializer = InstagramIceBreakerSerializer(ice_breakers, many=True)
        
        return Response(serializer.data)


class InstagramConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Instagram conversations.
    
    Endpoints:
    - GET /api/instagram/conversations/ - List conversations
    - GET /api/instagram/conversations/{id}/ - Get conversation details
    - PATCH /api/instagram/conversations/{id}/ - Update conversation
    - DELETE /api/instagram/conversations/{id}/ - Delete conversation
    - GET /api/instagram/conversations/{id}/messages/ - Get messages
    - POST /api/instagram/conversations/{id}/send/ - Send message
    - POST /api/instagram/conversations/{id}/handover_to_human/ - Handover
    - POST /api/instagram/conversations/{id}/handover_to_bot/ - Return to bot
    - POST /api/instagram/conversations/{id}/mark_read/ - Mark as read
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = InstagramConversation.objects.filter(
            account__owner=self.request.user
        )
        
        # Filter by account
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by human agent
        is_human = self.request.query_params.get('is_human_agent')
        if is_human is not None:
            queryset = queryset.filter(
                is_human_agent_active=is_human.lower() == 'true'
            )
        
        # Filter by window open
        window_open = self.request.query_params.get('window_open')
        if window_open is not None:
            queryset = queryset.filter(
                messaging_window_open=window_open.lower() == 'true'
            )
        
        return queryset.select_related('account')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InstagramConversationListSerializer
        return InstagramConversationSerializer
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get messages for this conversation with pagination."""
        conversation = self.get_object()
        
        # Get pagination params
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        
        messages = conversation.messages.order_by('-created_at')[offset:offset + limit]
        serializer = InstagramMessageListSerializer(messages, many=True)
        
        return Response({
            'count': conversation.message_count,
            'results': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send a message to this conversation."""
        conversation = self.get_object()
        
        text = request.data.get('text')
        if not text:
            return Response({
                'error': 'text is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check window
        if not conversation.is_window_open:
            message_tag = request.data.get('message_tag')
            if not message_tag:
                return Response({
                    'error': '24-hour messaging window closed. message_tag required.',
                    'window_closed_at': conversation.window_closes_at
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check rate limit
        if not conversation.account.can_send_message():
            return Response({
                'error': 'Daily message limit reached (200 messages)'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Trigger async send
        send_instagram_message_async.delay(
            account_id=str(conversation.account_id),
            recipient_id=conversation.participant_id,
            text=text,
            quick_replies=request.data.get('quick_replies'),
            message_tag=request.data.get('message_tag')
        )
        
        return Response({
            'status': 'message_queued',
            'message': 'Message send task created'
        })
    
    @action(detail=True, methods=['post'])
    def send_image(self, request, pk=None):
        """Send an image to this conversation."""
        conversation = self.get_object()
        
        image_url = request.data.get('image_url')
        if not image_url:
            return Response({
                'error': 'image_url is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check window and rate limit
        if not conversation.is_window_open:
            message_tag = request.data.get('message_tag')
            if not message_tag:
                return Response({
                    'error': '24-hour messaging window closed. message_tag required.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if not conversation.account.can_send_message():
            return Response({
                'error': 'Daily message limit reached (200 messages)'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Trigger async send
        send_instagram_image_async.delay(
            account_id=str(conversation.account_id),
            recipient_id=conversation.participant_id,
            image_url=image_url,
            message_tag=request.data.get('message_tag')
        )
        
        return Response({
            'status': 'message_queued',
            'message': 'Image send task created'
        })
    
    @action(detail=True, methods=['post'])
    def handover_to_human(self, request, pk=None):
        """Transfer conversation to human agent."""
        conversation = self.get_object()
        
        agent_user = None
        agent_user_id = request.data.get('agent_user_id')
        if agent_user_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                agent_user = User.objects.get(id=agent_user_id)
            except User.DoesNotExist:
                return Response({
                    'error': 'Agent user not found'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        conversation.handover_to_human(agent_user)
        
        return Response({
            'status': 'success',
            'message': 'Conversation transferred to human agent',
            'agent_user_id': agent_user_id
        })
    
    @action(detail=True, methods=['post'])
    def handover_to_bot(self, request, pk=None):
        """Transfer conversation back to bot."""
        conversation = self.get_object()
        
        conversation.handover_to_bot()
        
        return Response({
            'status': 'success',
            'message': 'Conversation transferred back to bot'
        })
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark conversation as read."""
        conversation = self.get_object()
        
        conversation.unread_count = 0
        conversation.save(update_fields=['unread_count'])
        
        # Mark all messages as read
        conversation.messages.filter(
            is_read=False,
            direction=InstagramMessage.Direction.INBOUND
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({
            'status': 'success',
            'message': 'Conversation marked as read'
        })
    
    @action(detail=True, methods=['post'])
    def clear_context(self, request, pk=None):
        """Clear conversation context and variables."""
        conversation = self.get_object()
        
        conversation.variables = {}
        conversation.context = {}
        conversation.current_node_id = ''
        conversation.save(update_fields=['variables', 'context', 'current_node_id'])
        
        return Response({
            'status': 'success',
            'message': 'Context cleared'
        })
    
    @action(detail=True, methods=['post'])
    def add_label(self, request, pk=None):
        """Add a label to conversation."""
        conversation = self.get_object()
        
        label = request.data.get('label')
        if not label:
            return Response({
                'error': 'label is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if label not in conversation.labels:
            conversation.labels.append(label)
            conversation.save(update_fields=['labels'])
        
        return Response({
            'status': 'success',
            'labels': conversation.labels
        })
    
    @action(detail=True, methods=['post'])
    def remove_label(self, request, pk=None):
        """Remove a label from conversation."""
        conversation = self.get_object()
        
        label = request.data.get('label')
        if label in conversation.labels:
            conversation.labels.remove(label)
            conversation.save(update_fields=['labels'])
        
        return Response({
            'status': 'success',
            'labels': conversation.labels
        })


class InstagramMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Instagram messages (read-only).
    
    Endpoints:
    - GET /api/instagram/messages/ - List messages
    - GET /api/instagram/messages/{id}/ - Get message details
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = InstagramMessage.objects.filter(
            conversation__account__owner=self.request.user
        )
        
        # Filter by conversation
        conversation_id = self.request.query_params.get('conversation_id')
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        
        # Filter by direction
        direction = self.request.query_params.get('direction')
        if direction:
            queryset = queryset.filter(direction=direction)
        
        # Filter by message type
        message_type = self.request.query_params.get('message_type')
        if message_type:
            queryset = queryset.filter(message_type=message_type)
        
        # Filter by send status
        send_status = self.request.query_params.get('send_status')
        if send_status:
            queryset = queryset.filter(send_status=send_status)
        
        return queryset.select_related('conversation', 'conversation__account')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InstagramMessageListSerializer
        return InstagramMessageSerializer


class InstagramQuickReplyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Instagram quick replies.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = InstagramQuickReply.objects.filter(
            account__owner=self.request.user
        )
        
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InstagramQuickReplyListSerializer
        return InstagramQuickReplySerializer


class InstagramIceBreakerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Instagram ice breakers.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InstagramIceBreakerSerializer
    
    def get_queryset(self):
        queryset = InstagramIceBreaker.objects.filter(
            account__owner=self.request.user
        )
        
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        return queryset


class InstagramMessageTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Instagram message templates.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InstagramMessageTemplateSerializer
    
    def get_queryset(self):
        queryset = InstagramMessageTemplate.objects.filter(
            account__owner=self.request.user
        )
        
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset


class InstagramWebhookView(APIView):
    """
    Webhook endpoint for receiving Instagram/Meta updates.
    
    URL: /api/instagram/webhook/
    
    GET: Webhook verification (hub.challenge)
    POST: Receive webhook events
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request):
        """
        Handle webhook verification challenge from Meta.
        """
        mode = request.query_params.get('hub.mode')
        token = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')
        
        verify_token = getattr(
            settings,
            'INSTAGRAM_WEBHOOK_VERIFY_TOKEN',
            'flowcube_instagram_webhook_2026'
        )
        
        if mode == 'subscribe' and token == verify_token:
            logger.info("Instagram webhook verified")
            return HttpResponse(challenge, content_type='text/plain')
        
        logger.warning(f"Invalid webhook verification: mode={mode}")
        return HttpResponse('Forbidden', status=403)
    
    def post(self, request):
        """
        Receive and process Instagram webhook events.
        """
        # Verify signature
        signature = request.headers.get('X-Hub-Signature-256', '')
        app_secret = getattr(settings, 'FACEBOOK_APP_SECRET', '')
        
        if app_secret:
            expected = 'sha256=' + hmac.new(
                app_secret.encode('utf-8'),
                request.body,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected):
                logger.warning("Invalid webhook signature")
                return HttpResponse(status=403)
        
        # Parse payload
        serializer = InstagramWebhookPayloadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Invalid webhook payload: {serializer.errors}")
            return HttpResponse(status=200)  # Return 200 to prevent retries
        
        payload = serializer.validated_data
        
        # Process each entry
        for entry in payload.get('entry', []):
            page_id = entry.get('id')
            
            # Get account by page ID
            try:
                account = InstagramAccount.objects.get(
                    facebook_page_id=page_id,
                    is_active=True
                )
            except InstagramAccount.DoesNotExist:
                logger.warning(f"Unknown page ID in webhook: {page_id}")
                continue
            
            # Process messaging events
            for messaging in entry.get('messaging', []):
                # Log the webhook
                webhook_log = InstagramWebhookLog.objects.create(
                    account=account,
                    event_type=self._get_event_type(messaging),
                    sender_id=messaging.get('sender', {}).get('id', ''),
                    recipient_id=messaging.get('recipient', {}).get('id', ''),
                    timestamp=messaging.get('timestamp'),
                    payload=messaging,
                    request_headers=dict(request.headers)
                )
                
                # Queue for async processing
                process_instagram_webhook.delay(str(webhook_log.id))
        
        return HttpResponse(status=200)
    
    def _get_event_type(self, messaging: dict) -> str:
        """Determine event type from messaging object."""
        if 'message' in messaging:
            if messaging['message'].get('is_echo'):
                return InstagramWebhookLog.EventType.MESSAGE_ECHOES
            return InstagramWebhookLog.EventType.MESSAGE
        elif 'read' in messaging:
            return InstagramWebhookLog.EventType.MESSAGE_READS
        elif 'delivery' in messaging:
            return InstagramWebhookLog.EventType.MESSAGE_DELIVERIES
        elif 'reaction' in messaging:
            return InstagramWebhookLog.EventType.MESSAGE_REACTIONS
        elif 'postback' in messaging:
            return InstagramWebhookLog.EventType.MESSAGING_POSTBACKS
        elif 'referral' in messaging:
            return InstagramWebhookLog.EventType.MESSAGING_REFERRALS
        elif 'pass_thread_control' in messaging or 'take_thread_control' in messaging:
            return InstagramWebhookLog.EventType.MESSAGING_HANDOVERS
        return InstagramWebhookLog.EventType.UNKNOWN


class InstagramWebhookLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing webhook logs.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = InstagramWebhookLog.objects.filter(
            account__owner=self.request.user
        )
        
        # Filter by account
        account_id = self.request.query_params.get('account_id')
        if account_id:
            queryset = queryset.filter(account_id=account_id)
        
        # Filter by processed status
        processed = self.request.query_params.get('processed')
        if processed is not None:
            queryset = queryset.filter(processed=processed.lower() == 'true')
        
        # Filter by event type
        event_type = self.request.query_params.get('event_type')
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        # Filter by errors
        has_error = self.request.query_params.get('has_error')
        if has_error is not None:
            if has_error.lower() == 'true':
                queryset = queryset.exclude(error='')
            else:
                queryset = queryset.filter(error='')
        
        return queryset.select_related('account', 'conversation', 'message')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return InstagramWebhookLogListSerializer
        return InstagramWebhookLogSerializer
    
    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry processing a failed webhook."""
        webhook_log = self.get_object()
        
        if webhook_log.processed:
            return Response({
                'error': 'Webhook already processed successfully'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Reset error and queue for reprocessing
        webhook_log.error = ''
        webhook_log.save(update_fields=['error'])
        
        process_instagram_webhook.delay(str(webhook_log.id))
        
        return Response({
            'status': 'retry_queued',
            'message': 'Webhook queued for reprocessing'
        })


class ConversationStatsView(APIView):
    """
    Get aggregated conversation statistics.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        from datetime import timedelta
        
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=7)
        
        conversations = InstagramConversation.objects.filter(
            account__owner=request.user
        )
        messages = InstagramMessage.objects.filter(
            conversation__account__owner=request.user
        )
        
        stats = {
            'total_conversations': conversations.count(),
            'active_conversations': conversations.filter(status='active').count(),
            'human_agent_conversations': conversations.filter(
                is_human_agent_active=True
            ).count(),
            'resolved_conversations': conversations.filter(
                status='resolved'
            ).count(),
            'total_messages': messages.count(),
            'messages_today': messages.filter(
                created_at__gte=today_start
            ).count(),
            'messages_this_week': messages.filter(
                created_at__gte=week_start
            ).count(),
            'avg_response_time_minutes': 0,  # TODO: Calculate
            'open_windows': conversations.filter(
                messaging_window_open=True
            ).count()
        }
        
        return Response(stats)
