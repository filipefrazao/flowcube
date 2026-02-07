import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import WhatsAppInstance

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=WhatsAppInstance)
def whatsapp_instance_pre_save(sender, instance: WhatsAppInstance, **kwargs):
    if not instance.pk:
        instance._previous_status = None  # type: ignore[attr-defined]
        return

    try:
        instance._previous_status = sender.objects.only("status").get(pk=instance.pk).status  # type: ignore[attr-defined]
    except sender.DoesNotExist:
        instance._previous_status = None  # type: ignore[attr-defined]


@receiver(post_save, sender=WhatsAppInstance)
def whatsapp_instance_post_save(sender, instance: WhatsAppInstance, created: bool, **kwargs):
    if created:
        logger.info(
            "WhatsAppInstance created id=%s owner_id=%s name=%s status=%s",
            instance.id,
            instance.owner_id,
            instance.name,
            instance.status,
        )
        return

    prev = getattr(instance, "_previous_status", None)
    if prev and prev != instance.status:
        logger.info(
            "WhatsAppInstance status changed id=%s owner_id=%s %s -> %s",
            instance.id,
            instance.owner_id,
            prev,
            instance.status,
        )

