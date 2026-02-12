import logging

from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes, action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from socialcube.models import SmartLinkPage, SmartLinkButton
from socialcube.serializers import SmartLinkPageSerializer, SmartLinkButtonSerializer

logger = logging.getLogger(__name__)


class SmartLinkPageViewSet(viewsets.ModelViewSet):
    serializer_class = SmartLinkPageSerializer

    def get_queryset(self):
        return SmartLinkPage.objects.filter(user=self.request.user).prefetch_related("buttons").order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SmartLinkButtonViewSet(viewsets.ModelViewSet):
    serializer_class = SmartLinkButtonSerializer

    def get_queryset(self):
        page_id = self.kwargs.get("page_pk")
        return SmartLinkButton.objects.filter(
            page_id=page_id, page__user=self.request.user
        ).order_by("order")

    def perform_create(self, serializer):
        page_id = self.kwargs.get("page_pk")
        page = SmartLinkPage.objects.get(id=page_id, user=self.request.user)
        serializer.save(page=page)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def smartlink_public_view(request, slug):
    try:
        page = SmartLinkPage.objects.prefetch_related("buttons").get(slug=slug, is_active=True)
    except SmartLinkPage.DoesNotExist:
        return JsonResponse({"error": "Not found"}, status=404)

    page.total_views += 1
    page.save(update_fields=["total_views"])

    buttons = page.buttons.filter(is_active=True).order_by("order")
    return Response({
        "title": page.title,
        "bio": page.bio,
        "avatar_url": page.avatar_url,
        "theme": page.theme,
        "buttons": SmartLinkButtonSerializer(buttons, many=True).data,
    })
