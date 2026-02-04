"""
FlowCube 3.0 Workflow Models
Based on best practices from n8n, Typebot, and Flowise
"""
from django.conf import settings
from django.db import models
import uuid


class BlockTypeChoices(models.TextChoices):
    # Traffic Sources
    GOOGLE_ORGANIC = "google_organic", "Google Organic"
    GOOGLE_ADS = "google_ads", "Google Ads"
    FACEBOOK_ADS = "facebook_ads", "Facebook Ads"
    INSTAGRAM_ADS = "instagram_ads", "Instagram Ads"
    DIRECT = "direct", "Direct Traffic"
    EMAIL_CAMPAIGN = "email_campaign", "Email Campaign"
    REFERRAL = "referral", "Referral"
    
    # Pages
    LANDING_PAGE = "landing_page", "Landing Page"
    SALES_PAGE = "sales_page", "Sales Page"
    PRODUCT_PAGE = "product_page", "Product Page"
    CHECKOUT = "checkout", "Checkout"
    THANK_YOU = "thank_you", "Thank You Page"
    BLOG_POST = "blog_post", "Blog Post"
    
    # Actions/Conversions
    BUTTON_CLICK = "button_click", "Button Click"
    FORM_SUBMIT = "form_submit", "Form Submit"
    PURCHASE = "purchase", "Purchase"
    SIGN_UP = "sign_up", "Sign Up"
    ADD_TO_CART = "add_to_cart", "Add to Cart"
    DOWNLOAD = "download", "Download"
    VIDEO_VIEW = "video_view", "Video View"
    CUSTOM_EVENT = "custom_event", "Custom Event"
    
    # Tools/Automations
    EMAIL_SEQUENCE = "email_sequence", "Email Sequence"
    TAG_SEGMENT = "tag_segment", "Tag/Segmentation"
    WEBHOOK = "webhook", "Webhook"
    DECISION_TREE = "decision_tree", "Decision Tree"
    WAIT = "wait", "Wait/Delay"
    
    # Triggers
    WHATSAPP_TRIGGER = "whatsapp_trigger", "WhatsApp Trigger"
    SCHEDULE = "schedule", "Schedule"
    
    # AI Models
    OPENAI = "openai", "OpenAI"
    CLAUDE = "claude", "Claude"
    DEEPSEEK = "deepseek", "DeepSeek"
    
    # Inputs (Chatbot style)
    TEXT_INPUT = "text_input", "Text Input"
    EMAIL_INPUT = "email_input", "Email Input"
    PHONE_INPUT = "phone_input", "Phone Input"
    CHOICE = "choice", "Choice"
    
    # Logic
    CONDITION = "condition", "Condition"
    SET_VARIABLE = "set_variable", "Set Variable"
    
    # Outputs
    TEXT_RESPONSE = "text_response", "Text Response"
    IMAGE_RESPONSE = "image_response", "Image Response"
    WHATSAPP_TEMPLATE = "whatsapp_template", "WhatsApp Template"


class Workflow(models.Model):
    """
    Main workflow container
    
    The 'graph' field stores the complete visual representation:
    {
        "nodes": [...],  # React Flow nodes with positions
        "edges": [...],  # Connections between nodes
        "viewport": {"x": 0, "y": 0, "zoom": 1}  # Canvas state
    }
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="workflows")
    
    # Graph JSON - stores complete visual state (n8n/Typebot pattern)
    graph = models.JSONField(default=dict, blank=True, help_text="React Flow graph: {nodes, edges, viewport}")
    
    # Status flags
    is_published = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    
    # Folder organization
    folder = models.CharField(max_length=255, blank=True, default="")
    
    # Tags for filtering
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ["-updated_at"]
    
    def __str__(self):
        return self.name
    
    def get_published_version(self):
        """Get the latest published version"""
        return self.versions.filter(tag="published").order_by("-created_at").first()


class WorkflowVersion(models.Model):
    """
    Immutable workflow version for execution safety
    When user clicks "Publish", a version is created
    The execution engine runs against versions, not drafts
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="versions")
    
    # Snapshot of the graph at publish time
    graph = models.JSONField(default=dict)
    
    # Version metadata
    version_number = models.PositiveIntegerField(default=1)
    tag = models.CharField(max_length=50, blank=True, default="", help_text="e.g., 'published', 'draft-v1'")
    notes = models.TextField(blank=True, help_text="Release notes for this version")
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ["-created_at"]
        unique_together = ["workflow", "version_number"]
    
    def __str__(self):
        return f"{self.workflow.name} v{self.version_number}"


