"""
FlowCube URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from .views import ThrottledObtainAuthToken


def health_check(request):
    return JsonResponse({"status": "ok", "service": "FlowCube API"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/v1/", include("workflows.urls")),
    # path("api/v1/marketplace/", include("marketplace.urls")),
    path("api/v1/billing/", include("billing.urls")),
    path("api/v1/", include("achievements.urls")),
    path("api/v1/ai/", include("ai.urls")),
    path("api/v1/auth/token/", ThrottledObtainAuthToken.as_view(), name="api_token_auth"),
    path("api/flowcube/", include("flowcube.urls")),
    path("api/telegram/", include("telegram_integration.urls")),
]
