import logging
import time
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .engine_client import EngineClient, EngineClientError
from .models import Campaign, Contact, Message, WhatsAppInstance

logger = logging.getLogger(__name__)

try:
    from celery import shared_task  # type: ignore
except Exception:  # pragma: no cover
    # Allows importing the app without Celery installed.
    def shared_task(*_args, **_kwargs):  # type: ignore
        def decorator(fn):  # type: ignore
            fn.delay = fn  # type: ignore[attr-defined]
            fn.apply_async = lambda args=None, kwargs=None, countdown=None: fn(*(args or []), **(kwargs or {}))  # type: ignore[attr-defined]
            return fn

        return decorator


# Warm-up schedule: progressive daily limit increase to avoid WhatsApp bans
# Format: (max_day, daily_limit) - applies when warmup_day <= max_day
WARMUP_SCHEDULE = [
    (3,  20),   # days 1-3:   20 msgs/day
    (7,  50),   # days 4-7:   50 msgs/day
    (14, 100),  # days 8-14:  100 msgs/day
    (30, 200),  # days 15-30: 200 msgs/day
]
WARMUP_FULL_LIMIT = 500  # limit after warm-up complete


@shared_task
def reset_daily_counters() -> Dict[str, Any]:
    """
    Reset daily message counters for all instances.
    Uses bulk UPDATE for non-warmup instances, individual for warmup.
    """
    # Bulk reset all counters in a single query
    total = WhatsAppInstance.objects.all().count()
    WhatsAppInstance.objects.all().update(messages_sent_today=0)

    # Handle warmup progression for Baileys instances only
    warmup_instances = WhatsAppInstance.objects.filter(
        engine="baileys", is_warmed_up=False
    )
    warmup_advanced = 0

    for instance in warmup_instances:
        new_day = instance.warmup_day + 1
        new_limit = WARMUP_FULL_LIMIT
        is_now_warmed_up = True

        for max_day, limit in WARMUP_SCHEDULE:
            if new_day <= max_day:
                new_limit = limit
                is_now_warmed_up = False
                break

        WhatsAppInstance.objects.filter(id=instance.id).update(
            warmup_day=new_day,
            daily_limit=new_limit,
            is_warmed_up=is_now_warmed_up,
        )
        warmup_advanced += 1

        if is_now_warmed_up:
            logger.info(
                "WhatsApp instance %s (%s) warm-up complete after %d days. Limit: %d/day",
                instance.id, instance.name, new_day, new_limit,
            )

    return {
        "instances_reset": total,
        "warmup_advanced": warmup_advanced,
    }


@shared_task
def health_check_instances() -> Dict[str, Any]:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    client = EngineClient()
    instances = list(
        WhatsAppInstance.objects.exclude(
            engine_instance_id__isnull=True
        ).exclude(engine_instance_id="").values_list("id", "engine_instance_id", named=True)
    )
    updated = 0
    errors: List[str] = []

    def _check_one(inst_id, engine_id):
        try:
            data = client.get_status(engine_id)
            eng_status = data.get("status") or (data.get("data") or {}).get("status")
            if not eng_status:
                return None
            update_fields: Dict[str, Any] = {"status": eng_status}
            if eng_status == "connected":
                update_fields["last_connected_at"] = timezone.now()
            return (inst_id, update_fields)
        except EngineClientError as e:
            return ("error", f"{inst_id}: {e}")

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(_check_one, inst.id, inst.engine_instance_id): inst
            for inst in instances
        }
        for future in as_completed(futures):
            result = future.result()
            if result is None:
                continue
            if result[0] == "error":
                errors.append(result[1])
            else:
                inst_id, update_fields = result
                WhatsAppInstance.objects.filter(id=inst_id).update(**update_fields)
                updated += 1

    return {"checked": len(instances), "updated": updated, "errors": errors}


def _normalize_recipients(recipients: Any) -> List[Union[str, Dict[str, Any]]]:
    if recipients is None:
        return []
    if isinstance(recipients, list):
        return recipients
    return []


def _safe_format_template(content: str, variables: Dict[str, Any]) -> str:
    class _SafeDict(dict):
        def __missing__(self, key):  # type: ignore[override]
            return ""

    try:
        return content.format_map(_SafeDict(variables))
    except Exception:
        # If the template uses a different placeholder convention, keep it as-is.
        return content


