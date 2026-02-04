"""
FlowCube AI Agents Django Admin

Admin configuration for all AI agent models.

Author: FRZ Group
"""

from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Sum

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


# =============================================================================
# INLINE ADMINS
# =============================================================================

class LLMModelInline(admin.TabularInline):
    """Inline admin for LLM models within a provider."""
    model = LLMModel
    extra = 0
    fields = ['model_id', 'display_name', 'context_window', 'is_active', 'is_default']
    readonly_fields = []


class AgentMessageInline(admin.TabularInline):
    """Inline admin for messages within a conversation."""
    model = AgentMessage
    extra = 0
    fields = ['role', 'content_preview', 'status', 'total_tokens', 'cost', 'created_at']
    readonly_fields = ['content_preview', 'status', 'total_tokens', 'cost', 'created_at']
    ordering = ['sequence_number']
    max_num = 20
    
    def content_preview(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content'


class KnowledgeDocumentInline(admin.TabularInline):
    """Inline admin for documents within a knowledge base."""
    model = KnowledgeDocument
    extra = 0
    fields = ['title', 'document_type', 'indexing_status', 'chunk_count', 'created_at']
    readonly_fields = ['indexing_status', 'chunk_count', 'created_at']


# =============================================================================
# LLM PROVIDER ADMIN
# =============================================================================

@admin.register(LLMProvider)
class LLMProviderAdmin(admin.ModelAdmin):
    """Admin for LLM Provider management."""
    
    list_display = [
        'name', 'provider_type', 'default_model', 
        'is_active', 'is_default', 'models_count', 'created_at'
    ]
    list_filter = ['provider_type', 'is_active', 'is_default', 'created_at']
    search_fields = ['name', 'description', 'default_model']
    readonly_fields = ['id', 'masked_api_key', 'created_at', 'updated_at', 'created_by']
    inlines = [LLMModelInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'provider_type', 'description')
        }),
        ('API Configuration', {
            'fields': ('api_key', 'masked_api_key', 'api_base_url', 'api_version', 'organization_id'),
            'classes': ('collapse',)
        }),
        ('Model Configuration', {
            'fields': ('default_model', 'available_models', 'default_temperature', 
                      'default_max_tokens', 'default_top_p', 'context_window')
        }),
        ('Rate Limits', {
            'fields': ('requests_per_minute', 'tokens_per_minute'),
            'classes': ('collapse',)
        }),
        ('Pricing', {
            'fields': ('input_cost_per_million', 'output_cost_per_million'),
            'classes': ('collapse',)
        }),
        ('Features', {
            'fields': ('supports_streaming', 'supports_function_calling', 
                      'supports_vision', 'supports_json_mode')
        }),
        ('Status', {
            'fields': ('is_active', 'is_default')
        }),
        ('Metadata', {
            'fields': ('extra_config', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def models_count(self, obj):
        return obj.models.count()
    models_count.short_description = 'Models'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(LLMModel)
class LLMModelAdmin(admin.ModelAdmin):
    """Admin for LLM Model management."""
    
    list_display = [
        'display_name', 'provider', 'model_id', 
        'context_window', 'is_active', 'is_default'
    ]
    list_filter = ['provider', 'is_active', 'is_default', 'supports_vision']
    search_fields = ['model_id', 'display_name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']


# =============================================================================
# AGENT TOOL ADMIN
# =============================================================================

@admin.register(AgentTool)
class AgentToolAdmin(admin.ModelAdmin):
    """Admin for Agent Tool management."""
    
    list_display = [
        'display_name', 'name', 'tool_type', 'is_active', 'is_system',
        'success_rate', 'total_executions', 'last_executed_at'
    ]
    list_filter = ['tool_type', 'is_active', 'is_system', 'cache_enabled']
    search_fields = ['name', 'display_name', 'description']
    readonly_fields = [
        'id', 'total_executions', 'successful_executions', 'failed_executions',
        'average_execution_time', 'last_executed_at', 'created_at', 'updated_at'
    ]
    filter_horizontal = []
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'display_name', 'description', 'tool_type')
        }),
        ('Schema', {
            'fields': ('parameters_schema', 'return_schema'),
            'classes': ('collapse',)
        }),
        ('HTTP Configuration', {
            'fields': ('http_method', 'http_url', 'http_headers', 'http_body_template'),
            'classes': ('collapse',)
        }),
        ('Database Configuration', {
            'fields': ('database_connection', 'query_template'),
            'classes': ('collapse',)
        }),
        ('Python Configuration', {
            'fields': ('python_module', 'python_function', 'python_code'),
            'classes': ('collapse',)
        }),
        ('Execution Settings', {
            'fields': ('timeout_seconds', 'retry_count', 'retry_delay_seconds')
        }),
        ('Caching', {
            'fields': ('cache_enabled', 'cache_ttl_seconds'),
            'classes': ('collapse',)
        }),
        ('Rate Limiting', {
            'fields': ('rate_limit_enabled', 'rate_limit_calls'),
            'classes': ('collapse',)
        }),
        ('Security', {
            'fields': ('requires_confirmation', 'allowed_roles')
        }),
        ('Status', {
            'fields': ('is_active', 'is_system')
        }),
        ('Statistics', {
            'fields': ('total_executions', 'successful_executions', 'failed_executions',
                      'average_execution_time', 'last_executed_at'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('version', 'author', 'tags', 'extra_config', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def success_rate(self, obj):
        if obj.total_executions == 0:
            return '-'
        rate = obj.successful_executions / obj.total_executions * 100
        color = 'green' if rate >= 90 else 'orange' if rate >= 70 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, rate
        )
    success_rate.short_description = 'Success Rate'


# =============================================================================
# AGENT DEFINITION ADMIN
# =============================================================================

@admin.register(AgentDefinition)
class AgentDefinitionAdmin(admin.ModelAdmin):
    """Admin for Agent Definition management."""
    
    list_display = [
        'display_name', 'name', 'agent_type', 'llm_provider',
        'is_active', 'is_public', 'total_conversations', 'total_cost_display'
    ]
    list_filter = ['agent_type', 'is_active', 'is_public', 'llm_provider', 'created_at']
    search_fields = ['name', 'display_name', 'description', 'system_prompt']
    readonly_fields = [
        'id', 'total_conversations', 'total_messages', 'total_tokens_used',
        'total_cost', 'average_response_time', 'created_at', 'updated_at', 'created_by'
    ]
    filter_horizontal = ['tools', 'knowledge_bases', 'allowed_users']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'display_name', 'description', 'avatar_url', 'agent_type')
        }),
        ('LLM Configuration', {
            'fields': ('llm_provider', 'llm_model', 'fallback_provider',
                      'temperature', 'max_tokens', 'top_p',
                      'frequency_penalty', 'presence_penalty')
        }),
        ('Prompts', {
            'fields': ('system_prompt', 'system_prompt_template',
                      'persona_description', 'output_format_instructions', 'examples')
        }),
        ('Tools', {
            'fields': ('tools', 'tool_choice', 'parallel_tool_calls', 'max_tool_iterations')
        }),
        ('Memory', {
            'fields': ('memory_type', 'memory_window', 'memory_token_limit')
        }),
        ('RAG', {
            'fields': ('knowledge_bases', 'rag_enabled', 'rag_top_k', 'rag_score_threshold'),
            'classes': ('collapse',)
        }),
        ('Response', {
            'fields': ('streaming_enabled', 'json_mode', 'json_schema')
        }),
        ('Safety', {
            'fields': ('content_filter_enabled', 'max_conversation_turns')
        }),
        ('Permissions', {
            'fields': ('is_public', 'allowed_users')
        }),
        ('Status', {
            'fields': ('is_active', 'is_system')
        }),
        ('Statistics', {
            'fields': ('total_conversations', 'total_messages', 'total_tokens_used',
                      'total_cost', 'average_response_time'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('version', 'tags', 'extra_config', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def total_cost_display(self, obj):
        return f'${obj.total_cost:.4f}'
    total_cost_display.short_description = 'Total Cost'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


# =============================================================================
# CONVERSATION ADMIN
# =============================================================================

@admin.register(AgentConversation)
class AgentConversationAdmin(admin.ModelAdmin):
    """Admin for Agent Conversation management."""
    
    list_display = [
        'title', 'agent', 'user', 'status',
        'message_count', 'total_cost_display', 'last_message_at'
    ]
    list_filter = ['agent', 'status', 'is_pinned', 'is_starred', 'created_at']
    search_fields = ['title', 'summary', 'user__username', 'user__email']
    readonly_fields = [
        'id', 'message_count', 'total_input_tokens', 'total_output_tokens',
        'total_cost', 'last_message_at', 'created_at', 'updated_at'
    ]
    inlines = [AgentMessageInline]
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'title', 'summary', 'agent', 'user')
        }),
        ('Branching', {
            'fields': ('parent_conversation', 'branched_from_message'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Context', {
            'fields': ('context_variables', 'memory_state', 'memory_summary'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('message_count', 'total_input_tokens', 'total_output_tokens',
                      'total_cost', 'last_message_at')
        }),
        ('Feedback', {
            'fields': ('rating', 'feedback')
        }),
        ('Flags', {
            'fields': ('is_pinned', 'is_starred', 'tags')
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def total_cost_display(self, obj):
        return f'${obj.total_cost:.6f}'
    total_cost_display.short_description = 'Cost'


@admin.register(AgentMessage)
class AgentMessageAdmin(admin.ModelAdmin):
    """Admin for Agent Message management."""
    
    list_display = [
        'id_short', 'conversation', 'role', 'content_preview',
        'status', 'total_tokens', 'cost', 'created_at'
    ]
    list_filter = ['role', 'status', 'is_edited', 'is_regenerated', 'created_at']
    search_fields = ['content', 'conversation__title']
    readonly_fields = [
        'id', 'sequence_number', 'input_tokens', 'output_tokens', 'total_tokens',
        'response_time_ms', 'first_token_time_ms', 'cost',
        'model_used', 'provider_used', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'conversation', 'role', 'content', 'sequence_number')
        }),
        ('Tool Calls', {
            'fields': ('tool_calls', 'tool_call_id', 'tool_name'),
            'classes': ('collapse',)
        }),
        ('Attachments', {
            'fields': ('attachments',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status', 'error_message')
        }),
        ('Usage', {
            'fields': ('input_tokens', 'output_tokens', 'total_tokens',
                      'response_time_ms', 'first_token_time_ms', 'cost')
        }),
        ('Model Info', {
            'fields': ('model_used', 'provider_used')
        }),
        ('Feedback', {
            'fields': ('thumbs_up', 'feedback_text')
        }),
        ('Edit History', {
            'fields': ('is_edited', 'original_content', 'edited_at',
                      'is_regenerated', 'regeneration_count', 'previous_version'),
            'classes': ('collapse',)
        }),
        ('RAG', {
            'fields': ('rag_context',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


# =============================================================================
# EXECUTION ADMIN
# =============================================================================

@admin.register(AgentExecution)
class AgentExecutionAdmin(admin.ModelAdmin):
    """Admin for Agent Execution logs."""
    
    list_display = [
        'id_short', 'agent', 'execution_type', 'status',
        'model_used', 'total_tokens', 'cost', 'duration_ms', 'created_at'
    ]
    list_filter = ['execution_type', 'status', 'provider', 'agent', 'created_at']
    search_fields = ['model_used', 'error_message']
    readonly_fields = [
        'id', 'conversation', 'message', 'agent', 'execution_type', 'status',
        'provider', 'model_used', 'request_payload', 'response_payload',
        'tool', 'tool_input', 'tool_output',
        'input_tokens', 'output_tokens', 'total_tokens', 'cost',
        'started_at', 'completed_at', 'duration_ms', 'time_to_first_token_ms',
        'error_type', 'error_message', 'error_traceback',
        'retry_count', 'was_rate_limited', 'rate_limit_delay_ms',
        'was_cached', 'cache_key', 'metadata', 'created_at', 'updated_at'
    ]
    date_hierarchy = 'created_at'
    
    def id_short(self, obj):
        return str(obj.id)[:8]
    id_short.short_description = 'ID'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


# =============================================================================
# KNOWLEDGE BASE ADMIN
# =============================================================================

@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    """Admin for Knowledge Base management."""
    
    list_display = [
        'display_name', 'name', 'vector_store_type', 'embedding_model',
        'document_count', 'chunk_count', 'is_active', 'is_indexing'
    ]
    list_filter = ['vector_store_type', 'embedding_model', 'is_active', 'is_indexing']
    search_fields = ['name', 'display_name', 'description']
    readonly_fields = [
        'id', 'document_count', 'chunk_count', 'total_characters',
        'is_indexing', 'last_indexed_at', 'created_at', 'updated_at', 'created_by'
    ]
    inlines = [KnowledgeDocumentInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'display_name', 'description')
        }),
        ('Vector Store', {
            'fields': ('vector_store_type', 'vector_store_config', 'collection_name')
        }),
        ('Embedding', {
            'fields': ('embedding_model', 'embedding_dimension', 'embedding_provider')
        }),
        ('Chunking', {
            'fields': ('chunk_size', 'chunk_overlap', 'chunking_strategy')
        }),
        ('Retrieval', {
            'fields': ('default_top_k', 'default_score_threshold')
        }),
        ('Statistics', {
            'fields': ('document_count', 'chunk_count', 'total_characters')
        }),
        ('Status', {
            'fields': ('is_active', 'is_indexing', 'last_indexed_at')
        }),
        ('Metadata', {
            'fields': ('metadata', 'tags', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    """Admin for Knowledge Document management."""
    
    list_display = [
        'title', 'knowledge_base', 'document_type',
        'indexing_status', 'chunk_count', 'is_active', 'created_at'
    ]
    list_filter = ['knowledge_base', 'document_type', 'indexing_status', 'is_active']
    search_fields = ['title', 'content']
    readonly_fields = [
        'id', 'content_hash', 'chunks', 'chunk_count',
        'indexing_status', 'indexed_at', 'indexing_error',
        'character_count', 'word_count', 'created_at', 'updated_at'
    ]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'knowledge_base', 'title', 'document_type')
        }),
        ('Content', {
            'fields': ('content', 'content_hash', 'source_url', 'source_file')
        }),
        ('Indexing', {
            'fields': ('chunks', 'chunk_count', 'indexing_status', 'indexed_at', 'indexing_error')
        }),
        ('Statistics', {
            'fields': ('character_count', 'word_count')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('metadata', 'tags', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['reindex_documents']
    
    @admin.action(description='Reindex selected documents')
    def reindex_documents(self, request, queryset):
        from .tasks import index_document
        for doc in queryset:
            doc.indexing_status = 'pending'
            doc.save(update_fields=['indexing_status'])
            index_document.delay(str(doc.id))
        self.message_user(request, f'{queryset.count()} documents queued for reindexing.')


# =============================================================================
# PROMPT TEMPLATE ADMIN
# =============================================================================

@admin.register(PromptTemplate)
class PromptTemplateAdmin(admin.ModelAdmin):
    """Admin for Prompt Template management."""
    
    list_display = [
        'display_name', 'name', 'template_type',
        'is_active', 'is_system', 'version'
    ]
    list_filter = ['template_type', 'is_active', 'is_system']
    search_fields = ['name', 'display_name', 'description', 'template']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'display_name', 'description', 'template_type')
        }),
        ('Template', {
            'fields': ('template', 'variables_schema', 'default_values')
        }),
        ('Status', {
            'fields': ('is_active', 'is_system')
        }),
        ('Metadata', {
            'fields': ('version', 'tags', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# =============================================================================
# WORKFLOW ADMIN
# =============================================================================

@admin.register(AgentWorkflow)
class AgentWorkflowAdmin(admin.ModelAdmin):
    """Admin for Agent Workflow management."""
    
    list_display = [
        'display_name', 'name', 'status',
        'agents_count', 'total_executions', 'success_rate'
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['name', 'display_name', 'description']
    readonly_fields = [
        'id', 'total_executions', 'successful_executions', 'failed_executions',
        'created_at', 'updated_at', 'created_by'
    ]
    filter_horizontal = ['agents']
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'name', 'display_name', 'description')
        }),
        ('Graph Definition', {
            'fields': ('graph_definition', 'entry_node', 'nodes', 'edges', 'conditional_edges'),
            'classes': ('collapse',)
        }),
        ('Agents', {
            'fields': ('agents',)
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Statistics', {
            'fields': ('total_executions', 'successful_executions', 'failed_executions')
        }),
        ('Metadata', {
            'fields': ('version', 'tags', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def agents_count(self, obj):
        return obj.agents.count()
    agents_count.short_description = 'Agents'
    
    def success_rate(self, obj):
        if obj.total_executions == 0:
            return '-'
        rate = obj.successful_executions / obj.total_executions * 100
        color = 'green' if rate >= 90 else 'orange' if rate >= 70 else 'red'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, rate
        )
    success_rate.short_description = 'Success Rate'
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
