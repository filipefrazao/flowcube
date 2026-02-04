from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from .models import Subscription, Plan, PlanTier, UsageMetrics

User = get_user_model()


@receiver(post_save, sender=User)
def create_free_subscription(sender, instance, created, **kwargs):
    """
    Cria assinatura Free automaticamente para novos usuários
    """
    if created:
        try:
            # Get Free plan
            free_plan = Plan.objects.get(tier=PlanTier.FREE)

            # Calculate period
            now = timezone.now()
            period_end = now + timedelta(days=30)

            # Create subscription
            Subscription.objects.create(
                user=instance,
                plan=free_plan,
                status='active',
                current_period_start=now,
                current_period_end=period_end,
                trial_ends_at=now + timedelta(days=free_plan.trial_days) if free_plan.trial_days > 0 else None
            )

            # Create initial usage metrics
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            UsageMetrics.objects.create(
                user=instance,
                month=month_start.date()
            )

        except Plan.DoesNotExist:
            # Free plan not configured yet
            pass


@receiver(post_save, sender=Subscription)
def initialize_usage_metrics(sender, instance, created, **kwargs):
    """
    Inicializa métricas de uso ao criar assinatura
    """
    if created:
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        UsageMetrics.objects.get_or_create(
            user=instance.user,
            month=month_start.date()
        )
