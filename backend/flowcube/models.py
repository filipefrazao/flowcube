import uuid
import json
from django.conf import settings
from django.db import models
from django.utils import timezone
from typing import Optional
import logging
from cryptography.fernet import Fernet
import base64
import os

# Setup logger
logger = logging.getLogger('flowcube.execution')

# Get or generate encryption key
CREDENTIAL_ENCRYPTION_KEY = getattr(
    settings,
    'CREDENTIAL_ENCRYPTION_KEY',
    os.environ.get('CREDENTIAL_ENCRYPTION_KEY', Fernet.generate_key().decode())
)


class UserPreference(models.Model):
    """User preferences for FlowCube"""

    THEME_CHOICES = [
        ('dark', 'Dark'),
        ('light', 'Light'),
        ('system', 'System'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="preference")

    # UI Preferences
    theme = models.CharField(max_length=50, choices=THEME_CHOICES, default='dark')
    sidebar_collapsed = models.BooleanField(default=False)
    default_zoom = models.FloatField(default=1.0)
    show_minimap = models.BooleanField(default=True)
    show_node_stats = models.BooleanField(default=True)

    # Notification Preferences
    email_notifications = models.BooleanField(default=True)
    execution_failure_alerts = models.BooleanField(default=True)
    weekly_digest = models.BooleanField(default=False)

    # Editor Preferences
    auto_save = models.BooleanField(default=True)
    auto_save_interval_seconds = models.PositiveIntegerField(default=30)
    snap_to_grid = models.BooleanField(default=True)
    grid_size = models.PositiveIntegerField(default=20)

    def __str__(self):
        return f"Preferences for {self.user}"


class Credential(models.Model):
    """Encrypted credentials for workflow integrations"""

    CREDENTIAL_TYPE_CHOICES = [
        ('evolution_api', 'Evolution API'),
        ('salescube', 'SalesCube'),
        ('openai', 'OpenAI'),
        ('anthropic', 'Anthropic (Claude)'),
        ('meta_ads', 'Meta Ads'),
        ('google_sheets', 'Google Sheets'),
        ('google_drive', 'Google Drive'),
        ('notion', 'Notion'),
        ('slack', 'Slack'),
        ('discord', 'Discord'),
        ('webhook', 'Webhook'),
        ('smtp', 'SMTP Email'),
        ('postgresql', 'PostgreSQL'),
        ('mysql', 'MySQL'),
        ('mongodb', 'MongoDB'),
        ('redis', 'Redis'),
        ('custom', 'Custom'),
        ('groq', 'Groq'),
        ('deepseek', 'DeepSeek'),
        ('grok', 'Grok (X.AI)'),
        ('google_ai', 'Google AI (Gemini)'),
        ('n8n', 'N8N'),
        ('whatsapp_cloud', 'WhatsApp Cloud API'),
        ('meta_lead_ads', 'Meta Lead Ads'),
        ('supabase', 'Supabase'),
        ('make', 'Make (Integromat)'),
        ('google_ads', 'Google Ads'),
        ('openrouter', 'OpenRouter'),
        ('elevenlabs', 'ElevenLabs'),
        ('mistral', 'Mistral'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='credentials'
    )
    name = models.CharField(max_length=255)
    credential_type = models.CharField(max_length=50, choices=CREDENTIAL_TYPE_CHOICES)
    description = models.TextField(blank=True)
    encrypted_data = models.BinaryField()
    base_url = models.URLField(blank=True, max_length=500)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ['owner', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_credential_type_display()})"

    @property
    def data(self) -> dict:
        """Decrypt and return credential data"""
        if not self.encrypted_data:
            return {}
        try:
            fernet = Fernet(CREDENTIAL_ENCRYPTION_KEY.encode() if isinstance(CREDENTIAL_ENCRYPTION_KEY, str) else CREDENTIAL_ENCRYPTION_KEY)
            token = self.encrypted_data
            if isinstance(token, memoryview):
                token = token.tobytes()
            decrypted = fernet.decrypt(token)
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"Failed to decrypt credential {self.id}: {e}")
            return {}

    @data.setter
    def data(self, value: dict):
        """Encrypt and store credential data"""
        if not value:
            self.encrypted_data = b''
            return
        try:
            fernet = Fernet(CREDENTIAL_ENCRYPTION_KEY.encode() if isinstance(CREDENTIAL_ENCRYPTION_KEY, str) else CREDENTIAL_ENCRYPTION_KEY)
            json_data = json.dumps(value).encode()
            self.encrypted_data = fernet.encrypt(json_data)
        except Exception as e:
            logger.error(f"Failed to encrypt credential data: {e}")
            raise

    def get_masked_preview(self) -> dict:
        """Return credential data with sensitive values masked"""
        data = self.data
        masked = {}
        for key, value in data.items():
            if isinstance(value, str) and len(value) > 4:
                masked[key] = value[:2] + '*' * (len(value) - 4) + value[-2:]
            elif isinstance(value, str):
                masked[key] = '****'
            else:
                masked[key] = value
        return masked

    def mark_used(self):
        """Mark this credential as recently used"""
        self.last_used_at = timezone.now()
        self.save(update_fields=['last_used_at'])


