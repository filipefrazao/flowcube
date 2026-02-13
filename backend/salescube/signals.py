from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Lead, LeadActivity, Pipeline, PipelineStage


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


@receiver(pre_save, sender=Lead)
def track_lead_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = Lead.objects.get(pk=instance.pk)
    except Lead.DoesNotExist:
        return

    # Store old values for post_save signal
    instance._old_stage = old.stage
    instance._old_score = old.score
    instance._old_assigned_to = old.assigned_to


@receiver(post_save, sender=Lead)
def log_lead_activity(sender, instance, created, **kwargs):
    if created:
        LeadActivity.objects.create(
            lead=instance,
            action="lead_created",
            new_value=instance.name,
        )
        return

    old_stage = getattr(instance, "_old_stage", None)
    old_score = getattr(instance, "_old_score", None)
    old_assigned = getattr(instance, "_old_assigned_to", None)

    if old_stage and old_stage != instance.stage:
        LeadActivity.objects.create(
            lead=instance,
            action="stage_changed",
            old_value=old_stage.name if old_stage else "",
            new_value=instance.stage.name if instance.stage else "",
        )

    if old_assigned != instance.assigned_to:
        old_name = ""
        new_name = ""
        if old_assigned:
            old_name = old_assigned.get_full_name() or old_assigned.username
        if instance.assigned_to:
            new_name = instance.assigned_to.get_full_name() or instance.assigned_to.username
        LeadActivity.objects.create(
            lead=instance,
            action="assigned_changed",
            old_value=old_name,
            new_value=new_name,
        )

    if old_score is not None and old_score != instance.score:
        LeadActivity.objects.create(
            lead=instance,
            action="score_changed",
            old_value=str(old_score),
            new_value=str(instance.score),
        )
