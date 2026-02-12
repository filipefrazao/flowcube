from django.db import models


class PageTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    thumbnail = models.URLField(blank=True)
    puck_data = models.JSONField(default=dict)
    category = models.CharField(
        max_length=50,
        choices=[
            ('landing_page', 'Landing Page'),
            ('form', 'Form Page'),
            ('webinar', 'Webinar'),
            ('launch', 'Product Launch'),
            ('lead_capture', 'Lead Capture'),
            ('thank_you', 'Thank You'),
        ],
        default='landing_page',
    )
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pagecube_template'
        ordering = ['name']

    def __str__(self):
        return self.name