class FlowExecutionLog(models.Model):
    """Log for workflow executions"""
    
    class ExecutionStatus:
        STARTED = 'STARTED'
        COMPLETED = 'COMPLETED'
        FAILED = 'FAILED'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        'workflows.Workflow', 
        on_delete=models.CASCADE,
        related_name='execution_logs'
    )
    executor = models.CharField(max_length=255)
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=50,
        choices=[
            (ExecutionStatus.STARTED, 'Started'),
            (ExecutionStatus.COMPLETED, 'Completed'),
            (ExecutionStatus.FAILED, 'Failed')
        ],
        default=ExecutionStatus.STARTED
    )
    input_data = models.JSONField(null=True, blank=True)
    output_data = models.JSONField(null=True, blank=True)
    error_details = models.TextField(null=True, blank=True)
    execution_time = models.DurationField(blank=True, null=True)

    def __str__(self):
        return f"Execution Log for Workflow {self.workflow.id} - {self.status}"

    class Meta:
        ordering = ['-start_time']
        verbose_name_plural = "Flow Execution Logs"


def setup_logging() -> None:
    """Setup logging configuration"""
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    file_handler = logging.FileHandler('flow_execution.log')
    file_handler.setFormatter(formatter)
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.setLevel(logging.DEBUG)


def log_flow_start(execution_log: FlowExecutionLog) -> None:
    """Log workflow execution start"""
    logger.debug(
        f"Workflow execution started - ID: {execution_log.id}, "
        f"Workflow: {execution_log.workflow.id}, Executor: {execution_log.executor}"
    )


def log_flow_end(execution_log: FlowExecutionLog, status: str, error: Optional[Exception] = None) -> None:
    """Log workflow execution end"""
    execution_time = timezone.now() - execution_log.start_time
    execution_log.execution_time = execution_time
    
    if error:
        logger.error(
            f"Workflow execution failed - ID: {execution_log.id}, "
            f"Workflow: {execution_log.workflow.id}, Error: {str(error)}"
        )
    else:
        logger.info(
            f"Workflow execution completed - ID: {execution_log.id}, "
            f"Workflow: {execution_log.workflow.id}, Duration: {execution_time}"
        )


def create_execution_log(workflow, executor: str, input_data: dict) -> FlowExecutionLog:
    """Create a new execution log entry"""
    log = FlowExecutionLog(
        workflow=workflow,
        executor=executor,
        input_data=input_data
    )
    log.save()
    return log


def update_execution_log_status(log_id, status: str, output_data: dict, error: Optional[Exception] = None) -> None:
    """Update execution log status"""
    execution_log = FlowExecutionLog.objects.get(id=log_id)
    execution_log.status = status
    execution_log.output_data = output_data
    execution_log.end_time = timezone.now()
    if error:
        execution_log.error_details = str(error)
    execution_log.save()


# ============================================================================
# CHATBOT RUNTIME MODELS - Added by Multi-Agent Orchestration Session
# Date: 2026-01-30
# ============================================================================

class ChatSession(models.Model):
    """
    Chat session for tracking conversations with users
    Each phone number + workflow combination creates a unique session
    """
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        WAITING_INPUT = 'waiting_input', 'Waiting for Input'
        WAITING_AI = 'waiting_ai', 'Waiting for AI'
        HANDOFF = 'handoff', 'Human Handoff'
        COMPLETED = 'completed', 'Completed'
        EXPIRED = 'expired', 'Expired'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.CASCADE,
        related_name='chat_sessions'
    )
    
    # Contact information
    contact_phone = models.CharField(max_length=20, db_index=True)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    
    # WhatsApp specific
    whatsapp_instance = models.CharField(max_length=100, blank=True, help_text='Evolution API instance name')
    
    # Current state
    current_node_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    # Variables collected during conversation
    variables = models.JSONField(default=dict, blank=True)
    
    # Conversation context for AI
    context = models.JSONField(default=dict, blank=True)
    
    # Message history (for quick access without joining)
    message_count = models.PositiveIntegerField(default=0)
    
    # Human handoff
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_chats'
    )
    handoff_reason = models.TextField(blank=True)
    
    # Lead integration
    salescube_lead_id = models.PositiveIntegerField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-last_message_at']
        indexes = [
            models.Index(fields=['contact_phone', 'workflow']),
            models.Index(fields=['status', 'last_message_at']),
        ]
    
    def __str__(self):
        return f"Chat {self.contact_phone} - {self.workflow.name}"
    
    def get_recent_messages(self, limit=10):
        return self.messages.order_by('-created_at')[:limit]


