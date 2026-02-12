import logging
import requests
from .base import AbstractPlatformService

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v24.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class FacebookService(AbstractPlatformService):
    PLATFORM_NAME = "facebook"

    def authenticate(self, auth_code: str, redirect_uri: str) -> dict:
        resp = requests.post(
            f"{GRAPH_API_BASE}/oauth/access_token",
            data={
                "client_id": self._app_id(),
                "client_secret": self._app_secret(),
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
                "code": auth_code,
            },
            timeout=30,
        )
        resp.raise_for_status()
        short = resp.json()
        ll_resp = requests.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": self._app_id(),
                "client_secret": self._app_secret(),
                "fb_exchange_token": short["access_token"],
            },
            timeout=30,
        )
        ll_resp.raise_for_status()
        data = ll_resp.json()
        return {
            "access_token": data["access_token"],
            "expires_in": data.get("expires_in", 5184000),
        }

    def refresh_access_token(self, refresh_token: str) -> dict:
        resp = requests.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": self._app_id(),
                "client_secret": self._app_secret(),
                "fb_exchange_token": refresh_token,
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return {"access_token": data["access_token"], "expires_in": data.get("expires_in", 5184000)}

    def get_user_info(self, access_token: str) -> dict:
        resp = requests.get(
            f"{GRAPH_API_BASE}/me/accounts",
            params={"access_token": access_token, "fields": "id,name,picture,fan_count,link"},
            timeout=30,
        )
        resp.raise_for_status()
        pages = resp.json().get("data", [])
        if not pages:
            raise ValueError("No Facebook Pages found for this account")
        page = pages[0]
        page_token_resp = requests.get(
            f"{GRAPH_API_BASE}/{page[id]}",
            params={"fields": "access_token", "access_token": access_token},
            timeout=30,
        )
        page_token_resp.raise_for_status()
        return {
            "id": page["id"],
            "username": page.get("name", ""),
            "display_name": page.get("name", ""),
            "profile_image_url": page.get("picture", {}).get("data", {}).get("url", ""),
            "followers_count": page.get("fan_count", 0),
            "page_access_token": page_token_resp.json().get("access_token", ""),
            "all_pages": [{"id": p["id"], "name": p["name"]} for p in pages],
        }

    def publish_post(self, access_token: str, post_data: dict) -> dict:
        page_id = post_data["page_id"]
        caption = post_data.get("caption", "")
        media_items = post_data.get("media", [])

        if media_items and media_items[0].get("media_type") == "video":
            return self._publish_video(access_token, page_id, media_items[0], caption)
        elif media_items:
            return self._publish_photo(access_token, page_id, media_items[0], caption)
        else:
            return self._publish_text(access_token, page_id, caption)

    def _publish_text(self, token, page_id, message):
        resp = requests.post(
            f"{GRAPH_API_BASE}/{page_id}/feed",
            data={"message": message, "access_token": token},
            timeout=60,
        )
        resp.raise_for_status()
        post_id = resp.json()["id"]
        return {"platform_post_id": post_id, "permalink": f"https://www.facebook.com/{post_id}"}

    def _publish_photo(self, token, page_id, media, caption):
        resp = requests.post(
            f"{GRAPH_API_BASE}/{page_id}/photos",
            data={"url": media["url"], "message": caption, "access_token": token},
            timeout=60,
        )
        resp.raise_for_status()
        post_id = resp.json().get("post_id", resp.json().get("id", ""))
        return {"platform_post_id": post_id, "permalink": f"https://www.facebook.com/{post_id}"}

    def _publish_video(self, token, page_id, media, caption):
        resp = requests.post(
            f"{GRAPH_API_BASE}/{page_id}/videos",
            data={"file_url": media["url"], "description": caption, "access_token": token},
            timeout=120,
        )
        resp.raise_for_status()
        post_id = resp.json().get("id", "")
        return {"platform_post_id": post_id, "permalink": f"https://www.facebook.com/{post_id}"}

    def delete_post(self, access_token: str, platform_post_id: str) -> bool:
        resp = requests.delete(
            f"{GRAPH_API_BASE}/{platform_post_id}",
            params={"access_token": access_token},
            timeout=30,
        )
        return resp.status_code == 200

    def get_post_insights(self, access_token: str, platform_post_id: str) -> dict:
        metrics = "post_impressions,post_engaged_users,post_reactions_by_type_total,post_clicks"
        resp = requests.get(
            f"{GRAPH_API_BASE}/{platform_post_id}/insights",
            params={"metric": metrics, "access_token": access_token},
            timeout=30,
        )
        resp.raise_for_status()
        result = {}
        for item in resp.json().get("data", []):
            result[item["name"]] = item["values"][0]["value"] if item.get("values") else 0
        return result

    def get_account_insights(self, access_token: str, user_id: str, date_range: tuple) -> dict:
        metrics = "page_impressions,page_engaged_users,page_fans,page_views_total"
        resp = requests.get(
            f"{GRAPH_API_BASE}/{user_id}/insights",
            params={
                "metric": metrics,
                "period": "day",
                "since": int(date_range[0].timestamp()),
                "until": int(date_range[1].timestamp()),
                "access_token": access_token,
            },
            timeout=30,
        )
        resp.raise_for_status()
        result = {}
        for item in resp.json().get("data", []):
            result[item["name"]] = item.get("values", [])
        return result

    def get_supported_content_types(self):
        return ["image", "video", "text", "link"]

    def _app_id(self):
        from django.conf import settings
        return getattr(settings, "SOCIALCUBE_META_APP_ID", "656846287422494")

    def _app_secret(self):
        from django.conf import settings
        return getattr(settings, "SOCIALCUBE_META_APP_SECRET", "")
