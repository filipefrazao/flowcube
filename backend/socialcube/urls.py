from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.accounts import SocialAccountViewSet
from .views.posts import ScheduledPostViewSet, MediaUploadView
from .views.analytics import AnalyticsViewSet
from .views.competitors import CompetitorViewSet
from .views.smartlinks import SmartLinkPageViewSet, SmartLinkButtonViewSet, smartlink_public_view
from .views.approvals import ContentApprovalViewSet
from .views.ai_content import ai_generate_caption, ai_suggest_hashtags, ai_improve_caption, ai_alt_text
from .views.calendar import calendar_view
from .views.leadads import (
    LeadAdsConnectionViewSet, LeadAdsFormViewSet, LeadEntryViewSet,
    available_pages, leadads_config,
)
from .views.leadads_webhook import leadads_webhook

router = DefaultRouter()
router.register(r"accounts", SocialAccountViewSet, basename="socialcube-accounts")
router.register(r"posts", ScheduledPostViewSet, basename="socialcube-posts")
router.register(r"analytics", AnalyticsViewSet, basename="socialcube-analytics")
router.register(r"competitors", CompetitorViewSet, basename="socialcube-competitors")
router.register(r"smartlinks", SmartLinkPageViewSet, basename="socialcube-smartlinks")
router.register(r"approvals", ContentApprovalViewSet, basename="socialcube-approvals")
router.register(r"leadads/connections", LeadAdsConnectionViewSet, basename="socialcube-leadads-connections")
router.register(r"leadads/forms", LeadAdsFormViewSet, basename="socialcube-leadads-forms")
router.register(r"leadads/leads", LeadEntryViewSet, basename="socialcube-leadads-leads")

urlpatterns = [
    path("", include(router.urls)),

    # Media upload
    path("media/upload/", MediaUploadView.as_view(), name="socialcube-media-upload"),

    # Calendar
    path("calendar/", calendar_view, name="socialcube-calendar"),

    # AI Content
    path("ai/generate-caption/", ai_generate_caption, name="socialcube-ai-caption"),
    path("ai/suggest-hashtags/", ai_suggest_hashtags, name="socialcube-ai-hashtags"),
    path("ai/improve-caption/", ai_improve_caption, name="socialcube-ai-improve"),
    path("ai/alt-text/", ai_alt_text, name="socialcube-ai-alt-text"),

    # SmartLink buttons (nested under page)
    path(
        "smartlinks/<int:page_pk>/buttons/",
        SmartLinkButtonViewSet.as_view({"get": "list", "post": "create"}),
        name="socialcube-smartlink-buttons-list",
    ),
    path(
        "smartlinks/<int:page_pk>/buttons/<int:pk>/",
        SmartLinkButtonViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}),
        name="socialcube-smartlink-buttons-detail",
    ),

    # Public SmartLink page (no auth)
    path("s/<slug:slug>/", smartlink_public_view, name="socialcube-smartlink-public"),

    # Lead Ads webhook (public, no auth)
    path("leadads/webhook/", leadads_webhook, name="socialcube-leadads-webhook"),

    # Lead Ads management
    path("leadads/pages/", available_pages, name="socialcube-leadads-pages"),
    path("leadads/config/", leadads_config, name="socialcube-leadads-config"),
]