class ChatMessage(models.Model):
    """
    Individual message in a chat session
    """
    class Direction(models.TextChoices):
        INBOUND = 'inbound', 'Inbound (from user)'
        OUTBOUND = 'outbound', 'Outbound (from bot/agent)'
    
    class MessageType(models.TextChoices):
        TEXT = 'text', 'Text'
        IMAGE = 'image', 'Image'
        AUDIO = 'audio', 'Audio'
        VIDEO = 'video', 'Video'
        DOCUMENT = 'document', 'Document'
        TEMPLATE = 'template', 'WhatsApp Template'
        INTERACTIVE = 'interactive', 'Interactive (buttons/list)'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    
    # Message content
    direction = models.CharField(max_length=10, choices=Direction.choices)
    message_type = models.CharField(max_length=20, choices=MessageType.choices, default=MessageType.TEXT)
    content = models.TextField(blank=True)
    media_url = models.URLField(blank=True, max_length=500)
    metadata = models.JSONField(default=dict, blank=True, help_text='Extra data like buttons, template params')
    
    # Source information
    from_node_id = models.CharField(max_length=100, blank=True, help_text='Node that generated this message')
    is_ai_generated = models.BooleanField(default=False)
    ai_model = models.CharField(max_length=50, blank=True, help_text='Model used: gpt-4o, claude, etc')
    
    # WhatsApp specific
    whatsapp_message_id = models.CharField(max_length=100, blank=True, db_index=True)
    whatsapp_status = models.CharField(max_length=20, blank=True, help_text='sent, delivered, read')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.direction} - {self.content[:50]}"


class WhatsAppWebhookLog(models.Model):
    """
    Log of all incoming webhooks from Evolution API
    Useful for debugging and replay
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Raw webhook data
    instance = models.CharField(max_length=100)
    event_type = models.CharField(max_length=50)
    payload = models.JSONField()
    
    # Processing status
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)
    
    # Related session (if matched)
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhook_logs'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['instance', 'event_type']),
            models.Index(fields=['processed', 'created_at']),
        ]


class HandoffRequest(models.Model):
    """
    Human handoff request tracking
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        REJECTED = 'rejected', 'Rejected'
        COMPLETED = 'completed', 'Completed'
        EXPIRED = 'expired', 'Expired'
    
    class Reason(models.TextChoices):
        EXPLICIT_REQUEST = 'explicit_request', 'User requested human'
        SENTIMENT_NEGATIVE = 'sentiment_negative', 'Negative sentiment detected'
        CONFIDENCE_LOW = 'confidence_low', 'AI confidence too low'
        ESCALATION_KEYWORD = 'escalation_keyword', 'Escalation keyword detected'
        LOOP_DETECTED = 'loop_detected', 'Conversation loop detected'
        COMPLEX_QUERY = 'complex_query', 'Complex query'
        MANUAL = 'manual', 'Manual escalation'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='handoff_requests')
    
    reason = models.CharField(max_length=30, choices=Reason.choices)
    reason_details = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Assignment
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='handoff_requests'
    )
    
    # Context snapshot at handoff time
    conversation_summary = models.TextField(blank=True)
    collected_variables = models.JSONField(default=dict)
    sentiment_score = models.FloatField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Handoff {self.session.contact_phone} - {self.reason}"


# ============================================================================
# SETTINGS MODELS - UserGroup, BusinessUnit, Squad, Tag
# ============================================================================

class UserGroup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="custom_groups")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class BusinessUnit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    address = models.CharField(max_length=300, blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=2, blank=True, default="")
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="managed_units"
    )
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Squad(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    unit = models.ForeignKey(BusinessUnit, on_delete=models.CASCADE, related_name="squads")
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="led_squads"
    )
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name="squads")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.unit.name})"


class Tag(models.Model):
    ENTITY_TYPE_CHOICES = [
        ("lead", "Lead"), ("contact", "Contact"),
        ("product", "Product"), ("general", "General"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    color = models.CharField(max_length=7, default="#6366f1")
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPE_CHOICES, default="general")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
