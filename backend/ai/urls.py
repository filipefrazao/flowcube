from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "ai"

router = DefaultRouter()
router.register(r"agents", views.AIAgentViewSet, basename="agents")
router.register(r"knowledge-bases", views.KnowledgeBaseViewSet, basename="knowledge-bases")
router.register(r"documents", views.KnowledgeDocumentViewSet, basename="documents")

urlpatterns = [
    # Existing function-based views
    path("generate-node/", views.generate_node, name="generate_node"),
    path("generate-node-stream/", views.generate_node_stream, name="generate_node_stream"),
    path("debug/", views.debug_workflow, name="debug_workflow"),
    path("apply-fix/", views.apply_quick_fix, name="apply_quick_fix"),
    path("health/", views.analyze_workflow_health, name="analyze_workflow_health"),
    # New viewset routes
] + router.urls
