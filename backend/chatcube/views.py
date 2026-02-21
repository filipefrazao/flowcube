import logging

logger = logging.getLogger('chatcube')
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from django.db.models import Count, F, Max, OuterRef, Q, Subquery
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from django.contrib.auth import get_user_model

from .engine_client import EngineClient, EngineClientError
from .models import Campaign, Contact, Group, GroupNote, GroupTask, Message, MessageTemplate, WhatsAppInstance
from .serializers import (
    CampaignSerializer,
    ContactSerializer,
    GroupNoteSerializer,
    GroupSerializer,
    GroupTaskSerializer,
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
        from django.db.models import Count, Q
        from datetime import timedelta
        now = timezone.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
        return WhatsAppInstance.objects.filter(owner=self.request.user).annotate(
            _prefetched_sent_today=Count(
                "messages", filter=Q(messages__from_me=True, messages__timestamp__gte=start, messages__timestamp__lt=end)
            ),
            _prefetched_received_today=Count(
                "messages", filter=Q(messages__from_me=False, messages__timestamp__gte=start, messages__timestamp__lt=end)
            ),
        )

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

        # Anti-ban: check daily message limit before sending
        if instance.messages_sent_today >= instance.daily_limit:
            warmup_info = f" (warm-up day {instance.warmup_day})" if not instance.is_warmed_up else ""
            return Response(
                {
                    "detail": (
                        f"Daily limit reached: {instance.messages_sent_today}/{instance.daily_limit} "                        f"messages sent today{warmup_info}. Limit resets at midnight."
                    ),
                    "messages_sent_today": instance.messages_sent_today,
                    "daily_limit": instance.daily_limit,
                    "is_warmed_up": instance.is_warmed_up,
                    "warmup_day": instance.warmup_day,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

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

        # Allow caller to request a larger page via ?limit= or ?page_size=
        requested_limit = request.query_params.get("limit") or request.query_params.get("page_size")
        if requested_limit:
            try:
                page_size = min(int(requested_limit), 500)
                paginator = PageNumberPagination()
                paginator.page_size = page_size
                page = paginator.paginate_queryset(qs, request)
                if page is not None:
                    return paginator.get_paginated_response(MessageSerializer(page, many=True).data)
            except (ValueError, TypeError):
                pass

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

        # Annotate each group with message count and last message timestamp,
        # then sort: groups with messages first (most recent at top), then the rest
        qs = (
            instance.groups.all()
            .annotate(
                message_count=Count("instance__messages", filter=Q(instance__messages__remote_jid=F("jid"))),
                last_message_at=Max("instance__messages__timestamp", filter=Q(instance__messages__remote_jid=F("jid"))),
            )
            .order_by(F("last_message_at").desc(nulls_last=True), "name")
        )
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
            logger.exception("Unexpected error in ChatCube view")
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
            logger.exception("Unexpected error in ChatCube view")
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

    @action(detail=True, methods=["patch"], url_path=r"groups/(?P<jid>[^/]+)/subject")
    def group_update_subject(self, request, pk=None, jid=None):
        jid = request.query_params.get("jid") or jid or ""
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

    @action(detail=True, methods=["patch"], url_path=r"groups/(?P<jid>[^/]+)/description")
    def group_update_description(self, request, pk=None, jid=None):
        jid = request.query_params.get("jid") or jid or ""
        """Update group description. Body: { description: str }"""
        instance = self.get_object()
        client = EngineClient()
        try:
            return Response(client.group_update_description(instance.engine_instance_id, jid, request.data.get("description") or ""))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path=r"groups/(?P<jid>[^/]+)/participants")
    def group_participants_update(self, request, pk=None, jid=None):
        jid = request.query_params.get("jid") or jid or ""
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

    @action(detail=True, methods=["get"], url_path=r"groups/(?P<jid>[^/]+)/metadata")
    def group_metadata(self, request, pk=None, jid=None):
        jid = request.query_params.get("jid") or jid or ""
        """Get full group metadata (participants, description, admin, etc.)"""
        instance = self.get_object()
        client = EngineClient()
        try:
            return Response(client.group_metadata(instance.engine_instance_id, jid))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["get"], url_path=r"groups/(?P<jid>[^/]+)/invite-code")
    def group_invite_code(self, request, pk=None, jid=None):
        jid = request.query_params.get("jid") or jid or ""
        """Get group invite link."""
        instance = self.get_object()
        client = EngineClient()
        try:
            return Response(client.group_invite_code(instance.engine_instance_id, jid))
        except EngineClientError as e:
            return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    @action(detail=True, methods=["post"], url_path=r"groups/(?P<jid>[^/]+)/leave")
    def group_leave(self, request, pk=None, jid=None):
        jid = request.query_params.get("jid") or jid or ""
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
            logger.exception("Unexpected error in ChatCube view")
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
            logger.exception("Unexpected error in ChatCube view")
        return Response({"detail": "Campaign resumed."})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chatcube_stats(request):
    from django.db.models import Sum
    start, end = _today_range()
    user = request.user

    # Single aggregate query for instances
    inst_agg = WhatsAppInstance.objects.filter(owner=user).aggregate(
        total=Count("id"),
        connected=Count("id", filter=Q(status="connected")),
        disconnected=Count("id", filter=Q(status="disconnected")),
    )
    instance_ids = list(
        WhatsAppInstance.objects.filter(owner=user).values_list("id", flat=True)
    )

    # Single aggregate query for today's messages
    msg_agg = Message.objects.filter(
        instance_id__in=instance_ids, timestamp__gte=start, timestamp__lt=end
    ).aggregate(
        sent=Count("id", filter=Q(from_me=True)),
        received=Count("id", filter=Q(from_me=False)),
    )

    # Single aggregate query for campaigns
    camp_agg = Campaign.objects.filter(owner=user).aggregate(
        total=Count("id"),
        running=Count("id", filter=Q(status="running")),
        scheduled=Count("id", filter=Q(status="scheduled")),
        failed=Count("id", filter=Q(status="failed")),
    )

    data = {
        "instances_total": inst_agg["total"] or 0,
        "instances_connected": inst_agg["connected"] or 0,
        "instances_disconnected": inst_agg["disconnected"] or 0,
        "messages_sent_today": msg_agg["sent"] or 0,
        "messages_received_today": msg_agg["received"] or 0,
        "campaigns_total": camp_agg["total"] or 0,
        "campaigns_running": camp_agg["running"] or 0,
        "campaigns_scheduled": camp_agg["scheduled"] or 0,
        "campaigns_failed": camp_agg["failed"] or 0,
    }
    return Response(data)


class GroupViewSet(viewsets.GenericViewSet):
    """
    ViewSet for Group-level operations: notes, tasks, assignment, instance change.
    Groups are accessed by their UUID (not nested under an instance).
    """
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(instance__owner=self.request.user).select_related(
            "instance", "assigned_to"
        )

    def list(self, request):
        qs = self.get_queryset().annotate(
            message_count=Count("instance__messages", filter=Q(instance__messages__remote_jid=F("jid"))),
            last_message_at=Max("instance__messages__timestamp", filter=Q(instance__messages__remote_jid=F("jid"))),
        ).order_by(F("last_message_at").desc(nulls_last=True), "name")
        return Response(GroupSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        group = self.get_object()
        return Response(GroupSerializer(group).data)

    def partial_update(self, request, pk=None):
        group = self.get_object()
        # Allow updating instance (canal) and assigned_to
        data = {}
        if "instance" in request.data:
            # Verify the new instance belongs to the user
            try:
                inst = WhatsAppInstance.objects.get(id=request.data["instance"], owner=request.user)
                data["instance"] = inst
            except WhatsAppInstance.DoesNotExist:
                return Response({"detail": "Instância não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if "assigned_to" in request.data:
            val = request.data["assigned_to"]
            if val is None:
                data["assigned_to"] = None
            else:
                User = get_user_model()
                try:
                    data["assigned_to"] = User.objects.get(pk=val)
                except User.DoesNotExist:
                    return Response({"detail": "Usuário não encontrado."}, status=status.HTTP_404_NOT_FOUND)
        Group.objects.filter(pk=group.pk).update(**data)
        group.refresh_from_db()
        return Response(GroupSerializer(group).data)

    # ── Notes ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        group = self.get_object()
        if request.method == "GET":
            return Response(GroupNoteSerializer(group.notes.all(), many=True).data)
        ser = GroupNoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(group=group, user=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path=r"notes/(?P<note_id>[^/.]+)")
    def delete_note(self, request, pk=None, note_id=None):
        group = self.get_object()
        try:
            note = group.notes.get(pk=note_id)
            note.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except GroupNote.DoesNotExist:
            return Response({"detail": "Nota não encontrada."}, status=status.HTTP_404_NOT_FOUND)

    # ── Tasks ───────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get", "post"], url_path="tasks")
    def tasks(self, request, pk=None):
        group = self.get_object()
        if request.method == "GET":
            return Response(GroupTaskSerializer(group.tasks.all(), many=True).data)
        ser = GroupTaskSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save(group=group, created_by=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path=r"tasks/(?P<task_id>[^/.]+)")
    def task_detail(self, request, pk=None, task_id=None):
        group = self.get_object()
        try:
            task = group.tasks.get(pk=task_id)
        except GroupTask.DoesNotExist:
            return Response({"detail": "Tarefa não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if request.method == "DELETE":
            task.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        # PATCH
        ser = GroupTaskSerializer(task, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chatcube_users_list(request):
    """Return a list of all users for assignment dropdowns."""
    User = get_user_model()
    users = User.objects.filter(is_active=True).order_by("first_name", "username")
    data = [
        {
            "id": u.pk,
            "username": u.username,
            "full_name": u.get_full_name() or u.username,
            "email": u.email,
        }
        for u in users
    ]
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

