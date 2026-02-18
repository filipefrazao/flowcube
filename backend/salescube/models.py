from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


# ============================================================================
# Organizational Models (from PROD accounts app)
# ============================================================================


class Franchise(models.Model):
    """Franchise/unit of the organization. PROD: accounts.franchise (6 records)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Pole(models.Model):
    """Regional pole. PROD: accounts.pole (1 record)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    franchise = models.ForeignKey(
        Franchise, on_delete=models.SET_NULL, null=True, blank=True, related_name="poles"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Squad(models.Model):
    """Team/squad within a franchise. PROD: accounts.squad (11 records)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    franchise = models.ForeignKey(
        Franchise, on_delete=models.SET_NULL, null=True, blank=True, related_name="squads"
    )
    owners = models.ManyToManyField(
        User, blank=True, related_name="owned_squads"
    )
    members = models.ManyToManyField(
        User, blank=True, related_name="squad_memberships"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Origin(models.Model):
    """Lead origin/source as a dynamic table. PROD: leads.origin (15 records)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# ============================================================================
# Sprint 1 Models - Pipelines, Leads, Sales, Tasks
# ============================================================================


class Pipeline(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="salescube_pipelines"
    )
    is_default = models.BooleanField(default=False)
    squads = models.ManyToManyField("Squad", blank=True, related_name="pipelines")
    franchises = models.ManyToManyField("Franchise", blank=True, related_name="pipelines")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class PipelineStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline = models.ForeignKey(
        Pipeline, on_delete=models.CASCADE, related_name="stages"
    )
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=7, default="#6366f1")
    probability = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]
        unique_together = ["pipeline", "order"]

    def __str__(self):
        return f"{self.pipeline.name} > {self.name}"


class Lead(models.Model):
    SOURCE_CHOICES = [
        ("manual", "Manual"),
        ("website", "Website"),
        ("whatsapp", "WhatsApp"),
        ("facebook", "Facebook"),
        ("instagram", "Instagram"),
        ("referral", "Referral"),
        ("event", "Event"),
        ("other", "Other"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    company = models.CharField(max_length=200, blank=True, default="")
    stage = models.ForeignKey(
        PipelineStage, on_delete=models.SET_NULL, null=True, related_name="leads"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_leads",
    )
    responsibles = models.ManyToManyField(
        User, blank=True, related_name="responsible_leads"
    )
    origin = models.ForeignKey(
        Origin, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads"
    )
    squads = models.ManyToManyField("Squad", blank=True, related_name="leads")
    franchises = models.ManyToManyField("Franchise", blank=True, related_name="leads")
    score = models.IntegerField(default=0)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")
    notes = models.TextField(blank=True, default="")
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    lost_reason = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["stage", "-created_at"]),
            models.Index(fields=["assigned_to", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.stage})"


class LeadNote(models.Model):
    NOTE_TYPE_CHOICES = [
        ("note", "Nota"),
        ("call", "Ligacao"),
        ("email", "Email"),
        ("meeting", "Reuniao"),
        ("task", "Tarefa"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="lead_notes")
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="salescube_notes"
    )
    content = models.TextField()
    note_type = models.CharField(
        max_length=20, choices=NOTE_TYPE_CHOICES, default="note"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.note_type}: {self.content[:50]}"


class LeadActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, related_name="activities"
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="salescube_activities"
    )
    action = models.CharField(max_length=100)
    old_value = models.CharField(max_length=500, blank=True, default="")
    new_value = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "lead activities"

    def __str__(self):
        return f"{self.action} - {self.lead.name}"


