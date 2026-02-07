from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CampaignViewSet, InstanceViewSet, TemplateViewSet, chatcube_stats, engine_webhook, meta_cloud_webhook
from .conversation_views import conversation_list, conversation_detail, conversation_send_message, conversation_stats

router = DefaultRouter()
router.register(r"instances", InstanceViewSet, basename="chatcube-instance")
router.register(r"templates", TemplateViewSet, basename="chatcube-template")
router.register(r"campaigns", CampaignViewSet, basename="chatcube-campaign")

urlpatterns = [
    path("", include(router.urls)),
    path("stats/", chatcube_stats, name="chatcube-stats"),
    path("webhook/engine/", engine_webhook, name="chatcube-engine-webhook"),
    path("webhook/meta/", meta_cloud_webhook, name="chatcube-meta-webhook"),
    # Conversation aggregation endpoints (for /conversations page)
    path("conversations/", conversation_list, name="chatcube-conversation-list"),
    path("conversations/stats/", conversation_stats, name="chatcube-conversation-stats"),
    path("conversations/<str:conversation_id>/", conversation_detail, name="chatcube-conversation-detail"),
    path("conversations/<str:conversation_id>/messages/", conversation_send_message, name="chatcube-conversation-send"),
]
