from django.db import models


class FormSubmission(models.Model):
    form = models.ForeignKey(
        'pagecube.FormSchema',
        on_delete=models.CASCADE,
        related_name='submissions',
    )
    data = models.JSONField(default=dict)  # Submitted data
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    referrer = models.URLField(blank=True, max_length=500)
    utm_source = models.CharField(max_length=255, blank=True)
    utm_medium = models.CharField(max_length=255, blank=True)
    utm_campaign = models.CharField(max_length=255, blank=True)
    utm_content = models.CharField(max_length=255, blank=True)
    fbclid = models.CharField(max_length=255, blank=True)
    gclid = models.CharField(max_length=255, blank=True)
    distributed = models.BooleanField(default=False)
    distributed_at = models.DateTimeField(null=True, blank=True)
    distribution_result = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pagecube_form_submission'
        ordering = ['-created_at']

    def __str__(self):
        return f"Submission #{self.pk} - {self.form.name}"