@shared_task(time_limit=600, soft_time_limit=540)
def run_campaign(campaign_id: str) -> Dict[str, Any]:
    """
    Send campaign messages in batches.

    Progress pointer is inferred as:
      attempted = sent_count + failed_count
    """

    client = EngineClient()
    try:
        campaign = Campaign.objects.select_related("instance", "template").get(id=campaign_id)
    except Campaign.DoesNotExist:
        return {"ok": False, "detail": "Campaign not found."}

    if campaign.status in {"completed", "failed"}:
        return {"ok": True, "detail": f"Campaign already {campaign.status}."}
    if campaign.status == "paused":
        return {"ok": True, "detail": "Campaign is paused."}

    now = timezone.now()
    if campaign.scheduled_at and now < campaign.scheduled_at:
        Campaign.objects.filter(id=campaign.id).update(status="scheduled")
        return {"ok": True, "detail": "Campaign is scheduled for the future."}

    if not campaign.template:
        Campaign.objects.filter(id=campaign.id).update(status="failed", completed_at=timezone.now())
        return {"ok": False, "detail": "Campaign has no template."}

    if not campaign.instance.engine_instance_id:
        Campaign.objects.filter(id=campaign.id).update(status="failed", completed_at=timezone.now())
        return {"ok": False, "detail": "Instance is not linked to engine (missing engine_instance_id)."}

    # Mark running.
    Campaign.objects.filter(id=campaign.id).update(status="running", started_at=campaign.started_at or now)

    recipients = _normalize_recipients(campaign.recipients)
    attempted_total = int(campaign.sent_count) + int(campaign.failed_count)
    batch = recipients[attempted_total : attempted_total + int(campaign.batch_size)]

    sent = 0
    failed = 0

    for rec in batch:
        # Allow pausing mid-batch.
        current_status = Campaign.objects.filter(id=campaign.id).values_list("status", flat=True).first()
        if current_status != "running":
            break

        jid: Optional[str] = None
        vars_map: Dict[str, Any] = {}
        if isinstance(rec, str):
            jid = rec
        elif isinstance(rec, dict):
            jid = rec.get("jid") or rec.get("to")
            vars_map = rec.get("variables") or rec.get("vars") or {}

        if not jid:
            Campaign.objects.filter(id=campaign.id).update(failed_count=F("failed_count") + 1)
            failed += 1
            continue

        content = _safe_format_template(campaign.template.content, vars_map)
        message_type = campaign.template.message_type
        media_url = campaign.template.media_url
        msg_ts = timezone.now()

        try:
            resp = client.send_message(
                campaign.instance.engine_instance_id,
                to=jid,
                message_type=message_type,
                content=content,
                media_url=media_url,
                metadata={"campaign_id": str(campaign.id), "variables": vars_map},
            )
            wa_message_id = resp.get("wa_message_id") or resp.get("waMessageId") or resp.get("id")

            Message.objects.create(
                instance=campaign.instance,
                remote_jid=jid,
                from_me=True,
                message_type=message_type,
                content=content,
                media_url=media_url,
                wa_message_id=wa_message_id,
                status="sent",
                timestamp=msg_ts,
                metadata={"campaign_id": str(campaign.id), "engine_response": resp, "variables": vars_map},
            )
            Campaign.objects.filter(id=campaign.id).update(sent_count=F("sent_count") + 1)
            sent += 1
        except EngineClientError as e:
            Message.objects.create(
                instance=campaign.instance,
                remote_jid=jid,
                from_me=True,
                message_type=message_type,
                content=content,
                media_url=media_url,
                wa_message_id=None,
                status="failed",
                timestamp=msg_ts,
                metadata={"campaign_id": str(campaign.id), "error": str(e), "variables": vars_map},
            )
            Campaign.objects.filter(id=campaign.id).update(failed_count=F("failed_count") + 1)
            failed += 1

        time.sleep(max(float(campaign.delay_between_messages_ms) / 1000.0, 0.0))

    # Decide whether we're done.
    campaign = Campaign.objects.get(id=campaign.id)
    attempted_total = int(campaign.sent_count) + int(campaign.failed_count)
    if attempted_total >= len(recipients):
        Campaign.objects.filter(id=campaign.id).update(status="completed", completed_at=timezone.now())
        return {"ok": True, "sent": sent, "failed": failed, "completed": True}

    # Re-queue next batch (if Celery is active). If Celery is not active, the caller can invoke again.
    try:
        run_campaign.apply_async(args=[str(campaign.id)], countdown=1)  # type: ignore[attr-defined]
    except Exception:
        logger.info("Celery apply_async not available; campaign will require manual re-run. id=%s", campaign.id)

    return {"ok": True, "sent": sent, "failed": failed, "completed": False}


@shared_task(time_limit=300, soft_time_limit=240)
def sync_contacts(instance_id: Optional[str] = None) -> Dict[str, Any]:
    client = EngineClient()
    qs = WhatsAppInstance.objects.all()
    if instance_id:
        qs = qs.filter(id=instance_id)

    synced_instances = 0
    upserted = 0
    errors: List[str] = []

    for instance in qs.exclude(engine_instance_id__isnull=True).exclude(engine_instance_id=""):
        try:
            data = client.get_contacts(instance.engine_instance_id)
            contacts = data.get("contacts") or data.get("data") or data
            if not isinstance(contacts, list):
                continue

            synced_instances += 1
            for c in contacts:
                if not isinstance(c, dict):
                    continue
                jid = c.get("jid") or c.get("id")
                if not jid:
                    continue
                Contact.objects.update_or_create(
                    instance=instance,
                    jid=jid,
                    defaults={
                        "name": c.get("name") or c.get("push_name") or c.get("pushName") or "",
                        "phone": c.get("phone") or "",
                        "profile_picture": c.get("profile_picture") or c.get("profilePicture"),
                        "is_business": bool(c.get("is_business") or c.get("isBusiness") or False),
                    },
                )
                upserted += 1
        except EngineClientError as e:
            errors.append(f"{instance.id}: {e}")

    return {"synced_instances": synced_instances, "contacts_upserted": upserted, "errors": errors}



