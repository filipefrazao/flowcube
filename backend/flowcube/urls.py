"""
FlowCube URL Configuration
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views.api import UserPreferenceViewSet, CredentialViewSet
from .views.chat import ChatSessionViewSet, HandoffQueueViewSet
from .views.webhooks import (
    EvolutionWebhookView,
    GenericWebhookView,
    WebhookTestView,
    N8NWebhookView,
    SalesCubeWebhookView,
)

router = DefaultRouter()
router.register(r"preferences", UserPreferenceViewSet, basename="preferences")
router.register(r"credentials", CredentialViewSet, basename="credentials")
router.register(r"chat/sessions", ChatSessionViewSet, basename="chat-sessions")
router.register(r"chat/handoffs", HandoffQueueViewSet, basename="handoff-queue")

urlpatterns = router.urls + [
    # Evolution API Webhook
    path(
        "webhooks/evolution/<str:workflow_id>/",
        EvolutionWebhookView.as_view(),
        name="evolution-webhook",
    ),
    # Generic Webhook (any source)
    path(
        "webhooks/generic/<str:workflow_id>/",
        GenericWebhookView.as_view(),
        name="generic-webhook",
    ),
    path(
        "webhooks/generic/<str:workflow_id>/<str:trigger_node_id>/",
        GenericWebhookView.as_view(),
        name="generic-webhook-trigger",
    ),
    # N8N Webhook
    path(
        "webhooks/n8n/<str:workflow_id>/",
        N8NWebhookView.as_view(),
        name="n8n-webhook",
    ),
    # SalesCube Webhook
    path(
        "webhooks/salescube/<str:workflow_id>/",
        SalesCubeWebhookView.as_view(),
        name="salescube-webhook",
    ),
    # Test Webhook
    path("webhooks/test/", WebhookTestView.as_view(), name="webhook-test"),
]
