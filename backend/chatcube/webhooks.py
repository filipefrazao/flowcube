import logging
import time
from typing import Any, Dict, Optional, Tuple

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import Contact, Group, Message, WhatsAppInstance

logger = logging.getLogger(__name__)


def _parse_timestamp(value: Any):
    if value is None:
        return timezone.now()

    if isinstance(value, (int, float)):
        ts = float(value)
        if ts > 1_000_000_000_000:
            ts = ts / 1000.0
        return timezone.datetime.fromtimestamp(ts, tz=timezone.utc)

    if isinstance(value, str):
        dt = parse_datetime(value)
        if dt is None:
            return timezone.now()
        if timezone.is_naive(dt):
            return timezone.make_aware(dt, timezone=timezone.utc)
        return dt

    return timezone.now()


def _get_event(payload: Dict[str, Any]) -> str:
    return (payload.get("event") or payload.get("type") or payload.get("name") or "").strip()


def _resolve_instance(payload: Dict[str, Any]) -> WhatsAppInstance:
    """
    Resolve the WhatsApp instance from the webhook payload.

    Looks up by:
      1. Direct instance UUID (instance_id / instance_uuid / instance)
      2. Engine-assigned instance ID (engine_instance_id / engineInstanceId / instanceId)

    For engine_instance_id lookups, retries once after a short delay to handle
    the race condition where the engine sends events before Django finishes
    saving the engine_instance_id.
    """
    instance_id = payload.get("instance_id") or payload.get("instance_uuid") or payload.get("instance")
    engine_instance_id = (
        payload.get("engine_instance_id")
        or payload.get("engineInstanceId")
        or payload.get("instanceId")
    )

    # Try direct UUID lookup first
    if instance_id:
        try:
            return WhatsAppInstance.objects.get(id=instance_id)
        except (WhatsAppInstance.DoesNotExist, ValueError):
            pass

    # Try engine_instance_id lookup with retry for race condition
    if engine_instance_id:
        try:
            return WhatsAppInstance.objects.get(engine_instance_id=engine_instance_id)
        except WhatsAppInstance.DoesNotExist:
            # Race condition: engine sends webhook before Django saves engine_instance_id.
            # The engine uses the Django instance UUID as the engine_instance_id,
            # so we can also try looking up by primary key.
            try:
                return WhatsAppInstance.objects.get(id=engine_instance_id)
            except (WhatsAppInstance.DoesNotExist, ValueError):
                pass

            # Last resort: wait briefly and retry
            time.sleep(1.5)
            try:
                return WhatsAppInstance.objects.get(engine_instance_id=engine_instance_id)
            except WhatsAppInstance.DoesNotExist:
                try:
                    return WhatsAppInstance.objects.get(id=engine_instance_id)
                except (WhatsAppInstance.DoesNotExist, ValueError):
                    pass

    raise WhatsAppInstance.DoesNotExist(
        f"Missing instance identifier (instance_id={instance_id}, engine_instance_id={engine_instance_id})."
    )


def _upsert_contact_or_group(instance: WhatsAppInstance, remote_jid: str, *, name: str = "", phone: str = ""):
    if remote_jid.endswith("@g.us"):
        Group.objects.update_or_create(
            instance=instance,
            jid=remote_jid,
            defaults={
                "name": name or remote_jid,
            },
        )
        return

    Contact.objects.update_or_create(
        instance=instance,
        jid=remote_jid,
        defaults={
            "name": name or remote_jid,
            "phone": phone or "",
        },
    )


@transaction.atomic
def process_engine_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process webhook events emitted by chatcube-engine.

    Supported events:
      - message_received
      - message_status_update
      - instance_status_change
      - qr_code_update
    """

    event = _get_event(payload)
    instance = _resolve_instance(payload)

    if event == "message_received":
        message_data = payload.get("message") or payload.get("data") or payload

        remote_jid = message_data.get("remote_jid") or message_data.get("remoteJid") or message_data.get("jid")
        if not remote_jid:
            return {"ok": False, "detail": "Missing remote_jid."}

        from_me = bool(message_data.get("from_me") or message_data.get("fromMe") or False)
        message_type = message_data.get("message_type") or message_data.get("messageType") or message_data.get("type") or "text"
        content = message_data.get("content") or message_data.get("text") or ""
        media_url = message_data.get("media_url") or message_data.get("mediaUrl") or None
        wa_message_id = message_data.get("wa_message_id") or message_data.get("waMessageId") or message_data.get("id")
        status = message_data.get("status") or ("sent" if from_me else "delivered")
        timestamp = _parse_timestamp(message_data.get("timestamp") or message_data.get("ts"))

        defaults = {
            "remote_jid": remote_jid,
            "from_me": from_me,
            "message_type": message_type,
            "content": content,
            "media_url": media_url,
            "status": status,
            "timestamp": timestamp,
            "metadata": message_data.get("metadata") or message_data,
        }

        if wa_message_id:
            msg, created = Message.objects.update_or_create(
                instance=instance,
                wa_message_id=wa_message_id,
                defaults=defaults,
            )
        else:
            msg = Message.objects.create(instance=instance, wa_message_id=None, **defaults)
            created = True

        _upsert_contact_or_group(
            instance,
            remote_jid,
            name=message_data.get("name") or message_data.get("push_name") or message_data.get("pushName") or "",
            phone=message_data.get("phone") or "",
        )
        if not remote_jid.endswith("@g.us"):
            Contact.objects.filter(instance=instance, jid=remote_jid).update(last_message_at=timestamp)

        if from_me and timestamp.date() == timezone.localdate():
            WhatsAppInstance.objects.filter(id=instance.id).update(messages_sent_today=F("messages_sent_today") + 1)

        return {"ok": True, "event": event, "message_id": str(msg.id), "created": created}

    if event == "message_status_update":
        message_data = payload.get("message") or payload.get("data") or payload
        wa_message_id = message_data.get("wa_message_id") or message_data.get("waMessageId") or message_data.get("id")
        status = message_data.get("status")
        if not wa_message_id or not status:
            return {"ok": False, "detail": "Missing wa_message_id or status."}

        updated = Message.objects.filter(instance=instance, wa_message_id=wa_message_id).update(
            status=status,
            metadata=message_data.get("metadata") or message_data,
        )
        return {"ok": True, "event": event, "updated": int(updated)}

    if event == "instance_status_change":
        new_status = payload.get("status") or (payload.get("data") or {}).get("status")
        if not new_status:
            return {"ok": False, "detail": "Missing status."}

        update_fields = {"status": new_status}
        if new_status == "connected":
            update_fields["last_connected_at"] = timezone.now()
        WhatsAppInstance.objects.filter(id=instance.id).update(**update_fields)
        return {"ok": True, "event": event, "status": new_status}

    if event == "qr_code_update":
        WhatsAppInstance.objects.filter(id=instance.id).update(status="connecting")
        logger.info("QR code updated for instance id=%s", instance.id)
        return {"ok": True, "event": event}

    logger.warning("Unknown engine webhook event=%r payload_keys=%s", event, sorted(payload.keys()))
    return {"ok": False, "detail": f"Unknown event: {event}"}
