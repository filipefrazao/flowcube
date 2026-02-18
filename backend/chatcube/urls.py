from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CampaignViewSet,
    GroupViewSet,
    InstanceViewSet,
    TemplateViewSet,
    chatcube_stats,
    chatcube_users_list,
    engine_webhook,
    meta_cloud_webhook,
)
from .conversation_views import conversation_list, conversation_detail, conversation_send_message, conversation_stats

router = DefaultRouter()
router.register(r"instances", InstanceViewSet, basename="chatcube-instance")
router.register(r"templates", TemplateViewSet, basename="chatcube-template")
router.register(r"campaigns", CampaignViewSet, basename="chatcube-campaign")

# Manual URLs for GroupViewSet (nested notes/tasks need custom regex patterns)
group_list = GroupViewSet.as_view({"get": "list"})
group_detail = GroupViewSet.as_view({"get": "retrieve", "patch": "partial_update"})
group_notes = GroupViewSet.as_view({"get": "notes", "post": "notes"})
group_note_delete = GroupViewSet.as_view({"delete": "delete_note"})
group_tasks = GroupViewSet.as_view({"get": "tasks", "post": "tasks"})
group_task_detail = GroupViewSet.as_view({"patch": "task_detail", "delete": "task_detail"})

urlpatterns = [
    path("", include(router.urls)),
    path("stats/", chatcube_stats, name="chatcube-stats"),
    path("users/", chatcube_users_list, name="chatcube-users"),
    path("webhook/engine/", engine_webhook, name="chatcube-engine-webhook"),
    path("webhook/meta/", meta_cloud_webhook, name="chatcube-meta-webhook"),
    # Conversation aggregation endpoints (for /conversations page)
    path("conversations/", conversation_list, name="chatcube-conversation-list"),
    path("conversations/stats/", conversation_stats, name="chatcube-conversation-stats"),
    path("conversations/<str:conversation_id>/", conversation_detail, name="chatcube-conversation-detail"),
    path("conversations/<str:conversation_id>/messages/", conversation_send_message, name="chatcube-conversation-send"),
    # Group management endpoints
    path("groups/", group_list, name="chatcube-group-list"),
    path("groups/<uuid:pk>/", group_detail, name="chatcube-group-detail"),
    path("groups/<uuid:pk>/notes/", group_notes, name="chatcube-group-notes"),
    path("groups/<uuid:pk>/notes/<uuid:note_id>/", group_note_delete, name="chatcube-group-note-delete"),
    path("groups/<uuid:pk>/tasks/", group_tasks, name="chatcube-group-tasks"),
    path("groups/<uuid:pk>/tasks/<uuid:task_id>/", group_task_detail, name="chatcube-group-task-detail"),
]
