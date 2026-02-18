"""
Conversation aggregation views for ChatCube.

Groups messages by (instance, remote_jid) and presents them as "conversations"
for the /conversations frontend page. This bridges the ChatCube messaging system
with the conversations UI.
"""
from django.core.exceptions import ValidationError
from django.db.models import Count, Max, Q, F, Value
from django.db.models.functions import Replace
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

from .models import Contact, Message, WhatsAppInstance
from .engine_client import EngineClient, EngineClientError
from .views import _ensure_engine_instance_id


def _phone_from_jid(jid: str) -> str:
    """Extract phone number from a WhatsApp JID like '5591918662660@s.whatsapp.net'."""
    return jid.split("@")[0] if "@" in jid else jid


def _normalize_jid(jid: str) -> str:
    """Ensure JID has the @s.whatsapp.net suffix for consistency."""
    if not jid:
        return jid
    phone = jid.split("@")[0] if "@" in jid else jid
    return f"{phone}@s.whatsapp.net"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversation_list(request):
    """
    List all conversations for the authenticated user's WhatsApp instances.

    A conversation = unique (instance, remote_jid) pair that has messages.
    Uses Contact for name/phone, falls back to parsing remote_jid.
    """
    user = request.user
    instance_ids = list(
        WhatsAppInstance.objects.filter(owner=user).values_list("id", flat=True)
    )

    if not instance_ids:
        return Response([])

    # Aggregate unique conversations from messages, normalizing JID format
    # Strip @s.whatsapp.net for consistent grouping (some msgs have it, some don't)
    convs = (
        Message.objects.filter(instance_id__in=instance_ids)
        .annotate(
            normalized_jid=Replace(
                "remote_jid", Value("@s.whatsapp.net"), Value("")
            )
        )
        .values("instance_id", "normalized_jid")
        .annotate(
            message_count=Count("id"),
            last_message_at=Max("timestamp"),
        )
        .order_by("-last_message_at")
    )

    # Build a lookup of contacts by (instance_id, phone) for flexible matching
    contacts = Contact.objects.filter(instance_id__in=instance_ids)
    contact_map = {}
    for c in contacts:
        phone = _phone_from_jid(c.jid)
        contact_map[(str(c.instance_id), phone)] = c

    # Build a lookup of instance names
    instances = WhatsAppInstance.objects.filter(id__in=instance_ids)
    instance_map = {str(i.id): i.name for i in instances}

    # Apply optional status / search filters
    search = request.query_params.get("search", "").strip().lower()

    result = []
    for conv in convs:
        inst_id = str(conv["instance_id"])
        phone = conv["normalized_jid"]
        contact = contact_map.get((inst_id, phone))

        contact_name = ""
        contact_phone = phone
        if contact:
            contact_name = contact.name or contact_phone
            contact_phone = contact.phone or contact_phone

        # Simple search filter
        if search:
            if search not in contact_name.lower() and search not in contact_phone.lower():
                continue

        # Use contact UUID as conversation ID if available, else composite
        conv_id = str(contact.id) if contact else f"{inst_id}_{phone}"

        result.append(
            {
                "id": conv_id,
                "contact_name": contact_name or contact_phone,
                "contact_phone": contact_phone,
                "status": "active",
                "message_count": conv["message_count"],
                "last_message_at": (
                    conv["last_message_at"].isoformat()
                    if conv["last_message_at"]
                    else None
                ),
                "instance_id": inst_id,
                "instance_name": instance_map.get(inst_id, ""),
            }
        )

    return Response(result)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversation_detail(request, conversation_id):
    """
    Get conversation detail with messages.

    conversation_id can be a Contact UUID or an "instance_id_remote_jid" composite.
    """
    user = request.user

    # Try to find by Contact UUID first
    contact = None
    instance = None
    remote_jid = None

    try:
        contact = Contact.objects.select_related("instance").get(
            id=conversation_id, instance__owner=user
        )
        instance = contact.instance
        remote_jid = contact.jid
    except (Contact.DoesNotExist, ValueError, ValidationError):
        # Try composite ID: "instance_id_remote_jid"
        if "_" in conversation_id:
            parts = conversation_id.split("_", 1)
            try:
                instance = WhatsAppInstance.objects.get(id=parts[0], owner=user)
                remote_jid = parts[1]
            except (WhatsAppInstance.DoesNotExist, ValueError, ValidationError):
                pass

    if not instance or not remote_jid:
        return Response({"detail": "Not found."}, status=http_status.HTTP_404_NOT_FOUND)

    # Get messages matching both JID formats (with and without @s.whatsapp.net)
    phone = _phone_from_jid(remote_jid)
    full_jid = _normalize_jid(remote_jid)
    messages = Message.objects.filter(
        instance=instance,
        remote_jid__in=[phone, full_jid],
    ).order_by("timestamp")

    contact_name = ""
    contact_phone = phone
    if contact:
        contact_name = contact.name or contact_phone
        contact_phone = contact.phone or contact_phone

    msg_data = [
        {
            "id": str(msg.id),
            "direction": "outbound" if msg.from_me else "inbound",
            "message_type": msg.message_type,
            "content": msg.content,
            "media_url": msg.media_url,
            "is_ai_generated": False,
            "ai_model": None,
            "created_at": msg.timestamp.isoformat(),
            "delivered_at": (
                msg.timestamp.isoformat()
                if msg.status in ("delivered", "read")
                else None
            ),
            "read_at": (
                msg.timestamp.isoformat() if msg.status == "read" else None
            ),
            "whatsapp_status": msg.status,
        }
        for msg in messages
    ]

    return Response(
        {
            "id": conversation_id,
            "contact_name": contact_name or contact_phone,
            "contact_phone": contact_phone,
            "status": "active",
            "message_count": len(msg_data),
            "last_message_at": (
                msg_data[-1]["created_at"] if msg_data else None
            ),
            "instance_id": str(instance.id),
            "instance_name": instance.name,
            "assigned_to": None,
            "messages": msg_data,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def conversation_send_message(request, conversation_id):
    """Send a message in a conversation."""
    user = request.user

    # Resolve conversation
    contact = None
    instance = None
    remote_jid = None

    try:
        contact = Contact.objects.select_related("instance").get(
            id=conversation_id, instance__owner=user
        )
        instance = contact.instance
        remote_jid = contact.jid
    except (Contact.DoesNotExist, ValueError, ValidationError):
        if "_" in conversation_id:
            parts = conversation_id.split("_", 1)
            try:
                instance = WhatsAppInstance.objects.get(id=parts[0], owner=user)
                remote_jid = parts[1]
            except (WhatsAppInstance.DoesNotExist, ValueError, ValidationError):
                pass

    if not instance or not remote_jid:
        return Response({"detail": "Not found."}, status=http_status.HTTP_404_NOT_FOUND)

    content = request.data.get("content", "")
    if not content:
        return Response(
            {"detail": "Content is required."}, status=http_status.HTTP_400_BAD_REQUEST
        )

    # Normalize JID for consistent storage
    normalized = _normalize_jid(remote_jid)

    # For Cloud API, extract the phone number from JID to send
    to = _phone_from_jid(remote_jid)

    client = EngineClient()
    try:
        engine_id = _ensure_engine_instance_id(instance, client)
        data = client.send_message(
            engine_id,
            to=to,
            message_type="text",
            content=content,
        )

        wa_message_id = (
            data.get("wa_message_id")
            or data.get("waMessageId")
            or data.get("id")
        )
        msg = Message.objects.create(
            instance=instance,
            remote_jid=normalized,
            from_me=True,
            message_type="text",
            content=content,
            wa_message_id=str(wa_message_id) if wa_message_id else None,
            status=data.get("status") or "sent",
            timestamp=timezone.now(),
            metadata={"engine_response": data},
        )

        return Response(
            {
                "id": str(msg.id),
                "direction": "outbound",
                "message_type": "text",
                "content": msg.content,
                "is_ai_generated": False,
                "ai_model": None,
                "created_at": msg.timestamp.isoformat(),
                "delivered_at": None,
                "read_at": None,
                "whatsapp_status": msg.status,
            },
            status=http_status.HTTP_201_CREATED,
        )
    except EngineClientError as e:
        # Save failed message for visibility
        Message.objects.create(
            instance=instance,
            remote_jid=normalized,
            from_me=True,
            message_type="text",
            content=content,
            status="failed",
            timestamp=timezone.now(),
            metadata={"error": str(e)},
        )
        return Response(
            {"detail": str(e)}, status=http_status.HTTP_502_BAD_GATEWAY
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def conversation_stats(request):
    """Get conversation statistics for the authenticated user."""
    user = request.user
    instance_ids = list(
        WhatsAppInstance.objects.filter(owner=user).values_list("id", flat=True)
    )

    if not instance_ids:
        return Response(
            {
                "total": 0,
                "by_status": {"active": 0, "waiting": 0, "handoff": 0, "completed": 0},
                "total_messages": 0,
                "unread_messages": 0,
            }
        )

    # Count unique conversations (normalize JIDs for dedup)
    conv_count = (
        Message.objects.filter(instance_id__in=instance_ids)
        .annotate(
            normalized_jid=Replace(
                "remote_jid", Value("@s.whatsapp.net"), Value("")
            )
        )
        .values("instance_id", "normalized_jid")
        .distinct()
        .count()
    )

    total_messages = Message.objects.filter(instance_id__in=instance_ids).count()

    unread = Message.objects.filter(
        instance_id__in=instance_ids,
        from_me=False,
        status__in=["delivered", "sent", "pending"],
    ).count()

    return Response(
        {
            "total": conv_count,
            "by_status": {
                "active": conv_count,
                "waiting": 0,
                "handoff": 0,
                "completed": 0,
            },
            "total_messages": total_messages,
            "unread_messages": unread,
        }
    )
