"""
FlowCube URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .views import ThrottledObtainAuthToken


def health_check(request):
    return JsonResponse({"status": "ok", "service": "FlowCube API"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_me(request):
    """Get current authenticated user info"""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
        'last_login': user.last_login.isoformat() if user.last_login else None,
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/v1/auth/me/", auth_me, name="auth-me"),
    path("api/v1/auth/token/", ThrottledObtainAuthToken.as_view(), name="api_token_auth"),
    # Plugin framework API
    path("api/v1/plugins/", include("flowcube_core.urls")),
    # Core analytics (merged from analytics app into core)
    path("api/v1/", include("flowcube_core.analytics_urls")),
    # Plugin app URLs (backward compatible)
    path("api/v1/achievements/", include("achievements.urls")),
    path("api/v1/funnelcube/", include("funnelcube.urls")),
    path("api/v1/socialcube/", include("socialcube.urls")),
    path("api/v1/pagecube/", include("pagecube.urls")),
    path("api/v1/", include("workflows.urls")),
    path("api/v1/billing/", include("billing.urls")),
    path("api/v1/ai/", include("ai.urls")),
    path("api/flowcube/", include("flowcube.urls")),
    path("api/telegram/", include("telegram_integration.urls")),
    path("api/v1/chatcube/", include("chatcube.urls")),
    # PageCube public page serving
    path("p/<slug:slug>/", include(("pagecube.public_urls", "pagecube"), namespace="pagecube-public")),
]
