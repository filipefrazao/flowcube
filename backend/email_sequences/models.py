"""
Email Sequences Models
email_sequences/models.py

Models for managing email providers, templates, sequences, recipients and tracking.
Created: 2026-02-02
"""
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class EmailProvider(models.Model):
    """
    Email service provider configuration.
    Supports SMTP, SendGrid, Mailgun, and Amazon SES.
    """
    class ProviderType(models.TextChoices):
        SMTP = "smtp", "SMTP"
        SENDGRID = "sendgrid", "SendGrid"
        MAILGUN = "mailgun", "Mailgun"
        SES = "ses", "Amazon SES"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_providers"
    )
    
    # Provider identification
    name = models.CharField(
        max_length=100,
        help_text="Friendly name for this provider"
    )
    provider_type = models.CharField(
        max_length=20,
        choices=ProviderType.choices,
        default=ProviderType.SMTP
    )
    
    # SMTP Configuration
    smtp_host = models.CharField(
        max_length=255,
        blank=True,
        help_text="SMTP server hostname"
    )
    smtp_port = models.PositiveIntegerField(
        default=587,
        validators=[MinValueValidator(1), MaxValueValidator(65535)],
        help_text="SMTP server port"
    )
    smtp_username = models.CharField(
        max_length=255,
        blank=True,
        help_text="SMTP username"
    )
    smtp_password = models.CharField(
        max_length=255,
        blank=True,
        help_text="SMTP password (encrypted)"
    )
    smtp_use_tls = models.BooleanField(
        default=True,
        help_text="Use TLS encryption"
    )
    smtp_use_ssl = models.BooleanField(
        default=False,
        help_text="Use SSL encryption"
    )
    
    # API Configuration (for SendGrid, Mailgun, SES)
    api_key = models.CharField(
        max_length=500,
        blank=True,
        help_text="API key for the provider"
    )
    api_secret = models.CharField(
        max_length=500,
        blank=True,
        help_text="API secret (for Mailgun domain)"
    )
    api_region = models.CharField(
        max_length=50,
        blank=True,
        help_text="API region (e.g., us-east-1 for SES, EU for Mailgun)"
    )
    api_endpoint = models.URLField(
        max_length=500,
        blank=True,
        help_text="Custom API endpoint URL"
    )
    
    # Sender defaults
    default_from_email = models.EmailField(
        help_text="Default sender email address"
    )
    default_from_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Default sender name"
    )
    default_reply_to = models.EmailField(
        blank=True,
        help_text="Default reply-to address"
    )
    
    # Rate limiting
    rate_limit_per_hour = models.PositiveIntegerField(
        default=500,
        help_text="Maximum emails per hour"
    )
    rate_limit_per_day = models.PositiveIntegerField(
        default=10000,
        help_text="Maximum emails per day"
    )
    
    # Webhook configuration
    webhook_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="Webhook URL for receiving events"
    )
    webhook_secret = models.CharField(
        max_length=256,
        blank=True,
        help_text="Webhook signing secret"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether provider connection was verified"
    )
    last_verified_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    last_error_at = models.DateTimeField(null=True, blank=True)
    
    # Stats
    emails_sent_today = models.PositiveIntegerField(default=0)
    emails_sent_total = models.PositiveIntegerField(default=0)
    last_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email Provider"
        verbose_name_plural = "Email Providers"
        indexes = [
            models.Index(fields=["owner", "is_active"]),
            models.Index(fields=["provider_type"]),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"
    
    def mark_error(self, error_message: str):
        """Record an error for this provider"""
        self.last_error = error_message
        self.last_error_at = timezone.now()
        self.save(update_fields=["last_error", "last_error_at"])
    
    def mark_verified(self):
        """Mark provider as verified"""
        self.is_verified = True
        self.last_verified_at = timezone.now()
        self.last_error = ""
        self.save(update_fields=["is_verified", "last_verified_at", "last_error"])
    
    def increment_sent_count(self):
        """Increment sent email counters"""
        self.emails_sent_today += 1
        self.emails_sent_total += 1
        self.last_sent_at = timezone.now()
        self.save(update_fields=["emails_sent_today", "emails_sent_total", "last_sent_at"])
    
    def reset_daily_count(self):
        """Reset daily email counter"""
        self.emails_sent_today = 0
        self.save(update_fields=["emails_sent_today"])
    
    def can_send(self) -> bool:
        """Check if provider can send more emails"""
        return (
            self.is_active and
            self.is_verified and
            self.emails_sent_today < self.rate_limit_per_day
        )


class EmailTemplate(models.Model):
    """
    Reusable email template with HTML and text content.
    Supports variable substitution using {{variable_name}} syntax.
    """
    class Category(models.TextChoices):
        MARKETING = "marketing", "Marketing"
        TRANSACTIONAL = "transactional", "Transactional"
        NOTIFICATION = "notification", "Notification"
        WELCOME = "welcome", "Welcome"
        ONBOARDING = "onboarding", "Onboarding"
        FOLLOWUP = "followup", "Follow-up"
        NEWSLETTER = "newsletter", "Newsletter"
        PROMOTIONAL = "promotional", "Promotional"
        OTHER = "other", "Other"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_templates"
    )
    
    # Template identification
    name = models.CharField(
        max_length=200,
        help_text="Template name for identification"
    )
    description = models.TextField(
        blank=True,
        help_text="Template description"
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER
    )
    
    # Email content
    subject = models.CharField(
        max_length=998,
        help_text="Email subject line (supports variables)"
    )
    preheader = models.CharField(
        max_length=200,
        blank=True,
        help_text="Preview text shown in email clients"
    )
    html_content = models.TextField(
        help_text="HTML email content (supports variables)"
    )
    text_content = models.TextField(
        blank=True,
        help_text="Plain text fallback content"
    )
    
    # Variables configuration
    variables = models.JSONField(
        default=list,
        blank=True,
        help_text="List of variable definitions [{name, type, default, required}]"
    )
    
    # Design settings
    design_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="Design configuration (for visual editor)"
    )
    thumbnail_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="Template preview thumbnail"
    )
    
    # Metadata
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Tags for organization"
    )
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(
        default=False,
        help_text="Available as a shared template"
    )
    
    # Stats
    times_used = models.PositiveIntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Email Template"
        verbose_name_plural = "Email Templates"
        indexes = [
            models.Index(fields=["owner", "is_active"]),
            models.Index(fields=["category"]),
        ]
    
    def __str__(self):
        return self.name
    
    def increment_usage(self):
        """Increment usage counter"""
        self.times_used += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=["times_used", "last_used_at"])
    
    def duplicate(self, new_name: str = None):
        """Create a copy of this template"""
        new_template = EmailTemplate(
            owner=self.owner,
            name=new_name or f"{self.name} (Copy)",
            description=self.description,
            category=self.category,
            subject=self.subject,
            preheader=self.preheader,
            html_content=self.html_content,
            text_content=self.text_content,
            variables=self.variables.copy() if self.variables else [],
            design_json=self.design_json.copy() if self.design_json else {},
            tags=self.tags.copy() if self.tags else [],
        )
        new_template.save()
        return new_template