class TaskType(models.Model):
    """Customizable task types. PROD: api.tasktype (2 records)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=20, blank=True, default="#6366f1")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Task(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("blocked", "Blocked"),
        ("cancelled", "Cancelled"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    due_date = models.DateTimeField(blank=True, null=True)
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, null=True, blank=True, related_name="tasks"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="salescube_tasks",
    )
    responsibles = models.ManyToManyField(
        User, blank=True, related_name="responsible_tasks"
    )
    task_type = models.ForeignKey(
        TaskType, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="medium"
    )
    reminder_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Category(models.Model):
    TYPE_CHOICES = [
        ("product", "Product"),
        ("lead", "Lead"),
        ("general", "General"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="product")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=12, decimal_places=2)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sku = models.CharField(max_length=50, blank=True, default="")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    active = models.BooleanField(default=True)
    image_url = models.URLField(blank=True, default="")
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} (R${self.price})"


class Sale(models.Model):
    STAGE_CHOICES = [
        ("negotiation", "Negotiation"),
        ("proposal", "Proposal"),
        ("won", "Won"),
        ("lost", "Lost"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(
        Lead,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    products = models.ManyToManyField(Product, blank=True, related_name="sales")
    squads = models.ManyToManyField("Squad", blank=True, related_name="sales")
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES, default="negotiation")
    notes = models.TextField(blank=True, default="")
    closed_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="salescube_sales",
    )
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Sale {self.id} - R${self.total_value}"


class SaleLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="line_items")
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, related_name="sale_line_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        product_name = self.product.name if self.product else "N/A"
        return f"{product_name} x{self.quantity} = R${self.subtotal}"


class FinancialRecord(models.Model):
    TYPE_CHOICES = [
        ("revenue", "Revenue"),
        ("expense", "Expense"),
        ("refund", "Refund"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(
        Sale,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="financial_records",
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    description = models.CharField(max_length=300, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.type}: R${self.value} ({self.date})"


class LeadComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="salescube_comments"
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment on {self.lead.name}: {self.text[:50]}"


class LeadTag(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=20, blank=True, default="#6366f1")
    created_at = models.DateTimeField(auto_now_add=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class LeadTagAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="tag_assignments")
    tag = models.ForeignKey(LeadTag, on_delete=models.CASCADE, related_name="assignments")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["lead", "tag"]
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.lead.name} -> {self.tag.name}"


class Payment(models.Model):
    METHOD_CHOICES = [
        ("credit_card", "Credit Card"),
        ("debit_card", "Debit Card"),
        ("pix", "PIX"),
        ("cash", "Cash"),
        ("transfer", "Transfer"),
        ("cheque", "Cheque"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("reproved", "Reproved"),
        ("cancelled", "Cancelled"),
        ("refunded", "Refunded"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="payments")
    taker = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="salescube_payments_taken"
    )
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default="pix")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    protocol = models.CharField(max_length=100, blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment R${self.amount} ({self.method}) - {self.status}"


class SaleAttachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="attachments")
    file = models.FileField(upload_to="salescube/attachments/%Y/%m/", blank=True)
    file_name = models.CharField(max_length=255, blank=True, default="")
    file_url = models.URLField(blank=True, default="")
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="salescube_attachments"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Attachment: {self.file_name or self.file}"


# ============================================================================
# Sprint 2 Models - Contacts, Invoices, Tickets, Email
# ============================================================================


class Contact(models.Model):
    SOURCE_CHOICES = [
        ("manual", "Manual"),
        ("import", "Import CSV"),
        ("lead", "Convertido de Lead"),
        ("whatsapp", "WhatsApp"),
        ("website", "Website"),
        ("referral", "Indicacao"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    company = models.CharField(max_length=200, blank=True, default="")
    position = models.CharField(max_length=100, blank=True, default="")
    cpf = models.CharField(max_length=14, blank=True, default="")
    address = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    state = models.CharField(max_length=2, blank=True, default="")
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")
    notes = models.TextField(blank=True, default="")
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="contacts"
    )
    tags = models.ManyToManyField(LeadTag, blank=True, related_name="contacts")
    owner = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_contacts"
    )
    is_active = models.BooleanField(default=True)
    is_starred = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["cpf"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.email or self.phone})"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("draft", "Rascunho"),
        ("sent", "Enviada"),
        ("paid", "Paga"),
        ("overdue", "Vencida"),
        ("cancelled", "Cancelada"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    number = models.CharField(max_length=20, unique=True)
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )
    contact = models.ForeignKey(
        "Contact", on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )
    sale = models.ForeignKey(
        Sale, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    issue_date = models.DateField()
    due_date = models.DateField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default="")
    payment_method = models.CharField(max_length=50, blank=True, default="")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_invoices"
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-issue_date"]

    def __str__(self):
        return f"Fatura #{self.number} - R${self.total}"

    def recalculate(self):
        self.subtotal = sum(item.subtotal for item in self.items.all())
        self.total = self.subtotal - self.discount + self.tax
        self.save(update_fields=["subtotal", "total", "updated_at"])


class InvoiceItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_items"
    )
    description = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} x{self.quantity} = R${self.subtotal}"


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("open", "Aberto"),
        ("in_progress", "Em Andamento"),
        ("waiting", "Aguardando"),
        ("resolved", "Resolvido"),
        ("closed", "Fechado"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Baixa"),
        ("medium", "Media"),
        ("high", "Alta"),
        ("urgent", "Urgente"),
    ]
    CATEGORY_CHOICES = [
        ("support", "Suporte"),
        ("billing", "Financeiro"),
        ("technical", "Tecnico"),
        ("feature", "Solicitacao"),
        ("complaint", "Reclamacao"),
        ("other", "Outro"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets"
    )
    contact = models.ForeignKey(
        "Contact", on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="support")
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_tickets"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_tickets"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.status}] {self.title}"


class TicketMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="ticket_messages"
    )
    content = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Msg #{self.ticket.title[:30]} by {self.author}"


class EmailTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    subject = models.CharField(max_length=200)
    body_html = models.TextField()
    body_text = models.TextField(blank=True, default="")
    category = models.CharField(max_length=50, blank=True, default="general")
    variables = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="email_templates"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


# ============================================================================
# Sprint 3 Models - PROD Parity (Reminder, Pitch, Campaign, Reports, Attachment)
# ============================================================================


class Reminder(models.Model):
    """Reminders linked to leads/tasks. PROD: api.reminder (60 records)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    remind_at = models.DateTimeField()
    lead = models.ForeignKey(
        Lead, on_delete=models.CASCADE, null=True, blank=True, related_name="reminders"
    )
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, null=True, blank=True, related_name="reminders"
    )
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="salescube_reminders"
    )
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_reminders"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["remind_at"]

    def __str__(self):
        return f"{self.title} ({self.remind_at})"


