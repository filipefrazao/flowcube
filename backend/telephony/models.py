import uuid
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Extension(models.Model):
    """Maps a CRM user to a SIP extension on the PABX."""

    class Status(models.TextChoices):
        AVAILABLE = "AVAILABLE", _("Available")
        UNAVAILABLE = "UNAVAILABLE", _("Unavailable")
        ON_CALL = "ON_CALL", _("On Call")
        RINGING = "RINGING", _("Ringing")
        DND = "DND", _("Do Not Disturb")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="extension",
    )
    extension_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="SIP extension number, e.g., 1001",
    )
    sip_password = models.CharField(max_length=80)
    webrtc_enabled = models.BooleanField(default=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.UNAVAILABLE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["extension_number"]

    def __str__(self):
        return f"Ext {self.extension_number} ({self.user.get_full_name()})"


class CallRecord(models.Model):
    """Stores metadata for every call passing through the PABX."""

    class Direction(models.TextChoices):
        INBOUND = "INBOUND", _("Inbound")
        OUTBOUND = "OUTBOUND", _("Outbound")
        INTERNAL = "INTERNAL", _("Internal")

    class Status(models.TextChoices):
        RINGING = "RINGING", _("Ringing")
        ANSWERED = "ANSWERED", _("Answered")
        NO_ANSWER = "NO_ANSWER", _("No Answer")
        BUSY = "BUSY", _("Busy")
        FAILED = "FAILED", _("Failed")
        COMPLETED = "COMPLETED", _("Completed")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pabx_call_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique call ID from Asterisk",
    )
    direction = models.CharField(max_length=10, choices=Direction.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.RINGING
    )
    caller_number = models.CharField(max_length=50, db_index=True)
    callee_number = models.CharField(max_length=50, db_index=True)

    # CRM relationships
    lead = models.ForeignKey(
        "salescube.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )
    contact = models.ForeignKey(
        "salescube.Contact",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="calls",
    )

    # Timing
    start_time = models.DateTimeField(auto_now_add=True)
    answer_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)

    # Recording & Transcription
    recording_s3_key = models.CharField(
        max_length=512,
        null=True,
        blank=True,
        help_text="S3/MinIO object key for the recording file",
    )
    transcription = models.TextField(blank=True, null=True)
    transcription_status = models.CharField(
        max_length=20,
        default="pending",
        choices=[
            ("pending", "Pending"),
            ("processing", "Processing"),
            ("completed", "Completed"),
            ("failed", "Failed"),
            ("skipped", "Skipped"),
        ],
    )

    # Agent notes
    disposition = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Call outcome: Sale, Follow-up, Not Interested, etc.",
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-start_time"]
        indexes = [
            models.Index(fields=["caller_number", "start_time"]),
            models.Index(fields=["agent", "start_time"]),
        ]

    def __str__(self):
        return f"{self.direction} {self.caller_number} -> {self.callee_number}"


class VoicemailMessage(models.Model):
    """Voicemail messages left for extensions."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    extension = models.ForeignKey(
        Extension, on_delete=models.CASCADE, related_name="voicemails"
    )
    caller_number = models.CharField(max_length=50)
    duration = models.PositiveIntegerField(help_text="Duration in seconds")
    audio_s3_key = models.CharField(max_length=512)
    transcription = models.TextField(blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"VM for {self.extension} from {self.caller_number}"


class IVRMenu(models.Model):
    """Interactive Voice Response menu configuration."""

    name = models.CharField(max_length=100, unique=True)
    greeting_audio_s3_key = models.CharField(max_length=512, blank=True, default="")
    timeout_seconds = models.PositiveIntegerField(default=10)
    timeout_destination = models.CharField(
        max_length=100,
        help_text="e.g., queue:support or extension:1000",
    )
    invalid_destination = models.CharField(max_length=100)
    max_retries = models.PositiveIntegerField(default=3)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class IVROption(models.Model):
    """Individual menu option within an IVR."""

    class DestinationType(models.TextChoices):
        EXTENSION = "EXTENSION", _("Extension")
        QUEUE = "QUEUE", _("Call Queue")
        IVR_MENU = "IVR_MENU", _("IVR Menu")
        VOICEMAIL = "VOICEMAIL", _("Voicemail")
        EXTERNAL = "EXTERNAL", _("External Number")
        HANGUP = "HANGUP", _("Hangup")

    ivr_menu = models.ForeignKey(
        IVRMenu, on_delete=models.CASCADE, related_name="options"
    )
    digit = models.CharField(max_length=2, help_text="e.g., 1, 2, #")
    label = models.CharField(max_length=100, help_text="e.g., Vendas, Suporte")
    destination_type = models.CharField(
        max_length=20, choices=DestinationType.choices
    )
    destination_id = models.CharField(max_length=100)

    class Meta:
        unique_together = ("ivr_menu", "digit")
        ordering = ["ivr_menu", "digit"]

    def __str__(self):
        return f"[{self.digit}] {self.label} -> {self.destination_type}:{self.destination_id}"


class CallQueue(models.Model):
    """Call queue for distributing incoming calls to agents."""

    STRATEGY_CHOICES = [
        ("ringall", "Ring All"),
        ("leastrecent", "Least Recent"),
        ("fewestcalls", "Fewest Calls"),
        ("random", "Random"),
        ("rrmemory", "Round Robin (Memory)"),
    ]

    name = models.CharField(max_length=100, unique=True)
    strategy = models.CharField(
        max_length=50, choices=STRATEGY_CHOICES, default="ringall"
    )
    timeout = models.PositiveIntegerField(
        default=30, help_text="Ring timeout per agent (seconds)"
    )
    max_wait_time = models.PositiveIntegerField(
        default=300, help_text="Max caller wait time (seconds)"
    )
    music_on_hold = models.CharField(
        max_length=100, default="default", help_text="Music on hold class"
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class QueueMember(models.Model):
    """Maps extensions to call queues."""

    queue = models.ForeignKey(
        CallQueue, on_delete=models.CASCADE, related_name="members"
    )
    extension = models.ForeignKey(
        Extension, on_delete=models.CASCADE, related_name="queue_memberships"
    )
    priority = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("queue", "extension")
        ordering = ["queue", "priority"]

    def __str__(self):
        return f"{self.extension} in {self.queue} (P:{self.priority})"


class CallStats(models.Model):
    """Daily aggregated call statistics per agent."""

    date = models.DateField()
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="daily_call_stats",
    )
    total_calls = models.PositiveIntegerField(default=0)
    answered_calls = models.PositiveIntegerField(default=0)
    missed_calls = models.PositiveIntegerField(default=0)
    outbound_calls = models.PositiveIntegerField(default=0)
    avg_duration = models.FloatField(default=0.0)
    total_talk_time = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("date", "agent")
        ordering = ["-date", "agent"]

    def __str__(self):
        return f"Stats {self.agent} on {self.date}"