class EmailSequence(models.Model):
    """
    Automated email sequence with multiple steps.
    Can be triggered manually, by workflow, or by events.
    """
    class TriggerType(models.TextChoices):
        MANUAL = "manual", "Manual"
        WORKFLOW = "workflow", "Workflow Trigger"
        SUBSCRIPTION = "subscription", "New Subscription"
        TAG_ADDED = "tag_added", "Tag Added"
        DATE = "date", "Date/Time"
        API = "api", "API Call"
        WEBHOOK = "webhook", "Webhook"
    
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        ARCHIVED = "archived", "Archived"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_sequences"
    )
    
    # Sequence identification
    name = models.CharField(
        max_length=200,
        help_text="Sequence name"
    )
    description = models.TextField(
        blank=True,
        help_text="Sequence description"
    )
    
    # Trigger configuration
    trigger_type = models.CharField(
        max_length=20,
        choices=TriggerType.choices,
        default=TriggerType.MANUAL
    )
    trigger_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Trigger-specific configuration"
    )
    
    # Provider
    provider = models.ForeignKey(
        EmailProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sequences",
        help_text="Email provider to use"
    )
    
    # Workflow association
    workflow = models.ForeignKey(
        "workflows.Workflow",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_sequences",
        help_text="Associated workflow"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )
    is_active = models.BooleanField(default=False)
    
    # Settings
    settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Sequence settings (timezone, send windows, etc)"
    )
    
    # Metadata
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Tags for organization"
    )
    
    # Stats
    total_enrolled = models.PositiveIntegerField(default=0)
    total_completed = models.PositiveIntegerField(default=0)
    total_unsubscribed = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email Sequence"
        verbose_name_plural = "Email Sequences"
        indexes = [
            models.Index(fields=["owner", "is_active"]),
            models.Index(fields=["status"]),
            models.Index(fields=["trigger_type"]),
        ]
    
    def __str__(self):
        return self.name
    
    def activate(self):
        """Activate the sequence"""
        self.status = self.Status.ACTIVE
        self.is_active = True
        self.activated_at = timezone.now()
        self.save(update_fields=["status", "is_active", "activated_at"])
    
    def deactivate(self):
        """Deactivate the sequence"""
        self.status = self.Status.PAUSED
        self.is_active = False
        self.save(update_fields=["status", "is_active"])
    
    def get_next_step(self, current_order: int = 0):
        """Get the next step in the sequence"""
        return self.steps.filter(
            order__gt=current_order,
            is_active=True
        ).first()
    
    @property
    def step_count(self) -> int:
        """Get total number of active steps"""
        return self.steps.filter(is_active=True).count()


