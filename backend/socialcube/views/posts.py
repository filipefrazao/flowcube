import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from socialcube.models import ScheduledPost, PostMedia, PostPlatform
from socialcube.serializers import (
    ScheduledPostSerializer, ScheduledPostListSerializer,
    ScheduledPostCreateSerializer, PostMediaSerializer,
)

logger = logging.getLogger(__name__)


class ScheduledPostViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = ScheduledPost.objects.filter(user=self.request.user).select_related("user").prefetch_related(
            "media_items", "platforms__account"
        ).order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        post_type = self.request.query_params.get("post_type")
        if post_type:
            qs = qs.filter(post_type=post_type)

        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ScheduledPostListSerializer
        if self.action == "create":
            return ScheduledPostCreateSerializer
        return ScheduledPostSerializer

    @action(detail=True, methods=["post"])
    def publish_now(self, request, pk=None):
        post = self.get_object()
        if post.status == "published":
            return Response({"error": "Already published"}, status=status.HTTP_400_BAD_REQUEST)

        from socialcube.tasks import publish_post_task
        publish_post_task.delay(post.id)
        post.status = "publishing"
        post.save(update_fields=["status"])

        return Response({"status": "publishing", "message": "Post queued for publishing"})

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        post = self.get_object()
        new_post = ScheduledPost.objects.create(
            user=request.user,
            title=f"{post.title} (copy)",
            caption=post.caption,
            hashtags=post.hashtags,
            post_type=post.post_type,
            first_comment=post.first_comment,
            status="draft",
        )
        for pp in post.platforms.all():
            PostPlatform.objects.create(post=new_post, account=pp.account)
        return Response(ScheduledPostSerializer(new_post).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def drafts(self, request):
        qs = self.get_queryset().filter(status="draft")
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ScheduledPostListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ScheduledPostListSerializer(qs, many=True)
        return Response(serializer.data)


class MediaUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        media_type = "image"
        content_type = file.content_type or ""
        if content_type.startswith("video/"):
            media_type = "video"

        media = PostMedia.objects.create(
            file=file,
            media_type=media_type,
            alt_text=request.data.get("alt_text", ""),
        )
        return Response(PostMediaSerializer(media).data, status=status.HTTP_201_CREATED)
