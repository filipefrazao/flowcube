from django.db import models


class FormSchema(models.Model):
    page = models.ForeignKey(
        'pagecube.Page',
        on_delete=models.CASCADE,
        related_name='forms',
    )
    name = models.CharField(max_length=255)
    schema = models.JSONField(default=dict)  # JSON Schema (rjsf compatible)
    ui_schema = models.JSONField(default=dict, blank=True)  # rjsf UI schema
    conditional_logic = models.JSONField(
        default=list, blank=True,
    )  # [{conditions, actions}]
    success_message = models.TextField(
        default='Obrigado! Recebemos seu envio.',
    )
    redirect_url = models.URLField(blank=True)
    distribution_mode = models.CharField(
        max_length=20,
        choices=[
            ('none', 'No Distribution'),
            ('salescube', 'SalesCube CRM'),
            ('webhook', 'External Webhook'),
            ('whatsapp', 'WhatsApp Message'),
        ],
        default='none',
    )
    distribution_config = models.JSONField(default=dict, blank=True)
    submissions_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagecube_form_schema'
        ordering = ['-created_at']

    def __str__(self):
        return self.name
