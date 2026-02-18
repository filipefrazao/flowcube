from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from django.db.models import Count, F, Q
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .engine_client import EngineClient, EngineClientError
from .models import Campaign, Contact, Group, Message, MessageTemplate, WhatsAppInstance
from .serializers import (
    CampaignSerializer,
    ContactSerializer,
    GroupSerializer,
    MessageSerializer,
    MessageTemplateSerializer,
    WhatsAppInstanceSerializer,
)
from .webhooks import process_engine_webhook


def _today_range():
    now = timezone.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


def _create_on_engine(instance: WhatsAppInstance, client: EngineClient) -> str:
    """Create instance on the engine and return the engine_instance_id."""
    payload: Dict[str, Any] = {
        "instance_id": str(instance.id),
        "name": instance.name,
        "engine": instance.engine,
        "phone_number": instance.phone_number,
        "webhook_url": instance.webhook_url,
        "webhook_events": instance.webhook_events,
    }
    if instance.phone_number_id:
        payload["phone_number_id"] = instance.phone_number_id
    if instance.waba_id:
        payload["waba_id"] = instance.waba_id
    if instance.access_token:
        payload["access_token"] = instance.access_token

    data = client.create_instance(payload)
    engine_instance_id = (
        data.get("engine_instance_id")
        or data.get("engineInstanceId")
        or data.get("id")
        or (data.get("data") or {}).get("id")
    )
    if not engine_instance_id:
        raise EngineClientError(f"Engine did not return engine_instance_id. response={data}")

    WhatsAppInstance.objects.filter(id=instance.id).update(engine_instance_id=str(engine_instance_id))
    instance.engine_instance_id = str(engine_instance_id)
    return instance.engine_instance_id


def _ensure_engine_instance_id(instance: WhatsAppInstance, client: EngineClient) -> str:
    """
    Ensure instance exists on the engine.

    If engine_instance_id is missing, creates it.
    If engine_instance_id exists but engine returns 404 (e.g. after restart),
    re-creates it.
    """

    if not instance.engine_instance_id:
        return _create_on_engine(instance, client)

    # Verify the instance still exists on the engine
    try:
        client.get_status(instance.engine_instance_id)
        return instance.engine_instance_id
    except EngineClientError as e:
        if "404" in str(e):
            # Engine lost the instance (restart), re-create it
            instance.engine_instance_id = ""
            WhatsAppInstance.objects.filter(id=instance.id).update(engine_instance_id="")
            return _create_on_engine(instance, client)
        raise



class InstanceViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppInstanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WhatsAppInstance.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance: WhatsAppInstance):
        # Best-effort cleanup on engine.
        if instance.engine_instance_id:
            try:
                EngineClient().delete_instance(instance.engine_instance_id)
            except EngineClientError:
                pass
        instance.delete()

    @action(detail=True, methods=["get"], url_path="qr-code")
    def qr_code(self, request, pk=None):
        instance = self.get_object()
        client = EngineClient()
        try:
            engine_id = _ensure_engine_instance_id(instance, client)
            data = client.get_qr_code(engine_id)
            return Response(data)
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path="pairing-code")
    def pairing_code(self, request, pk=None):
        instance = self.get_object()
        phone_number = request.data.get("phone_number") or request.data.get("phoneNumber") or instance.phone_number
        client = EngineClient()
        try:
            engine_id = _ensure_engine_instance_id(instance, client)
            data = client.get_pairing_code(engine_id, phone_number=phone_number)
            return Response(data)
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path="disconnect")
    def disconnect(self, request, pk=None):
        instance = self.get_object()
        client = EngineClient()
        try:
            engine_id = _ensure_engine_instance_id(instance, client)
            data = client.disconnect(engine_id)
            WhatsAppInstance.objects.filter(id=instance.id).update(status="disconnected")
            return Response(data)
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path="reconnect")
    def reconnect(self, request, pk=None):
        instance = self.get_object()
        client = EngineClient()
        try:
            engine_id = _ensure_engine_instance_id(instance, client)
            data = client.reconnect(engine_id)
            WhatsAppInstance.objects.filter(id=instance.id).update(status="connecting")
            return Response(data)
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["get"], url_path="status")
    def status(self, request, pk=None):
        instance = self.get_object()
        client = EngineClient()
        try:
            engine_id = _ensure_engine_instance_id(instance, client)
            data = client.get_status(engine_id)
            engine_status = data.get("status") or (data.get("data") or {}).get("status")
            if engine_status:
                update_fields: Dict[str, Any] = {"status": engine_status}
                if engine_status == "connected":
                    update_fields["last_connected_at"] = timezone.now()
                WhatsAppInstance.objects.filter(id=instance.id).update(**update_fields)
            return Response(data)
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path="send-message")
    def send_message(self, request, pk=None):
        instance = self.get_object()
        to = request.data.get("to") or request.data.get("remote_jid") or request.data.get("remoteJid")
        if not to:
            return Response({"detail": "Missing 'to'."}, status=status.HTTP_400_BAD_REQUEST)

        message_type = request.data.get("message_type") or request.data.get("messageType") or "text"
        content = request.data.get("content") or ""
        media_url = request.data.get("media_url") or request.data.get("mediaUrl")
        metadata = request.data.get("metadata") if isinstance(request.data.get("metadata"), dict) else None

        client = EngineClient()
        try:
            engine_id = _ensure_engine_instance_id(instance, client)
            data = client.send_message(
                engine_id,
                to=str(to),
                message_type=str(message_type),
                content=str(content),
                media_url=str(media_url) if media_url else None,
                metadata=metadata,
            )

            wa_message_id = data.get("wa_message_id") or data.get("waMessageId") or data.get("id")
            msg = Message.objects.create(
                instance=instance,
                remote_jid=str(to),
                from_me=True,
                message_type=str(message_type),
                content=str(content),
                media_url=str(media_url) if media_url else None,
                wa_message_id=str(wa_message_id) if wa_message_id else None,
                status=data.get("status") or "sent",
                timestamp=timezone.now(),
                metadata={"engine_response": data, **({"metadata": metadata} if metadata else {})},
            )

            if msg.timestamp.date() == timezone.localdate():
                WhatsAppInstance.objects.filter(id=instance.id).update(messages_sent_today=F("messages_sent_today") + 1)

            return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)
        except EngineClientError as e:
            Message.objects.create(
                instance=instance,
                remote_jid=str(to),
                from_me=True,
                message_type=str(message_type),
                content=str(content),
                media_url=str(media_url) if media_url else None,
                wa_message_id=None,
                status="failed",
                timestamp=timezone.now(),
                metadata={"error": str(e), **({"metadata": metadata} if metadata else {})},
            )
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        instance = self.get_object()
        qs = instance.messages.all()

        remote_jid = request.query_params.get("remote_jid") or request.query_params.get("remoteJid")
        if remote_jid:
            qs = qs.filter(remote_jid=remote_jid)

        qs = qs.order_by("-timestamp")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(MessageSerializer(page, many=True).data)
        return Response(MessageSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="contacts")
    def contacts(self, request, pk=None):
        instance = self.get_object()

        sync = (request.query_params.get("sync") or "").lower() in {"1", "true", "yes"}
        if sync and instance.engine_instance_id:
            client = EngineClient()
            try:
                data = client.get_contacts(instance.engine_instance_id)
                contacts = data.get("contacts") or data.get("data") or data
                if isinstance(contacts, list):
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
                                "name": c.get("name") or c.get("notify") or c.get("push_name") or c.get("pushName") or "",
                                "phone": c.get("phone") or "",
                                "profile_picture": c.get("profile_picture") or c.get("profilePicture"),
                                "is_business": bool(c.get("is_business") or c.get("isBusiness") or False),
                            },
                        )
            except EngineClientError as e:
                return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        qs = instance.contacts.all().order_by("jid")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ContactSerializer(page, many=True).data)
        return Response(ContactSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="groups")
    def groups(self, request, pk=None):
        instance = self.get_object()

        sync = (request.query_params.get("sync") or "").lower() in {"1", "true", "yes"}
        if sync and instance.engine_instance_id:
            client = EngineClient()
            try:
                data = client.get_groups(instance.engine_instance_id)
                groups = data.get("groups") or data.get("data") or data
                if isinstance(groups, list):
                    for g in groups:
                        if not isinstance(g, dict):
                            continue
                        jid = g.get("jid") or g.get("id")
                        if not jid:
                            continue
                        Group.objects.update_or_create(
                            instance=instance,
                            jid=jid,
                            defaults={
                                "name": g.get("name") or g.get("subject") or "",
                                "description": g.get("description") or "",
                                "participants_count": int(g.get("participants_count") or g.get("participantsCount") or g.get("participants") or 0),
                                "is_admin": bool(g.get("is_admin") or g.get("isAdmin") or False),
                            },
                        )
            except EngineClientError as e:
                return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        qs = instance.groups.all().order_by("jid")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(GroupSerializer(page, many=True).data)
        return Response(GroupSerializer(qs, many=True).data)

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        instance = self.get_object()
        start, end = _today_range()

        qs_today = instance.messages.filter(timestamp__gte=start, timestamp__lt=end)
        data = {
            "instance_id": str(instance.id),
            "messages_total": instance.messages.count(),
            "messages_sent_today": qs_today.filter(from_me=True).count(),
            "messages_received_today": qs_today.filter(from_me=False).count(),
            "messages_by_status": dict(
                instance.messages.values("status").annotate(c=Count("id")).values_list("status", "c")
            ),
            "contacts_count": instance.contacts.count(),
            "groups_count": instance.groups.count(),
            "campaigns_running": instance.campaigns.filter(status="running").count(),
        }
        return Response(data)


    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        campaign = self.get_object()
        now = timezone.now()

        if campaign.scheduled_at and campaign.scheduled_at > now:
            Campaign.objects.filter(id=campaign.id).update(status="scheduled")
            return Response({"detail": "Campaign scheduled.", "scheduled_at": campaign.scheduled_at})

        Campaign.objects.filter(id=campaign.id).update(status="running", started_at=campaign.started_at or now)
        try:
            from .tasks import run_campaign

            run_campaign.delay(str(campaign.id))
        except Exception:
            pass
        return Response({"detail": "Campaign started."})

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request, pk=None):
        campaign = self.get_object()
        Campaign.objects.filter(id=campaign.id).update(status="paused")
        return Response({"detail": "Campaign paused."})

    @action(detail=True, methods=["post"], url_path="resume")
    def resume(self, request, pk=None):
        campaign = self.get_object()
        Campaign.objects.filter(id=campaign.id).update(status="running")
        try:
            from .tasks import run_campaign

            run_campaign.delay(str(campaign.id))
        except Exception:
            pass
        return Response({"detail": "Campaign resumed."})



    # ------------------------------------------------------------------
    # Group Management Actions (native Baileys)
    # ------------------------------------------------------------------

    @action(detail=True, methods=["post"], url_path="groups/create")
    def group_create(self, request, pk=None):
        """Create a new WhatsApp group.
        Body: { subject: str, participants: ["5511...@s.whatsapp.net", ...] }"""
        instance = self.get_object()
        if not instance.engine_instance_id:
            return Response({"detail": "Instance not connected."}, status=status.HTTP_400_BAD_REQUEST)
        subject = request.data.get("subject") or ""
        participants = request.data.get("participants") or []
        if not subject or not participants:
            return Response({"detail": "subject and participants required."}, status=status.HTTP_400_BAD_REQUEST)
        client = EngineClient()
        try:
            data = client.group_create(instance.engine_instance_id, subject, participants)
            return Response(data, status=status.HTTP_201_CREATED)
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["patch"], url_path=r"groups/(?P<jid>[^/.]+)/subject")
    def group_update_subject(self, request, pk=None, jid=None):
        """Rename a group. Body: { subject: str }"""
        instance = self.get_object()
        subject = request.data.get("subject") or ""
        if not subject:
            return Response({"detail": "subject required."}, status=status.HTTP_400_BAD_REQUEST)
        client = EngineClient()
        try:
            return Response(client.group_update_subject(instance.engine_instance_id, jid, subject))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["patch"], url_path=r"groups/(?P<jid>[^/.]+)/description")
    def group_update_description(self, request, pk=None, jid=None):
        """Update group description. Body: { description: str }"""
        instance = self.get_object()
        client = EngineClient()
        try:
            return Response(client.group_update_description(instance.engine_instance_id, jid, request.data.get("description") or ""))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path=r"groups/(?P<jid>[^/.]+)/participants")
    def group_participants_update(self, request, pk=None, jid=None):
        """Manage participants. Body: { participants: [...], action: add|remove|promote|demote }"""
        instance = self.get_object()
        participants = request.data.get("participants") or []
        action_str = request.data.get("action") or ""
        if not participants or action_str not in ("add", "remove", "promote", "demote"):
            return Response({"detail": "participants and action (add|remove|promote|demote) required."}, status=status.HTTP_400_BAD_REQUEST)
        client = EngineClient()
        try:
            return Response(client.group_participants_update(instance.engine_instance_id, jid, participants, action_str))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["get"], url_path=r"groups/(?P<jid>[^/.]+)/metadata")
    def group_metadata(self, request, pk=None, jid=None):
        """Get full group metadata (participants, description, admin, etc.)"""
        instance = self.get_object()
        client = EngineClient()
        try:
            return Response(client.group_metadata(instance.engine_instance_id, jid))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["get"], url_path=r"groups/(?P<jid>[^/.]+)/invite-code")
    def group_invite_code(self, request, pk=None, jid=None):
        """Get group invite link."""
        instance = self.get_object()
        client = EngineClient()
        try:
            return Response(client.group_invite_code(instance.engine_instance_id, jid))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path=r"groups/(?P<jid>[^/.]+)/leave")
    def group_leave(self, request, pk=None, jid=None):
        """Leave a WhatsApp group."""
        instance = self.get_object()
        client = EngineClient()
        try:
            return Response(client.group_leave(instance.engine_instance_id, jid))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path="fetch-history")
    def fetch_history(self, request, pk=None):
        """Trigger history fetch for a specific chat (messages arrive via history_sync webhook).
        Body: { jid: str, count: int (default 50) }"""
        instance = self.get_object()
        if not instance.engine_instance_id:
            return Response({"detail": "Instance not connected."}, status=status.HTTP_400_BAD_REQUEST)
        jid = request.data.get("jid") or ""
        count = int(request.data.get("count") or 50)
        if not jid:
            return Response({"detail": "jid required."}, status=status.HTTP_400_BAD_REQUEST)
        client = EngineClient()
        try:
            return Response(client.fetch_history(instance.engine_instance_id, jid, count))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)




