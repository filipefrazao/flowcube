"""Register/update the periodic sync task in Celery Beat DB."""
from django.core.management.base import BaseCommand
from django_celery_beat.models import IntervalSchedule, PeriodicTask


class Command(BaseCommand):
    help = "Register SalesCube sync periodic task in Celery Beat"

    def handle(self, *args, **options):
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=5,
            period=IntervalSchedule.MINUTES,
        )
        task, created = PeriodicTask.objects.update_or_create(
            name="SalesCube: sync incremental PROD",
            defaults={
                "task": "salescube.tasks.sync_from_prod",
                "interval": schedule,
                "enabled": True,
                "description": "Sync incremental a cada 5 min via updated_after",
            },
        )
        action = "Criada" if created else "Atualizada"
        self.stdout.write(self.style.SUCCESS(f"{action}: \"{task.name}\" (cada 5 min)"))
