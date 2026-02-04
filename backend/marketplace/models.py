"""
FlowCube 3.0 Marketplace Models
"""
from django.conf import settings
from django.db import models
from django.db.models import Avg
from workflows.models import Workflow
import uuid


class TemplateCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50)
    description = models.TextField()
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subcategories')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'categories'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Template(models.Model):
    class PricingType(models.TextChoices):
        FREE = 'free', 'Free'
        PAID = 'paid', 'Paid'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_templates')
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=300)
    description = models.TextField()
    long_description = models.TextField(blank=True)
    category = models.ForeignKey(TemplateCategory, on_delete=models.SET_NULL, null=True, related_name='templates')
    tags = models.JSONField(default=list, blank=True)
    workflow_data = models.JSONField()
    preview_image = models.URLField(blank=True)
    screenshots = models.JSONField(default=list, blank=True)
    pricing_type = models.CharField(max_length=10, choices=PricingType.choices, default=PricingType.FREE)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_featured = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    version = models.CharField(max_length=20, default='1.0.0')
    downloads_count = models.PositiveIntegerField(default=0)
    rating_avg = models.FloatField(default=0)
    rating_count = models.PositiveIntegerField(default=0)
    revenue_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-is_featured', '-rating_avg', '-downloads_count', '-created_at']

    def __str__(self):
        return self.name

    def update_rating(self):
        aggregate = self.reviews.aggregate(avg_rating=Avg('rating'), count=models.Count('id'))
        self.rating_avg = round(aggregate['avg_rating'] or 0, 2)
        self.rating_count = aggregate['count']
        self.save(update_fields=['rating_avg', 'rating_count'])

    def increment_downloads(self):
        self.downloads_count = models.F('downloads_count') + 1
        self.save(update_fields=['downloads_count'])
        self.refresh_from_db(fields=['downloads_count'])


class TemplatePurchase(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='purchases')
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='template_purchases')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)
    creator_revenue = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=50, blank=True)
    payment_id = models.CharField(max_length=255, blank=True)
    purchased_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['template', 'buyer']
        ordering = ['-purchased_at']

    def __str__(self):
        return f"{self.buyer} -> {self.template.name}"

    def save(self, *args, **kwargs):
        if not self.platform_fee or not self.creator_revenue:
            self.platform_fee = round(self.amount * 0.30, 2)
            self.creator_revenue = round(self.amount * 0.70, 2)
        super().save(*args, **kwargs)


class TemplateReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='template_reviews')
    rating = models.PositiveSmallIntegerField(choices=[(i, i) for i in range(1, 6)])
    title = models.CharField(max_length=255, blank=True)
    comment = models.TextField(blank=True)
    helpful_count = models.PositiveIntegerField(default=0)
    is_verified_purchase = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['template', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} -> {self.template.name} ({self.rating}/5)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.template.update_rating()


class TemplateVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='versions')
    version = models.CharField(max_length=20)
    workflow_data = models.JSONField()
    changelog = models.TextField()
    downloads_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        unique_together = ['template', 'version']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.template.name} v{self.version}"


class TemplateDownload(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='download_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='template_downloads')
    version = models.ForeignKey(TemplateVersion, on_delete=models.SET_NULL, null=True, blank=True)
    downloaded_at = models.DateTimeField(auto_now_add=True)
    workflow_created = models.ForeignKey(Workflow, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['-downloaded_at']

    def __str__(self):
        return f"{self.user} downloaded {self.template.name}"
