import json
import logging
import uuid
from datetime import datetime

from django.conf import settings
from django.utils import timezone
import redis

logger = logging.getLogger(__name__)

BUFFER_KEY = "funnelcube:event_buffer"
BATCH_SIZE = 4000


def _get_redis():
    redis_url = getattr(settings, "CELERY_BROKER_URL", "redis://flowcube-redis:6379/3")
    return redis.from_url(redis_url)


def push_event(event_data: dict):
    r = _get_redis()
    r.lpush(BUFFER_KEY, json.dumps(event_data, default=str))


def flush_buffer():
    from funnelcube.models import AnalyticsEvent
    from funnelcube.services.session_manager import update_session

    r = _get_redis()
    events_to_create = []
    count = 0

    while count < BATCH_SIZE:
        raw = r.rpop(BUFFER_KEY)
        if raw is None:
            break
        count += 1
        try:
            data = json.loads(raw)
            event = AnalyticsEvent(
                id=uuid.uuid4(),
                project_id=data["project_id"],
                name=data["name"],
                device_id=data.get("device_id", ""),
                profile_id=data.get("profile_id", ""),
                session_id=data.get("session_id", ""),
                path=data.get("path", ""),
                origin=data.get("origin", ""),
                referrer=data.get("referrer", ""),
                referrer_name=data.get("referrer_name", ""),
                referrer_type=data.get("referrer_type", ""),
                revenue=data.get("revenue", 0),
                duration=data.get("duration", 0),
                properties=data.get("properties", {}),
                country=data.get("country", ""),
                city=data.get("city", ""),
                region=data.get("region", ""),
                longitude=data.get("longitude"),
                latitude=data.get("latitude"),
                os=data.get("os", ""),
                os_version=data.get("os_version", ""),
                browser=data.get("browser", ""),
                browser_version=data.get("browser_version", ""),
                device=data.get("device", ""),
                brand=data.get("brand", ""),
                model_name=data.get("model_name", ""),
                created_at=data.get("created_at", timezone.now()),
            )
            events_to_create.append(event)

            update_session(
                project_id=data["project_id"],
                session_id=data.get("session_id", ""),
                device_id=data.get("device_id", ""),
                profile_id=data.get("profile_id", ""),
                event_name=data["name"],
                path=data.get("path", ""),
                referrer=data.get("referrer", ""),
                utm_source=data.get("utm_source", ""),
                utm_medium=data.get("utm_medium", ""),
                utm_campaign=data.get("utm_campaign", ""),
                country=data.get("country", ""),
                city=data.get("city", ""),
                device=data.get("device", ""),
                browser=data.get("browser", ""),
                os=data.get("os", ""),
                revenue=data.get("revenue", 0),
                timestamp=data.get("created_at", timezone.now()),
            )
        except Exception:
            logger.exception("Failed to parse buffered event")

    if events_to_create:
        AnalyticsEvent.objects.bulk_create(events_to_create, ignore_conflicts=True)
        logger.info("Flushed %d events to database", len(events_to_create))

    return len(events_to_create)
