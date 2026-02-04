"""
Telegram Integration URLs
telegram_integration/urls.py

URL routing for Telegram integration API.
Created: 2026-02-02
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from telegram_integration.views import (
    TelegramBotViewSet,
    TelegramChatViewSet,
    TelegramMessageViewSet,
    TelegramWebhookView,
    TelegramWebhookLogViewSet,
    TelegramCallbackViewSet,
)

# Create router
router = DefaultRouter()
router.register(r'bots', TelegramBotViewSet, basename='telegram-bot')
router.register(r'chats', TelegramChatViewSet, basename='telegram-chat')
router.register(r'messages', TelegramMessageViewSet, basename='telegram-message')
router.register(r'webhooks', TelegramWebhookLogViewSet, basename='telegram-webhook-log')
router.register(r'callbacks', TelegramCallbackViewSet, basename='telegram-callback')

app_name = 'telegram'

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Webhook endpoint (public, no auth)
    path(
        'webhook/<uuid:bot_id>/',
        TelegramWebhookView.as_view(),
        name='telegram-webhook'
    ),
]

# URL patterns documentation:
#
# Bots:
#   GET    /api/telegram/bots/                    - List user's bots
#   POST   /api/telegram/bots/                    - Create new bot
#   GET    /api/telegram/bots/{id}/               - Get bot details
#   PUT    /api/telegram/bots/{id}/               - Update bot
#   PATCH  /api/telegram/bots/{id}/               - Partial update bot
#   DELETE /api/telegram/bots/{id}/               - Delete bot
#   POST   /api/telegram/bots/{id}/verify/        - Verify bot token
#   POST   /api/telegram/bots/{id}/set_webhook/   - Set webhook
#   POST   /api/telegram/bots/{id}/delete_webhook/- Delete webhook
#   GET    /api/telegram/bots/{id}/webhook_info/  - Get webhook info
#   POST   /api/telegram/bots/{id}/send_message/  - Send message
#
# Chats:
#   GET    /api/telegram/chats/                   - List chats
#   GET    /api/telegram/chats/{id}/              - Get chat details
#   PATCH  /api/telegram/chats/{id}/              - Update chat
#   DELETE /api/telegram/chats/{id}/              - Delete chat
#   GET    /api/telegram/chats/{id}/messages/     - Get chat messages
#   POST   /api/telegram/chats/{id}/send/         - Send to chat
#   POST   /api/telegram/chats/{id}/clear_context/- Clear context
#
# Messages:
#   GET    /api/telegram/messages/                - List messages
#   GET    /api/telegram/messages/{id}/           - Get message details
#
# Webhook Logs:
#   GET    /api/telegram/webhooks/                - List webhook logs
#   GET    /api/telegram/webhooks/{id}/           - Get log details
#   POST   /api/telegram/webhooks/{id}/retry/     - Retry processing
#
# Callbacks:
#   GET    /api/telegram/callbacks/               - List callbacks
#   GET    /api/telegram/callbacks/{id}/          - Get callback details
#
# Public Webhook:
#   POST   /api/telegram/webhook/{bot_id}/        - Receive Telegram updates
#   GET    /api/telegram/webhook/{bot_id}/        - Health check
