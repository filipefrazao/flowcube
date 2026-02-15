from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "FRZ Platform API"})


def api_root(request):
    return JsonResponse({
        "status": "ok",
        "service": "FRZ Platform API",
        "version": "11.3.0",
        "endpoints": {
            "health": "/api/health/",
            "auth_token": "/api/v1/auth/token/",
            "auth_jwt": "/api/v1/auth/jwt/",
            "auth_jwt_refresh": "/api/v1/auth/jwt/refresh/",
            "auth_me": "/api/v1/auth/me/",
            "workflows": "/api/v1/workflows/",
            "credentials": "/api/v1/credentials/",
            "preferences": "/api/v1/preferences/me/",
            "executions": "/api/v1/executions/",
            "telegram": "/api/v1/telegram/",
            "email": "/api/v1/email/",
            "instagram": "/api/v1/instagram/",
            "ai-agents": "/api/v1/ai-agents/",
            "achievements": "/api/v1/achievements/",
            "chatcube": "/api/v1/chatcube/",
            "salescube": "/api/v1/salescube/",
            "minicube": "/api/v1/minicube/",
            "admin": "/admin/",
        }
    })


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
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health'),
    # Auth - Token (legacy compatibility)
    path('api/v1/auth/token/', obtain_auth_token, name='api-token-auth'),
    # Auth - JWT (aligned with SalesCube PROD)
    path('api/v1/auth/jwt/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('api/v1/auth/jwt/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('api/v1/auth/jwt/verify/', TokenVerifyView.as_view(), name='token-verify'),
    # Auth - User info
    path('api/v1/auth/me/', auth_me, name='auth-me'),
    # App routes
    path('api/v1/', include('workflows.urls')),
    path('api/v1/', include('flowcube.urls')),
    path('api/v1/telegram/', include('telegram_integration.urls')),
    path('api/v1/email/', include('email_sequences.urls')),
    path('api/v1/instagram/', include('instagram_automation.urls')),
    path('api/v1/ai-agents/', include('ai_agents.urls')),
    path('api/v1/', include('achievements.urls')),
    path('api/v1/chatcube/', include('chatcube.urls')),
    path('api/v1/salescube/', include('salescube.urls')),
    path('api/v1/minicube/', include('minicube.urls')),
    path('api/', api_root, name='api-root'),
    path('', api_root, name='root'),
]