class EmailStep(models.Model):
    """
    Individual step in an email sequence.
    Each step sends a specific template after a delay.
    """
    class ConditionType(models.TextChoices):
        NONE = "none", "No condition"
        OPENED_PREVIOUS = "opened_previous", "Opened previous email"
        NOT_OPENED_PREVIOUS = "not_opened_previous", "Did not open previous"
        CLICKED_PREVIOUS = "clicked_previous", "Clicked previous email"
        NOT_CLICKED_PREVIOUS = "not_clicked_previous", "Did not click previous"
        HAS_TAG = "has_tag", "Has specific tag"
        CUSTOM = "custom", "Custom condition"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(
        EmailSequence,
        on_delete=models.CASCADE,
        related_name="steps"
    )
    
    # Step order
    order = models.PositiveIntegerField(
        default=0,
        help_text="Step order in sequence (0-indexed)"
    )
    name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Step name for identification"
    )
    
    # Template
    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sequence_steps",
        help_text="Email template to send"
    )
    
    # Inline content (if not using template)
    subject = models.CharField(
        max_length=998,
        blank=True,
        help_text="Email subject (overrides template)"
    )
    html_content = models.TextField(
        blank=True,
        help_text="HTML content (overrides template)"
    )
    text_content = models.TextField(
        blank=True,
        help_text="Text content (overrides template)"
    )
    
    # Delay configuration
    delay_days = models.PositiveIntegerField(
        default=0,
        help_text="Days to wait before sending"
    )
    delay_hours = models.PositiveIntegerField(
        default=0,
        validators=[MaxValueValidator(23)],
        help_text="Hours to wait (0-23)"
    )
    delay_minutes = models.PositiveIntegerField(
        default=0,
        validators=[MaxValueValidator(59)],
        help_text="Minutes to wait (0-59)"
    )
    
    # Send window (optional)
    send_after_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Only send after this time"
    )
    send_before_time = models.TimeField(
        null=True,
        blank=True,
        help_text="Only send before this time"
    )
    send_on_days = models.JSONField(
        default=list,
        blank=True,
        help_text="Days of week to send (0=Monday, 6=Sunday)"
    )
    
    # Conditions
    condition_type = models.CharField(
        max_length=30,
        choices=ConditionType.choices,
        default=ConditionType.NONE
    )
    condition_config = models.JSONField(
        default=dict,
        blank=True,
        help_text="Condition-specific configuration"
    )
    
    # A/B Testing
    ab_test_enabled = models.BooleanField(
        default=False,
        help_text="Enable A/B testing for this step"
    )
    ab_variants = models.JSONField(
        default=list,
        blank=True,
        help_text="A/B test variants [{subject, html_content, weight}]"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Stats
    total_sent = models.PositiveIntegerField(default=0)
    total_opened = models.PositiveIntegerField(default=0)
    total_clicked = models.PositiveIntegerField(default=0)
    total_bounced = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["sequence", "order"]
        verbose_name = "Email Step"
        verbose_name_plural = "Email Steps"
        indexes = [
            models.Index(fields=["sequence", "order"]),
            models.Index(fields=["is_active"]),
        ]
    
    def __str__(self):
        name = self.name or f"Step {self.order + 1}"
        return f"{self.sequence.name} - {name}"
    
    @property
    def delay_total_minutes(self) -> int:
        """Get total delay in minutes"""
        return (
            self.delay_days * 24 * 60 +
            self.delay_hours * 60 +
            self.delay_minutes
        )
    
    @property
    def open_rate(self) -> float:
        """Calculate open rate percentage"""
        if self.total_sent == 0:
            return 0.0
        return (self.total_opened / self.total_sent) * 100
    
    @property
    def click_rate(self) -> float:
        """Calculate click rate percentage"""
        if self.total_sent == 0:
            return 0.0
        return (self.total_clicked / self.total_sent) * 100
    
    def get_effective_content(self):
        """Get effective subject and content (template or inline)"""
        if self.template:
            return {
                "subject": self.subject or self.template.subject,
                "html_content": self.html_content or self.template.html_content,
                "text_content": self.text_content or self.template.text_content,
            }
        return {
            "subject": self.subject,
            "html_content": self.html_content,
            "text_content": self.text_content,
        }


class EmailRecipient(models.Model):
    """
    Email recipient/subscriber with associated data.
    Can be enrolled in multiple sequences.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_recipients"
    )
    
    # Contact info
    email = models.EmailField(
        db_index=True,
        help_text="Recipient email address"
    )
    name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Recipient full name"
    )
    first_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="First name"
    )
    last_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Last name"
    )
    
    # Custom data
    variables = models.JSONField(
        default=dict,
        blank=True,
        help_text="Custom variables for personalization"
    )
    
    # Organization
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Tags for segmentation"
    )
    lists = models.JSONField(
        default=list,
        blank=True,
        help_text="Lists this recipient belongs to"
    )
    
    # Source tracking
    source = models.CharField(
        max_length=100,
        blank=True,
        help_text="Source of this recipient (import, api, form, etc)"
    )
    source_details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional source details"
    )
    
    # Subscription status
    is_subscribed = models.BooleanField(
        default=True,
        help_text="Whether recipient is subscribed"
    )
    subscribed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When they subscribed"
    )
    unsubscribed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When they unsubscribed"
    )
    unsubscribe_reason = models.TextField(
        blank=True,
        help_text="Reason for unsubscribing"
    )
    
    # Bounce/Complaint status
    is_bounced = models.BooleanField(
        default=False,
        help_text="Email bounced"
    )
    bounced_at = models.DateTimeField(null=True, blank=True)
    bounce_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Type of bounce (hard/soft)"
    )
    is_complained = models.BooleanField(
        default=False,
        help_text="Marked as spam"
    )
    complained_at = models.DateTimeField(null=True, blank=True)
    
    # Stats
    emails_received = models.PositiveIntegerField(default=0)
    emails_opened = models.PositiveIntegerField(default=0)
    emails_clicked = models.PositiveIntegerField(default=0)
    last_email_at = models.DateTimeField(null=True, blank=True)
    last_opened_at = models.DateTimeField(null=True, blank=True)
    last_clicked_at = models.DateTimeField(null=True, blank=True)
    
    # External IDs
    external_id = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="External system ID"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email Recipient"
        verbose_name_plural = "Email Recipients"
        unique_together = ["owner", "email"]
        indexes = [
            models.Index(fields=["owner", "email"]),
            models.Index(fields=["is_subscribed"]),
            models.Index(fields=["external_id"]),
        ]
    
    def __str__(self):
        if self.name:
            return f"{self.name} <{self.email}>"
        return self.email
    
    def can_receive_email(self) -> bool:
        """Check if recipient can receive emails"""
        return (
            self.is_subscribed and
            not self.is_bounced and
            not self.is_complained
        )
    
    def unsubscribe(self, reason: str = ""):
        """Unsubscribe this recipient"""
        self.is_subscribed = False
        self.unsubscribed_at = timezone.now()
        self.unsubscribe_reason = reason
        self.save(update_fields=["is_subscribed", "unsubscribed_at", "unsubscribe_reason"])
    
    def resubscribe(self):
        """Resubscribe this recipient"""
        self.is_subscribed = True
        self.subscribed_at = timezone.now()
        self.unsubscribed_at = None
        self.unsubscribe_reason = ""
        self.save(update_fields=["is_subscribed", "subscribed_at", "unsubscribed_at", "unsubscribe_reason"])
    
    def mark_bounced(self, bounce_type: str = "hard"):
        """Mark email as bounced"""
        self.is_bounced = True
        self.bounced_at = timezone.now()
        self.bounce_type = bounce_type
        if bounce_type == "hard":
            self.is_subscribed = False
        self.save(update_fields=["is_bounced", "bounced_at", "bounce_type", "is_subscribed"])
    
    def mark_complained(self):
        """Mark recipient as complained/spam"""
        self.is_complained = True
        self.complained_at = timezone.now()
        self.is_subscribed = False
        self.save(update_fields=["is_complained", "complained_at", "is_subscribed"])
    
    def add_tag(self, tag: str):
        """Add a tag to recipient"""
        if tag not in self.tags:
            self.tags.append(tag)
            self.save(update_fields=["tags"])
    
    def remove_tag(self, tag: str):
        """Remove a tag from recipient"""
        if tag in self.tags:
            self.tags.remove(tag)
            self.save(update_fields=["tags"])
    
    def has_tag(self, tag: str) -> bool:
        """Check if recipient has a specific tag"""
        return tag in self.tags


class SequenceEnrollment(models.Model):
    """
    Tracks a recipient enrollment in a sequence.
    """
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"
        UNSUBSCRIBED = "unsubscribed", "Unsubscribed"
        BOUNCED = "bounced", "Bounced"
        FAILED = "failed", "Failed"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sequence = models.ForeignKey(
        EmailSequence,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )
    recipient = models.ForeignKey(
        EmailRecipient,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    
    # Progress
    current_step = models.ForeignKey(
        EmailStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="current_enrollments",
        help_text="Current step in the sequence"
    )
    completed_steps = models.PositiveIntegerField(default=0)
    
    # Timing
    next_send_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When next email should be sent"
    )
    
    # Custom variables for this enrollment
    variables = models.JSONField(
        default=dict,
        blank=True,
        help_text="Enrollment-specific variables"
    )
    
    # Timestamps
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ["-enrolled_at"]
        verbose_name = "Sequence Enrollment"
        verbose_name_plural = "Sequence Enrollments"
        unique_together = ["sequence", "recipient"]
        indexes = [
            models.Index(fields=["sequence", "status"]),
            models.Index(fields=["next_send_at"]),
        ]
    
    def __str__(self):
        return f"{self.recipient.email} in {self.sequence.name}"
    
    def advance_to_next_step(self):
        """Advance to the next step in the sequence"""
        if self.current_step:
            next_step = self.sequence.get_next_step(self.current_step.order)
        else:
            next_step = self.sequence.steps.filter(is_active=True).first()
        
        if next_step:
            self.current_step = next_step
            self.completed_steps += 1
            # Calculate next send time
            delay_minutes = next_step.delay_total_minutes
            self.next_send_at = timezone.now() + timezone.timedelta(minutes=delay_minutes)
            self.save(update_fields=["current_step", "completed_steps", "next_send_at"])
            return True
        else:
            # No more steps - sequence complete
            self.status = self.Status.COMPLETED
            self.completed_at = timezone.now()
            self.next_send_at = None
            self.save(update_fields=["status", "completed_at", "next_send_at"])
            return False
    
    def pause(self):
        """Pause this enrollment"""
        self.status = self.Status.PAUSED
        self.paused_at = timezone.now()
        self.save(update_fields=["status", "paused_at"])
    
    def resume(self):
        """Resume this enrollment"""
        self.status = self.Status.ACTIVE
        self.paused_at = None
        self.save(update_fields=["status", "paused_at"])


class EmailSend(models.Model):
    """
    Individual email send record.
    Tracks the delivery status and engagement.
    """
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        QUEUED = "queued", "Queued"
        SENDING = "sending", "Sending"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        OPENED = "opened", "Opened"
        CLICKED = "clicked", "Clicked"
        BOUNCED = "bounced", "Bounced"
        FAILED = "failed", "Failed"
        DROPPED = "dropped", "Dropped"
        DEFERRED = "deferred", "Deferred"
        SPAM = "spam", "Marked as Spam"
        UNSUBSCRIBED = "unsubscribed", "Unsubscribed"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    step = models.ForeignKey(
        EmailStep,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sends",
        help_text="Sequence step this send belongs to"
    )
    enrollment = models.ForeignKey(
        SequenceEnrollment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sends",
        help_text="Sequence enrollment"
    )
    recipient = models.ForeignKey(
        EmailRecipient,
        on_delete=models.CASCADE,
        related_name="sends"
    )
    provider = models.ForeignKey(
        EmailProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sends"
    )
    
    # Email details
    from_email = models.EmailField()
    from_name = models.CharField(max_length=100, blank=True)
    to_email = models.EmailField()
    reply_to = models.EmailField(blank=True)
    
    subject = models.CharField(max_length=998)
    html_content = models.TextField()
    text_content = models.TextField(blank=True)
    
    # Provider reference
    provider_message_id = models.CharField(
        max_length=200,
        blank=True,
        db_index=True,
        help_text="Message ID from the provider"
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )
    
    # Error tracking
    error_message = models.TextField(blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=3)
    
    # Engagement tracking
    open_count = models.PositiveIntegerField(default=0)
    click_count = models.PositiveIntegerField(default=0)
    unique_opens = models.PositiveIntegerField(default=0)
    unique_clicks = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When email should be sent"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    clicked_at = models.DateTimeField(null=True, blank=True)
    bounced_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional send metadata"
    )
    
    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Email Send"
        verbose_name_plural = "Email Sends"
        indexes = [
            models.Index(fields=["recipient", "status"]),
            models.Index(fields=["status", "scheduled_at"]),
            models.Index(fields=["provider_message_id"]),
            models.Index(fields=["sent_at"]),
        ]
    
    def __str__(self):
        return f"Email to {self.to_email} - {self.status}"
    
    def mark_sent(self, message_id: str = None):
        """Mark email as sent"""
        self.status = self.Status.SENT
        self.sent_at = timezone.now()
        if message_id:
            self.provider_message_id = message_id
        self.save(update_fields=["status", "sent_at", "provider_message_id"])
    
    def mark_delivered(self):
        """Mark email as delivered"""
        self.status = self.Status.DELIVERED
        self.delivered_at = timezone.now()
        self.save(update_fields=["status", "delivered_at"])
    
    def mark_opened(self):
        """Mark email as opened"""
        now = timezone.now()
        self.open_count += 1
        if self.unique_opens == 0:
            self.unique_opens = 1
            self.opened_at = now
            self.status = self.Status.OPENED
        self.save(update_fields=["status", "open_count", "unique_opens", "opened_at"])
    
    def mark_clicked(self, url: str = None):
        """Mark email as clicked"""
        now = timezone.now()
        self.click_count += 1
        if self.unique_clicks == 0:
            self.unique_clicks = 1
            self.clicked_at = now
            self.status = self.Status.CLICKED
        self.save(update_fields=["status", "click_count", "unique_clicks", "clicked_at"])
    
    def mark_bounced(self, bounce_type: str = "hard", error: str = ""):
        """Mark email as bounced"""
        self.status = self.Status.BOUNCED
        self.bounced_at = timezone.now()
        self.error_message = error
        self.error_code = bounce_type
        self.save(update_fields=["status", "bounced_at", "error_message", "error_code"])
    
    def mark_failed(self, error: str, error_code: str = ""):
        """Mark email as failed"""
        self.status = self.Status.FAILED
        self.failed_at = timezone.now()
        self.error_message = error
        self.error_code = error_code
        self.retry_count += 1
        self.save(update_fields=["status", "failed_at", "error_message", "error_code", "retry_count"])
    
    def can_retry(self) -> bool:
        """Check if send can be retried"""
        return (
            self.status == self.Status.FAILED and
            self.retry_count < self.max_retries
        )


class EmailEvent(models.Model):
    """
    Email event tracking.
    Records all events for an email send (opens, clicks, etc).
    """
    class EventType(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        DEFERRED = "deferred", "Deferred"
        BOUNCE = "bounce", "Bounce"
        DROPPED = "dropped", "Dropped"
        OPEN = "open", "Open"
        CLICK = "click", "Click"
        SPAM_REPORT = "spam_report", "Spam Report"
        UNSUBSCRIBE = "unsubscribe", "Unsubscribe"
        GROUP_UNSUBSCRIBE = "group_unsubscribe", "Group Unsubscribe"
        GROUP_RESUBSCRIBE = "group_resubscribe", "Group Resubscribe"
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    send = models.ForeignKey(
        EmailSend,
        on_delete=models.CASCADE,
        related_name="events"
    )
    
    # Event details
    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        default=timezone.now,
        help_text="When the event occurred"
    )
    
    # Click tracking
    url = models.URLField(
        max_length=2000,
        blank=True,
        help_text="Clicked URL (for click events)"
    )
    
    # Client info
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the client"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string"
    )
    
    # Device/Client parsed info
    device_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="Device type (desktop, mobile, tablet)"
    )
    client_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Email client name"
    )
    client_os = models.CharField(
        max_length=100,
        blank=True,
        help_text="Operating system"
    )
    
    # Location (from IP)
    country = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Provider event data
    provider_event_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="Event ID from provider"
    )
    
    # Additional metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional event data"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Email Event"
        verbose_name_plural = "Email Events"
        indexes = [
            models.Index(fields=["send", "event_type"]),
            models.Index(fields=["event_type", "timestamp"]),
            models.Index(fields=["timestamp"]),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.send.to_email}"
