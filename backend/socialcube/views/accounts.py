import logging
from urllib.parse import urlencode

from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from socialcube.models import SocialAccount
from socialcube.serializers import SocialAccountSerializer, SocialAccountListSerializer
from socialcube.services.platforms.instagram import InstagramService
from socialcube.services.platforms.facebook import FacebookService

logger = logging.getLogger(__name__)

META_APP_ID = getattr(settings, "SOCIALCUBE_META_APP_ID", "656846287422494")
META_APP_SECRET = getattr(settings, "SOCIALCUBE_META_APP_SECRET", "")
META_REDIRECT_URI = getattr(
    settings, "SOCIALCUBE_META_REDIRECT_URI",
    "https://flowcube.frzgroup.com.br/socialcube/callback"
)


class SocialAccountViewSet(viewsets.ModelViewSet):
    serializer_class = SocialAccountSerializer
    http_method_names = ["get", "delete", "patch"]

    def get_queryset(self):
        return SocialAccount.objects.filter(user=self.request.user).order_by("-connected_at")

    def get_serializer_class(self):
        if self.action == "list":
            return SocialAccountListSerializer
        return SocialAccountSerializer

    @action(detail=False, methods=["get"])
    def oauth_url(self, request):
        platform = request.query_params.get("platform", "instagram")
        scopes = {
            "instagram": "instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata",
            "facebook": "pages_manage_posts,pages_read_engagement,pages_show_list,pages_read_user_content,read_insights,leads_retrieval,pages_manage_metadata",
        }
        params = {
            "client_id": META_APP_ID,
            "redirect_uri": META_REDIRECT_URI,
            "scope": scopes.get(platform, scopes["instagram"]),
            "response_type": "code",
            "state": f"{platform}:{request.user.id}",
        }
        url = f"https://www.facebook.com/v24.0/dialog/oauth?{urlencode(params)}"
        return Response({"url": url, "platform": platform})

    @action(detail=False, methods=["post"])
    def connect(self, request):
        code = request.data.get("code")
        state = request.data.get("state", "instagram:0")
        platform = state.split(":")[0] if ":" in state else "instagram"

        if not code:
            return Response({"error": "Authorization code is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token_url = "https://graph.facebook.com/v24.0/oauth/access_token"
            import requests as http_requests
            token_resp = http_requests.get(token_url, params={
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "redirect_uri": META_REDIRECT_URI,
                "code": code,
            }, timeout=15)
            token_data = token_resp.json()

            if "error" in token_data:
                return Response({"error": token_data["error"].get("message", "OAuth failed")}, status=status.HTTP_400_BAD_REQUEST)

            short_token = token_data["access_token"]

            if platform == "instagram":
                svc = InstagramService()
                long_token = svc.authenticate(short_token)
                user_info = svc.get_user_info(long_token)
                account, created = SocialAccount.objects.update_or_create(
                    user=request.user,
                    platform="instagram",
                    platform_user_id=user_info["id"],
                    defaults={
                        "username": user_info.get("username", ""),
                        "display_name": user_info.get("name", ""),
                        "profile_image_url": user_info.get("profile_picture_url", ""),
                        "is_active": True,
                        "metadata": {
                            "page_id": user_info.get("page_id", ""),
                            "page_access_token": user_info.get("page_access_token", ""),
                        },
                    }
                )
                account.access_token = long_token
                account.save(update_fields=["_access_token"])

            else:
                svc = FacebookService()
                long_token = svc.authenticate(short_token)
                user_info = svc.get_user_info(long_token)
                account, created = SocialAccount.objects.update_or_create(
                    user=request.user,
                    platform="facebook",
                    platform_user_id=user_info["id"],
                    defaults={
                        "username": user_info.get("name", ""),
                        "display_name": user_info.get("name", ""),
                        "profile_image_url": "",
                        "is_active": True,
                        "metadata": {
                            "page_id": user_info.get("page_id", ""),
                            "page_access_token": user_info.get("page_access_token", ""),
                            "all_pages": user_info.get("all_pages", []),
                        },
                    }
                )
                account.access_token = long_token
                account.save(update_fields=["_access_token"])

            return Response(
                SocialAccountSerializer(account).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )

        except Exception as e:
            logger.exception("OAuth connect failed")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def disconnect(self, request, pk=None):
        account = self.get_object()
        account.is_active = False
        account.save(update_fields=["is_active"])
        return Response({"status": "disconnected"})

    @action(detail=True, methods=["post"])
    def refresh(self, request, pk=None):
        account = self.get_object()
        try:
            if account.platform in ("instagram", "facebook"):
                svc = InstagramService() if account.platform == "instagram" else FacebookService()
                new_token = svc.refresh_access_token(account.access_token)
                account.access_token = new_token
                account.save(update_fields=["_access_token"])
            return Response({"status": "refreshed"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
