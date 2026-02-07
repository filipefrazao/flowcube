from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"projects", views.ProjectViewSet, basename="analytics-project")
router.register(r"clients", views.ClientViewSet, basename="analytics-client")
router.register(r"dashboards", views.DashboardViewSet, basename="analytics-dashboard")
router.register(r"reports", views.ReportViewSet, basename="analytics-report")
router.register(r"event-meta", views.EventMetaViewSet, basename="analytics-eventmeta")
router.register(r"profiles", views.ProfileViewSet, basename="analytics-profile")
router.register(r"references", views.ReferenceViewSet, basename="analytics-reference")
router.register(
    r"notification-rules",
    views.NotificationRuleViewSet,
    basename="analytics-notification-rule",
)

urlpatterns = [
    # Public endpoints (auth via client_id/client_secret headers)
    path("track/", views.track_event, name="funnelcube-track"),
    path("identify/", views.identify_profile, name="funnelcube-identify"),
    # Overview
    path(
        "projects/<uuid:project_id>/overview/",
        views.project_overview,
        name="funnelcube-overview",
    ),
    # Router-based CRUD
    path("", include(router.urls)),
]
