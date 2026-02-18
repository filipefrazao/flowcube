from django.conf import settings
from django.db import models
from cryptography.fernet import Fernet


def _get_fernet():
    key = getattr(settings, "CREDENTIAL_ENCRYPTION_KEY", "")
    if not key:
        raise ValueError("CREDENTIAL_ENCRYPTION_KEY not set")
    return Fernet(key.encode() if isinstance(key, str) else key)


class LeadAdsAppConfig(models.Model):
    """Singleton: Meta App credentials for Lead Ads webhook."""

    app_id = models.CharField(max_length=64)
    _app_secret = models.TextField(db_column="app_secret")
    verify_token = models.CharField(max_length=128)
    webhook_url = models.CharField(max_length=500, blank=True)
    _system_user_token = models.TextField(db_column="system_user_token", default="", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "socialcube_leadads_appconfig"
        verbose_name = "Lead Ads App Config"

    def __str__(self):
        return f"LeadAds App {self.app_id}"

    # ── app_secret (encrypted) ───────────────────────────────

    @property
    def app_secret(self):
        if not self._app_secret:
            return ""
        try:
            return _get_fernet().decrypt(self._app_secret.encode()).decode()
        except Exception:
            return self._app_secret

    @app_secret.setter
    def app_secret(self, value):
        if value:
            self._app_secret = _get_fernet().encrypt(value.encode()).decode()
        else:
            self._app_secret = ""

    # ── system_user_token (encrypted) ────────────────────────

    @property
    def system_user_token(self):
        if not self._system_user_token:
            return ""
        try:
            return _get_fernet().decrypt(self._system_user_token.encode()).decode()
        except Exception:
            return self._system_user_token

    @system_user_token.setter
    def system_user_token(self, value):
        if value:
            self._system_user_token = _get_fernet().encrypt(value.encode()).decode()
        else:
            self._system_user_token = ""

    def save(self, *args, **kwargs):
        # Singleton: delete all others
        if not self.pk:
            LeadAdsAppConfig.objects.all().delete()
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        return cls.objects.first()


class LeadAdsConnection(models.Model):
    """Links a SocialAccount (Facebook page) to leadgen webhook subscription."""

    social_account = models.ForeignKey(
        "socialcube.SocialAccount",
        on_delete=models.CASCADE,
        related_name="leadads_connections",
        null=True,
        blank=True,
    )
    page_id = models.CharField(max_length=64, unique=True)
    page_name = models.CharField(max_length=255, blank=True)
    _page_access_token = models.TextField(db_column="page_access_token")
    is_subscribed = models.BooleanField(default=False)
    webhook_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "socialcube_leadads_connection"
        ordering = ["-created_at"]

    def __str__(self):
        return f"LeadAds: {self.page_name} ({self.page_id})"

    @property
    def page_access_token(self):
        if not self._page_access_token:
            return ""
        try:
            return _get_fernet().decrypt(self._page_access_token.encode()).decode()
        except Exception:
            return self._page_access_token

    @page_access_token.setter
    def page_access_token(self, value):
        if value:
            self._page_access_token = _get_fernet().encrypt(value.encode()).decode()
        else:
            self._page_access_token = ""


class LeadAdsForm(models.Model):
    """Individual lead form configuration."""

    DISTRIBUTION_CHOICES = [
        ("none", "No Distribution"),
        ("salescube", "SalesCube CRM"),
        ("webhook", "External Webhook"),
        ("workflow", "FlowCube Workflow"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("archived", "Archived"),
    ]

    connection = models.ForeignKey(
        LeadAdsConnection,
        on_delete=models.CASCADE,
        related_name="forms",
    )
    form_id = models.CharField(max_length=64, unique=True)
    form_name = models.CharField(max_length=255, blank=True)
    form_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    distribution_mode = models.CharField(max_length=20, choices=DISTRIBUTION_CHOICES, default="none")
    distribution_config = models.JSONField(default=dict, blank=True)
    leads_count = models.IntegerField(default=0)
    last_lead_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "socialcube_leadads_form"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Form: {self.form_name} ({self.form_id})"


class LeadEntry(models.Model):
    """Stored lead data from Facebook Lead Ads."""

    form = models.ForeignKey(
        LeadAdsForm,
        on_delete=models.CASCADE,
        related_name="leads",
    )
    leadgen_id = models.CharField(max_length=64, unique=True)
    data = models.JSONField(default=dict)
    name = models.CharField(max_length=255, blank=True)
    email = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=64, blank=True)
    distributed = models.BooleanField(default=False)
    distributed_at = models.DateTimeField(null=True, blank=True)
    distribution_result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "socialcube_leadads_entry"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Lead {self.leadgen_id}: {self.name or self.email or 'unknown'}"
