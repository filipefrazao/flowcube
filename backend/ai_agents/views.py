"""
FlowCube AI Agents Views

Django REST Framework views for AI agents API.

Features:
- LLMProviderViewSet
- AgentToolViewSet
- AgentDefinitionViewSet
- AgentConversationViewSet with chat endpoint
- KnowledgeBaseViewSet
- Streaming chat support

Author: FRZ Group
"""

import asyncio
import json
import logging
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import transaction
from django.db.models import Avg, Count, Sum, Q
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    LLMProvider,
    LLMModel,
    AgentTool,
    AgentDefinition,
    AgentConversation,
    AgentMessage,
    AgentExecution,
    KnowledgeBase,
    KnowledgeDocument,
    PromptTemplate,
    AgentWorkflow,
)
from .serializers import (
    LLMProviderListSerializer,
    LLMProviderDetailSerializer,
    LLMProviderWriteSerializer,
    LLMModelSerializer,
    AgentToolListSerializer,
    AgentToolDetailSerializer,
    AgentToolWriteSerializer,
    AgentDefinitionListSerializer,
    AgentDefinitionDetailSerializer,
    AgentDefinitionWriteSerializer,
    AgentConversationListSerializer,
    AgentConversationDetailSerializer,
    AgentConversationWriteSerializer,
    AgentMessageSerializer,
    AgentMessageWriteSerializer,
    AgentExecutionListSerializer,
    AgentExecutionDetailSerializer,
    KnowledgeBaseListSerializer,
    KnowledgeBaseDetailSerializer,
    KnowledgeBaseWriteSerializer,
    KnowledgeDocumentListSerializer,
    KnowledgeDocumentDetailSerializer,
    KnowledgeDocumentWriteSerializer,
    PromptTemplateListSerializer,
    PromptTemplateDetailSerializer,
    AgentWorkflowListSerializer,
    AgentWorkflowDetailSerializer,
    AgentWorkflowWriteSerializer,
    ChatRequestSerializer,
    ChatResponseSerializer,
    RAGSearchRequestSerializer,
    RAGSearchResponseSerializer,
    AgentStatsSerializer,
    UsageReportSerializer,
)
from .langchain_client import LangChainClient, agent_manager, ExecutionResult
from .tools import ToolFactory, get_all_tools

logger = logging.getLogger(__name__)


# =============================================================================
# MIXINS
# =============================================================================

class MultiSerializerViewSetMixin:
    """Mixin for using different serializers for different actions."""
    
    serializer_classes = {}
    
    def get_serializer_class(self):
        return self.serializer_classes.get(
            self.action,
            self.serializer_classes.get('default', super().get_serializer_class())
        )


# =============================================================================
# LLM PROVIDER VIEWS
# =============================================================================

class LLMProviderViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for LLM Provider management.
    
    Endpoints:
    - GET /providers/ - List all providers
    - POST /providers/ - Create a new provider
    - GET /providers/{id}/ - Get provider details
    - PUT /providers/{id}/ - Update provider
    - DELETE /providers/{id}/ - Delete provider
    - POST /providers/{id}/test/ - Test provider connection
    - POST /providers/{id}/set_default/ - Set as default provider
    """
    
    queryset = LLMProvider.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['provider_type', 'is_active', 'is_default']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'provider_type']
    ordering = ['-is_default', 'name']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': LLMProviderListSerializer,
        'retrieve': LLMProviderDetailSerializer,
        'create': LLMProviderWriteSerializer,
        'update': LLMProviderWriteSerializer,
        'partial_update': LLMProviderWriteSerializer,
        'default': LLMProviderDetailSerializer,
    }
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test provider connection with a simple request."""
        provider = self.get_object()
        
        try:
            # Create client
            client = LangChainClient({
                'provider_type': provider.provider_type,
                'api_key': provider.api_key,
                'model': provider.default_model,
                'api_base_url': provider.api_base_url,
                'temperature': 0.0,
                'max_tokens': 10,
            })
            
            # Send test message
            start_time = time.time()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(client.chat(
                messages=[{'role': 'user', 'content': 'Say "OK"'}]
            ))
            loop.close()
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            if result.error:
                return Response({
                    'success': False,
                    'error': result.error,
                    'latency_ms': latency_ms,
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'response': result.content,
                'latency_ms': latency_ms,
                'model': result.model_used,
            })
        
        except Exception as e:
            logger.exception('Provider test failed')
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set this provider as the default."""
        provider = self.get_object()
        provider.is_default = True
        provider.save()
        
        return Response({
            'success': True,
            'message': f'{provider.name} is now the default provider',
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get provider usage statistics."""
        stats = LLMProvider.objects.annotate(
            execution_count=Count('executions'),
            total_tokens=Sum('executions__total_tokens'),
            total_cost=Sum('executions__cost'),
            avg_duration=Avg('executions__duration_ms'),
        ).values(
            'id', 'name', 'provider_type',
            'execution_count', 'total_tokens', 'total_cost', 'avg_duration'
        )
        
        return Response(list(stats))


