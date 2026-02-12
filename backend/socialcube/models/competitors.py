from django.conf import settings
from django.db import models
from .accounts import SocialPlatform


class Competitor(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="competitors",
    )
    platform = models.CharField(max_length=20, choices=SocialPlatform.choices)
    username = models.CharField(max_length=255)
    platform_user_id = models.CharField(max_length=255, blank=True)
    display_name = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "platform", "username"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Competitor @{self.username} ({self.get_platform_display()})"


class CompetitorSnapshot(models.Model):
    competitor = models.ForeignKey(
        Competitor, on_delete=models.CASCADE, related_name="snapshots"
    )
    date = models.DateField()
    followers = models.PositiveIntegerField(default=0)
    posts_count = models.PositiveIntegerField(default=0)
    avg_likes = models.FloatField(default=0.0)
    avg_comments = models.FloatField(default=0.0)
    engagement_rate = models.FloatField(default=0.0)
    top_hashtags = models.JSONField(default=list, blank=True)

    class Meta:
        unique_together = ["competitor", "date"]
        ordering = ["-date"]

    def __str__(self):
        return f"Snapshot {self.competitor} - {self.date}"
