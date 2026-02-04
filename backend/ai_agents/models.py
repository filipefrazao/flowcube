"""
FlowCube AI Agents Models

This module defines all database models for the AI agents infrastructure:
- LLMProvider: Configuration for different LLM providers
- AgentDefinition: Agent configurations with system prompts and tools
- AgentTool: Custom tools with Pydantic schemas
- AgentConversation: Conversation sessions
- AgentMessage: Individual messages in conversations
- AgentExecution: Execution logs with token usage and costs
- KnowledgeBase: RAG document collections
- KnowledgeDocument: Individual documents for RAG

Author: FRZ Group
"""

import uuid
import hashlib
from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField


User = get_user_model()


class TimeStampedModel(models.Model):
    """Abstract base model with created/updated timestamps."""
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Abstract base model with UUID primary key."""
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    class Meta:
        abstract = True


# =============================================================================
# LLM PROVIDER MODELS
# =============================================================================

class LLMProvider(UUIDModel, TimeStampedModel):
    """
    Configuration for LLM providers (OpenAI, Anthropic, Google, DeepSeek).
    
    Stores API keys, model configurations, and pricing information
    for each supported LLM provider.
    """
    
    class ProviderType(models.TextChoices):
        OPENAI = 'openai', 'OpenAI'
        ANTHROPIC = 'anthropic', 'Anthropic'
        GOOGLE = 'google', 'Google AI'
        DEEPSEEK = 'deepseek', 'DeepSeek'
        GROQ = 'groq', 'Groq'
        TOGETHER = 'together', 'Together AI'
        OLLAMA = 'ollama', 'Ollama (Local)'
        AZURE_OPENAI = 'azure_openai', 'Azure OpenAI'
    
    # Basic Info
    name = models.CharField(
        max_length=100,
        help_text='Display name for this provider configuration'
    )
    provider_type = models.CharField(
        max_length=20,
        choices=ProviderType.choices,
        db_index=True,
        help_text='Type of LLM provider'
    )
    description = models.TextField(
        blank=True,
        help_text='Optional description of this provider configuration'
    )
    
    # API Configuration
    api_key = models.CharField(
        max_length=500,
        help_text='API key for the provider (encrypted in production)'
    )
    api_base_url = models.URLField(
        blank=True,
        null=True,
        help_text='Custom API base URL (for self-hosted or proxy)'
    )
    api_version = models.CharField(
        max_length=50,
        blank=True,
        help_text='API version (mainly for Azure OpenAI)'
    )
    organization_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Organization ID (for OpenAI)'
    )
    
    # Default Model Configuration
    default_model = models.CharField(
        max_length=100,
        help_text='Default model to use (e.g., gpt-4o, claude-3-opus)'
    )
    available_models = ArrayField(
        models.CharField(max_length=100),
        default=list,
        blank=True,
        help_text='List of available models for this provider'
    )
    
    # Default Parameters
    default_temperature = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)],
        help_text='Default temperature for completions'
    )
    default_max_tokens = models.IntegerField(
        default=4096,
        validators=[MinValueValidator(1), MaxValueValidator(200000)],
        help_text='Default maximum tokens for completions'
    )
    default_top_p = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Default top_p for nucleus sampling'
    )
    
    # Rate Limits
    requests_per_minute = models.IntegerField(
        default=60,
        help_text='Rate limit: requests per minute'
    )
    tokens_per_minute = models.IntegerField(
        default=90000,
        help_text='Rate limit: tokens per minute'
    )
    
    # Pricing (per 1M tokens)
    input_cost_per_million = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal('0.0'),
        help_text='Cost per 1M input tokens in USD'
    )
    output_cost_per_million = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal('0.0'),
        help_text='Cost per 1M output tokens in USD'
    )
    
    # Context Window
    context_window = models.IntegerField(
        default=128000,
        help_text='Maximum context window size in tokens'
    )
    
    # Features
    supports_streaming = models.BooleanField(
        default=True,
        help_text='Whether provider supports streaming responses'
    )
    supports_function_calling = models.BooleanField(
        default=True,
        help_text='Whether provider supports function/tool calling'
    )
    supports_vision = models.BooleanField(
        default=False,
        help_text='Whether provider supports vision/image inputs'
    )
    supports_json_mode = models.BooleanField(
        default=True,
        help_text='Whether provider supports JSON mode output'
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text='Whether this provider is active and can be used'
    )
    is_default = models.BooleanField(
        default=False,
        help_text='Whether this is the default provider'
    )
    
    # Ownership
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='llm_providers_created'
    )
    
    # Extra Configuration
    extra_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional provider-specific configuration'
    )
    
    class Meta:
        verbose_name = 'LLM Provider'
        verbose_name_plural = 'LLM Providers'
        ordering = ['-is_default', 'name']
        constraints = [
            models.UniqueConstraint(
                fields=['provider_type', 'name'],
                name='unique_provider_type_name'
            )
        ]
    
    def __str__(self):
        return f'{self.name} ({self.get_provider_type_display()})'
    
    def save(self, *args, **kwargs):
        # Ensure only one default provider
        if self.is_default:
            LLMProvider.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)
    
    def calculate_cost(self, input_tokens: int, output_tokens: int) -> Decimal:
        """Calculate the cost for a given number of tokens."""
        input_cost = (Decimal(input_tokens) / Decimal('1000000')) * self.input_cost_per_million
        output_cost = (Decimal(output_tokens) / Decimal('1000000')) * self.output_cost_per_million
        return input_cost + output_cost
    
    @property
    def masked_api_key(self) -> str:
        """Return masked API key for display."""
        if len(self.api_key) > 8:
            return f'{self.api_key[:4]}...{self.api_key[-4:]}'
        return '****'


class LLMModel(UUIDModel, TimeStampedModel):
    """
    Individual model configuration within a provider.
    
    Allows for model-specific settings and pricing that may differ
    from provider defaults.
    """
    
    provider = models.ForeignKey(
        LLMProvider,
        on_delete=models.CASCADE,
        related_name='models'
    )
    
    # Model Info
    model_id = models.CharField(
        max_length=100,
        help_text='Model identifier (e.g., gpt-4o-2024-08-06)'
    )
    display_name = models.CharField(
        max_length=100,
        help_text='Human-readable model name'
    )
    description = models.TextField(
        blank=True,
        help_text='Model description and capabilities'
    )
    
    # Model Specifications
    context_window = models.IntegerField(
        default=128000,
        help_text='Maximum context window in tokens'
    )
    max_output_tokens = models.IntegerField(
        default=4096,
        help_text='Maximum output tokens'
    )
    
    # Pricing (per 1M tokens) - overrides provider defaults
    input_cost_per_million = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal('0.0')
    )
    output_cost_per_million = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal('0.0')
    )
    
    # Capabilities
    supports_streaming = models.BooleanField(default=True)
    supports_function_calling = models.BooleanField(default=True)
    supports_vision = models.BooleanField(default=False)
    supports_json_mode = models.BooleanField(default=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_default = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'LLM Model'
        verbose_name_plural = 'LLM Models'
        ordering = ['provider', 'display_name']
        unique_together = ['provider', 'model_id']
    
    def __str__(self):
        return f'{self.display_name} ({self.provider.name})'


# =============================================================================
# AGENT TOOL MODELS
# =============================================================================

class AgentTool(UUIDModel, TimeStampedModel):
    """
    Custom tool definition for AI agents.
    
    Tools can be HTTP requests, database queries, or custom Python functions.
    Each tool has a Pydantic-compatible JSON schema for parameters.
    """
    
    class ToolType(models.TextChoices):
        HTTP_REQUEST = 'http_request', 'HTTP Request'
        DATABASE_QUERY = 'database_query', 'Database Query'
        PYTHON_FUNCTION = 'python_function', 'Python Function'
        SALESCUBE_API = 'salescube_api', 'SalesCube API'
        WHATSAPP = 'whatsapp', 'WhatsApp Message'
        TELEGRAM = 'telegram', 'Telegram Message'
        EMAIL = 'email', 'Email'
        WEBHOOK = 'webhook', 'Webhook'
        RAG_SEARCH = 'rag_search', 'RAG Search'
        CODE_EXECUTION = 'code_execution', 'Code Execution'
    
    # Basic Info
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique tool identifier (snake_case recommended)'
    )
    display_name = models.CharField(
        max_length=200,
        help_text='Human-readable tool name'
    )
    description = models.TextField(
        help_text='Description of what this tool does (shown to LLM)'
    )
    
    # Tool Configuration
    tool_type = models.CharField(
        max_length=20,
        choices=ToolType.choices,
        db_index=True
    )
    
    # Parameter Schema (JSON Schema / Pydantic compatible)
    parameters_schema = models.JSONField(
        default=dict,
        help_text='JSON Schema for tool parameters'
    )
    
    # Return Schema
    return_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text='Expected return value schema'
    )
    
    # HTTP Request Configuration
    http_method = models.CharField(
        max_length=10,
        blank=True,
        choices=[
            ('GET', 'GET'),
            ('POST', 'POST'),
            ('PUT', 'PUT'),
            ('PATCH', 'PATCH'),
            ('DELETE', 'DELETE'),
        ]
    )
    http_url = models.CharField(
        max_length=1000,
        blank=True,
        help_text='URL template with {parameter} placeholders'
    )
    http_headers = models.JSONField(
        default=dict,
        blank=True,
        help_text='HTTP headers template'
    )
    http_body_template = models.TextField(
        blank=True,
        help_text='Request body template (Jinja2 supported)'
    )
    
    # Database Query Configuration
    database_connection = models.CharField(
        max_length=100,
        blank=True,
        help_text='Database connection alias'
    )
    query_template = models.TextField(
        blank=True,
        help_text='SQL query template with {parameter} placeholders'
    )
    
    # Python Function Configuration
    python_module = models.CharField(
        max_length=200,
        blank=True,
        help_text='Python module path'
    )
    python_function = models.CharField(
        max_length=100,
        blank=True,
        help_text='Function name in the module'
    )
    python_code = models.TextField(
        blank=True,
        help_text='Inline Python code (for simple tools)'
    )
    
    # Execution Configuration
    timeout_seconds = models.IntegerField(
        default=30,
        validators=[MinValueValidator(1), MaxValueValidator(300)],
        help_text='Maximum execution time in seconds'
    )
    retry_count = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        help_text='Number of retries on failure'
    )
    retry_delay_seconds = models.IntegerField(
        default=1,
        help_text='Delay between retries in seconds'
    )
    
    # Caching
    cache_enabled = models.BooleanField(
        default=False,
        help_text='Whether to cache tool results'
    )
    cache_ttl_seconds = models.IntegerField(
        default=300,
        help_text='Cache TTL in seconds'
    )
    
    # Rate Limiting
    rate_limit_enabled = models.BooleanField(
        default=False,
        help_text='Whether to apply rate limiting'
    )
    rate_limit_calls = models.IntegerField(
        default=60,
        help_text='Maximum calls per minute'
    )
    
    # Security
    requires_confirmation = models.BooleanField(
        default=False,
        help_text='Whether tool execution requires user confirmation'
    )
    allowed_roles = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
        help_text='Roles allowed to use this tool'
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_system = models.BooleanField(
        default=False,
        help_text='Whether this is a system tool (cannot be deleted)'
    )
    
    # Metadata
    version = models.CharField(max_length=20, default='1.0.0')
    author = models.CharField(max_length=100, blank=True)
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    
    # Usage Statistics
    total_executions = models.BigIntegerField(default=0)
    successful_executions = models.BigIntegerField(default=0)
    failed_executions = models.BigIntegerField(default=0)
    average_execution_time = models.FloatField(default=0.0)
    last_executed_at = models.DateTimeField(null=True, blank=True)
    
    # Extra Configuration
    extra_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional tool-specific configuration'
    )
    
    class Meta:
        verbose_name = 'Agent Tool'
        verbose_name_plural = 'Agent Tools'
        ordering = ['name']
    
    def __str__(self):
        return f'{self.display_name} ({self.tool_type})'
    
    def get_langchain_tool_schema(self) -> dict:
        """Return tool schema in LangChain format."""
        return {
            'name': self.name,
            'description': self.description,
            'parameters': self.parameters_schema,
        }
    
    def record_execution(self, success: bool, execution_time: float):
        """Record execution statistics."""
        self.total_executions += 1
        if success:
            self.successful_executions += 1
        else:
            self.failed_executions += 1
        
        # Update average execution time
        if self.average_execution_time == 0:
            self.average_execution_time = execution_time
        else:
            self.average_execution_time = (
                (self.average_execution_time * (self.total_executions - 1) + execution_time)
                / self.total_executions
            )
        
        self.last_executed_at = timezone.now()
        self.save(update_fields=[
            'total_executions', 'successful_executions', 'failed_executions',
            'average_execution_time', 'last_executed_at'
        ])


# =============================================================================
# AGENT DEFINITION MODELS
# =============================================================================

class AgentDefinition(UUIDModel, TimeStampedModel):
    """
    AI Agent definition with configuration, system prompt, and tools.
    
    An agent is a configured AI assistant with specific capabilities,
    personality, and access to tools.
    """
    
    class AgentType(models.TextChoices):
        ASSISTANT = 'assistant', 'General Assistant'
        SALES = 'sales', 'Sales Agent'
        SUPPORT = 'support', 'Support Agent'
        ANALYST = 'analyst', 'Data Analyst'
        DEVELOPER = 'developer', 'Developer Assistant'
        RESEARCHER = 'researcher', 'Research Agent'
        WORKFLOW = 'workflow', 'Workflow Agent'
        CUSTOM = 'custom', 'Custom Agent'
    
    class MemoryType(models.TextChoices):
        NONE = 'none', 'No Memory'
        BUFFER = 'buffer', 'Buffer Memory'
        SUMMARY = 'summary', 'Summary Memory'
        VECTOR = 'vector', 'Vector Memory'
        HYBRID = 'hybrid', 'Hybrid Memory'
    
    # Basic Info
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique agent identifier'
    )
    display_name = models.CharField(
        max_length=200,
        help_text='Human-readable agent name'
    )
    description = models.TextField(
        blank=True,
        help_text='Agent description'
    )
    avatar_url = models.URLField(
        blank=True,
        null=True,
        help_text='Avatar image URL'
    )
    
    # Agent Type
    agent_type = models.CharField(
        max_length=20,
        choices=AgentType.choices,
        default=AgentType.ASSISTANT,
        db_index=True
    )
    
    # LLM Configuration
    llm_provider = models.ForeignKey(
        LLMProvider,
        on_delete=models.PROTECT,
        related_name='agents',
        help_text='Primary LLM provider for this agent'
    )
    llm_model = models.CharField(
        max_length=100,
        blank=True,
        help_text='Specific model to use (overrides provider default)'
    )
    fallback_provider = models.ForeignKey(
        LLMProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='fallback_agents',
        help_text='Fallback provider if primary fails'
    )
    
    # Model Parameters
    temperature = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(2.0)]
    )
    max_tokens = models.IntegerField(
        default=4096,
        validators=[MinValueValidator(1), MaxValueValidator(200000)]
    )
    top_p = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    frequency_penalty = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(-2.0), MaxValueValidator(2.0)]
    )
    presence_penalty = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(-2.0), MaxValueValidator(2.0)]
    )
    
    # System Prompt
    system_prompt = models.TextField(
        help_text='System prompt that defines agent behavior'
    )
    system_prompt_template = models.TextField(
        blank=True,
        help_text='Jinja2 template for dynamic system prompts'
    )
    
    # Prompt Enhancements
    persona_description = models.TextField(
        blank=True,
        help_text='Detailed persona/character description'
    )
    output_format_instructions = models.TextField(
        blank=True,
        help_text='Instructions for output formatting'
    )
    examples = models.JSONField(
        default=list,
        blank=True,
        help_text='Few-shot examples for the agent'
    )
    
    # Tools Configuration
    tools = models.ManyToManyField(
        AgentTool,
        blank=True,
        related_name='agents',
        help_text='Tools available to this agent'
    )
    tool_choice = models.CharField(
        max_length=20,
        default='auto',
        choices=[
            ('auto', 'Auto'),
            ('required', 'Required'),
            ('none', 'None'),
        ],
        help_text='How the agent should use tools'
    )
    parallel_tool_calls = models.BooleanField(
        default=True,
        help_text='Whether to allow parallel tool calls'
    )
    max_tool_iterations = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        help_text='Maximum tool call iterations per turn'
    )
    
    # Memory Configuration
    memory_type = models.CharField(
        max_length=20,
        choices=MemoryType.choices,
        default=MemoryType.BUFFER
    )
    memory_window = models.IntegerField(
        default=20,
        help_text='Number of messages to keep in memory'
    )
    memory_token_limit = models.IntegerField(
        default=8000,
        help_text='Maximum tokens to use for memory'
    )
    
    # RAG Configuration
    knowledge_bases = models.ManyToManyField(
        'KnowledgeBase',
        blank=True,
        related_name='agents',
        help_text='Knowledge bases for RAG'
    )
    rag_enabled = models.BooleanField(
        default=False,
        help_text='Whether to use RAG for this agent'
    )
    rag_top_k = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(50)],
        help_text='Number of documents to retrieve'
    )
    rag_score_threshold = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Minimum similarity score for retrieval'
    )
    
    # Response Configuration
    streaming_enabled = models.BooleanField(
        default=True,
        help_text='Whether to stream responses'
    )
    json_mode = models.BooleanField(
        default=False,
        help_text='Whether to force JSON output'
    )
    json_schema = models.JSONField(
        default=dict,
        blank=True,
        help_text='JSON schema for structured output'
    )
    
    # Safety & Moderation
    content_filter_enabled = models.BooleanField(
        default=True,
        help_text='Whether to filter unsafe content'
    )
    max_conversation_turns = models.IntegerField(
        default=100,
        help_text='Maximum turns in a conversation'
    )
    
    # Permissions
    is_public = models.BooleanField(
        default=False,
        help_text='Whether agent is publicly accessible'
    )
    allowed_users = models.ManyToManyField(
        User,
        blank=True,
        related_name='allowed_agents',
        help_text='Users allowed to use this agent'
    )
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_system = models.BooleanField(
        default=False,
        help_text='Whether this is a system agent'
    )
    
    # Metadata
    version = models.CharField(max_length=20, default='1.0.0')
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    
    # Usage Statistics
    total_conversations = models.BigIntegerField(default=0)
    total_messages = models.BigIntegerField(default=0)
    total_tokens_used = models.BigIntegerField(default=0)
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        default=Decimal('0.0')
    )
    average_response_time = models.FloatField(default=0.0)
    
    # Ownership
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agents_created'
    )
    
    # Extra Configuration
    extra_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional agent-specific configuration'
    )
    
    class Meta:
        verbose_name = 'Agent Definition'
        verbose_name_plural = 'Agent Definitions'
        ordering = ['name']
    
    def __str__(self):
        return f'{self.display_name} ({self.agent_type})'
    
    def get_full_system_prompt(self, context: dict = None) -> str:
        """Generate full system prompt with optional context."""
        prompt_parts = [self.system_prompt]
        
        if self.persona_description:
            prompt_parts.append(f"\n\nPersona:\n{self.persona_description}")
        
        if self.output_format_instructions:
            prompt_parts.append(f"\n\nOutput Format:\n{self.output_format_instructions}")
        
        return '\n'.join(prompt_parts)
    
    def increment_stats(self, tokens: int, cost: Decimal, response_time: float):
        """Update usage statistics."""
        self.total_messages += 1
        self.total_tokens_used += tokens
        self.total_cost += cost
        
        # Update average response time
        if self.average_response_time == 0:
            self.average_response_time = response_time
        else:
            self.average_response_time = (
                (self.average_response_time * (self.total_messages - 1) + response_time)
                / self.total_messages
            )
        
        self.save(update_fields=[
            'total_messages', 'total_tokens_used', 'total_cost', 'average_response_time'
        ])


# =============================================================================
# CONVERSATION MODELS
# =============================================================================

class AgentConversation(UUIDModel, TimeStampedModel):
    """
    Conversation session with an AI agent.
    
    Tracks the full conversation history, metadata, and execution details.
    """
    
    class ConversationStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        COMPLETED = 'completed', 'Completed'
        ARCHIVED = 'archived', 'Archived'
        ERROR = 'error', 'Error'
    
    # Basic Info
    title = models.CharField(
        max_length=200,
        blank=True,
        help_text='Conversation title (auto-generated if blank)'
    )
    summary = models.TextField(
        blank=True,
        help_text='AI-generated conversation summary'
    )
    
    # Relationships
    agent = models.ForeignKey(
        AgentDefinition,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='agent_conversations'
    )
    
    # Parent Conversation (for branching)
    parent_conversation = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='branches'
    )
    branched_from_message = models.ForeignKey(
        'AgentMessage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='branched_conversations'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.ACTIVE,
        db_index=True
    )
    
    # Context Variables
    context_variables = models.JSONField(
        default=dict,
        blank=True,
        help_text='Variables available in system prompt templates'
    )
    
    # Memory State
    memory_state = models.JSONField(
        default=dict,
        blank=True,
        help_text='Current memory state for the conversation'
    )
    memory_summary = models.TextField(
        blank=True,
        help_text='Summary of older messages for memory compression'
    )
    
    # Statistics
    message_count = models.IntegerField(default=0)
    total_input_tokens = models.BigIntegerField(default=0)
    total_output_tokens = models.BigIntegerField(default=0)
    total_cost = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=Decimal('0.0')
    )
    
    # Timestamps
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    # Feedback
    rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='User rating (1-5)'
    )
    feedback = models.TextField(
        blank=True,
        help_text='User feedback text'
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional conversation metadata'
    )
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    
    # Pinned/Starred
    is_pinned = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = 'Agent Conversation'
        verbose_name_plural = 'Agent Conversations'
        ordering = ['-last_message_at', '-created_at']
        indexes = [
            models.Index(fields=['user', 'agent', 'status']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f'{self.title or "Untitled"} ({self.agent.display_name})'
    
    def save(self, *args, **kwargs):
        if not self.title:
            self.title = f'Conversation with {self.agent.display_name}'
        super().save(*args, **kwargs)
    
    def update_stats(self, input_tokens: int, output_tokens: int, cost: Decimal):
        """Update conversation statistics."""
        self.message_count += 1
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_cost += cost
        self.last_message_at = timezone.now()
        self.save(update_fields=[
            'message_count', 'total_input_tokens', 'total_output_tokens',
            'total_cost', 'last_message_at'
        ])


class AgentMessage(UUIDModel, TimeStampedModel):
    """
    Individual message in an agent conversation.
    
    Supports different roles (user, assistant, system, tool) and
    tracks tool calls and execution details.
    """
    
    class MessageRole(models.TextChoices):
        SYSTEM = 'system', 'System'
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        TOOL = 'tool', 'Tool'
        FUNCTION = 'function', 'Function'  # Legacy support
    
    class MessageStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        STREAMING = 'streaming', 'Streaming'
        COMPLETED = 'completed', 'Completed'
        ERROR = 'error', 'Error'
        CANCELLED = 'cancelled', 'Cancelled'
    
    # Relationships
    conversation = models.ForeignKey(
        AgentConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Message Content
    role = models.CharField(
        max_length=20,
        choices=MessageRole.choices,
        db_index=True
    )
    content = models.TextField(
        blank=True,
        help_text='Message content (can be empty for tool calls)'
    )
    
    # Tool Calls (for assistant messages)
    tool_calls = models.JSONField(
        default=list,
        blank=True,
        help_text='List of tool calls made by assistant'
    )
    
    # Tool Response (for tool messages)
    tool_call_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='ID of the tool call this message responds to'
    )
    tool_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Name of the tool that was called'
    )
    
    # Attachments & Media
    attachments = models.JSONField(
        default=list,
        blank=True,
        help_text='List of attachments (images, files, etc.)'
    )
    
    # Message Sequence
    sequence_number = models.IntegerField(
        default=0,
        db_index=True,
        help_text='Order of message in conversation'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=MessageStatus.choices,
        default=MessageStatus.COMPLETED
    )
    error_message = models.TextField(blank=True)
    
    # Token Usage
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    
    # Timing
    response_time_ms = models.IntegerField(
        default=0,
        help_text='Response time in milliseconds'
    )
    first_token_time_ms = models.IntegerField(
        default=0,
        help_text='Time to first token in milliseconds'
    )
    
    # Cost
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        default=Decimal('0.0')
    )
    
    # Model Information
    model_used = models.CharField(
        max_length=100,
        blank=True,
        help_text='Actual model used for this message'
    )
    provider_used = models.CharField(
        max_length=50,
        blank=True,
        help_text='Provider used for this message'
    )
    
    # Feedback
    thumbs_up = models.BooleanField(null=True, blank=True)
    feedback_text = models.TextField(blank=True)
    
    # Edit History
    is_edited = models.BooleanField(default=False)
    original_content = models.TextField(blank=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    # Regeneration
    is_regenerated = models.BooleanField(default=False)
    regeneration_count = models.IntegerField(default=0)
    previous_version = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='regenerated_versions'
    )
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional message metadata'
    )
    
    # RAG Context
    rag_context = models.JSONField(
        default=list,
        blank=True,
        help_text='Retrieved documents used for context'
    )
    
    class Meta:
        verbose_name = 'Agent Message'
        verbose_name_plural = 'Agent Messages'
        ordering = ['conversation', 'sequence_number']
        indexes = [
            models.Index(fields=['conversation', 'sequence_number']),
            models.Index(fields=['conversation', 'role']),
        ]
    
    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f'{self.role}: {preview}'
    
    def save(self, *args, **kwargs):
        if not self.sequence_number:
            # Auto-increment sequence number
            last_msg = AgentMessage.objects.filter(
                conversation=self.conversation
            ).order_by('-sequence_number').first()
            self.sequence_number = (last_msg.sequence_number + 1) if last_msg else 1
        
        self.total_tokens = self.input_tokens + self.output_tokens
        super().save(*args, **kwargs)


# =============================================================================
# EXECUTION MODELS
# =============================================================================

class AgentExecution(UUIDModel, TimeStampedModel):
    """
    Detailed execution log for agent interactions.
    
    Tracks the full execution lifecycle including LLM calls,
    tool executions, and error handling.
    """
    
    class ExecutionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RUNNING = 'running', 'Running'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'
        TIMEOUT = 'timeout', 'Timeout'
    
    class ExecutionType(models.TextChoices):
        CHAT = 'chat', 'Chat Message'
        TOOL_CALL = 'tool_call', 'Tool Call'
        RAG_RETRIEVAL = 'rag_retrieval', 'RAG Retrieval'
        MEMORY_OPERATION = 'memory_operation', 'Memory Operation'
        WORKFLOW_STEP = 'workflow_step', 'Workflow Step'
    
    # Relationships
    conversation = models.ForeignKey(
        AgentConversation,
        on_delete=models.CASCADE,
        related_name='executions'
    )
    message = models.ForeignKey(
        AgentMessage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='executions'
    )
    agent = models.ForeignKey(
        AgentDefinition,
        on_delete=models.CASCADE,
        related_name='executions'
    )
    
    # Execution Info
    execution_type = models.CharField(
        max_length=20,
        choices=ExecutionType.choices,
        default=ExecutionType.CHAT
    )
    status = models.CharField(
        max_length=20,
        choices=ExecutionStatus.choices,
        default=ExecutionStatus.PENDING,
        db_index=True
    )
    
    # LLM Provider Info
    provider = models.ForeignKey(
        LLMProvider,
        on_delete=models.SET_NULL,
        null=True,
        related_name='executions'
    )
    model_used = models.CharField(max_length=100)
    
    # Request/Response
    request_payload = models.JSONField(
        default=dict,
        help_text='Full request payload sent to LLM'
    )
    response_payload = models.JSONField(
        default=dict,
        blank=True,
        help_text='Full response from LLM'
    )
    
    # Tool Execution Details
    tool = models.ForeignKey(
        AgentTool,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='executions'
    )
    tool_input = models.JSONField(
        default=dict,
        blank=True,
        help_text='Input parameters for tool execution'
    )
    tool_output = models.JSONField(
        default=dict,
        blank=True,
        help_text='Output from tool execution'
    )
    
    # Token Usage
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    total_tokens = models.IntegerField(default=0)
    
    # Cost
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        default=Decimal('0.0')
    )
    
    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_ms = models.IntegerField(default=0)
    time_to_first_token_ms = models.IntegerField(default=0)
    
    # Error Handling
    error_type = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)
    error_traceback = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    # Rate Limiting
    was_rate_limited = models.BooleanField(default=False)
    rate_limit_delay_ms = models.IntegerField(default=0)
    
    # Cache
    was_cached = models.BooleanField(default=False)
    cache_key = models.CharField(max_length=255, blank=True)
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Agent Execution'
        verbose_name_plural = 'Agent Executions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
            models.Index(fields=['agent', 'status', '-created_at']),
            models.Index(fields=['provider', '-created_at']),
        ]
    
    def __str__(self):
        return f'{self.execution_type} - {self.status} ({self.model_used})'
    
    def save(self, *args, **kwargs):
        self.total_tokens = self.input_tokens + self.output_tokens
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            self.duration_ms = int(delta.total_seconds() * 1000)
        super().save(*args, **kwargs)


# =============================================================================
# KNOWLEDGE BASE MODELS (RAG)
# =============================================================================

class KnowledgeBase(UUIDModel, TimeStampedModel):
    """
    Collection of documents for RAG (Retrieval Augmented Generation).
    
    Supports different vector stores and embedding models.
    """
    
    class VectorStoreType(models.TextChoices):
        QDRANT = 'qdrant', 'Qdrant'
        PINECONE = 'pinecone', 'Pinecone'
        WEAVIATE = 'weaviate', 'Weaviate'
        CHROMA = 'chroma', 'Chroma'
        PGVECTOR = 'pgvector', 'PGVector'
        FAISS = 'faiss', 'FAISS (Local)'
    
    class EmbeddingModel(models.TextChoices):
        OPENAI_ADA = 'text-embedding-ada-002', 'OpenAI Ada 002'
        OPENAI_3_SMALL = 'text-embedding-3-small', 'OpenAI 3 Small'
        OPENAI_3_LARGE = 'text-embedding-3-large', 'OpenAI 3 Large'
        COHERE = 'cohere', 'Cohere'
        SENTENCE_TRANSFORMERS = 'sentence-transformers', 'Sentence Transformers'
    
    # Basic Info
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Unique knowledge base identifier'
    )
    display_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Vector Store Configuration
    vector_store_type = models.CharField(
        max_length=20,
        choices=VectorStoreType.choices,
        default=VectorStoreType.QDRANT
    )
    vector_store_config = models.JSONField(
        default=dict,
        help_text='Vector store connection configuration'
    )
    collection_name = models.CharField(
        max_length=100,
        help_text='Collection/index name in vector store'
    )
    
    # Embedding Configuration
    embedding_model = models.CharField(
        max_length=50,
        choices=EmbeddingModel.choices,
        default=EmbeddingModel.OPENAI_3_SMALL
    )
    embedding_dimension = models.IntegerField(
        default=1536,
        help_text='Embedding vector dimension'
    )
    embedding_provider = models.ForeignKey(
        LLMProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='knowledge_bases',
        help_text='Provider for embedding model (if applicable)'
    )
    
    # Chunking Configuration
    chunk_size = models.IntegerField(
        default=1000,
        help_text='Maximum chunk size in characters'
    )
    chunk_overlap = models.IntegerField(
        default=200,
        help_text='Overlap between chunks in characters'
    )
    chunking_strategy = models.CharField(
        max_length=50,
        default='recursive',
        choices=[
            ('recursive', 'Recursive Text Splitter'),
            ('character', 'Character Splitter'),
            ('token', 'Token Splitter'),
            ('semantic', 'Semantic Splitter'),
        ]
    )
    
    # Retrieval Configuration
    default_top_k = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(50)]
    )
    default_score_threshold = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )
    
    # Statistics
    document_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)
    total_characters = models.BigIntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_indexing = models.BooleanField(default=False)
    last_indexed_at = models.DateTimeField(null=True, blank=True)
    
    # Ownership
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='knowledge_bases_created'
    )
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Knowledge Base'
        verbose_name_plural = 'Knowledge Bases'
        ordering = ['name']
    
    def __str__(self):
        return self.display_name


class KnowledgeDocument(UUIDModel, TimeStampedModel):
    """
    Individual document in a knowledge base.
    
    Tracks document content, metadata, and indexing status.
    """
    
    class DocumentType(models.TextChoices):
        TEXT = 'text', 'Plain Text'
        MARKDOWN = 'markdown', 'Markdown'
        HTML = 'html', 'HTML'
        PDF = 'pdf', 'PDF'
        DOCX = 'docx', 'Word Document'
        CSV = 'csv', 'CSV'
        JSON = 'json', 'JSON'
        URL = 'url', 'Web URL'
    
    class IndexingStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        INDEXED = 'indexed', 'Indexed'
        FAILED = 'failed', 'Failed'
        OUTDATED = 'outdated', 'Outdated'
    
    # Relationships
    knowledge_base = models.ForeignKey(
        KnowledgeBase,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    # Document Info
    title = models.CharField(max_length=500)
    document_type = models.CharField(
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.TEXT
    )
    
    # Content
    content = models.TextField(
        help_text='Raw document content'
    )
    content_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text='SHA-256 hash of content for change detection'
    )
    
    # Source
    source_url = models.URLField(blank=True, null=True)
    source_file = models.FileField(
        upload_to='knowledge_documents/',
        blank=True,
        null=True
    )
    
    # Chunking Results
    chunks = models.JSONField(
        default=list,
        blank=True,
        help_text='List of chunk data with vector IDs'
    )
    chunk_count = models.IntegerField(default=0)
    
    # Indexing
    indexing_status = models.CharField(
        max_length=20,
        choices=IndexingStatus.choices,
        default=IndexingStatus.PENDING,
        db_index=True
    )
    indexed_at = models.DateTimeField(null=True, blank=True)
    indexing_error = models.TextField(blank=True)
    
    # Statistics
    character_count = models.IntegerField(default=0)
    word_count = models.IntegerField(default=0)
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Document metadata (author, date, category, etc.)'
    )
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Knowledge Document'
        verbose_name_plural = 'Knowledge Documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['knowledge_base', 'indexing_status']),
        ]
    
    def __str__(self):
        return f'{self.title} ({self.knowledge_base.name})'
    
    def save(self, *args, **kwargs):
        # Calculate content hash
        self.content_hash = hashlib.sha256(self.content.encode()).hexdigest()
        
        # Update statistics
        self.character_count = len(self.content)
        self.word_count = len(self.content.split())
        
        super().save(*args, **kwargs)
    
    def needs_reindexing(self) -> bool:
        """Check if document content has changed and needs reindexing."""
        current_hash = hashlib.sha256(self.content.encode()).hexdigest()
        return current_hash != self.content_hash


# =============================================================================
# PROMPT TEMPLATE MODELS
# =============================================================================

class PromptTemplate(UUIDModel, TimeStampedModel):
    """
    Reusable prompt templates with variable substitution.
    """
    
    class TemplateType(models.TextChoices):
        SYSTEM = 'system', 'System Prompt'
        USER = 'user', 'User Prompt'
        ASSISTANT = 'assistant', 'Assistant Prompt'
        RAG_CONTEXT = 'rag_context', 'RAG Context'
        TOOL_RESULT = 'tool_result', 'Tool Result'
        SUMMARY = 'summary', 'Summary'
    
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    template_type = models.CharField(
        max_length=20,
        choices=TemplateType.choices
    )
    
    # Template Content (Jinja2)
    template = models.TextField(
        help_text='Jinja2 template with {{ variable }} placeholders'
    )
    
    # Variable Schema
    variables_schema = models.JSONField(
        default=dict,
        help_text='JSON Schema for template variables'
    )
    
    # Default Values
    default_values = models.JSONField(
        default=dict,
        blank=True,
        help_text='Default values for variables'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)
    
    # Metadata
    version = models.CharField(max_length=20, default='1.0.0')
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Prompt Template'
        verbose_name_plural = 'Prompt Templates'
        ordering = ['name']
    
    def __str__(self):
        return self.display_name


# =============================================================================
# AGENT WORKFLOW MODELS (LangGraph)
# =============================================================================

class AgentWorkflow(UUIDModel, TimeStampedModel):
    """
    LangGraph workflow definition for complex agent interactions.
    """
    
    class WorkflowStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        PAUSED = 'paused', 'Paused'
        ARCHIVED = 'archived', 'Archived'
    
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Workflow Definition
    graph_definition = models.JSONField(
        default=dict,
        help_text='LangGraph workflow definition'
    )
    
    # Entry Point
    entry_node = models.CharField(
        max_length=100,
        help_text='Entry node name'
    )
    
    # Nodes Configuration
    nodes = models.JSONField(
        default=list,
        help_text='List of node configurations'
    )
    
    # Edges Configuration
    edges = models.JSONField(
        default=list,
        help_text='List of edge configurations'
    )
    
    # Conditional Edges
    conditional_edges = models.JSONField(
        default=list,
        help_text='List of conditional edge configurations'
    )
    
    # Agents in Workflow
    agents = models.ManyToManyField(
        AgentDefinition,
        blank=True,
        related_name='workflows'
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.DRAFT
    )
    
    # Statistics
    total_executions = models.BigIntegerField(default=0)
    successful_executions = models.BigIntegerField(default=0)
    failed_executions = models.BigIntegerField(default=0)
    
    # Ownership
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflows_created'
    )
    
    # Metadata
    version = models.CharField(max_length=20, default='1.0.0')
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True
    )
    
    class Meta:
        verbose_name = 'Agent Workflow'
        verbose_name_plural = 'Agent Workflows'
        ordering = ['name']
    
    def __str__(self):
        return self.display_name
