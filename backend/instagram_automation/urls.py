"""
Instagram Automation URLs
instagram_automation/urls.py

URL routing for Instagram DM automation API.
Created: 2026-02-02
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from instagram_automation.views import (
    InstagramAccountViewSet,
    InstagramConversationViewSet,
    InstagramMessageViewSet,
    InstagramQuickReplyViewSet,
    InstagramIceBreakerViewSet,
    InstagramMessageTemplateViewSet,
    InstagramWebhookView,
    InstagramWebhookLogViewSet,
    ConversationStatsView,
)

# Create router
router = DefaultRouter()
router.register(r'accounts', InstagramAccountViewSet, basename='instagram-account')
router.register(r'conversations', InstagramConversationViewSet, basename='instagram-conversation')
router.register(r'messages', InstagramMessageViewSet, basename='instagram-message')
router.register(r'quick-replies', InstagramQuickReplyViewSet, basename='instagram-quick-reply')
router.register(r'ice-breakers', InstagramIceBreakerViewSet, basename='instagram-ice-breaker')
router.register(r'templates', InstagramMessageTemplateViewSet, basename='instagram-template')
router.register(r'webhook-logs', InstagramWebhookLogViewSet, basename='instagram-webhook-log')

app_name = 'instagram'

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Webhook endpoint (public, no auth)
    path(
        'webhook/',
        InstagramWebhookView.as_view(),
        name='instagram-webhook'
    ),
    
    # Stats endpoint
    path(
        'stats/',
        ConversationStatsView.as_view(),
        name='instagram-stats'
    ),
]

# URL patterns documentation:
#
# Accounts:
#   GET    /api/instagram/accounts/                      - List user's accounts
#   POST   /api/instagram/accounts/                      - Create new account
#   GET    /api/instagram/accounts/{id}/                 - Get account details
#   PUT    /api/instagram/accounts/{id}/                 - Update account
#   PATCH  /api/instagram/accounts/{id}/                 - Partial update account
#   DELETE /api/instagram/accounts/{id}/                 - Delete account
#   POST   /api/instagram/accounts/{id}/verify/          - Verify account
#   POST   /api/instagram/accounts/{id}/sync_conversations/ - Sync conversations
#   POST   /api/instagram/accounts/{id}/send_message/    - Send message
#   GET    /api/instagram/accounts/{id}/stats/           - Get account stats
#   POST   /api/instagram/accounts/{id}/set_ice_breakers/ - Set ice breakers
#   GET    /api/instagram/accounts/{id}/ice_breakers/    - Get ice breakers
#
# Conversations:
#   GET    /api/instagram/conversations/                 - List conversations
#   GET    /api/instagram/conversations/{id}/            - Get conversation details
#   PATCH  /api/instagram/conversations/{id}/            - Update conversation
#   DELETE /api/instagram/conversations/{id}/            - Delete conversation
#   GET    /api/instagram/conversations/{id}/messages/   - Get messages
#   POST   /api/instagram/conversations/{id}/send/       - Send text message
#   POST   /api/instagram/conversations/{id}/send_image/ - Send image
#   POST   /api/instagram/conversations/{id}/handover_to_human/ - Handover to human
#   POST   /api/instagram/conversations/{id}/handover_to_bot/   - Return to bot
#   POST   /api/instagram/conversations/{id}/mark_read/  - Mark as read
#   POST   /api/instagram/conversations/{id}/clear_context/ - Clear context
#   POST   /api/instagram/conversations/{id}/add_label/  - Add label
#   POST   /api/instagram/conversations/{id}/remove_label/ - Remove label
#
# Messages:
#   GET    /api/instagram/messages/                      - List messages
#   GET    /api/instagram/messages/{id}/                 - Get message details
#
# Quick Replies:
#   GET    /api/instagram/quick-replies/                 - List quick replies
#   POST   /api/instagram/quick-replies/                 - Create quick reply
#   GET    /api/instagram/quick-replies/{id}/            - Get quick reply
#   PUT    /api/instagram/quick-replies/{id}/            - Update quick reply
#   DELETE /api/instagram/quick-replies/{id}/            - Delete quick reply
#
# Ice Breakers:
#   GET    /api/instagram/ice-breakers/                  - List ice breakers
#   POST   /api/instagram/ice-breakers/                  - Create ice breaker
#   GET    /api/instagram/ice-breakers/{id}/             - Get ice breaker
#   PUT    /api/instagram/ice-breakers/{id}/             - Update ice breaker
#   DELETE /api/instagram/ice-breakers/{id}/             - Delete ice breaker
#
# Message Templates:
#   GET    /api/instagram/templates/                     - List templates
#   POST   /api/instagram/templates/                     - Create template
#   GET    /api/instagram/templates/{id}/                - Get template
#   PUT    /api/instagram/templates/{id}/                - Update template
#   DELETE /api/instagram/templates/{id}/                - Delete template
#
# Webhook Logs:
#   GET    /api/instagram/webhook-logs/                  - List webhook logs
#   GET    /api/instagram/webhook-logs/{id}/             - Get log details
#   POST   /api/instagram/webhook-logs/{id}/retry/       - Retry processing
#
# Webhook (Public):
#   GET    /api/instagram/webhook/                       - Webhook verification
#   POST   /api/instagram/webhook/                       - Receive webhook events
#
# Stats:
#   GET    /api/instagram/stats/                         - Get conversation stats
