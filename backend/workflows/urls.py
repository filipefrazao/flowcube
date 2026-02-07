"""
FlowCube API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from .views import (
    WorkflowViewSet, GroupViewSet, BlockViewSet, EdgeViewSet,
    VariableViewSet, ExecutionViewSet,
    AIAssistantViewSet, BrazilianContextViewSet
)
from .webhook_handler import webhook_receiver

# Main router
router = DefaultRouter()
router.register(r"workflows", WorkflowViewSet, basename="workflow")
router.register(r"executions", ExecutionViewSet, basename="execution")
router.register(r"ai-assistant", AIAssistantViewSet, basename="ai-assistant")
router.register(r"brazilian-contexts", BrazilianContextViewSet, basename="brazilian-context")

# Nested routers for workflow resources
workflow_router = nested_routers.NestedDefaultRouter(router, r"workflows", lookup="workflow")
workflow_router.register(r"groups", GroupViewSet, basename="workflow-groups")
workflow_router.register(r"blocks", BlockViewSet, basename="workflow-blocks")
workflow_router.register(r"edges", EdgeViewSet, basename="workflow-edges")
workflow_router.register(r"variables", VariableViewSet, basename="workflow-variables")

urlpatterns = [
    path("", include(router.urls)),
    path("", include(workflow_router.urls)),
    # Webhook trigger endpoint
    path("webhooks/<str:token>/", webhook_receiver, name="webhook-receiver"),
]
