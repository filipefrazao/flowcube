from django.conf import settings
from django.db import models
from cryptography.fernet import Fernet


class SocialPlatform(models.TextChoices):
    INSTAGRAM = "instagram", "Instagram"
    FACEBOOK = "facebook", "Facebook"
    THREADS = "threads", "Threads"
    YOUTUBE = "youtube", "YouTube"
    TIKTOK = "tiktok", "TikTok"
    BLUESKY = "bluesky", "Bluesky"
    PINTEREST = "pinterest", "Pinterest"
    LINKEDIN = "linkedin", "LinkedIn"
    TWITTER = "twitter", "X/Twitter"


def _get_fernet():
    key = getattr(settings, "CREDENTIAL_ENCRYPTION_KEY", "")
    if not key:
        raise ValueError("CREDENTIAL_ENCRYPTION_KEY not set")
    return Fernet(key.encode() if isinstance(key, str) else key)


class SocialAccount(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="social_accounts",
    )
    platform = models.CharField(max_length=20, choices=SocialPlatform.choices)
    platform_user_id = models.CharField(max_length=255)
    username = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255, blank=True)
    profile_image_url = models.URLField(max_length=500, blank=True)
    _access_token = models.TextField(db_column="access_token")
    _refresh_token = models.TextField(db_column="refresh_token", blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    scopes = models.JSONField(default=list)
    metadata = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    connected_at = models.DateTimeField(auto_now_add=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["user", "platform", "platform_user_id"]
        ordering = ["-connected_at"]

    def __str__(self):
        return f"{self.get_platform_display()} - @{self.username}"

    # Encrypted token helpers
    @property
    def access_token(self):
        if not self._access_token:
            return ""
        try:
            return _get_fernet().decrypt(self._access_token.encode()).decode()
        except Exception:
            return self._access_token

    @access_token.setter
    def access_token(self, value):
        if value:
            self._access_token = _get_fernet().encrypt(value.encode()).decode()
        else:
            self._access_token = ""

    @property
    def refresh_token(self):
        if not self._refresh_token:
            return ""
        try:
            return _get_fernet().decrypt(self._refresh_token.encode()).decode()
        except Exception:
            return self._refresh_token

    @refresh_token.setter
    def refresh_token(self, value):
        if value:
            self._refresh_token = _get_fernet().encrypt(value.encode()).decode()
        else:
            self._refresh_token = ""
