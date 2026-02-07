import logging
import secrets

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(queue="analytics")
def flush_event_buffer():
    from funnelcube.services.event_buffer import flush_buffer

    count = flush_buffer()
    if count:
        logger.info("flush_event_buffer: flushed %d events", count)
    return count


@shared_task(queue="analytics")
def rotate_daily_salt():
    from funnelcube.models import AnalyticsProject, AnalyticsSalt

    today = timezone.now().date()
    projects = AnalyticsProject.objects.filter(is_active=True)
    created = 0
    for project in projects:
        _, was_created = AnalyticsSalt.objects.get_or_create(
            project=project,
            date=today,
            defaults={"salt": secrets.token_hex(32)},
        )
        if was_created:
            created += 1

    # Clean old salts (older than 3 days)
    cutoff = today - timezone.timedelta(days=3)
    deleted, _ = AnalyticsSalt.objects.filter(date__lt=cutoff).delete()
    logger.info("rotate_daily_salt: created=%d, cleaned=%d", created, deleted)


@shared_task(queue="analytics")
def generate_insights(project_id):
    logger.info("generate_insights for project %s (placeholder)", project_id)


@shared_task(queue="analytics")
def refresh_geoip_database():
    from funnelcube.services.geo_service import refresh_database
    result = refresh_database()
    logger.info("refresh_geoip_database: success=%s", result)
    return result
