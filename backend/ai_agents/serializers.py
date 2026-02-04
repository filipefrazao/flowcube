"""
FlowCube AI Agents Serializers

Django REST Framework serializers for all AI agent models.

Author: FRZ Group
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.contrib.auth import get_user_model
from rest_framework import serializers

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

User = get_user_model()


# =============================================================================
# BASE SERIALIZERS
# =============================================================================

class TimestampedModelSerializer(serializers.ModelSerializer):
    """Base serializer with timestamp fields."""
    
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for nested representations."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = fields


# =============================================================================
# LLM PROVIDER SERIALIZERS
# =============================================================================

class LLMProviderListSerializer(TimestampedModelSerializer):
    """Serializer for LLM provider list view."""
    
    masked_api_key = serializers.CharField(read_only=True)
    models_count = serializers.SerializerMethodField()
    
    class Meta:
        model = LLMProvider
        fields = [
            'id', 'name', 'provider_type', 'description',
            'default_model', 'available_models',
            'is_active', 'is_default',
            'masked_api_key', 'models_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_models_count(self, obj) -> int:
        return obj.models.count()


class LLMProviderDetailSerializer(TimestampedModelSerializer):
    """Serializer for LLM provider detail view."""
    
    masked_api_key = serializers.CharField(read_only=True)
    created_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = LLMProvider
        fields = [
            'id', 'name', 'provider_type', 'description',
            'api_key', 'api_base_url', 'api_version', 'organization_id',
            'default_model', 'available_models',
            'default_temperature', 'default_max_tokens', 'default_top_p',
            'requests_per_minute', 'tokens_per_minute',
            'input_cost_per_million', 'output_cost_per_million',
            'context_window',
            'supports_streaming', 'supports_function_calling',
            'supports_vision', 'supports_json_mode',
            'is_active', 'is_default',
            'masked_api_key', 'extra_config',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'masked_api_key', 'created_at', 'updated_at']
        extra_kwargs = {
            'api_key': {'write_only': True},
        }
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class LLMProviderWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating LLM providers."""
    
    class Meta:
        model = LLMProvider
        fields = [
            'name', 'provider_type', 'description',
            'api_key', 'api_base_url', 'api_version', 'organization_id',
            'default_model', 'available_models',
            'default_temperature', 'default_max_tokens', 'default_top_p',
            'requests_per_minute', 'tokens_per_minute',
            'input_cost_per_million', 'output_cost_per_million',
            'context_window',
            'supports_streaming', 'supports_function_calling',
            'supports_vision', 'supports_json_mode',
            'is_active', 'is_default',
            'extra_config',
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class LLMModelSerializer(TimestampedModelSerializer):
    """Serializer for LLM models."""
    
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    
    class Meta:
        model = LLMModel
        fields = [
            'id', 'provider', 'provider_name',
            'model_id', 'display_name', 'description',
            'context_window', 'max_output_tokens',
            'input_cost_per_million', 'output_cost_per_million',
            'supports_streaming', 'supports_function_calling',
            'supports_vision', 'supports_json_mode',
            'is_active', 'is_default',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# AGENT TOOL SERIALIZERS
# =============================================================================

class AgentToolListSerializer(TimestampedModelSerializer):
    """Serializer for agent tool list view."""
    
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = AgentTool
        fields = [
            'id', 'name', 'display_name', 'description',
            'tool_type', 'is_active', 'is_system',
            'total_executions', 'successful_executions',
            'average_execution_time', 'success_rate',
            'tags', 'version',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_success_rate(self, obj) -> float:
        if obj.total_executions == 0:
            return 0.0
        return round(obj.successful_executions / obj.total_executions * 100, 2)


class AgentToolDetailSerializer(TimestampedModelSerializer):
    """Serializer for agent tool detail view."""
    
    success_rate = serializers.SerializerMethodField()
    langchain_schema = serializers.SerializerMethodField()
    
    class Meta:
        model = AgentTool
        fields = [
            'id', 'name', 'display_name', 'description',
            'tool_type',
            'parameters_schema', 'return_schema',
            'http_method', 'http_url', 'http_headers', 'http_body_template',
            'database_connection', 'query_template',
            'python_module', 'python_function', 'python_code',
            'timeout_seconds', 'retry_count', 'retry_delay_seconds',
            'cache_enabled', 'cache_ttl_seconds',
            'rate_limit_enabled', 'rate_limit_calls',
            'requires_confirmation', 'allowed_roles',
            'is_active', 'is_system',
            'version', 'author', 'tags',
            'total_executions', 'successful_executions', 'failed_executions',
            'average_execution_time', 'last_executed_at',
            'success_rate', 'langchain_schema',
            'extra_config',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_executions', 'successful_executions', 'failed_executions',
            'average_execution_time', 'last_executed_at',
            'created_at', 'updated_at',
        ]
    
    def get_success_rate(self, obj) -> float:
        if obj.total_executions == 0:
            return 0.0
        return round(obj.successful_executions / obj.total_executions * 100, 2)
    
    def get_langchain_schema(self, obj) -> dict:
        return obj.get_langchain_tool_schema()


class AgentToolWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating agent tools."""
    
    class Meta:
        model = AgentTool
        fields = [
            'name', 'display_name', 'description',
            'tool_type',
            'parameters_schema', 'return_schema',
            'http_method', 'http_url', 'http_headers', 'http_body_template',
            'database_connection', 'query_template',
            'python_module', 'python_function', 'python_code',
            'timeout_seconds', 'retry_count', 'retry_delay_seconds',
            'cache_enabled', 'cache_ttl_seconds',
            'rate_limit_enabled', 'rate_limit_calls',
            'requires_confirmation', 'allowed_roles',
            'is_active',
            'version', 'author', 'tags',
            'extra_config',
        ]
    
    def validate_parameters_schema(self, value):
        """Validate JSON Schema format."""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError('Parameters schema must be a JSON object')
        
        if value and 'type' in value and value['type'] != 'object':
            raise serializers.ValidationError('Root type must be "object"')
        
        return value


# =============================================================================
# AGENT DEFINITION SERIALIZERS
# =============================================================================

class AgentDefinitionListSerializer(TimestampedModelSerializer):
    """Serializer for agent definition list view."""
    
    provider_name = serializers.CharField(source='llm_provider.name', read_only=True)
    tools_count = serializers.SerializerMethodField()
    knowledge_bases_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AgentDefinition
        fields = [
            'id', 'name', 'display_name', 'description', 'avatar_url',
            'agent_type',
            'llm_provider', 'provider_name', 'llm_model',
            'is_active', 'is_public', 'is_system',
            'tools_count', 'knowledge_bases_count',
            'total_conversations', 'total_messages', 'total_tokens_used',
            'total_cost', 'average_response_time',
            'version', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_conversations', 'total_messages', 'total_tokens_used',
            'total_cost', 'average_response_time',
            'created_at', 'updated_at',
        ]
    
    def get_tools_count(self, obj) -> int:
        return obj.tools.count()
    
    def get_knowledge_bases_count(self, obj) -> int:
        return obj.knowledge_bases.count()


class AgentDefinitionDetailSerializer(TimestampedModelSerializer):
    """Serializer for agent definition detail view."""
    
    llm_provider_detail = LLMProviderListSerializer(source='llm_provider', read_only=True)
    fallback_provider_detail = LLMProviderListSerializer(source='fallback_provider', read_only=True)
    tools_detail = AgentToolListSerializer(source='tools', many=True, read_only=True)
    created_by = UserMinimalSerializer(read_only=True)
    full_system_prompt = serializers.SerializerMethodField()
    
    class Meta:
        model = AgentDefinition
        fields = [
            'id', 'name', 'display_name', 'description', 'avatar_url',
            'agent_type',
            'llm_provider', 'llm_provider_detail',
            'llm_model',
            'fallback_provider', 'fallback_provider_detail',
            'temperature', 'max_tokens', 'top_p',
            'frequency_penalty', 'presence_penalty',
            'system_prompt', 'system_prompt_template',
            'persona_description', 'output_format_instructions',
            'examples', 'full_system_prompt',
            'tools', 'tools_detail',
            'tool_choice', 'parallel_tool_calls', 'max_tool_iterations',
            'memory_type', 'memory_window', 'memory_token_limit',
            'knowledge_bases', 'rag_enabled', 'rag_top_k', 'rag_score_threshold',
            'streaming_enabled', 'json_mode', 'json_schema',
            'content_filter_enabled', 'max_conversation_turns',
            'is_public', 'allowed_users',
            'is_active', 'is_system',
            'version', 'tags',
            'total_conversations', 'total_messages', 'total_tokens_used',
            'total_cost', 'average_response_time',
            'created_by', 'extra_config',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_conversations', 'total_messages', 'total_tokens_used',
            'total_cost', 'average_response_time',
            'created_at', 'updated_at',
        ]
    
    def get_full_system_prompt(self, obj) -> str:
        return obj.get_full_system_prompt()


class AgentDefinitionWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating agent definitions."""
    
    class Meta:
        model = AgentDefinition
        fields = [
            'name', 'display_name', 'description', 'avatar_url',
            'agent_type',
            'llm_provider', 'llm_model', 'fallback_provider',
            'temperature', 'max_tokens', 'top_p',
            'frequency_penalty', 'presence_penalty',
            'system_prompt', 'system_prompt_template',
            'persona_description', 'output_format_instructions',
            'examples',
            'tools', 'tool_choice', 'parallel_tool_calls', 'max_tool_iterations',
            'memory_type', 'memory_window', 'memory_token_limit',
            'knowledge_bases', 'rag_enabled', 'rag_top_k', 'rag_score_threshold',
            'streaming_enabled', 'json_mode', 'json_schema',
            'content_filter_enabled', 'max_conversation_turns',
            'is_public', 'allowed_users',
            'is_active',
            'version', 'tags',
            'extra_config',
        ]
    
    def create(self, validated_data):
        tools = validated_data.pop('tools', [])
        knowledge_bases = validated_data.pop('knowledge_bases', [])
        allowed_users = validated_data.pop('allowed_users', [])
        
        validated_data['created_by'] = self.context['request'].user
        agent = AgentDefinition.objects.create(**validated_data)
        
        if tools:
            agent.tools.set(tools)
        if knowledge_bases:
            agent.knowledge_bases.set(knowledge_bases)
        if allowed_users:
            agent.allowed_users.set(allowed_users)
        
        return agent
    
    def update(self, instance, validated_data):
        tools = validated_data.pop('tools', None)
        knowledge_bases = validated_data.pop('knowledge_bases', None)
        allowed_users = validated_data.pop('allowed_users', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if tools is not None:
            instance.tools.set(tools)
        if knowledge_bases is not None:
            instance.knowledge_bases.set(knowledge_bases)
        if allowed_users is not None:
            instance.allowed_users.set(allowed_users)
        
        return instance


# =============================================================================
# CONVERSATION SERIALIZERS
# =============================================================================

class AgentMessageSerializer(TimestampedModelSerializer):
    """Serializer for agent messages."""
    
    class Meta:
        model = AgentMessage
        fields = [
            'id', 'conversation', 'role', 'content',
            'tool_calls', 'tool_call_id', 'tool_name',
            'attachments', 'sequence_number',
            'status', 'error_message',
            'input_tokens', 'output_tokens', 'total_tokens',
            'response_time_ms', 'first_token_time_ms',
            'cost',
            'model_used', 'provider_used',
            'thumbs_up', 'feedback_text',
            'is_edited', 'is_regenerated', 'regeneration_count',
            'rag_context', 'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'sequence_number',
            'input_tokens', 'output_tokens', 'total_tokens',
            'response_time_ms', 'first_token_time_ms', 'cost',
            'model_used', 'provider_used',
            'created_at', 'updated_at',
        ]


class AgentMessageWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating messages."""
    
    class Meta:
        model = AgentMessage
        fields = ['role', 'content', 'attachments', 'metadata']


class AgentConversationListSerializer(TimestampedModelSerializer):
    """Serializer for conversation list view."""
    
    agent_name = serializers.CharField(source='agent.display_name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = AgentConversation
        fields = [
            'id', 'title', 'summary',
            'agent', 'agent_name',
            'user', 'user_name',
            'status',
            'message_count', 'total_cost',
            'last_message_at', 'last_message_preview',
            'rating', 'is_pinned', 'is_starred',
            'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'message_count', 'total_cost',
            'last_message_at', 'created_at', 'updated_at',
        ]
    
    def get_last_message_preview(self, obj) -> Optional[str]:
        last_msg = obj.messages.order_by('-sequence_number').first()
        if last_msg:
            content = last_msg.content[:100]
            return f'{content}...' if len(last_msg.content) > 100 else content
        return None


class AgentConversationDetailSerializer(TimestampedModelSerializer):
    """Serializer for conversation detail view."""
    
    agent_detail = AgentDefinitionListSerializer(source='agent', read_only=True)
    user = UserMinimalSerializer(read_only=True)
    messages = AgentMessageSerializer(many=True, read_only=True)
    parent_conversation_id = serializers.UUIDField(
        source='parent_conversation.id', read_only=True, allow_null=True
    )
    branches_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AgentConversation
        fields = [
            'id', 'title', 'summary',
            'agent', 'agent_detail',
            'user',
            'parent_conversation_id', 'branches_count',
            'status',
            'context_variables', 'memory_state', 'memory_summary',
            'message_count', 'total_input_tokens', 'total_output_tokens', 'total_cost',
            'last_message_at',
            'rating', 'feedback',
            'is_pinned', 'is_starred',
            'tags', 'metadata',
            'messages',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'message_count', 'total_input_tokens', 'total_output_tokens', 'total_cost',
            'last_message_at', 'created_at', 'updated_at',
        ]
    
    def get_branches_count(self, obj) -> int:
        return obj.branches.count()


class AgentConversationWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating conversations."""
    
    class Meta:
        model = AgentConversation
        fields = [
            'title', 'agent',
            'parent_conversation', 'branched_from_message',
            'context_variables',
            'rating', 'feedback',
            'is_pinned', 'is_starred',
            'tags', 'metadata',
        ]
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


# =============================================================================
# CHAT SERIALIZERS
# =============================================================================

class ChatMessageInputSerializer(serializers.Serializer):
    """Serializer for chat message input."""
    
    role = serializers.ChoiceField(
        choices=['user', 'assistant', 'system'],
        default='user'
    )
    content = serializers.CharField(allow_blank=False)
    attachments = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )


class ChatRequestSerializer(serializers.Serializer):
    """Serializer for chat request."""
    
    conversation_id = serializers.UUIDField(required=False, allow_null=True)
    agent_id = serializers.UUIDField(required=True)
    message = serializers.CharField(required=True)
    attachments = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    context_variables = serializers.DictField(required=False, default=dict)
    stream = serializers.BooleanField(default=True)
    
    def validate_agent_id(self, value):
        try:
            AgentDefinition.objects.get(id=value, is_active=True)
        except AgentDefinition.DoesNotExist:
            raise serializers.ValidationError('Agent not found or inactive')
        return value


class ChatResponseSerializer(serializers.Serializer):
    """Serializer for chat response."""
    
    conversation_id = serializers.UUIDField()
    message_id = serializers.UUIDField()
    content = serializers.CharField()
    role = serializers.CharField()
    tool_calls = serializers.ListField(child=serializers.DictField(), default=list)
    input_tokens = serializers.IntegerField()
    output_tokens = serializers.IntegerField()
    cost = serializers.DecimalField(max_digits=10, decimal_places=8)
    response_time_ms = serializers.IntegerField()
    model_used = serializers.CharField()
    rag_context = serializers.ListField(child=serializers.DictField(), required=False)


class StreamChunkSerializer(serializers.Serializer):
    """Serializer for streaming chunk."""
    
    type = serializers.ChoiceField(choices=['content', 'tool_call', 'done', 'error'])
    content = serializers.CharField(required=False, allow_blank=True)
    tool_call = serializers.DictField(required=False)
    metadata = serializers.DictField(required=False)


# =============================================================================
# EXECUTION SERIALIZERS
# =============================================================================

class AgentExecutionListSerializer(TimestampedModelSerializer):
    """Serializer for execution list view."""
    
    agent_name = serializers.CharField(source='agent.display_name', read_only=True)
    tool_name = serializers.CharField(source='tool.display_name', read_only=True, allow_null=True)
    
    class Meta:
        model = AgentExecution
        fields = [
            'id', 'conversation', 'message',
            'agent', 'agent_name',
            'execution_type', 'status',
            'model_used',
            'tool', 'tool_name',
            'input_tokens', 'output_tokens', 'total_tokens', 'cost',
            'duration_ms', 'time_to_first_token_ms',
            'was_rate_limited', 'was_cached',
            'error_type', 'error_message',
            'created_at',
        ]
        read_only_fields = fields


class AgentExecutionDetailSerializer(TimestampedModelSerializer):
    """Serializer for execution detail view."""
    
    agent_name = serializers.CharField(source='agent.display_name', read_only=True)
    tool_detail = AgentToolListSerializer(source='tool', read_only=True)
    provider_detail = LLMProviderListSerializer(source='provider', read_only=True)
    
    class Meta:
        model = AgentExecution
        fields = [
            'id', 'conversation', 'message',
            'agent', 'agent_name',
            'execution_type', 'status',
            'provider', 'provider_detail', 'model_used',
            'request_payload', 'response_payload',
            'tool', 'tool_detail', 'tool_input', 'tool_output',
            'input_tokens', 'output_tokens', 'total_tokens', 'cost',
            'started_at', 'completed_at', 'duration_ms', 'time_to_first_token_ms',
            'error_type', 'error_message', 'error_traceback',
            'retry_count',
            'was_rate_limited', 'rate_limit_delay_ms',
            'was_cached', 'cache_key',
            'metadata',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


# =============================================================================
# KNOWLEDGE BASE SERIALIZERS
# =============================================================================

class KnowledgeDocumentListSerializer(TimestampedModelSerializer):
    """Serializer for knowledge document list view."""
    
    class Meta:
        model = KnowledgeDocument
        fields = [
            'id', 'knowledge_base', 'title', 'document_type',
            'indexing_status', 'indexed_at',
            'character_count', 'word_count', 'chunk_count',
            'source_url', 'tags',
            'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'indexing_status', 'indexed_at',
            'character_count', 'word_count', 'chunk_count',
            'created_at', 'updated_at',
        ]


class KnowledgeDocumentDetailSerializer(TimestampedModelSerializer):
    """Serializer for knowledge document detail view."""
    
    class Meta:
        model = KnowledgeDocument
        fields = [
            'id', 'knowledge_base', 'title', 'document_type',
            'content', 'content_hash',
            'source_url', 'source_file',
            'chunks', 'chunk_count',
            'indexing_status', 'indexed_at', 'indexing_error',
            'character_count', 'word_count',
            'metadata', 'tags',
            'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'content_hash',
            'chunks', 'chunk_count',
            'indexing_status', 'indexed_at', 'indexing_error',
            'character_count', 'word_count',
            'created_at', 'updated_at',
        ]


class KnowledgeDocumentWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating knowledge documents."""
    
    class Meta:
        model = KnowledgeDocument
        fields = [
            'knowledge_base', 'title', 'document_type',
            'content', 'source_url', 'source_file',
            'metadata', 'tags', 'is_active',
        ]
    
    def validate(self, attrs):
        if not attrs.get('content') and not attrs.get('source_file') and not attrs.get('source_url'):
            raise serializers.ValidationError(
                'At least one of content, source_file, or source_url must be provided'
            )
        return attrs


class KnowledgeBaseListSerializer(TimestampedModelSerializer):
    """Serializer for knowledge base list view."""
    
    created_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = KnowledgeBase
        fields = [
            'id', 'name', 'display_name', 'description',
            'vector_store_type', 'embedding_model',
            'document_count', 'chunk_count', 'total_characters',
            'is_active', 'is_indexing', 'last_indexed_at',
            'created_by', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'document_count', 'chunk_count', 'total_characters',
            'is_indexing', 'last_indexed_at',
            'created_at', 'updated_at',
        ]


class KnowledgeBaseDetailSerializer(TimestampedModelSerializer):
    """Serializer for knowledge base detail view."""
    
    created_by = UserMinimalSerializer(read_only=True)
    embedding_provider_detail = LLMProviderListSerializer(
        source='embedding_provider', read_only=True
    )
    documents = KnowledgeDocumentListSerializer(many=True, read_only=True)
    agents_using = serializers.SerializerMethodField()
    
    class Meta:
        model = KnowledgeBase
        fields = [
            'id', 'name', 'display_name', 'description',
            'vector_store_type', 'vector_store_config', 'collection_name',
            'embedding_model', 'embedding_dimension',
            'embedding_provider', 'embedding_provider_detail',
            'chunk_size', 'chunk_overlap', 'chunking_strategy',
            'default_top_k', 'default_score_threshold',
            'document_count', 'chunk_count', 'total_characters',
            'is_active', 'is_indexing', 'last_indexed_at',
            'created_by', 'metadata', 'tags',
            'documents', 'agents_using',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'document_count', 'chunk_count', 'total_characters',
            'is_indexing', 'last_indexed_at',
            'created_at', 'updated_at',
        ]
    
    def get_agents_using(self, obj) -> List[Dict[str, Any]]:
        return [
            {'id': str(agent.id), 'name': agent.display_name}
            for agent in obj.agents.all()
        ]


class KnowledgeBaseWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating knowledge bases."""
    
    class Meta:
        model = KnowledgeBase
        fields = [
            'name', 'display_name', 'description',
            'vector_store_type', 'vector_store_config', 'collection_name',
            'embedding_model', 'embedding_dimension', 'embedding_provider',
            'chunk_size', 'chunk_overlap', 'chunking_strategy',
            'default_top_k', 'default_score_threshold',
            'is_active', 'metadata', 'tags',
        ]
    
    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


# =============================================================================
# RAG SEARCH SERIALIZERS
# =============================================================================

class RAGSearchRequestSerializer(serializers.Serializer):
    """Serializer for RAG search request."""
    
    query = serializers.CharField(required=True)
    knowledge_base_id = serializers.UUIDField(required=True)
    top_k = serializers.IntegerField(default=5, min_value=1, max_value=50)
    score_threshold = serializers.FloatField(default=0.7, min_value=0.0, max_value=1.0)
    filter_metadata = serializers.DictField(required=False, default=dict)


class RAGSearchResultSerializer(serializers.Serializer):
    """Serializer for RAG search result."""
    
    content = serializers.CharField()
    metadata = serializers.DictField()
    score = serializers.FloatField()
    document_id = serializers.UUIDField(required=False)
    document_title = serializers.CharField(required=False)


class RAGSearchResponseSerializer(serializers.Serializer):
    """Serializer for RAG search response."""
    
    query = serializers.CharField()
    results = RAGSearchResultSerializer(many=True)
    total_results = serializers.IntegerField()
    search_time_ms = serializers.IntegerField()


# =============================================================================
# PROMPT TEMPLATE SERIALIZERS
# =============================================================================

class PromptTemplateListSerializer(TimestampedModelSerializer):
    """Serializer for prompt template list view."""
    
    class Meta:
        model = PromptTemplate
        fields = [
            'id', 'name', 'display_name', 'description',
            'template_type',
            'is_active', 'is_system',
            'version', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PromptTemplateDetailSerializer(TimestampedModelSerializer):
    """Serializer for prompt template detail view."""
    
    class Meta:
        model = PromptTemplate
        fields = [
            'id', 'name', 'display_name', 'description',
            'template_type',
            'template', 'variables_schema', 'default_values',
            'is_active', 'is_system',
            'version', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# WORKFLOW SERIALIZERS
# =============================================================================

class AgentWorkflowListSerializer(TimestampedModelSerializer):
    """Serializer for workflow list view."""
    
    created_by = UserMinimalSerializer(read_only=True)
    agents_count = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = AgentWorkflow
        fields = [
            'id', 'name', 'display_name', 'description',
            'status', 'entry_node',
            'agents_count',
            'total_executions', 'successful_executions', 'failed_executions',
            'success_rate',
            'created_by', 'version', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_executions', 'successful_executions', 'failed_executions',
            'created_at', 'updated_at',
        ]
    
    def get_agents_count(self, obj) -> int:
        return obj.agents.count()
    
    def get_success_rate(self, obj) -> float:
        if obj.total_executions == 0:
            return 0.0
        return round(obj.successful_executions / obj.total_executions * 100, 2)


class AgentWorkflowDetailSerializer(TimestampedModelSerializer):
    """Serializer for workflow detail view."""
    
    created_by = UserMinimalSerializer(read_only=True)
    agents_detail = AgentDefinitionListSerializer(source='agents', many=True, read_only=True)
    
    class Meta:
        model = AgentWorkflow
        fields = [
            'id', 'name', 'display_name', 'description',
            'graph_definition', 'entry_node',
            'nodes', 'edges', 'conditional_edges',
            'agents', 'agents_detail',
            'status',
            'total_executions', 'successful_executions', 'failed_executions',
            'created_by', 'version', 'tags',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'total_executions', 'successful_executions', 'failed_executions',
            'created_at', 'updated_at',
        ]


class AgentWorkflowWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating workflows."""
    
    class Meta:
        model = AgentWorkflow
        fields = [
            'name', 'display_name', 'description',
            'graph_definition', 'entry_node',
            'nodes', 'edges', 'conditional_edges',
            'agents', 'status',
            'version', 'tags',
        ]
    
    def create(self, validated_data):
        agents = validated_data.pop('agents', [])
        validated_data['created_by'] = self.context['request'].user
        workflow = AgentWorkflow.objects.create(**validated_data)
        if agents:
            workflow.agents.set(agents)
        return workflow


# =============================================================================
# STATISTICS SERIALIZERS
# =============================================================================

class AgentStatsSerializer(serializers.Serializer):
    """Serializer for agent statistics."""
    
    total_agents = serializers.IntegerField()
    active_agents = serializers.IntegerField()
    total_conversations = serializers.IntegerField()
    total_messages = serializers.IntegerField()
    total_tokens_used = serializers.IntegerField()
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=6)
    average_response_time = serializers.FloatField()
    top_agents = serializers.ListField(child=serializers.DictField())


class ProviderStatsSerializer(serializers.Serializer):
    """Serializer for provider statistics."""
    
    provider_id = serializers.UUIDField()
    provider_name = serializers.CharField()
    total_requests = serializers.IntegerField()
    total_input_tokens = serializers.IntegerField()
    total_output_tokens = serializers.IntegerField()
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=6)
    average_latency_ms = serializers.FloatField()
    error_rate = serializers.FloatField()


class UsageReportSerializer(serializers.Serializer):
    """Serializer for usage reports."""
    
    period_start = serializers.DateTimeField()
    period_end = serializers.DateTimeField()
    total_requests = serializers.IntegerField()
    total_tokens = serializers.IntegerField()
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=6)
    by_agent = serializers.ListField(child=serializers.DictField())
    by_provider = serializers.ListField(child=serializers.DictField())
    by_day = serializers.ListField(child=serializers.DictField())