class TemplateViewSet(viewsets.ModelViewSet):
    serializer_class = MessageTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MessageTemplate.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Campaign.objects.filter(owner=self.request.user).select_related("instance", "template")

    def perform_create(self, serializer):
        instance = serializer.validated_data.get("instance")
        if instance and instance.owner_id != self.request.user.id:
            raise ValueError("Instance does not belong to current user.")
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        campaign = self.get_object()
        now = timezone.now()
        if campaign.scheduled_at and campaign.scheduled_at > now:
            Campaign.objects.filter(id=campaign.id).update(status="scheduled")
            return Response({"detail": "Campaign scheduled.", "scheduled_at": campaign.scheduled_at})
        Campaign.objects.filter(id=campaign.id).update(status="running", started_at=campaign.started_at or now)
        try:
            from .tasks import run_campaign
            run_campaign.delay(str(campaign.id))
        except Exception:
            pass
        return Response({"detail": "Campaign started."})

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request, pk=None):
        campaign = self.get_object()
        Campaign.objects.filter(id=campaign.id).update(status="paused")
        return Response({"detail": "Campaign paused."})

    @action(detail=True, methods=["post"], url_path="resume")
    def resume(self, request, pk=None):
        campaign = self.get_object()
        Campaign.objects.filter(id=campaign.id).update(status="running")
        try:
            from .tasks import run_campaign
            run_campaign.delay(str(campaign.id))
        except Exception:
            pass
        return Response({"detail": "Campaign resumed."})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chatcube_stats(request):
    start, end = _today_range()
    user = request.user

    instances = WhatsAppInstance.objects.filter(owner=user)
    instance_ids = list(instances.values_list("id", flat=True))

    msg_qs = Message.objects.filter(instance_id__in=instance_ids, timestamp__gte=start, timestamp__lt=end)
    sent_today = msg_qs.filter(from_me=True).count()
    received_today = msg_qs.filter(from_me=False).count()

    campaigns = Campaign.objects.filter(owner=user)

    data = {
        "instances_total": instances.count(),
        "instances_connected": instances.filter(status="connected").count(),
        "instances_disconnected": instances.filter(status="disconnected").count(),
        "messages_sent_today": sent_today,
        "messages_received_today": received_today,
        "campaigns_total": campaigns.count(),
        "campaigns_running": campaigns.filter(status="running").count(),
        "campaigns_scheduled": campaigns.filter(status="scheduled").count(),
        "campaigns_failed": campaigns.filter(status="failed").count(),
    }
    return Response(data)