class Execution(models.Model):
    """
    Workflow execution instance
    Each run of a workflow creates one Execution
    """
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="executions")
    version = models.ForeignKey(WorkflowVersion, on_delete=models.SET_NULL, null=True, related_name="executions")
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Trigger data (webhook body, schedule params, etc)
    trigger_data = models.JSONField(null=True, blank=True)
    
    # Result data
    result_data = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    
    # Who/what triggered it
    triggered_by = models.CharField(max_length=100, default="manual", help_text="manual, webhook, schedule, api")
    
    class Meta:
        ordering = ["-started_at"]
    
    def __str__(self):
        return f"Execution {self.id} - {self.status}"
    
    @property
    def duration_ms(self):
        """Execution duration in milliseconds"""
        if self.finished_at and self.started_at:
            return int((self.finished_at - self.started_at).total_seconds() * 1000)
        return None


class NodeExecutionLog(models.Model):
    """
    Detailed log for each node/step in an execution
    Enables step-by-step debugging and analytics
    """
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        ERROR = "error", "Error"
        SKIPPED = "skipped", "Skipped"
        WAITING = "waiting", "Waiting"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution = models.ForeignKey(Execution, on_delete=models.CASCADE, related_name="node_logs")
    
    # Node identification (matches React Flow node.id)
    node_id = models.CharField(max_length=100)
    node_type = models.CharField(max_length=50)
    node_label = models.CharField(max_length=255, blank=True)
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    
    # Data flow
    input_data = models.JSONField(null=True, blank=True)
    output_data = models.JSONField(null=True, blank=True)
    error_details = models.TextField(blank=True)
    
    # Performance
    duration_ms = models.PositiveIntegerField(default=0)
    
    started_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["started_at"]
    
    def __str__(self):
        return f"{self.node_type} ({self.node_id}) - {self.status}"


class NodeAnalytics(models.Model):
    """
    Aggregated analytics per node (Funnellytics-style)
    Updated periodically or via Redis counters
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="node_analytics")
    
    # Node identification
    node_id = models.CharField(max_length=100)
    
    # Metrics
    views = models.PositiveIntegerField(default=0, help_text="Total entries to this node")
    conversions = models.PositiveIntegerField(default=0, help_text="Successful exits to next node")
    drop_offs = models.PositiveIntegerField(default=0, help_text="Exits without conversion")
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Revenue attributed")
    
    # Time metrics
    avg_time_on_node_ms = models.PositiveIntegerField(default=0)
    
    # Date range
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Last update
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ["workflow", "node_id", "period_start", "period_end"]
        ordering = ["-period_start"]
    
    def __str__(self):
        return f"Analytics: {self.node_id} ({self.period_start})"
    
    @property
    def conversion_rate(self):
        """Calculate conversion rate"""
        if self.views == 0:
            return 0
        return round((self.conversions / self.views) * 100, 2)
    
    @property
    def drop_off_rate(self):
        """Calculate drop-off rate"""
        if self.views == 0:
            return 0
        return round((self.drop_offs / self.views) * 100, 2)


class Group(models.Model):
    """Group of blocks for visual organization"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="groups")
    title = models.CharField(max_length=255, default="New Group")
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)
    width = models.FloatField(default=400)
    height = models.FloatField(default=300)
    color = models.CharField(max_length=20, default="#6B7280")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.workflow.name} - {self.title}"


class Block(models.Model):
    """Individual block in workflow (legacy - for migration)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="blocks")
    group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True, blank=True, related_name="blocks")
    block_type = models.CharField(max_length=50, choices=BlockTypeChoices.choices)
    content = models.JSONField(default=dict)
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["created_at"]
    
    def __str__(self):
        return f"{self.block_type} - {self.id}"


class Edge(models.Model):
    """Connection between blocks (legacy - for migration)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="edges")
    source_block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name="outgoing_edges")
    target_block = models.ForeignKey(Block, on_delete=models.CASCADE, related_name="incoming_edges")
    source_handle = models.CharField(max_length=50, default="default")
    target_handle = models.CharField(max_length=50, default="default")
    condition = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ["source_block", "target_block", "source_handle", "target_handle"]
    
    def __str__(self):
        return f"{self.source_block_id} -> {self.target_block_id}"


