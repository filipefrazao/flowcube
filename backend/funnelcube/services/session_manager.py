import uuid
from datetime import timedelta

from django.utils import timezone

from funnelcube.models import AnalyticsSession

SESSION_TIMEOUT = timedelta(minutes=30)


def get_or_create_session(project_id, device_id, profile_id="", timestamp=None):
    now = timestamp or timezone.now()
    cutoff = now - SESSION_TIMEOUT

    session = (
        AnalyticsSession.objects.filter(
            project_id=project_id,
            device_id=device_id,
            created_at__gte=cutoff,
        )
        .order_by("-created_at")
        .first()
    )

    if session:
        return session.id

    session_id = str(uuid.uuid4())
    AnalyticsSession.objects.create(
        id=session_id,
        project_id=project_id,
        device_id=device_id,
        profile_id=profile_id,
        created_at=now,
    )
    return session_id


def update_session(
    project_id,
    session_id,
    device_id,
    profile_id="",
    event_name="",
    path="",
    referrer="",
    utm_source="",
    utm_medium="",
    utm_campaign="",
    country="",
    city="",
    device="",
    browser="",
    os="",
    revenue=0,
    timestamp=None,
):
    now = timestamp if isinstance(timestamp, str) is False else timezone.now()
    if isinstance(now, str):
        from django.utils.dateparse import parse_datetime
        now = parse_datetime(now) or timezone.now()

    try:
        session = AnalyticsSession.objects.get(id=session_id)
    except AnalyticsSession.DoesNotExist:
        session = AnalyticsSession(
            id=session_id,
            project_id=project_id,
            device_id=device_id,
            profile_id=profile_id,
            created_at=now,
            entry_path=path,
        )

    session.ended_at = now
    session.event_count = (session.event_count or 0) + 1
    session.exit_path = path

    if event_name == "screen_view":
        session.screen_view_count = (session.screen_view_count or 0) + 1

    if not session.entry_path and path:
        session.entry_path = path

    if session.created_at and now:
        try:
            session.duration = int((now - session.created_at).total_seconds())
        except (TypeError, AttributeError):
            pass

    session.is_bounce = session.screen_view_count <= 1

    if revenue:
        session.revenue = (session.revenue or 0) + revenue

    if profile_id and not session.profile_id:
        session.profile_id = profile_id
    if referrer and not session.referrer:
        session.referrer = referrer
    if utm_source and not session.utm_source:
        session.utm_source = utm_source
    if utm_medium and not session.utm_medium:
        session.utm_medium = utm_medium
    if utm_campaign and not session.utm_campaign:
        session.utm_campaign = utm_campaign
    if country and not session.country:
        session.country = country
    if city and not session.city:
        session.city = city
    if device and not session.device:
        session.device = device
    if browser and not session.browser:
        session.browser = browser
    if os and not session.os:
        session.os = os

    session.save()
