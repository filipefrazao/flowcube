from django.conf import settings
from django.db import models


class PostStatus(models.TextChoices):
    DRAFT = "draft", "Rascunho"
    SCHEDULED = "scheduled", "Agendado"
    PENDING_APPROVAL = "pending_approval", "Aguardando Aprovacao"
    APPROVED = "approved", "Aprovado"
    PUBLISHING = "publishing", "Publicando"
    PUBLISHED = "published", "Publicado"
    FAILED = "failed", "Falhou"
    CANCELLED = "cancelled", "Cancelado"


class MediaType(models.TextChoices):
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"
    CAROUSEL = "carousel", "Carousel"


class ScheduledPost(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scheduled_posts",
    )
    caption = models.TextField(blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=PostStatus.choices, default=PostStatus.DRAFT
    )
    hashtags = models.JSONField(default=list, blank=True)
    first_comment = models.TextField(blank=True)
    ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Post #{self.pk} - {self.get_status_display()}"


class PostMedia(models.Model):
    post = models.ForeignKey(
        ScheduledPost, on_delete=models.CASCADE, related_name="media"
    )
    file = models.FileField(upload_to="socialcube/media/%Y/%m/")
    media_type = models.CharField(
        max_length=10, choices=MediaType.choices, default=MediaType.IMAGE
    )
    thumbnail_url = models.URLField(max_length=500, blank=True)
    alt_text = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"Media #{self.pk} ({self.get_media_type_display()})"


class PostPlatform(models.Model):
    post = models.ForeignKey(
        ScheduledPost, on_delete=models.CASCADE, related_name="platforms"
    )
    account = models.ForeignKey(
        "socialcube.SocialAccount", on_delete=models.CASCADE, related_name="post_platforms"
    )
    platform_post_id = models.CharField(max_length=255, blank=True)
    status = models.CharField(
        max_length=20, choices=PostStatus.choices, default=PostStatus.DRAFT
    )
    error_message = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    permalink = models.URLField(max_length=500, blank=True)

    class Meta:
        unique_together = ["post", "account"]

    def __str__(self):
        return f"PostPlatform #{self.pk} - {self.account.platform}"
