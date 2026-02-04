from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.authtoken.views import obtain_auth_token

def health_check(request):
    return JsonResponse({"status": "ok", "service": "FlowCube API"})

def api_root(request):
    return JsonResponse({
        "status": "ok",
        "service": "FlowCube API",
        "version": "3.0.0",
        "endpoints": {
            "health": "/api/health/",
            "auth": "/api/v1/auth/token/",
            "workflows": "/api/v1/workflows/",
            "credentials": "/api/v1/credentials/",
            "preferences": "/api/v1/preferences/me/",
            "executions": "/api/v1/executions/",
            "telegram": "/api/v1/telegram/",
            "email": "/api/v1/email/",
            "instagram": "/api/v1/instagram/",
            "ai-agents": "/api/v1/ai-agents/",
            "admin": "/admin/",
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health'),
    path('api/v1/auth/token/', obtain_auth_token, name='api-token-auth'),
    path('api/v1/', include('workflows.urls')),
    path('api/v1/', include('flowcube.urls')),
    path('api/v1/telegram/', include('telegram_integration.urls')),
    path('api/v1/email/', include('email_sequences.urls')),
    path('api/v1/instagram/', include('instagram_automation.urls')),
    path('api/v1/ai-agents/', include('ai_agents.urls')),
    path('api/', api_root, name='api-root'),
    path('', api_root, name='root'),
]
