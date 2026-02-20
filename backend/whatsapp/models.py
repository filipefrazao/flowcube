from django.conf import settings
from django.db import models
from workflows.models import Workflow


class WhatsAppFlow(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    workflow = models.ForeignKey(
        Workflow,
        on_delete=models.CASCADE,
        related_name='whatsapp_flows',
    )
    phone_number_id = models.CharField(max_length=255)
    flow_data = models.JSONField(default=dict)
    is_active = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class WhatsAppTemplate(models.Model):
    CATEGORY_CHOICES = [
        ('marketing', 'Marketing'),
        ('utility', 'Utility'),
        ('authentication', 'Authentication'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    language = models.CharField(max_length=10, default='pt_BR')
    header = models.JSONField(blank=True, null=True)
    body = models.TextField()
    footer = models.TextField(blank=True)
    buttons = models.JSONField(default=list)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    template_id = models.CharField(max_length=255, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.status})'


class WhatsAppInteraction(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('document', 'Document'),
        ('interactive', 'Interactive'),
        ('template', 'Template'),
    ]

    flow = models.ForeignKey(
        WhatsAppFlow,
        on_delete=models.CASCADE,
        related_name='interactions',
    )
    user_phone = models.CharField(max_length=20)
    user_name = models.CharField(max_length=255, blank=True)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES)
    message_data = models.JSONField()
    response = models.JSONField(blank=True, null=True)
    current_node = models.CharField(max_length=255, blank=True)
    flow_state = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f'{self.user_phone} → {self.flow.name} ({self.message_type})'


class WhatsAppConversation(models.Model):
    flow = models.ForeignKey(
        WhatsAppFlow,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    user_phone = models.CharField(max_length=20)
    user_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    current_node = models.CharField(max_length=255, blank=True)
    session_data = models.JSONField(default=dict)
    messages_sent = models.IntegerField(default=0)
    messages_received = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    last_interaction = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_interaction']
        constraints = [
            models.UniqueConstraint(
                fields=['flow', 'user_phone'],
                name='whatsapp_whatsappconversation_flow_id_user_phone_uniq',
            ),
        ]

    def __str__(self):
        status = 'active' if self.is_active else 'closed'
        return f'{self.user_phone} — {self.flow.name} ({status})'


class WhatsAppAnalytics(models.Model):
    flow = models.ForeignKey(
        WhatsAppFlow,
        on_delete=models.CASCADE,
        related_name='analytics',
    )
    date = models.DateField()
    messages_sent = models.IntegerField(default=0)
    messages_received = models.IntegerField(default=0)
    template_messages = models.IntegerField(default=0)
    conversations_started = models.IntegerField(default=0)
    conversations_completed = models.IntegerField(default=0)
    unique_users = models.IntegerField(default=0)
    avg_messages_per_conversation = models.FloatField(default=0.0)
    completion_rate = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'WhatsApp analytics'
        constraints = [
            models.UniqueConstraint(
                fields=['flow', 'date'],
                name='whatsapp_whatsappanalytics_flow_id_date_uniq',
            ),
        ]

    def __str__(self):
        return f'{self.flow.name} — {self.date}'