class Variable(models.Model):
    """Workflow variables"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name="variables")
    name = models.CharField(max_length=100)
    value = models.JSONField(default=dict)
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ["workflow", "name"]
    
    def __str__(self):
        return f"{self.workflow.name}.{self.name}"


# ==========================================
# AI Assistant Models - Automação Contextual
# ==========================================

class AIAssistant(models.Model):
    """
    Assistente IA para sugestões de automação contextual
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, help_text="Nome do assistente")
    description = models.TextField(blank=True, help_text="Descrição do assistente")
    
    # Padrões de contexto que o assistente reconhece
    context_patterns = models.JSONField(
        default=dict,
        help_text="Padrões de contexto brasileiro: {'pix': [...], 'whatsapp': [...], 'nfe': [...]}"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Assistente IA"
        verbose_name_plural = "Assistentes IA"
    
    def __str__(self):
        return self.name


class BrazilianContext(models.Model):
    """
    Contextos brasileiros pré-configurados para automações
    Ex: Pix, WhatsApp Business, NFe, etc.
    """
    class ContextType(models.TextChoices):
        PIX = "pix", "Pix"
        WHATSAPP = "whatsapp", "WhatsApp Business"
        NFE = "nfe", "Nota Fiscal Eletrônica"
        ECOMMERCE = "ecommerce", "E-commerce"
        CRM = "crm", "CRM"
        LEADS = "leads", "Gestão de Leads"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    context_type = models.CharField(max_length=50, choices=ContextType.choices, unique=True)
    
    # Padrões de reconhecimento
    patterns = models.JSONField(
        default=list,
        help_text="Lista de padrões/keywords para identificar este contexto"
    )
    
    # Templates de workflow pré-configurados
    templates = models.JSONField(
        default=list,
        help_text="Templates de workflow para este contexto"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Contexto Brasileiro"
        verbose_name_plural = "Contextos Brasileiros"
    
    def __str__(self):
        return self.get_context_type_display()


class AutomationSuggestion(models.Model):
    """
    Sugestão de automação gerada pelo assistente IA
    """
    class ConfidenceLevel(models.TextChoices):
        LOW = "low", "Baixa"
        MEDIUM = "medium", "Média"
        HIGH = "high", "Alta"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assistant = models.ForeignKey(
        AIAssistant,
        on_delete=models.CASCADE,
        related_name="suggestions"
    )
    
    # Template de workflow sugerido
    workflow_template = models.JSONField(
        default=dict,
        help_text="Template completo do workflow (nodes, edges, config)"
    )
    
    # Score de confiança da sugestão (0-100)
    confidence_score = models.FloatField(
        default=0.0,
        help_text="Score de 0 a 100 indicando confiança na sugestão"
    )
    
    # Tipo de contexto identificado
    context_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Tipo de contexto brasileiro identificado"
    )
    
    # Contexto original do usuário
    user_context = models.JSONField(
        default=dict,
        help_text="Contexto fornecido pelo usuário para análise"
    )
    
    # Explicação da sugestão
    explanation = models.TextField(
        blank=True,
        help_text="Explicação de por que esta automação foi sugerida"
    )
    
    # Status da sugestão
    is_applied = models.BooleanField(
        default=False,
        help_text="Se a sugestão foi aplicada ao workflow"
    )
    
    applied_to_workflow = models.ForeignKey(
        Workflow,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ai_suggestions"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    applied_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Sugestão de Automação"
        verbose_name_plural = "Sugestões de Automação"
    
    def __str__(self):
        return f"Sugestão {self.context_type} - Score: {self.confidence_score}"
    
    @property
    def confidence_level(self):
        """Retorna nível de confiança baseado no score"""
        if self.confidence_score >= 80:
            return self.ConfidenceLevel.HIGH
        elif self.confidence_score >= 50:
            return self.ConfidenceLevel.MEDIUM
        return self.ConfidenceLevel.LOW
