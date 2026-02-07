import uuid

from django.conf import settings
from django.db import models


class AnalyticsProject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="analytics_projects",
    )
    name = models.CharField(max_length=255)
    domain = models.CharField(max_length=255, blank=True, default="")
    timezone = models.CharField(max_length=50, default="America/Sao_Paulo")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class AnalyticsClient(models.Model):
    KEY_TYPE_CHOICES = [
        ("read", "Read"),
        ("write", "Write"),
        ("root", "Root"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(
        AnalyticsProject, on_delete=models.CASCADE, related_name="clients"
    )
    name = models.CharField(max_length=255)
    client_id = models.CharField(max_length=64, unique=True, db_index=True)
    client_secret = models.CharField(max_length=64)
    key_type = models.CharField(max_length=10, choices=KEY_TYPE_CHOICES, default="write")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.key_type})"


class AnalyticsEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(
        AnalyticsProject, on_delete=models.CASCADE, db_index=True
    )
    name = models.CharField(max_length=255, db_index=True)
    device_id = models.CharField(max_length=255)
    profile_id = models.CharField(max_length=255, blank=True, default="", db_index=True)
    session_id = models.CharField(max_length=255, db_index=True)
    path = models.TextField(blank=True, default="")
    origin = models.CharField(max_length=255, blank=True, default="")
    referrer = models.TextField(blank=True, default="")
    referrer_name = models.CharField(max_length=255, blank=True, default="")
    referrer_type = models.CharField(max_length=50, blank=True, default="")
    revenue = models.BigIntegerField(default=0)
    duration = models.BigIntegerField(default=0)
    properties = models.JSONField(default=dict, blank=True)
    # Geolocation
    country = models.CharField(max_length=2, blank=True, default="")
    city = models.CharField(max_length=255, blank=True, default="")
    region = models.CharField(max_length=255, blank=True, default="")
    longitude = models.FloatField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    # Device info
    os = models.CharField(max_length=100, blank=True, default="")
    os_version = models.CharField(max_length=50, blank=True, default="")
    browser = models.CharField(max_length=100, blank=True, default="")
    browser_version = models.CharField(max_length=50, blank=True, default="")
    device = models.CharField(max_length=50, blank=True, default="")
    brand = models.CharField(max_length=100, blank=True, default="")
    model_name = models.CharField(max_length=100, blank=True, default="")
    # Timestamps
    created_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["project", "created_at"]),
            models.Index(fields=["project", "name"]),
            models.Index(fields=["project", "profile_id"]),
        ]


class AnalyticsSession(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    project = models.ForeignKey(AnalyticsProject, on_delete=models.CASCADE)
    profile_id = models.CharField(max_length=255, blank=True, default="")
    device_id = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    is_bounce = models.BooleanField(default=False)
    entry_path = models.TextField(blank=True, default="")
    exit_path = models.TextField(blank=True, default="")
    screen_view_count = models.IntegerField(default=0)
    event_count = models.IntegerField(default=0)
    duration = models.IntegerField(default=0)
    revenue = models.FloatField(default=0)
    # UTM tracking
    utm_source = models.CharField(max_length=255, blank=True, default="")
    utm_medium = models.CharField(max_length=255, blank=True, default="")
    utm_campaign = models.CharField(max_length=255, blank=True, default="")
    utm_content = models.CharField(max_length=255, blank=True, default="")
    utm_term = models.CharField(max_length=255, blank=True, default="")
    # Referrer
    referrer = models.TextField(blank=True, default="")
    referrer_name = models.CharField(max_length=255, blank=True, default="")
    referrer_type = models.CharField(max_length=50, blank=True, default="")
    # Device/Geo
    country = models.CharField(max_length=2, blank=True, default="")
    city = models.CharField(max_length=255, blank=True, default="")
    device = models.CharField(max_length=50, blank=True, default="")
    browser = models.CharField(max_length=100, blank=True, default="")
    os = models.CharField(max_length=100, blank=True, default="")
    properties = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]


class AnalyticsProfile(models.Model):
    external_id = models.CharField(max_length=255, db_index=True)
    project = models.ForeignKey(AnalyticsProject, on_delete=models.CASCADE)
    is_external = models.BooleanField(default=False)
    first_name = models.CharField(max_length=255, blank=True, default="")
    last_name = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    avatar = models.URLField(blank=True, default="")
    properties = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["external_id", "project"]


class AnalyticsDashboard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(
        AnalyticsProject, on_delete=models.CASCADE, related_name="dashboards"
    )
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class AnalyticsReport(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(
        AnalyticsProject, on_delete=models.CASCADE, related_name="reports"
    )
    dashboard = models.ForeignKey(
        AnalyticsDashboard,
        on_delete=models.CASCADE,
        related_name="reports",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    chart_type = models.CharField(max_length=20)
    events = models.JSONField(default=list, blank=True)
    breakdowns = models.JSONField(default=list, blank=True)
    formula = models.CharField(max_length=500, blank=True, default="")
    interval = models.CharField(max_length=10, default="day")
    range = models.CharField(max_length=20, default="7d")
    previous = models.BooleanField(default=False)
    metric = models.CharField(max_length=20, default="sum")
    unit = models.CharField(max_length=20, blank=True, default="")
    options = models.JSONField(default=dict, blank=True)
    # Dashboard layout
    layout_x = models.IntegerField(default=0)
    layout_y = models.IntegerField(default=0)
    layout_w = models.IntegerField(default=6)
    layout_h = models.IntegerField(default=3)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class AnalyticsEventMeta(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(AnalyticsProject, on_delete=models.CASCADE)
    event_name = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, blank=True, default="")
    color = models.CharField(max_length=7, blank=True, default="")
    is_conversion = models.BooleanField(default=False)

    class Meta:
        unique_together = ["project", "event_name"]


class AnalyticsSalt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(AnalyticsProject, on_delete=models.CASCADE)
    salt = models.CharField(max_length=64)
    date = models.DateField()

    class Meta:
        unique_together = ["project", "date"]


class AnalyticsReference(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(AnalyticsProject, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class AnalyticsNotificationRule(models.Model):
    CONDITION_CHOICES = [
        ("spike", "Spike"),
        ("drop", "Drop"),
        ("threshold", "Threshold"),
    ]
    CHANNEL_CHOICES = [
        ("email", "Email"),
        ("webhook", "Webhook"),
        ("slack", "Slack"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey(AnalyticsProject, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    event_name = models.CharField(max_length=255)
    condition = models.CharField(max_length=50, choices=CONDITION_CHOICES)
    threshold = models.FloatField(default=0)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    channel_config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
