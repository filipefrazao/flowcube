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
    For Baileys instances still in warm-up: increment warmup_day
    and adjust daily_limit according to WARMUP_SCHEDULE.
    """
    instances = WhatsAppInstance.objects.all()
    reset_count = 0
    warmup_advanced = 0

    for instance in instances:
        update_fields: Dict[str, Any] = {"messages_sent_today": 0}

        if instance.engine == "baileys" and not instance.is_warmed_up:
            new_day = instance.warmup_day + 1
            new_limit = WARMUP_FULL_LIMIT
            is_now_warmed_up = True

            for max_day, limit in WARMUP_SCHEDULE:
                if new_day <= max_day:
                    new_limit = limit
                    is_now_warmed_up = False
                    break

            update_fields["warmup_day"] = new_day
            update_fields["daily_limit"] = new_limit
            update_fields["is_warmed_up"] = is_now_warmed_up
            warmup_advanced += 1

            if is_now_warmed_up:
                logger.info(
                    "WhatsApp instance %s (%s) warm-up complete after %d days. Limit: %d/day",
                    instance.id, instance.name, new_day, new_limit,
                )
            else:
                logger.info(
                    "WhatsApp instance %s (%s) warm-up day %d. Limit: %d/day",
                    instance.id, instance.name, new_day, new_limit,
                )

        WhatsAppInstance.objects.filter(id=instance.id).update(**update_fields)
        reset_count += 1

    return {
        "instances_reset": reset_count,
        "warmup_advanced": warmup_advanced,
    }


@shared_task
def health_check_instances() -> Dict[str, Any]:
    client = EngineClient()
    checked = 0
    updated = 0
    errors: List[str] = []

    for instance in WhatsAppInstance.objects.exclude(engine_instance_id__isnull=True).exclude(engine_instance_id=""):
        checked += 1
        try:
            data = client.get_status(instance.engine_instance_id)
            status = data.get("status") or (data.get("data") or {}).get("status")
            if not status:
                continue

            update_fields: Dict[str, Any] = {"status": status}
            if status == "connected":
                update_fields["last_connected_at"] = timezone.now()

            rows = WhatsAppInstance.objects.filter(id=instance.id).update(**update_fields)
            updated += int(rows)
        except EngineClientError as e:
            errors.append(f"{instance.id}: {e}")

    return {"checked": checked, "updated": updated, "errors": errors}


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


@shared_task
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


@shared_task
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



# ============================================================================
# Evolution API: Historical Message Sync
# ============================================================================

import datetime as _dt
import httpx as _httpx


def _evo_extract_content(msg_obj: dict, msg_type: str) -> str:
    """Extract text content from an Evolution API message object."""
    if msg_type == "conversation":
        return msg_obj.get("conversation") or ""
    if msg_type == "extendedTextMessage":
        return (msg_obj.get("extendedTextMessage") or {}).get("text") or ""
    if msg_type == "imageMessage":
        return (msg_obj.get("imageMessage") or {}).get("caption") or "[Imagem]"
    if msg_type == "videoMessage":
        return (msg_obj.get("videoMessage") or {}).get("caption") or "[Vídeo]"
    if msg_type == "audioMessage":
        return "[Áudio]"
    if msg_type == "documentMessage":
        return (msg_obj.get("documentMessage") or {}).get("fileName") or "[Documento]"
    if msg_type == "stickerMessage":
        return "[Sticker]"
    if msg_type == "reactionMessage":
        return (msg_obj.get("reactionMessage") or {}).get("text") or "[Reação]"
    if msg_type == "locationMessage":
        loc = msg_obj.get("locationMessage") or {}
        lat = loc.get("degreesLatitude", "")
        lng = loc.get("degreesLongitude", "")
        return f"[Localização: {lat},{lng}]"
    if msg_type == "contactMessage":
        return "[Contato]"
    if msg_type == "pollCreationMessage":
        return (msg_obj.get("pollCreationMessage") or {}).get("name") or "[Enquete]"
    if msg_type == "protocolMessage":
        return ""
    return f"[{msg_type}]"


EVOLUTION_TYPE_MAP = {
    "conversation": "text",
    "extendedTextMessage": "text",
    "imageMessage": "image",
    "videoMessage": "video",
    "audioMessage": "audio",
    "documentMessage": "document",
    "stickerMessage": "sticker",
    "locationMessage": "location",
    "reactionMessage": "reaction",
}


@shared_task(bind=True, max_retries=2, name="chatcube.tasks.sync_evolution_history")
def sync_evolution_history(
    self,
    instance_uuid: str,
    evolution_instance_name: str,
    remote_jid: str = None,
    days_back: int = 90,
    page_size: int = 50,
):
    """
    Sync historical messages from Evolution API into ChatCube Message model.

    Args:
        instance_uuid: WhatsAppInstance UUID
        evolution_instance_name: Name in Evolution API (e.g. "febracises_comercial4")
        remote_jid: Specific chat JID to sync. If None, syncs all chats.
        days_back: How many days of history to fetch (max 90)
        page_size: Messages per API page
    """
    from django.conf import settings

    try:
        instance = WhatsAppInstance.objects.get(id=instance_uuid)
    except WhatsAppInstance.DoesNotExist:
        return {"error": f"Instance {instance_uuid} not found"}

    evo_url = getattr(settings, "EVOLUTION_API_URL", "https://evolution.frzgroup.com.br")
    evo_key = getattr(settings, "EVOLUTION_API_KEY", "")

    cutoff_ts = int((_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=days_back)).timestamp())

    stats = {"fetched": 0, "imported": 0, "skipped": 0, "errors": 0}

    try:
        with _httpx.Client(
            base_url=evo_url,
            headers={"apikey": evo_key, "Content-Type": "application/json"},
            timeout=30,
        ) as client:

            # Determine which chats to sync
            if remote_jid:
                jids_to_sync = [remote_jid]
            else:
                # Fetch all chats and filter to ones with recent activity
                resp = client.post(f"/chat/findChats/{evolution_instance_name}", json={})
                resp.raise_for_status()
                chats = resp.json()
                jids_to_sync = [c["remoteJid"] for c in chats if isinstance(c, dict) and c.get("remoteJid")]
                logger.info("sync_evolution_history: found %d chats for %s", len(jids_to_sync), evolution_instance_name)

            for jid in jids_to_sync:
                page = 1
                while True:
                    try:
                        body = {
                            "where": {"key": {"remoteJid": jid}},
                            "count": page_size,
                            "page": page,
                        }
                        resp = client.post(
                            f"/chat/findMessages/{evolution_instance_name}",
                            json=body,
                        )
                        resp.raise_for_status()
                        data = resp.json()
                    except Exception as exc:
                        logger.warning("sync_evolution_history: fetch failed jid=%s page=%d: %s", jid, page, exc)
                        stats["errors"] += 1
                        break

                    records = (data.get("messages") or {}).get("records") or []
                    total_pages = (data.get("messages") or {}).get("pages") or 1

                    if not records:
                        break

                    stop_early = False
                    for rec in records:
                        stats["fetched"] += 1
                        key = rec.get("key") or {}
                        wa_id = key.get("id")
                        from_me = bool(key.get("fromMe", False))
                        rec_remote_jid = key.get("remoteJid") or jid
                        msg_ts = rec.get("messageTimestamp")

                        # Stop if older than cutoff
                        if msg_ts and int(msg_ts) < cutoff_ts:
                            stop_early = True
                            break

                        msg_type_raw = rec.get("messageType") or "conversation"
                        msg_type = EVOLUTION_TYPE_MAP.get(msg_type_raw, "text")
                        msg_obj = rec.get("message") or {}
                        content = _evo_extract_content(msg_obj, msg_type_raw)
                        push_name = rec.get("pushName") or ""

                        # Resolve sender JID for group messages
                        sender_jid = (
                            key.get("participantAlt")
                            or key.get("participant")
                            or rec_remote_jid
                        )

                        # Timestamp
                        if msg_ts:
                            try:
                                timestamp = _dt.datetime.fromtimestamp(int(msg_ts), tz=_dt.timezone.utc)
                            except Exception:
                                timestamp = timezone.now()
                        else:
                            timestamp = timezone.now()

                        # Skip protocol/empty messages
                        if msg_type_raw == "protocolMessage":
                            stats["skipped"] += 1
                            continue

                        defaults = {
                            "remote_jid": rec_remote_jid,
                            "from_me": from_me,
                            "message_type": msg_type,
                            "content": content,
                            "status": "read",
                            "timestamp": timestamp,
                            "metadata": rec,
                        }

                        if wa_id:
                            _, created = Message.objects.update_or_create(
                                instance=instance,
                                wa_message_id=wa_id,
                                defaults=defaults,
                            )
                        else:
                            Message.objects.create(instance=instance, wa_message_id=None, **defaults)
                            created = True

                        if created:
                            stats["imported"] += 1
                        else:
                            stats["skipped"] += 1

                        # Upsert contact/group
                        is_group = rec_remote_jid.endswith("@g.us")
                        if is_group:
                            from .models import Group
                            Group.objects.get_or_create(instance=instance, jid=rec_remote_jid)
                            if sender_jid and not sender_jid.endswith("@g.us"):
                                phone = sender_jid.split("@")[0] if "@" in sender_jid else ""
                                Contact.objects.update_or_create(
                                    instance=instance,
                                    jid=sender_jid,
                                    defaults={"name": push_name, "phone": phone},
                                )
                        else:
                            phone = rec_remote_jid.split("@")[0] if "@" in rec_remote_jid else ""
                            Contact.objects.update_or_create(
                                instance=instance,
                                jid=rec_remote_jid,
                                defaults={"name": push_name, "phone": phone, "last_message_at": timestamp},
                            )

                    if stop_early or page >= total_pages:
                        break
                    page += 1

    except Exception as exc:
        logger.exception("sync_evolution_history: unexpected error")
        raise self.retry(exc=exc, countdown=120)

    logger.info("sync_evolution_history done: %s", stats)
    return {"status": "ok", "evolution_instance": evolution_instance_name, "stats": stats}
