"""
FlowCube URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.authtoken.views import obtain_auth_token


def health_check(request):
    return JsonResponse({"status": "ok", "service": "FlowCube API"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/v1/", include("workflows.urls")),
    path("api/v1/auth/token/", obtain_auth_token, name="api_token_auth"),
    path("api/flowcube/", include("flowcube.urls")),
    path("api/telegram/", include("telegram_integration.urls")),
    path("api/whatsapp/", include("whatsapp.urls")),
    path("api/v1/billing/", include("billing.urls")),  # Billing & Subscriptions
]
