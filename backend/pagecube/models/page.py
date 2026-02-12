from django.conf import settings
from django.db import models


class Page(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pages',
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('published', 'Published'),
            ('archived', 'Archived'),
        ],
        default='draft',
    )
    puck_data = models.JSONField(default=dict, blank=True)  # Puck editor state
    html_cache = models.TextField(blank=True, default='')  # Pre-rendered HTML
    css_cache = models.TextField(blank=True, default='')  # Pre-rendered CSS
    meta_title = models.CharField(max_length=255, blank=True)
    meta_description = models.TextField(blank=True)
    og_image = models.URLField(blank=True)
    favicon_url = models.URLField(blank=True)
    custom_scripts = models.TextField(blank=True)  # Custom JS (tracking pixels etc)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagecube_page'
        ordering = ['-updated_at']

    def __str__(self):
        return self.title
