import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from socialcube.models import ContentApproval, ScheduledPost
from socialcube.serializers import ContentApprovalSerializer

logger = logging.getLogger(__name__)


class ContentApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = ContentApprovalSerializer
    http_method_names = ["get", "post", "patch"]

    def get_queryset(self):
        qs = ContentApproval.objects.filter(
            reviewer=self.request.user
        ).select_related("post", "reviewer").order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        approval = self.get_object()
        approval.status = "approved"
        approval.comment = request.data.get("comment", "")
        approval.reviewed_at = timezone.now()
        approval.save(update_fields=["status", "comment", "reviewed_at"])
        return Response(ContentApprovalSerializer(approval).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        approval = self.get_object()
        approval.status = "rejected"
        approval.comment = request.data.get("comment", "")
        approval.reviewed_at = timezone.now()
        approval.save(update_fields=["status", "comment", "reviewed_at"])
        return Response(ContentApprovalSerializer(approval).data)
