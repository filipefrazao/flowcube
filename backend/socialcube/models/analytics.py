from django.db import models


class PostInsight(models.Model):
    post_platform = models.OneToOneField(
        "socialcube.PostPlatform",
        on_delete=models.CASCADE,
        related_name="insight",
    )
    impressions = models.PositiveIntegerField(default=0)
    reach = models.PositiveIntegerField(default=0)
    likes = models.PositiveIntegerField(default=0)
    comments = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)
    saves = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    video_views = models.PositiveIntegerField(default=0)
    engagement_rate = models.FloatField(default=0.0)
    fetched_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Insight for PostPlatform #{self.post_platform_id}"


class PlatformAnalytics(models.Model):
    account = models.ForeignKey(
        "socialcube.SocialAccount",
        on_delete=models.CASCADE,
        related_name="daily_analytics",
    )
    date = models.DateField()
    followers = models.PositiveIntegerField(default=0)
    followers_gained = models.IntegerField(default=0)
    profile_views = models.PositiveIntegerField(default=0)
    website_clicks = models.PositiveIntegerField(default=0)
    total_impressions = models.PositiveIntegerField(default=0)
    total_reach = models.PositiveIntegerField(default=0)
    total_engagement = models.PositiveIntegerField(default=0)
    best_posting_hour = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        unique_together = ["account", "date"]
        ordering = ["-date"]

    def __str__(self):
        return f"Analytics {self.account} - {self.date}"