class LLMModelViewSet(viewsets.ModelViewSet):
    """ViewSet for LLM Model management."""
    
    queryset = LLMModel.objects.all()
    serializer_class = LLMModelSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['provider', 'is_active', 'supports_vision', 'supports_function_calling']
    search_fields = ['model_id', 'display_name']


# =============================================================================
# AGENT TOOL VIEWS
# =============================================================================

class AgentToolViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for Agent Tool management.
    
    Endpoints:
    - GET /tools/ - List all tools
    - POST /tools/ - Create a new tool
    - GET /tools/{id}/ - Get tool details
    - PUT /tools/{id}/ - Update tool
    - DELETE /tools/{id}/ - Delete tool
    - POST /tools/{id}/test/ - Test tool execution
    - GET /tools/registry/ - Get all registered tools
    """
    
    queryset = AgentTool.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tool_type', 'is_active', 'is_system']
    search_fields = ['name', 'display_name', 'description']
    ordering_fields = ['name', 'created_at', 'total_executions']
    ordering = ['name']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': AgentToolListSerializer,
        'retrieve': AgentToolDetailSerializer,
        'create': AgentToolWriteSerializer,
        'update': AgentToolWriteSerializer,
        'partial_update': AgentToolWriteSerializer,
        'default': AgentToolDetailSerializer,
    }
    
    def destroy(self, request, *args, **kwargs):
        tool = self.get_object()
        if tool.is_system:
            return Response(
                {'error': 'Cannot delete system tools'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test tool execution with provided parameters."""
        tool = self.get_object()
        params = request.data.get('parameters', {})
        
        try:
            # Create LangChain tool
            lc_tool = ToolFactory.create_tool_from_definition(tool)
            if not lc_tool:
                return Response({
                    'success': False,
                    'error': 'Failed to create tool',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Execute tool
            start_time = time.time()
            result = lc_tool.invoke(params)
            execution_time = time.time() - start_time
            
            # Record execution
            tool.record_execution(True, execution_time)
            
            return Response({
                'success': True,
                'result': json.loads(result) if isinstance(result, str) else result,
                'execution_time_ms': int(execution_time * 1000),
            })
        
        except Exception as e:
            logger.exception('Tool test failed')
            tool.record_execution(False, 0)
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def registry(self, request):
        """Get all registered tools in the system."""
        tools = get_all_tools()
        return Response([
            {
                'name': t.name,
                'description': t.description,
                'args_schema': t.args_schema.schema() if hasattr(t, 'args_schema') else {},
            }
            for t in tools
        ])


# =============================================================================
# AGENT DEFINITION VIEWS
# =============================================================================

class AgentDefinitionViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for Agent Definition management.
    
    Endpoints:
    - GET /agents/ - List all agents
    - POST /agents/ - Create a new agent
    - GET /agents/{id}/ - Get agent details
    - PUT /agents/{id}/ - Update agent
    - DELETE /agents/{id}/ - Delete agent
    - GET /agents/{id}/conversations/ - Get agent conversations
    - POST /agents/{id}/chat/ - Start a chat with the agent
    - GET /agents/{id}/stats/ - Get agent statistics
    """
    
    queryset = AgentDefinition.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['agent_type', 'is_active', 'is_public', 'llm_provider']
    search_fields = ['name', 'display_name', 'description']
    ordering_fields = ['name', 'created_at', 'total_conversations', 'total_messages']
    ordering = ['name']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': AgentDefinitionListSerializer,
        'retrieve': AgentDefinitionDetailSerializer,
        'create': AgentDefinitionWriteSerializer,
        'update': AgentDefinitionWriteSerializer,
        'partial_update': AgentDefinitionWriteSerializer,
        'default': AgentDefinitionDetailSerializer,
    }
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Filter by access permissions
        if not user.is_staff:
            queryset = queryset.filter(
                Q(is_public=True) |
                Q(created_by=user) |
                Q(allowed_users=user)
            ).distinct()
        
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        agent = self.get_object()
        if agent.is_system:
            return Response(
                {'error': 'Cannot delete system agents'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def conversations(self, request, pk=None):
        """Get all conversations for this agent."""
        agent = self.get_object()
        conversations = agent.conversations.filter(user=request.user)
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            conversations = conversations.filter(status=status_filter)
        
        serializer = AgentConversationListSerializer(conversations, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def chat(self, request, pk=None):
        """Start a chat with this agent."""
        agent = self.get_object()
        serializer = ChatRequestSerializer(data={
            **request.data,
            'agent_id': str(agent.id),
        })
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Get or create conversation
        conversation_id = data.get('conversation_id')
        if conversation_id:
            conversation = get_object_or_404(
                AgentConversation,
                id=conversation_id,
                user=request.user,
                agent=agent
            )
        else:
            conversation = AgentConversation.objects.create(
                agent=agent,
                user=request.user,
                context_variables=data.get('context_variables', {}),
            )
            agent.total_conversations += 1
            agent.save(update_fields=['total_conversations'])
        
        # Check streaming preference
        if data.get('stream', True) and agent.streaming_enabled:
            return self._stream_chat(request, agent, conversation, data)
        else:
            return self._sync_chat(request, agent, conversation, data)
    
    def _sync_chat(self, request, agent, conversation, data):
        """Handle synchronous chat."""
        message_content = data['message']
        attachments = data.get('attachments', [])
        
        # Create user message
        user_message = AgentMessage.objects.create(
            conversation=conversation,
            role='user',
            content=message_content,
            attachments=attachments,
        )
        
        try:
            # Build provider config
            provider = agent.llm_provider
            provider_config = {
                'provider_type': provider.provider_type,
                'api_key': provider.api_key,
                'model': agent.llm_model or provider.default_model,
                'api_base_url': provider.api_base_url,
                'temperature': agent.temperature,
                'max_tokens': agent.max_tokens,
                'top_p': agent.top_p,
                'input_cost_per_million': float(provider.input_cost_per_million),
                'output_cost_per_million': float(provider.output_cost_per_million),
            }
            
            # Build messages history
            messages = self._build_messages(conversation)
            
            # Load tools if available
            tools = ToolFactory.load_tools_from_database(agent) if agent.tools.exists() else None
            
            # Build RAG config if enabled
            rag_config = None
            if agent.rag_enabled and agent.knowledge_bases.exists():
                kb = agent.knowledge_bases.first()
                rag_config = {
                    'enabled': True,
                    'collection_name': kb.collection_name,
                    'top_k': agent.rag_top_k,
                    'score_threshold': agent.rag_score_threshold,
                    'qdrant_url': kb.vector_store_config.get('url'),
                    'qdrant_api_key': kb.vector_store_config.get('api_key'),
                }
            
            # Execute agent
            start_time = time.time()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result: ExecutionResult = loop.run_until_complete(
                agent_manager.execute_agent(
                    agent_id=str(agent.id),
                    provider_config=provider_config,
                    messages=messages,
                    system_prompt=agent.get_full_system_prompt(data.get('context_variables')),
                    tools=tools,
                    rag_config=rag_config,
                )
            )
            loop.close()
            
            # Create assistant message
            assistant_message = AgentMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content=result.content,
                tool_calls=result.tool_calls,
                input_tokens=result.token_usage.input_tokens,
                output_tokens=result.token_usage.output_tokens,
                cost=result.cost,
                response_time_ms=result.duration_ms,
                first_token_time_ms=result.time_to_first_token_ms,
                model_used=result.model_used,
                provider_used=result.provider_used,
                rag_context=result.metadata.get('rag_documents', []),
                status='completed' if not result.error else 'error',
                error_message=result.error or '',
            )
            
            # Update conversation stats
            conversation.update_stats(
                result.token_usage.input_tokens,
                result.token_usage.output_tokens,
                result.cost
            )
            
            # Update agent stats
            agent.increment_stats(
                result.token_usage.total_tokens,
                result.cost,
                result.duration_ms / 1000
            )
            
            # Create execution log
            AgentExecution.objects.create(
                conversation=conversation,
                message=assistant_message,
                agent=agent,
                execution_type='chat',
                status='completed' if not result.error else 'failed',
                provider=provider,
                model_used=result.model_used,
                input_tokens=result.token_usage.input_tokens,
                output_tokens=result.token_usage.output_tokens,
                cost=result.cost,
                started_at=timezone.now() - timezone.timedelta(milliseconds=result.duration_ms),
                completed_at=timezone.now(),
                duration_ms=result.duration_ms,
                time_to_first_token_ms=result.time_to_first_token_ms,
                error_message=result.error or '',
            )
            
            response_data = ChatResponseSerializer({
                'conversation_id': conversation.id,
                'message_id': assistant_message.id,
                'content': result.content,
                'role': 'assistant',
                'tool_calls': result.tool_calls,
                'input_tokens': result.token_usage.input_tokens,
                'output_tokens': result.token_usage.output_tokens,
                'cost': result.cost,
                'response_time_ms': result.duration_ms,
                'model_used': result.model_used,
                'rag_context': result.metadata.get('rag_documents', []),
            }).data
            
            return Response(response_data)
        
        except Exception as e:
            logger.exception('Chat error')
            
            # Create error message
            AgentMessage.objects.create(
                conversation=conversation,
                role='assistant',
                content='',
                status='error',
                error_message=str(e),
            )
            
            return Response({
                'error': str(e),
                'conversation_id': str(conversation.id),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _stream_chat(self, request, agent, conversation, data):
        """Handle streaming chat."""
        message_content = data['message']
        attachments = data.get('attachments', [])
        
        # Create user message
        user_message = AgentMessage.objects.create(
            conversation=conversation,
            role='user',
            content=message_content,
            attachments=attachments,
        )
        
        def generate():
            try:
                # Build provider config
                provider = agent.llm_provider
                provider_config = {
                    'provider_type': provider.provider_type,
                    'api_key': provider.api_key,
                    'model': agent.llm_model or provider.default_model,
                    'api_base_url': provider.api_base_url,
                    'temperature': agent.temperature,
                    'max_tokens': agent.max_tokens,
                    'top_p': agent.top_p,
                }
                
                # Build messages
                messages = self._build_messages(conversation)
                
                # Create client
                client = LangChainClient(provider_config)
                
                # Stream response
                full_content = ''
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                async def stream():
                    nonlocal full_content
                    async for chunk in client.chat_stream(
                        messages=messages,
                        system_prompt=agent.get_full_system_prompt(data.get('context_variables'))
                    ):
                        if chunk.content:
                            full_content += chunk.content
                            yield f'data: {json.dumps({"type": "content", "content": chunk.content})}\n\n'
                        
                        if chunk.is_complete:
                            # Create assistant message
                            assistant_message = AgentMessage.objects.create(
                                conversation=conversation,
                                role='assistant',
                                content=full_content,
                                tool_calls=chunk.tool_calls or [],
                                status='completed',
                            )
                            
                            yield f'data: {json.dumps({"type": "done", "message_id": str(assistant_message.id)})}\n\n'
                
                # Run async generator
                async_gen = stream()
                while True:
                    try:
                        result = loop.run_until_complete(async_gen.__anext__())
                        yield result
                    except StopAsyncIteration:
                        break
                
                loop.close()
            
            except Exception as e:
                logger.exception('Streaming error')
                yield f'data: {json.dumps({"type": "error", "error": str(e)})}\n\n'
        
        response = StreamingHttpResponse(
            generate(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
    
    def _build_messages(self, conversation, limit=None):
        """Build messages list from conversation history."""
        queryset = conversation.messages.filter(
            role__in=['user', 'assistant', 'tool']
        ).order_by('sequence_number')
        
        if limit:
            queryset = queryset[:limit]
        
        messages = []
        for msg in queryset:
            message = {
                'role': msg.role,
                'content': msg.content,
            }
            if msg.tool_calls:
                message['tool_calls'] = msg.tool_calls
            if msg.tool_call_id:
                message['tool_call_id'] = msg.tool_call_id
                message['name'] = msg.tool_name
            messages.append(message)
        
        return messages
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get statistics for this agent."""
        agent = self.get_object()
        
        # Get execution stats
        executions = AgentExecution.objects.filter(agent=agent)
        
        stats = {
            'total_conversations': agent.total_conversations,
            'total_messages': agent.total_messages,
            'total_tokens_used': agent.total_tokens_used,
            'total_cost': float(agent.total_cost),
            'average_response_time': agent.average_response_time,
            'executions': {
                'total': executions.count(),
                'completed': executions.filter(status='completed').count(),
                'failed': executions.filter(status='failed').count(),
                'avg_duration_ms': executions.aggregate(avg=Avg('duration_ms'))['avg'] or 0,
            },
            'by_day': list(
                executions
                .extra(select={'day': 'DATE(created_at)'})
                .values('day')
                .annotate(count=Count('id'), tokens=Sum('total_tokens'))
                .order_by('-day')[:30]
            ),
        }
        
        return Response(stats)


# =============================================================================
# CONVERSATION VIEWS
# =============================================================================

class AgentConversationViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for Agent Conversation management.
    
    Endpoints:
    - GET /conversations/ - List all conversations
    - POST /conversations/ - Create a new conversation
    - GET /conversations/{id}/ - Get conversation details
    - PUT /conversations/{id}/ - Update conversation
    - DELETE /conversations/{id}/ - Delete conversation
    - GET /conversations/{id}/messages/ - Get conversation messages
    - POST /conversations/{id}/messages/ - Add a message
    - POST /conversations/{id}/summarize/ - Generate summary
    - POST /conversations/{id}/branch/ - Create a branch
    """
    
    queryset = AgentConversation.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['agent', 'status', 'is_pinned', 'is_starred']
    search_fields = ['title', 'summary']
    ordering_fields = ['created_at', 'last_message_at', 'message_count']
    ordering = ['-last_message_at']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': AgentConversationListSerializer,
        'retrieve': AgentConversationDetailSerializer,
        'create': AgentConversationWriteSerializer,
        'update': AgentConversationWriteSerializer,
        'partial_update': AgentConversationWriteSerializer,
        'default': AgentConversationDetailSerializer,
    }
    
    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)
    
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        """Get or add messages to conversation."""
        conversation = self.get_object()
        
        if request.method == 'GET':
            messages = conversation.messages.order_by('sequence_number')
            serializer = AgentMessageSerializer(messages, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            serializer = AgentMessageWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            message = AgentMessage.objects.create(
                conversation=conversation,
                **serializer.validated_data
            )
            
            return Response(
                AgentMessageSerializer(message).data,
                status=status.HTTP_201_CREATED
            )
    
    @action(detail=True, methods=['post'])
    def summarize(self, request, pk=None):
        """Generate a summary for the conversation."""
        conversation = self.get_object()
        
        try:
            # Get messages
            messages = self._build_messages(conversation)
            
            # Get provider
            provider = conversation.agent.llm_provider
            client = LangChainClient({
                'provider_type': provider.provider_type,
                'api_key': provider.api_key,
                'model': provider.default_model,
                'temperature': 0.3,
                'max_tokens': 500,
            })
            
            # Generate summary
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            summary = loop.run_until_complete(client.summarize_conversation(messages))
            loop.close()
            
            # Update conversation
            conversation.summary = summary
            conversation.save(update_fields=['summary'])
            
            return Response({
                'summary': summary,
            })
        
        except Exception as e:
            logger.exception('Summarization error')
            return Response({
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def branch(self, request, pk=None):
        """Create a branch from this conversation."""
        conversation = self.get_object()
        message_id = request.data.get('from_message_id')
        
        # Get the message to branch from
        from_message = None
        if message_id:
            from_message = get_object_or_404(
                AgentMessage,
                id=message_id,
                conversation=conversation
            )
        
        # Create new conversation
        new_conversation = AgentConversation.objects.create(
            title=f'Branch of {conversation.title}',
            agent=conversation.agent,
            user=request.user,
            parent_conversation=conversation,
            branched_from_message=from_message,
            context_variables=conversation.context_variables,
        )
        
        # Copy messages up to the branch point
        messages_to_copy = conversation.messages.order_by('sequence_number')
        if from_message:
            messages_to_copy = messages_to_copy.filter(
                sequence_number__lte=from_message.sequence_number
            )
        
        for msg in messages_to_copy:
            AgentMessage.objects.create(
                conversation=new_conversation,
                role=msg.role,
                content=msg.content,
                tool_calls=msg.tool_calls,
                attachments=msg.attachments,
                metadata=msg.metadata,
            )
        
        return Response(
            AgentConversationDetailSerializer(new_conversation).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def feedback(self, request, pk=None):
        """Submit feedback for the conversation."""
        conversation = self.get_object()
        
        rating = request.data.get('rating')
        feedback_text = request.data.get('feedback', '')
        
        if rating is not None:
            conversation.rating = rating
        if feedback_text:
            conversation.feedback = feedback_text
        
        conversation.save(update_fields=['rating', 'feedback'])
        
        return Response({
            'success': True,
            'rating': conversation.rating,
            'feedback': conversation.feedback,
        })
    
    def _build_messages(self, conversation):
        """Build messages list from conversation."""
        return [
            {'role': msg.role, 'content': msg.content}
            for msg in conversation.messages.order_by('sequence_number')
            if msg.role in ['user', 'assistant']
        ]


# =============================================================================
# EXECUTION VIEWS
# =============================================================================

class AgentExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Agent Execution logs (read-only).
    
    Endpoints:
    - GET /executions/ - List all executions
    - GET /executions/{id}/ - Get execution details
    """
    
    queryset = AgentExecution.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['agent', 'conversation', 'execution_type', 'status', 'provider']
    ordering_fields = ['created_at', 'duration_ms', 'cost']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AgentExecutionDetailSerializer
        return AgentExecutionListSerializer
    
    def get_queryset(self):
        return super().get_queryset().filter(conversation__user=self.request.user)


# =============================================================================
# KNOWLEDGE BASE VIEWS
# =============================================================================

class KnowledgeBaseViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for Knowledge Base management.
    
    Endpoints:
    - GET /knowledge-bases/ - List all knowledge bases
    - POST /knowledge-bases/ - Create a new knowledge base
    - GET /knowledge-bases/{id}/ - Get knowledge base details
    - PUT /knowledge-bases/{id}/ - Update knowledge base
    - DELETE /knowledge-bases/{id}/ - Delete knowledge base
    - POST /knowledge-bases/{id}/index/ - Index all documents
    - POST /knowledge-bases/{id}/search/ - Search documents
    """
    
    queryset = KnowledgeBase.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vector_store_type', 'embedding_model', 'is_active']
    search_fields = ['name', 'display_name', 'description']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': KnowledgeBaseListSerializer,
        'retrieve': KnowledgeBaseDetailSerializer,
        'create': KnowledgeBaseWriteSerializer,
        'update': KnowledgeBaseWriteSerializer,
        'partial_update': KnowledgeBaseWriteSerializer,
        'default': KnowledgeBaseDetailSerializer,
    }
    
    @action(detail=True, methods=['post'])
    def index(self, request, pk=None):
        """Index all documents in the knowledge base."""
        knowledge_base = self.get_object()
        
        # Start async indexing task
        from .tasks import index_knowledge_base
        task = index_knowledge_base.delay(str(knowledge_base.id))
        
        knowledge_base.is_indexing = True
        knowledge_base.save(update_fields=['is_indexing'])
        
        return Response({
            'success': True,
            'task_id': task.id,
            'message': 'Indexing started',
        })
    
    @action(detail=True, methods=['post'])
    def search(self, request, pk=None):
        """Search documents in the knowledge base."""
        knowledge_base = self.get_object()
        serializer = RAGSearchRequestSerializer(data={
            **request.data,
            'knowledge_base_id': str(knowledge_base.id),
        })
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        try:
            # Get embedding provider
            provider = knowledge_base.embedding_provider or LLMProvider.objects.filter(
                is_default=True, is_active=True
            ).first()
            
            if not provider:
                return Response({
                    'error': 'No embedding provider configured',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create client
            client = LangChainClient({
                'provider_type': provider.provider_type,
                'api_key': provider.api_key,
                'embedding_model': knowledge_base.embedding_model,
            })
            
            # Search
            start_time = time.time()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(client.retrieve_documents(
                query=data['query'],
                collection_name=knowledge_base.collection_name,
                top_k=data['top_k'],
                score_threshold=data['score_threshold'],
                qdrant_url=knowledge_base.vector_store_config.get('url'),
                qdrant_api_key=knowledge_base.vector_store_config.get('api_key'),
            ))
            loop.close()
            
            search_time_ms = int((time.time() - start_time) * 1000)
            
            return Response({
                'query': data['query'],
                'results': [
                    {
                        'content': doc['content'],
                        'metadata': doc['metadata'],
                        'score': score,
                    }
                    for doc, score in zip(result.documents, result.scores)
                ],
                'total_results': result.total_retrieved,
                'search_time_ms': search_time_ms,
            })
        
        except Exception as e:
            logger.exception('Search error')
            return Response({
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class KnowledgeDocumentViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for Knowledge Document management."""
    
    queryset = KnowledgeDocument.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['knowledge_base', 'document_type', 'indexing_status', 'is_active']
    search_fields = ['title', 'content']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': KnowledgeDocumentListSerializer,
        'retrieve': KnowledgeDocumentDetailSerializer,
        'create': KnowledgeDocumentWriteSerializer,
        'update': KnowledgeDocumentWriteSerializer,
        'partial_update': KnowledgeDocumentWriteSerializer,
        'default': KnowledgeDocumentDetailSerializer,
    }
    
    @action(detail=True, methods=['post'])
    def reindex(self, request, pk=None):
        """Reindex this document."""
        document = self.get_object()
        
        # Start async indexing task
        from .tasks import index_document
        task = index_document.delay(str(document.id))
        
        document.indexing_status = 'pending'
        document.save(update_fields=['indexing_status'])
        
        return Response({
            'success': True,
            'task_id': task.id,
        })


# =============================================================================
# PROMPT TEMPLATE VIEWS
# =============================================================================

class PromptTemplateViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for Prompt Template management."""
    
    queryset = PromptTemplate.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['template_type', 'is_active', 'is_system']
    search_fields = ['name', 'display_name', 'description']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': PromptTemplateListSerializer,
        'retrieve': PromptTemplateDetailSerializer,
        'default': PromptTemplateDetailSerializer,
    }
    
    @action(detail=True, methods=['post'])
    def render(self, request, pk=None):
        """Render the template with provided variables."""
        template = self.get_object()
        variables = request.data.get('variables', {})
        
        try:
            from jinja2 import Template
            jinja_template = Template(template.template)
            rendered = jinja_template.render(**variables)
            
            return Response({
                'rendered': rendered,
            })
        except Exception as e:
            return Response({
                'error': str(e),
            }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# WORKFLOW VIEWS
# =============================================================================

class AgentWorkflowViewSet(MultiSerializerViewSetMixin, viewsets.ModelViewSet):
    """ViewSet for Agent Workflow management."""
    
    queryset = AgentWorkflow.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status']
    search_fields = ['name', 'display_name', 'description']
    
    serializer_class = LLMProviderListSerializer
    serializer_classes = {
        'list': AgentWorkflowListSerializer,
        'retrieve': AgentWorkflowDetailSerializer,
        'create': AgentWorkflowWriteSerializer,
        'update': AgentWorkflowWriteSerializer,
        'partial_update': AgentWorkflowWriteSerializer,
        'default': AgentWorkflowDetailSerializer,
    }
    
    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """Execute the workflow."""
        workflow = self.get_object()
        input_data = request.data.get('input', {})
        
        # Start async workflow execution
        from .tasks import execute_workflow
        task = execute_workflow.delay(str(workflow.id), input_data, request.user.id)
        
        return Response({
            'success': True,
            'task_id': task.id,
        })


# =============================================================================
# STATISTICS VIEWS
# =============================================================================

class StatsViewSet(viewsets.ViewSet):
    """ViewSet for global statistics."""
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get overall statistics."""
        user = request.user
        
        # Agent stats
        if user.is_staff:
            agents = AgentDefinition.objects.filter(is_active=True)
        else:
            agents = AgentDefinition.objects.filter(
                Q(is_public=True) | Q(created_by=user) | Q(allowed_users=user),
                is_active=True
            ).distinct()
        
        agent_stats = agents.aggregate(
            total_conversations=Sum('total_conversations'),
            total_messages=Sum('total_messages'),
            total_tokens=Sum('total_tokens_used'),
            total_cost=Sum('total_cost'),
            avg_response_time=Avg('average_response_time'),
        )
        
        # Top agents
        top_agents = agents.order_by('-total_messages')[:5].values(
            'id', 'display_name', 'total_messages', 'total_cost'
        )
        
        return Response({
            'total_agents': agents.count(),
            'active_agents': agents.filter(is_active=True).count(),
            'total_conversations': agent_stats['total_conversations'] or 0,
            'total_messages': agent_stats['total_messages'] or 0,
            'total_tokens_used': agent_stats['total_tokens'] or 0,
            'total_cost': float(agent_stats['total_cost'] or 0),
            'average_response_time': agent_stats['avg_response_time'] or 0,
            'top_agents': list(top_agents),
        })
    
    @action(detail=False, methods=['get'])
    def usage_report(self, request):
        """Get detailed usage report."""
        # Get date range
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timezone.timedelta(days=days)
        
        executions = AgentExecution.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date,
        )
        
        if not request.user.is_staff:
            executions = executions.filter(conversation__user=request.user)
        
        # Aggregate stats
        stats = executions.aggregate(
            total_requests=Count('id'),
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('cost'),
        )
        
        # By agent
        by_agent = executions.values(
            'agent__id', 'agent__display_name'
        ).annotate(
            requests=Count('id'),
            tokens=Sum('total_tokens'),
            cost=Sum('cost'),
        ).order_by('-requests')[:10]
        
        # By provider
        by_provider = executions.values(
            'provider__id', 'provider__name'
        ).annotate(
            requests=Count('id'),
            tokens=Sum('total_tokens'),
            cost=Sum('cost'),
        ).order_by('-requests')[:10]
        
        # By day
        by_day = executions.extra(
            select={'day': 'DATE(created_at)'}
        ).values('day').annotate(
            requests=Count('id'),
            tokens=Sum('total_tokens'),
            cost=Sum('cost'),
        ).order_by('day')
        
        return Response({
            'period_start': start_date,
            'period_end': end_date,
            'total_requests': stats['total_requests'] or 0,
            'total_tokens': stats['total_tokens'] or 0,
            'total_cost': float(stats['total_cost'] or 0),
            'by_agent': list(by_agent),
            'by_provider': list(by_provider),
            'by_day': list(by_day),
        })
