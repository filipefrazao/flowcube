"""
FlowCube AI Agents URL Configuration

API routes with nested routers for the AI agents app.

Author: FRZ Group
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers as nested_routers

from .views import (
    LLMProviderViewSet,
    LLMModelViewSet,
    AgentToolViewSet,
    AgentDefinitionViewSet,
    AgentConversationViewSet,
    AgentExecutionViewSet,
    KnowledgeBaseViewSet,
    KnowledgeDocumentViewSet,
    PromptTemplateViewSet,
    AgentWorkflowViewSet,
    StatsViewSet,
)

app_name = 'ai_agents'

# Main router
router = DefaultRouter()
router.register(r'providers', LLMProviderViewSet, basename='provider')
router.register(r'models', LLMModelViewSet, basename='model')
router.register(r'tools', AgentToolViewSet, basename='tool')
router.register(r'agents', AgentDefinitionViewSet, basename='agent')
router.register(r'conversations', AgentConversationViewSet, basename='conversation')
router.register(r'executions', AgentExecutionViewSet, basename='execution')
router.register(r'knowledge-bases', KnowledgeBaseViewSet, basename='knowledge-base')
router.register(r'documents', KnowledgeDocumentViewSet, basename='document')
router.register(r'templates', PromptTemplateViewSet, basename='template')
router.register(r'workflows', AgentWorkflowViewSet, basename='workflow')
router.register(r'stats', StatsViewSet, basename='stats')

# Nested routers for providers -> models
providers_router = nested_routers.NestedDefaultRouter(router, r'providers', lookup='provider')
providers_router.register(r'models', LLMModelViewSet, basename='provider-models')

# Nested routers for knowledge-bases -> documents
kb_router = nested_routers.NestedDefaultRouter(router, r'knowledge-bases', lookup='knowledge_base')
kb_router.register(r'documents', KnowledgeDocumentViewSet, basename='kb-documents')

# Nested routers for agents -> conversations
agents_router = nested_routers.NestedDefaultRouter(router, r'agents', lookup='agent')
agents_router.register(r'conversations', AgentConversationViewSet, basename='agent-conversations')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(providers_router.urls)),
    path('', include(kb_router.urls)),
    path('', include(agents_router.urls)),
]
