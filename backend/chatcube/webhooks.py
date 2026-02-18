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
        import datetime as _dt
        return _dt.datetime.fromtimestamp(ts, tz=_dt.timezone.utc)

    if isinstance(value, str):
        dt = parse_datetime(value)
        if dt is None:
            return timezone.now()
        if timezone.is_naive(dt):
            import datetime as _dt
            return dt.replace(tzinfo=_dt.timezone.utc)
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
        # Baileys engine sends: {event, instanceId, timestamp, data: {messageId, from, fromName, to, type, content, isGroup, groupId, timestamp}}
        message_data = payload.get("data") or payload.get("message") or payload

        # remote_jid: group JID for groups, sender JID for 1:1
        is_group = bool(message_data.get("isGroup") or message_data.get("is_group"))
        if is_group:
            remote_jid = (
                message_data.get("groupId")
                or message_data.get("group_id")
                or message_data.get("remote_jid")
                or message_data.get("remoteJid")
            )
        else:
            remote_jid = (
                message_data.get("remote_jid")
                or message_data.get("remoteJid")
                or message_data.get("from")
                or message_data.get("jid")
            )

        if not remote_jid:
            return {"ok": False, "detail": "Missing remote_jid."}

        message_type = (
            message_data.get("message_type")
            or message_data.get("messageType")
            or message_data.get("type")
            or "text"
        )
        content = message_data.get("content") or message_data.get("text") or ""
        media_url = message_data.get("media_url") or message_data.get("mediaUrl") or None
        wa_message_id = (
            message_data.get("wa_message_id")
            or message_data.get("waMessageId")
            or message_data.get("messageId")
            or message_data.get("id")
        )

        # from_me: engine doesn't send fromMe; infer from instance phone number
        from_me = bool(message_data.get("from_me") or message_data.get("fromMe") or False)
        if not from_me and instance.phone_number:
            sender = message_data.get("from") or ""
            from_me = bool(sender and instance.phone_number and sender.startswith(instance.phone_number))

        status = message_data.get("status") or ("sent" if from_me else "delivered")
        timestamp = _parse_timestamp(message_data.get("timestamp") or message_data.get("ts"))

        # Sender name: Baileys sends "fromName"
        sender_name = (
            message_data.get("fromName")
            or message_data.get("from_name")
            or message_data.get("name")
            or message_data.get("push_name")
            or message_data.get("pushName")
            or ""
        )

        defaults = {
            "remote_jid": remote_jid,
            "from_me": from_me,
            "message_type": message_type,
            "content": content,
            "media_url": media_url,
            "status": status,
            "timestamp": timestamp,
            "metadata": message_data,
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

        # Upsert conversation contact/group
        _upsert_contact_or_group(instance, remote_jid, name=sender_name, phone="")

        # For group messages, also upsert individual sender as contact
        if is_group:
            sender_jid = message_data.get("from") or ""
            if sender_jid and not sender_jid.endswith("@g.us"):
                _upsert_contact_or_group(instance, sender_jid, name=sender_name, phone="")

        if not remote_jid.endswith("@g.us"):
            Contact.objects.filter(instance=instance, jid=remote_jid).update(last_message_at=timestamp)

        if from_me and timestamp.date() == timezone.localdate():
            WhatsAppInstance.objects.filter(id=instance.id).update(messages_sent_today=F("messages_sent_today") + 1)

        return {"ok": True, "event": event, "message_id": str(msg.id), "created": created}

    if event == "message_status_update":
        message_data = payload.get("data") or payload.get("message") or payload
        wa_message_id = (
            message_data.get("wa_message_id")
            or message_data.get("waMessageId")
            or message_data.get("messageId")
            or message_data.get("id")
        )
        status = message_data.get("status")
        if not wa_message_id or not status:
            return {"ok": False, "detail": "Missing wa_message_id or status."}

        updated = Message.objects.filter(instance=instance, wa_message_id=wa_message_id).update(
            status=status,
            metadata=message_data,
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

    if event == "history_sync":
        data = payload.get("data") or payload
        messages = data.get("messages") or []
        imported = 0
        import datetime as _dt
        for item in messages:
            remote_jid = item.get("remoteJid") or ""
            wa_id = item.get("messageId") or ""
            from_me = bool(item.get("fromMe", False))
            msg_type_raw = item.get("messageType") or "conversation"
            msg_type_map = {"conversation": "text", "extendedTextMessage": "text", "imageMessage": "image", "videoMessage": "video", "audioMessage": "audio", "documentMessage": "document", "stickerMessage": "sticker", "locationMessage": "location", "reactionMessage": "reaction"}
            msg_type = msg_type_map.get(msg_type_raw, "text")
            ts = item.get("messageTimestamp")
            try:
                timestamp = _dt.datetime.fromtimestamp(int(ts), tz=_dt.timezone.utc) if ts else timezone.now()
            except Exception:
                timestamp = timezone.now()
            if not remote_jid or msg_type_raw == "protocolMessage":
                continue
            push_name = item.get("pushName") or ""
            msg_obj = item.get("message") or {}
            # Extract content
            content_str = msg_obj.get("conversation") or (msg_obj.get("extendedTextMessage") or {}).get("text") or ""
            if not content_str and msg_type_raw not in ("conversation", "extendedTextMessage"):
                content_str = f"[{msg_type_raw}]"
            if wa_id:
                _, created = Message.objects.update_or_create(
                    instance=instance,
                    wa_message_id=wa_id,
                    defaults={"remote_jid": remote_jid, "from_me": from_me, "message_type": msg_type, "content": content_str, "status": "read", "timestamp": timestamp, "metadata": item},
                )
            else:
                Message.objects.create(instance=instance, wa_message_id=None, remote_jid=remote_jid, from_me=from_me, message_type=msg_type, content=content_str, status="read", timestamp=timestamp, metadata=item)
                created = True
            if created:
                imported += 1
                sender_jid = item.get("participant") or remote_jid
                if sender_jid and not sender_jid.endswith("@g.us"):
                    phone = sender_jid.split("@")[0] if "@" in sender_jid else ""
                    Contact.objects.update_or_create(instance=instance, jid=sender_jid, defaults={"name": push_name, "phone": phone})
        sync_type = data.get("syncType", "")
        logger.info("history_sync: imported=%d sync_type=%s instance=%s", imported, sync_type, instance.id)
        return {"ok": True, "event": event, "imported": imported, "sync_type": sync_type}

    logger.warning("Unknown engine webhook event=%r payload_keys=%s", event, sorted(payload.keys()))
    return {"ok": False, "detail": f"Unknown event: {event}"}
