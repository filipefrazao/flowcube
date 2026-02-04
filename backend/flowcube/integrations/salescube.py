
# flowcube/integrations/salescube.py
from django.db import models
from django.contrib.postgres.fields import JSONField
from .integration_base import IntegrationBase
from salescube.models import Lead, Contact, Deal
from uuid import UUID


class LeadIntegration(IntegrationBase):
    class Meta:
        verbose_name = "Lead Integration"
        verbose_name_plural = "Leads Integrations"

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="flowcube_integrations"
    )
    external_id = models.CharField(max_length=255)
    data = JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Lead Integration {self.lead.id}"


class ContactIntegration(IntegrationBase):
    class Meta:
        verbose_name = "Contact Integration"
        verbose_name_plural = "Contacts Integrations"

    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="flowcube_integrations"
    )
    external_id = models.CharField(max_length=255)
    data = JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Contact Integration {self.contact.id}"


class DealIntegration(IntegrationBase):
    class Meta:
        verbose_name = "Deal Integration"
        verbose_name_plural = "Deals Integrations"

    deal = models.ForeignKey(
        Deal,
        on_delete=models.CASCADE,
        related_name="flowcube_integrations"
    )
    external_id = models.CharField(max_length=255)
    data = JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Deal Integration {self.deal.id}"
