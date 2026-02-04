"""
Telegram Integration Views
telegram_integration/views.py

DRF ViewSets and Views for Telegram integration.
Created: 2026-02-02
"""
import logging
import secrets
from typing import Optional

from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.http import HttpResponse

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from asgiref.sync import async_to_sync

from telegram_integration.models import (
    TelegramBot,
    TelegramChat,
    TelegramMessage,
    TelegramCallback,
    TelegramWebhookLog
)
from telegram_integration.serializers import (
    TelegramBotSerializer,
    TelegramBotCreateSerializer,
    TelegramBotListSerializer,
    TelegramChatSerializer,
    TelegramChatListSerializer,
    TelegramMessageSerializer,
    TelegramMessageListSerializer,
    TelegramMessageCreateSerializer,
    TelegramCallbackSerializer,
    TelegramWebhookLogSerializer,
    TelegramWebhookLogListSerializer,
    TelegramWebhookUpdateSerializer,
    SendMessageRequestSerializer,
    SetWebhookRequestSerializer,
)
from telegram_integration.client import TelegramClient, TelegramAPIError, get_telegram_client
from telegram_integration.tasks import (
    process_telegram_update,
    send_telegram_message_async,
    setup_telegram_webhook,
    verify_telegram_bot
)

logger = logging.getLogger('flowcube.telegram')


class TelegramBotViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Telegram bots.
    
    Endpoints:
    - GET /api/telegram/bots/ - List user's bots
    - POST /api/telegram/bots/ - Create new bot
    - GET /api/telegram/bots/{id}/ - Get bot details
    - PUT/PATCH /api/telegram/bots/{id}/ - Update bot
    - DELETE /api/telegram/bots/{id}/ - Delete bot
    - POST /api/telegram/bots/{id}/verify/ - Verify bot token
    - POST /api/telegram/bots/{id}/set_webhook/ - Set webhook
    - POST /api/telegram/bots/{id}/delete_webhook/ - Delete webhook
    - GET /api/telegram/bots/{id}/webhook_info/ - Get webhook info
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return TelegramBot.objects.filter(owner=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TelegramBotCreateSerializer
        if self.action == 'list':
            return TelegramBotListSerializer
        return TelegramBotSerializer
    
    def perform_create(self, serializer):
        bot = serializer.save(owner=self.request.user)
        # Trigger async verification
        verify_telegram_bot.delay(str(bot.id))
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """
        Verify bot token with Telegram API.
        Updates bot username and first_name if valid.
        """
        bot = self.get_object()
        
        # Trigger async verification
        verify_telegram_bot.delay(str(bot.id))
        
        return Response({
            'status': 'verification_started',
            'message': 'Bot verification in progress'
        })
    
    @action(detail=True, methods=['post'])
    def set_webhook(self, request, pk=None):
        """
        Set webhook URL for this bot.
        If no URL provided, generates one using the app's base URL.
        """
        bot = self.get_object()
        
        # Get or generate webhook URL
        webhook_url = request.data.get('url')
        if not webhook_url:
            base_url = getattr(
                settings,
                'FLOWCUBE_WEBHOOK_BASE_URL',
                'https://flowcube.frzgroup.com.br'
            )
            webhook_url = f"{base_url}/api/telegram/webhook/{bot.id}/"
        
        # Generate secret token
        secret_token = request.data.get('secret_token')
        if not secret_token:
            secret_token = secrets.token_urlsafe(32)
        
        allowed_updates = request.data.get(
            'allowed_updates',
            ['message', 'callback_query', 'edited_message']
        )
        drop_pending = request.data.get('drop_pending_updates', False)
        
        # Trigger async webhook setup
        setup_telegram_webhook.delay(
            str(bot.id),
            webhook_url,
            secret_token,
            allowed_updates,
            drop_pending
        )
        
        return Response({
            'status': 'webhook_setup_started',
            'webhook_url': webhook_url,
            'message': 'Webhook setup in progress'
        })
    
    @action(detail=True, methods=['post'])
    def delete_webhook(self, request, pk=None):
        """Delete webhook for this bot."""
        bot = self.get_object()
        
        async def _delete():
            client = get_telegram_client(bot)
            try:
                await client.delete_webhook()
                bot.webhook_url = ''
                bot.webhook_secret = ''
                bot.webhook_set_at = None
                bot.save(update_fields=['webhook_url', 'webhook_secret', 'webhook_set_at'])
                return True
            finally:
                await client.close()
        
        try:
            async_to_sync(_delete)()
            return Response({
                'status': 'success',
                'message': 'Webhook deleted'
            })
        except TelegramAPIError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def webhook_info(self, request, pk=None):
        """Get current webhook configuration from Telegram."""
        bot = self.get_object()
        
        async def _get_info():
            client = get_telegram_client(bot)
            try:
                return await client.get_webhook_info()
            finally:
                await client.close()
        
        try:
            info = async_to_sync(_get_info)()
            return Response(info)
        except TelegramAPIError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """
        Send a message through this bot.
        
        Request body:
        - chat_id: Telegram chat ID (required)
        - text: Message text (required)
        - parse_mode: HTML, Markdown, MarkdownV2 (optional)
        - reply_to_message_id: ID to reply to (optional)
        - reply_markup: Keyboard markup (optional)
        """
        bot = self.get_object()
        
        chat_id = request.data.get('chat_id')
        text = request.data.get('text')
        
        if not chat_id or not text:
            return Response({
                'error': 'chat_id and text are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Trigger async send
        send_telegram_message_async.delay(
            bot_id=str(bot.id),
            chat_id=chat_id,
            text=text,
            parse_mode=request.data.get('parse_mode'),
            reply_to_message_id=request.data.get('reply_to_message_id'),
            reply_markup=request.data.get('reply_markup')
        )
        
        return Response({
            'status': 'message_queued',
            'message': 'Message send task created'
        })


class TelegramChatViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Telegram chats.
    
    Endpoints:
    - GET /api/telegram/chats/ - List chats
    - GET /api/telegram/chats/{id}/ - Get chat details
    - PATCH /api/telegram/chats/{id}/ - Update chat (variables, context)
    - DELETE /api/telegram/chats/{id}/ - Delete chat
    - GET /api/telegram/chats/{id}/messages/ - Get chat messages
    - POST /api/telegram/chats/{id}/send/ - Send message to chat
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = TelegramChat.objects.filter(bot__owner=self.request.user)
        
        # Filter by bot
        bot_id = self.request.query_params.get('bot_id')
        if bot_id:
            queryset = queryset.filter(bot_id=bot_id)
        
        # Filter by chat type
        chat_type = self.request.query_params.get('chat_type')
        if chat_type:
            queryset = queryset.filter(chat_type=chat_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.select_related('bot')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TelegramChatListSerializer
        return TelegramChatSerializer
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get messages for this chat with pagination."""
        chat = self.get_object()
        
        # Get pagination params
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        
        messages = chat.messages.order_by('-created_at')[offset:offset + limit]
        serializer = TelegramMessageListSerializer(messages, many=True)
        
        return Response({
            'count': chat.message_count,
            'results': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        """Send a message to this chat."""
        chat = self.get_object()
        
        text = request.data.get('text')
        if not text:
            return Response({
                'error': 'text is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Trigger async send
        send_telegram_message_async.delay(
            bot_id=str(chat.bot_id),
            chat_id=chat.chat_id,
            text=text,
            parse_mode=request.data.get('parse_mode'),
            reply_to_message_id=request.data.get('reply_to_message_id'),
            reply_markup=request.data.get('reply_markup')
        )
        
        return Response({
            'status': 'message_queued',
            'message': 'Message send task created'
        })
    
    @action(detail=True, methods=['post'])
    def clear_context(self, request, pk=None):
        """Clear conversation context and variables."""
        chat = self.get_object()
        
        chat.variables = {}
        chat.context = {}
        chat.current_node_id = ''
        chat.save(update_fields=['variables', 'context', 'current_node_id'])
        
        return Response({
            'status': 'success',
            'message': 'Context cleared'
        })


class TelegramMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Telegram messages (read-only).
    
    Endpoints:
    - GET /api/telegram/messages/ - List messages
    - GET /api/telegram/messages/{id}/ - Get message details
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = TelegramMessage.objects.filter(
            chat__bot__owner=self.request.user
        )
        
        # Filter by chat
        chat_id = self.request.query_params.get('chat_id')
        if chat_id:
            queryset = queryset.filter(chat_id=chat_id)
        
        # Filter by direction
        direction = self.request.query_params.get('direction')
        if direction:
            queryset = queryset.filter(direction=direction)
        
        # Filter by message type
        message_type = self.request.query_params.get('message_type')
        if message_type:
            queryset = queryset.filter(message_type=message_type)
        
        return queryset.select_related('chat', 'chat__bot')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TelegramMessageListSerializer
        return TelegramMessageSerializer


class TelegramWebhookView(APIView):
    """
    Webhook endpoint for receiving Telegram updates.
    
    URL: POST /api/telegram/webhook/{bot_id}/
    
    This view handles incoming updates from Telegram's Bot API.
    It validates the request, logs the update, and queues processing.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request, bot_id):
        """Health check for webhook."""
        try:
            bot = TelegramBot.objects.get(id=bot_id)
            return Response({
                'status': 'ok',
                'bot_username': bot.username,
                'is_active': bot.is_active
            })
        except TelegramBot.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Bot not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def post(self, request, bot_id):
        """
        Receive and process Telegram update.
        
        Validates:
        1. Bot exists and is active
        2. Secret token (if configured)
        3. Update payload structure
        
        Then queues the update for async processing.
        """
        # Get bot
        try:
            bot = TelegramBot.objects.get(id=bot_id)
        except TelegramBot.DoesNotExist:
            logger.warning(f"Webhook received for unknown bot: {bot_id}")
            return HttpResponse(status=404)
        
        # Check if bot is active
        if not bot.is_active:
            logger.warning(f"Webhook received for inactive bot: {bot_id}")
            return HttpResponse(status=403)
        
        # Validate secret token if configured
        if bot.webhook_secret:
            secret_header = request.headers.get('X-Telegram-Bot-Api-Secret-Token', '')
            if secret_header != bot.webhook_secret:
                logger.warning(f"Invalid secret token for bot: {bot_id}")
                return HttpResponse(status=403)
        
        # Parse and validate update
        serializer = TelegramWebhookUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Invalid webhook payload: {serializer.errors}")
            # Return 200 to prevent Telegram from retrying
            return HttpResponse(status=200)
        
        update_data = serializer.validated_data
        event_type = serializer.get_event_type()
        update_id = update_data['update_id']
        
        # Log the webhook
        with transaction.atomic():
            webhook_log = TelegramWebhookLog.objects.create(
                bot=bot,
                update_id=update_id,
                event_type=event_type,
                payload=request.data
            )
        
        # Queue for async processing
        process_telegram_update.delay(str(webhook_log.id))
        
        logger.info(f"Webhook queued: bot={bot.username}, update_id={update_id}, event={event_type}")
        
        # Return 200 immediately to acknowledge receipt
        return HttpResponse(status=200)


class TelegramWebhookLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing webhook logs.
    
    Endpoints:
    - GET /api/telegram/webhooks/ - List webhook logs
    - GET /api/telegram/webhooks/{id}/ - Get log details
    - POST /api/telegram/webhooks/{id}/retry/ - Retry processing
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = TelegramWebhookLog.objects.filter(
            bot__owner=self.request.user
        )
        
        # Filter by bot
        bot_id = self.request.query_params.get('bot_id')
        if bot_id:
            queryset = queryset.filter(bot_id=bot_id)
        
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
        
        return queryset.select_related('bot', 'chat', 'message')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TelegramWebhookLogListSerializer
        return TelegramWebhookLogSerializer
    
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
        
        process_telegram_update.delay(str(webhook_log.id))
        
        return Response({
            'status': 'retry_queued',
            'message': 'Webhook queued for reprocessing'
        })


class TelegramCallbackViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing callback queries.
    
    Endpoints:
    - GET /api/telegram/callbacks/ - List callbacks
    - GET /api/telegram/callbacks/{id}/ - Get callback details
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TelegramCallbackSerializer
    
    def get_queryset(self):
        queryset = TelegramCallback.objects.filter(
            chat__bot__owner=self.request.user
        )
        
        # Filter by chat
        chat_id = self.request.query_params.get('chat_id')
        if chat_id:
            queryset = queryset.filter(chat_id=chat_id)
        
        # Filter by answered status
        answered = self.request.query_params.get('answered')
        if answered is not None:
            queryset = queryset.filter(answered=answered.lower() == 'true')
        
        return queryset.select_related('chat', 'chat__bot')