class Pitch(models.Model):
    """Sales pitches/proposals. PROD: sales.pitch (8 records)."""
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("sent", "Sent"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    sale = models.ForeignKey(
        Sale, on_delete=models.CASCADE, null=True, blank=True, related_name="pitches"
    )
    lead = models.ForeignKey(
        Lead, on_delete=models.SET_NULL, null=True, blank=True, related_name="pitches"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_pitches"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "pitches"

    def __str__(self):
        return f"{self.title} - {self.status}"


class Campaign(models.Model):
    """Marketing campaigns linked to pipelines. PROD: pipelines.campaign."""
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("paused", "Paused"),
        ("completed", "Completed"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    pipeline = models.ForeignKey(
        Pipeline, on_delete=models.SET_NULL, null=True, blank=True, related_name="campaigns"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_campaigns"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"


class ReportTemplate(models.Model):
    """Report templates. PROD: api.reporttemplate (14 records)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    template_type = models.CharField(max_length=50, blank=True, default="general")
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="created_report_templates"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ReportLog(models.Model):
    """Log of generated reports. PROD: api.reportlog (17 records)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        ReportTemplate, on_delete=models.SET_NULL, null=True, related_name="logs"
    )
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="generated_reports"
    )
    parameters = models.JSONField(default=dict, blank=True)
    result_url = models.URLField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        template_name = self.template.name if self.template else "N/A"
        return f"Report: {template_name} ({self.created_at})"


class Attachment(models.Model):
    """Generic attachments for leads, tasks, and other entities.
    PROD: api.attachment (753 records). Extends beyond sale-only attachments."""
    ENTITY_CHOICES = [
        ("lead", "Lead"),
        ("task", "Task"),
        ("sale", "Sale"),
        ("ticket", "Ticket"),
        ("pitch", "Pitch"),
        ("other", "Other"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=20, choices=ENTITY_CHOICES, default="lead")
    entity_id = models.UUIDField(null=True, blank=True, db_index=True)
    file = models.FileField(upload_to="salescube/attachments/%Y/%m/", blank=True)
    file_name = models.CharField(max_length=255, blank=True, default="")
    file_url = models.URLField(blank=True, default="")
    file_size = models.PositiveIntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True, default="")
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="uploaded_attachments"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    legacy_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return f"{self.entity_type}:{self.file_name or self.file}"
