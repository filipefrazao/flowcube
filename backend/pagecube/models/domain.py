from django.db import models


class CustomDomain(models.Model):
    page = models.OneToOneField(
        'pagecube.Page',
        on_delete=models.CASCADE,
        related_name='domain',
    )
    domain = models.CharField(max_length=255, unique=True)
    ssl_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('active', 'Active'),
            ('failed', 'Failed'),
        ],
        default='pending',
    )
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    dns_target = models.CharField(
        max_length=255,
        default='flowcube.frzgroup.com.br',
    )
    traefik_config_path = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagecube_custom_domain'

    def __str__(self):
        return self.domain
