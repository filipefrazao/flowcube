import hashlib
import secrets
from datetime import date

from django.utils import timezone

from funnelcube.models import AnalyticsSalt


def get_daily_salt(project):
    today = timezone.now().date()
    salt_obj, created = AnalyticsSalt.objects.get_or_create(
        project=project,
        date=today,
        defaults={"salt": secrets.token_hex(32)},
    )
    return salt_obj.salt


def generate_device_id(ip, user_agent, salt):
    raw = f"{ip}:{user_agent}:{salt}"
    return hashlib.sha256(raw.encode()).hexdigest()
