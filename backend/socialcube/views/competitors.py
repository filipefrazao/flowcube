import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from socialcube.models import Competitor, CompetitorSnapshot
from socialcube.serializers import CompetitorSerializer, CompetitorSnapshotSerializer

logger = logging.getLogger(__name__)


class CompetitorViewSet(viewsets.ModelViewSet):
    serializer_class = CompetitorSerializer

    def get_queryset(self):
        return Competitor.objects.filter(user=self.request.user).prefetch_related("snapshots").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        competitor = self.get_object()
        days = int(request.query_params.get("days", 30))
        from datetime import timedelta
        from django.utils import timezone
        since = timezone.now() - timedelta(days=days)

        snapshots = competitor.snapshots.filter(date__gte=since.date()).order_by("date")
        return Response(CompetitorSnapshotSerializer(snapshots, many=True).data)

    @action(detail=True, methods=["post"])
    def track_now(self, request, pk=None):
        competitor = self.get_object()
        from socialcube.tasks import track_single_competitor_task
        track_single_competitor_task.delay(competitor.id)
        return Response({"status": "queued", "message": "Competitor tracking queued"})