@api_view(["POST"])
@authentication_classes([])
@throttle_classes([])
@permission_classes([AllowAny])
def engine_webhook(request):
    if not isinstance(request.data, dict):
        return Response({"ok": False, "detail": "Expected JSON object."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = process_engine_webhook(request.data)
        http_status = status.HTTP_200_OK if result.get("ok") else status.HTTP_400_BAD_REQUEST
        return Response(result, status=http_status)
    except WhatsAppInstance.DoesNotExist as e:
        return Response({"ok": False, "detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"ok": False, "detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def meta_cloud_webhook(request):
    """
    Webhook endpoint for Meta WhatsApp Cloud API.

    GET  - Webhook verification (Meta sends hub.verify_token challenge)
    POST - Incoming messages and status updates from Meta
    """
    if request.method == "GET":
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        verify_token = getattr(settings, "META_WEBHOOK_VERIFY_TOKEN", "chatcube_meta_2026")
        if mode == "subscribe" and token == verify_token:
            return HttpResponse(challenge, content_type="text/plain")
        return HttpResponse("Forbidden", status=403, content_type="text/plain")

    # POST - process incoming webhook
    if not isinstance(request.data, dict):
        return Response({"ok": False, "detail": "Expected JSON object."}, status=status.HTTP_400_BAD_REQUEST)

    obj_type = request.data.get("object")
    if obj_type != "whatsapp_business_account":
        return Response({"ok": False, "detail": f"Unknown object type: {obj_type}"}, status=status.HTTP_400_BAD_REQUEST)

    entries = request.data.get("entry") or []
    processed = 0
    errors = []

    for entry in entries:
        changes = entry.get("changes") or []
        for change in changes:
            value = change.get("value") or {}
            metadata = value.get("metadata") or {}
            phone_number_id = metadata.get("phone_number_id")

            if not phone_number_id:
                continue

            # Find the instance by phone_number_id
            try:
                instance = WhatsAppInstance.objects.get(phone_number_id=phone_number_id)
            except WhatsAppInstance.DoesNotExist:
                errors.append(f"No instance for phone_number_id={phone_number_id}")
                continue

            # Process incoming messages
            messages = value.get("messages") or []
            for msg in messages:
                remote_jid = (msg.get("from") or "") + "@s.whatsapp.net"
                wa_message_id = msg.get("id")
                msg_type = msg.get("type") or "text"
                content_text = _extract_cloud_content(msg)
                ts = msg.get("timestamp")
                timestamp = datetime.fromtimestamp(int(ts), tz=timezone.get_current_timezone()) if ts else timezone.now()

                contact_name = ""
                contacts_list = value.get("contacts") or []
                if contacts_list:
                    contact_name = (contacts_list[0].get("profile") or {}).get("name") or ""

                defaults = {
                    "remote_jid": remote_jid,
                    "from_me": False,
                    "message_type": msg_type,
                    "content": content_text,
                    "status": "delivered",
                    "timestamp": timestamp,
                    "metadata": msg,
                }

                if wa_message_id:
                    Message.objects.update_or_create(
                        instance=instance,
                        wa_message_id=wa_message_id,
                        defaults=defaults,
                    )
                else:
                    Message.objects.create(instance=instance, wa_message_id=None, **defaults)

                # Upsert contact
                Contact.objects.update_or_create(
                    instance=instance,
                    jid=remote_jid,
                    defaults={
                        "name": contact_name or remote_jid,
                        "phone": msg.get("from") or "",
                        "last_message_at": timestamp,
                    },
                )
                processed += 1

            # Process status updates
            statuses_list = value.get("statuses") or []
            for st in statuses_list:
                wa_message_id = st.get("id")
                new_status = st.get("status")
                if wa_message_id and new_status:
                    Message.objects.filter(
                        instance=instance,
                        wa_message_id=wa_message_id,
                    ).update(status=new_status)
                    processed += 1

    return Response({"ok": True, "processed": processed, "errors": errors})


def _extract_cloud_content(msg: dict) -> str:
    msg_type = msg.get("type", "text")
    if msg_type == "text":
        return (msg.get("text") or {}).get("body") or ""
    if msg_type == "image":
        return (msg.get("image") or {}).get("caption") or "[Image]"
    if msg_type == "video":
        return (msg.get("video") or {}).get("caption") or "[Video]"
    if msg_type == "audio":
        return "[Audio]"
    if msg_type == "document":
        return (msg.get("document") or {}).get("filename") or "[Document]"
    if msg_type == "sticker":
        return "[Sticker]"
    if msg_type == "location":
        loc = msg.get("location") or {}
        return f"[Location: {loc.get("latitude")},{loc.get("longitude")}]"
    if msg_type == "contacts":
        return "[Contact]"
    if msg_type == "reaction":
        return (msg.get("reaction") or {}).get("emoji") or "[Reaction]"
    return f"[{msg_type}]"

