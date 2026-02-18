from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()


class WhatsAppInstance(models.Model):
    """Uma instancia WhatsApp conectada"""
    ENGINE_CHOICES = [
        ("baileys", "Baileys (Unofficial)"),
        ("cloud_api", "Cloud API (Official)"),
    ]
    STATUS_CHOICES = [
        ("connected", "Connected"),
        ("connecting", "Connecting"),
        ("disconnected", "Disconnected"),
        ("banned", "Banned"),
        ("timeout", "Timeout"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="whatsapp_instances")
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20, blank=True)
    engine = models.CharField(max_length=20, choices=ENGINE_CHOICES, default="baileys")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="disconnected")
    quality_rating = models.CharField(max_length=10, blank=True, null=True)
    profile_picture = models.URLField(blank=True, null=True)

    # Cloud API specific
    phone_number_id = models.CharField(max_length=50, blank=True, null=True)
    waba_id = models.CharField(max_length=50, blank=True, null=True)
    access_token = models.TextField(blank=True, null=True)

    # Webhook config
    webhook_url = models.URLField(blank=True, null=True)
    webhook_secret = models.CharField(max_length=64, blank=True, null=True)
    webhook_events = models.JSONField(default=list)

    # Anti-ban (warm-up desativado — ilimitado por padrão)
    is_warmed_up = models.BooleanField(default=True)
    messages_sent_today = models.IntegerField(default=0)
    daily_limit = models.IntegerField(default=999999)
    warmup_day = models.IntegerField(default=30)

    # Engine internal reference
    engine_instance_id = models.CharField(max_length=100, blank=True, null=True)
    evolution_instance_name = models.CharField(max_length=100, blank=True, null=True, help_text="Nome da instância na Evolution API para sync de histórico")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_connected_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "WhatsApp Instance"
        verbose_name_plural = "WhatsApp Instances"

    def __str__(self):
        return f"{self.name} ({self.phone_number}) - {self.status}"


class Message(models.Model):
    MESSAGE_TYPE_CHOICES = [
        ("text", "Text"),
        ("image", "Image"),
        ("video", "Video"),
        ("audio", "Audio"),
        ("document", "Document"),
        ("sticker", "Sticker"),
        ("location", "Location"),
        ("reaction", "Reaction"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("read", "Read"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instance = models.ForeignKey(WhatsAppInstance, on_delete=models.CASCADE, related_name="messages")
    remote_jid = models.CharField(max_length=255)
    from_me = models.BooleanField(default=False)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES, default="text")
    content = models.TextField(blank=True, default="")
    media_url = models.URLField(blank=True, null=True)
    wa_message_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    timestamp = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["instance", "-timestamp"]),
            models.Index(fields=["remote_jid", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.instance.name} -> {self.remote_jid} ({self.message_type}/{self.status})"


class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instance = models.ForeignKey(WhatsAppInstance, on_delete=models.CASCADE, related_name="contacts")
    jid = models.CharField(max_length=255)
    name = models.CharField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    profile_picture = models.URLField(blank=True, null=True)
    is_business = models.BooleanField(default=False)
    last_message_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["jid"]
        constraints = [
            models.UniqueConstraint(fields=["instance", "jid"], name="uniq_contact_instance_jid"),
        ]

    def __str__(self):
        return f"{self.name or self.jid} ({self.instance.name})"


class Group(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    instance = models.ForeignKey(WhatsAppInstance, on_delete=models.CASCADE, related_name="groups")
    jid = models.CharField(max_length=255)
    name = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    participants_count = models.IntegerField(default=0)
    is_admin = models.BooleanField(default=False)
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_groups",
    )

    class Meta:
        ordering = ["jid"]
        constraints = [
            models.UniqueConstraint(fields=["instance", "jid"], name="uniq_group_instance_jid"),
        ]

    def __str__(self):
        return f"{self.name or self.jid} ({self.instance.name})"


class MessageTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="message_templates")
    name = models.CharField(max_length=100)
    content = models.TextField()
    variables = models.JSONField(default=list, blank=True)
    message_type = models.CharField(max_length=20, choices=Message.MESSAGE_TYPE_CHOICES, default="text")
    media_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.owner_id})"


class GroupNote(models.Model):
    NOTE_TYPE_CHOICES = [
        ("note", "Nota"),
        ("call", "Ligação"),
        ("email", "E-mail"),
        ("meeting", "Reunião"),
        ("task", "Tarefa"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey("Group", on_delete=models.CASCADE, related_name="notes")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="group_notes")
    content = models.TextField()
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default="note")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.note_type} - {self.group.name} ({self.created_at:%Y-%m-%d})"


class GroupTask(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Baixa"),
        ("medium", "Média"),
        ("high", "Alta"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey("Group", on_delete=models.CASCADE, related_name="tasks")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="group_tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_completed = models.BooleanField(default=False)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["is_completed", "-created_at"]

    def __str__(self):
        return f"{self.title} ({'✓' if self.is_completed else '○'}) - {self.group.name}"


class Campaign(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("scheduled", "Scheduled"),
        ("running", "Running"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="campaigns")
    instance = models.ForeignKey(WhatsAppInstance, on_delete=models.CASCADE, related_name="campaigns")
    name = models.CharField(max_length=150)
    template = models.ForeignKey(
        MessageTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaigns",
    )
    recipients = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    sent_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    read_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)

    scheduled_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    delay_between_messages_ms = models.PositiveIntegerField(default=3000)
    batch_size = models.PositiveIntegerField(default=50)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.instance.name}) - {self.status}"
