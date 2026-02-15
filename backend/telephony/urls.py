from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CallEventWebhookView,
    CallQueueViewSet,
    CallRecordViewSet,
    CallStatsViewSet,
    DashboardStatsView,
    ExtensionViewSet,
    InitiateCallView,
    IVRMenuViewSet,
    IVROptionViewSet,
    QueueMemberViewSet,
    VoicemailViewSet,
)

router = DefaultRouter()
router.register("extensions", ExtensionViewSet)
router.register("calls", CallRecordViewSet)
router.register("voicemails", VoicemailViewSet)
router.register("ivr-menus", IVRMenuViewSet)
router.register("ivr-options", IVROptionViewSet)
router.register("queues", CallQueueViewSet)
router.register("queue-members", QueueMemberViewSet)
router.register("stats", CallStatsViewSet)

urlpatterns = [
    path("calls/initiate/", InitiateCallView.as_view(), name="initiate-call"),
    path("stats/dashboard/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path(
        "webhooks/call-event/",
        CallEventWebhookView.as_view(),
        name="call-event-webhook",
    ),
    path("", include(router.urls)),
]
