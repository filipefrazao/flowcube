from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Pipeline, PipelineStage


@receiver(post_save, sender=Pipeline)
def create_default_stages(sender, instance, created, **kwargs):
    if not created:
        return
    if not instance.is_default:
        return
    default_stages = [
        ("Novo", 0, "#94a3b8", 0),
        ("Qualificado", 1, "#3b82f6", 20),
        ("Proposta", 2, "#8b5cf6", 40),
        ("Negociacao", 3, "#f59e0b", 60),
        ("Ganho", 4, "#22c55e", 100),
        ("Perdido", 5, "#ef4444", 0),
    ]
    for name, order, color, probability in default_stages:
        PipelineStage.objects.create(
            pipeline=instance,
            name=name,
            order=order,
            color=color,
            probability=probability,
        )
