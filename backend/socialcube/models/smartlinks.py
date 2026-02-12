from django.conf import settings
from django.db import models


class SmartLinkPage(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="smartlink_pages",
    )
    slug = models.SlugField(unique=True, max_length=100)
    title = models.CharField(max_length=255)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(max_length=500, blank=True)
    theme = models.JSONField(
        default=dict,
        blank=True,
        help_text="Theme config: colors, fonts, style",
    )
    is_active = models.BooleanField(default=True)
    total_views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"SmartLink /{self.slug}"


class SmartLinkButton(models.Model):
    page = models.ForeignKey(
        SmartLinkPage, on_delete=models.CASCADE, related_name="buttons"
    )
    label = models.CharField(max_length=100)
    url = models.URLField(max_length=500)
    icon = models.CharField(max_length=50, blank=True)
    order = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.label} -> {self.url}"
