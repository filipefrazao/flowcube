import logging
from datetime import date, timedelta

from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    CallQueue,
    CallRecord,
    CallStats,
    Extension,
    IVRMenu,
    IVROption,
    QueueMember,
    VoicemailMessage,
)
from .serializers import (
    CallQueueSerializer,
    CallRecordListSerializer,
    CallRecordSerializer,
    CallStatsSerializer,
    ExtensionSerializer,
    IVRMenuSerializer,
    IVROptionSerializer,
    InitiateCallSerializer,
    QueueMemberSerializer,
    VoicemailMessageSerializer,
)
from .services.asterisk_client import AsteriskARIClient
from .services.s3_client import S3Client

logger = logging.getLogger(__name__)


class ExtensionViewSet(viewsets.ModelViewSet):
    queryset = Extension.objects.select_related("user").all()
    serializer_class = ExtensionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["extension_number", "user__first_name", "user__last_name"]


class CallRecordViewSet(viewsets.ModelViewSet):
    queryset = CallRecord.objects.select_related("agent", "lead", "contact").all()
    serializer_class = CallRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["direction", "status", "agent", "lead", "transcription_status"]
    search_fields = ["caller_number", "callee_number", "disposition", "notes"]
    ordering_fields = ["start_time", "duration_seconds"]

    def get_serializer_class(self):
        if self.action == "list":
            return CallRecordListSerializer
        return CallRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user.is_staff:
            qs = qs.filter(agent=user)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(start_time__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(start_time__date__lte=date_to)

        lead_id = self.request.query_params.get("lead_id")
        if lead_id:
            qs = qs.filter(lead_id=lead_id)

        return qs

    @action(detail=True, methods=["get"])
    def recording(self, request, pk=None):
        """GET /api/v1/telephony/calls/{id}/recording/"""
        call = self.get_object()
        if not call.recording_s3_key:
            return Response(
                {"error": "Recording not available"},
                status=status.HTTP_404_NOT_FOUND,
            )
        s3 = S3Client()
        url = s3.generate_presigned_url(call.recording_s3_key)
        if url:
            return Response({"recording_url": url})
        return Response(
            {"error": "Failed to generate recording URL"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=True, methods=["post"], url_path="transcribe")
    def transcribe(self, request, pk=None):
        """POST /api/v1/telephony/calls/{id}/transcribe/ - trigger transcription."""
        call = self.get_object()
        if not call.recording_s3_key:
            return Response(
                {"error": "No recording to transcribe"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from .tasks import transcribe_recording

        transcribe_recording.delay(str(call.id))
        return Response({"message": "Transcription queued"})


class VoicemailViewSet(viewsets.ModelViewSet):
    queryset = VoicemailMessage.objects.select_related("extension", "extension__user").all()
    serializer_class = VoicemailMessageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["extension", "is_read"]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(extension__user=self.request.user)
        return qs

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        vm = self.get_object()
        vm.is_read = True
        vm.save(update_fields=["is_read"])
        return Response(VoicemailMessageSerializer(vm).data)

    @action(detail=True, methods=["get"])
    def audio(self, request, pk=None):
        """GET presigned URL for voicemail audio."""
        vm = self.get_object()
        if not vm.audio_s3_key:
            return Response(
                {"error": "Audio not available"},
                status=status.HTTP_404_NOT_FOUND,
            )
        s3 = S3Client()
        url = s3.generate_presigned_url(vm.audio_s3_key)
        if url:
            return Response({"audio_url": url})
        return Response(
            {"error": "Failed to generate audio URL"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class IVRMenuViewSet(viewsets.ModelViewSet):
    queryset = IVRMenu.objects.prefetch_related("options").all()
    serializer_class = IVRMenuSerializer
    permission_classes = [IsAuthenticated]


class IVROptionViewSet(viewsets.ModelViewSet):
    queryset = IVROption.objects.select_related("ivr_menu").all()
    serializer_class = IVROptionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["ivr_menu"]


class CallQueueViewSet(viewsets.ModelViewSet):
    queryset = CallQueue.objects.prefetch_related(
        "members", "members__extension", "members__extension__user"
    ).all()
    serializer_class = CallQueueSerializer
    permission_classes = [IsAuthenticated]


class QueueMemberViewSet(viewsets.ModelViewSet):
    queryset = QueueMember.objects.select_related(
        "queue", "extension", "extension__user"
    ).all()
    serializer_class = QueueMemberSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["queue"]


class CallStatsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CallStats.objects.select_related("agent").all()
    serializer_class = CallStatsSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["agent"]
    ordering_fields = ["date", "total_calls"]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(agent=self.request.user)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            qs = qs.filter(date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs


class InitiateCallView(APIView):
    """POST /api/v1/telephony/calls/initiate/"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = InitiateCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        to_number = serializer.validated_data["to_number"]
        lead_id = serializer.validated_data.get("lead_id")
        user = request.user

        try:
            ext = Extension.objects.get(user=user)
        except Extension.DoesNotExist:
            return Response(
                {"error": "No extension assigned to your account"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ari = AsteriskARIClient()
        success, result = ari.originate_call(
            from_extension=ext.extension_number,
            to_number=to_number,
            caller_id=f'"{user.get_full_name()}" <{ext.extension_number}>',
        )

        if success:
            logger.info(
                f"Call initiated by {user.username}: "
                f"{ext.extension_number} -> {to_number}"
            )
            return Response({"message": "Call initiated", "channel_id": result})
        else:
            return Response(
                {"error": f"Failed to initiate call: {result}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DashboardStatsView(APIView):
    """GET /api/v1/telephony/stats/dashboard/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        start_date = date.today() - timedelta(days=days)

        qs = CallStats.objects.filter(date__gte=start_date)
        if not request.user.is_staff:
            qs = qs.filter(agent=request.user)

        summary = qs.aggregate(
            total_calls=Sum("total_calls"),
            total_answered=Sum("answered_calls"),
            total_missed=Sum("missed_calls"),
            total_outbound=Sum("outbound_calls"),
            total_talk_time=Sum("total_talk_time"),
            avg_duration=Avg("avg_duration"),
        )

        daily = list(
            qs.values("date")
            .annotate(
                calls=Sum("total_calls"),
                answered=Sum("answered_calls"),
                missed=Sum("missed_calls"),
            )
            .order_by("date")
        )

        agents = []
        if request.user.is_staff:
            agents = list(
                qs.values(
                    "agent__username",
                    "agent__first_name",
                    "agent__last_name",
                )
                .annotate(
                    total=Sum("total_calls"),
                    answered=Sum("answered_calls"),
                    talk_time=Sum("total_talk_time"),
                )
                .order_by("-total")[:20]
            )

        return Response(
            {
                "summary": summary,
                "daily": daily,
                "agents": agents,
            }
        )


class CallEventWebhookView(APIView):
    """
    POST /api/v1/telephony/webhooks/call-event/
    Receives real-time call events from the PABX Event Listener.
    Secured by internal network + secret token.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        token = request.headers.get("X-Webhook-Token")
        from django.conf import settings as s

        expected = getattr(s, "PABX_WEBHOOK_TOKEN", "")
        if not expected or token != expected:
            return Response(status=status.HTTP_403_FORBIDDEN)

        data = request.data
        event = data.get("event")
        pabx_call_id = data.get("pabx_call_id")

        if not event or not pabx_call_id:
            return Response(
                {"error": "Missing event or pabx_call_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(f"PABX webhook: {event} for {pabx_call_id}")

        # Find agent by extension
        agent = None
        ext_num = data.get("agent_extension")
        if ext_num:
            try:
                ext = Extension.objects.select_related("user").get(
                    extension_number=ext_num
                )
                agent = ext.user
            except Extension.DoesNotExist:
                pass

        # Lookup lead by caller number
        lead = None
        caller = data.get("caller_number", "")
        if caller:
            from salescube.models import Lead

            lead = Lead.objects.filter(
                Q(phone=caller) | Q(phone__endswith=caller[-9:])
            ).first()

        if event == "call_start":
            CallRecord.objects.update_or_create(
                pabx_call_id=pabx_call_id,
                defaults={
                    "direction": data.get("direction", "INBOUND"),
                    "status": "RINGING",
                    "caller_number": caller,
                    "callee_number": data.get("callee_number", ""),
                    "agent": agent,
                    "lead": lead,
                },
            )

        elif event == "call_answer":
            CallRecord.objects.filter(pabx_call_id=pabx_call_id).update(
                status="ANSWERED", answer_time=timezone.now()
            )

        elif event == "call_end":
            call = CallRecord.objects.filter(pabx_call_id=pabx_call_id).first()
            if call:
                call.status = "COMPLETED"
                call.end_time = timezone.now()
                call.duration_seconds = data.get("duration", 0)
                call.save(update_fields=["status", "end_time", "duration_seconds"])

                recording_path = data.get("recording_path")
                if recording_path:
                    from .tasks import process_call_recording

                    process_call_recording.delay(str(call.id), recording_path)

        return Response({"status": "ok"})
