import logging
import time

import requests

from .base import AbstractPlatformService

logger = logging.getLogger(__name__)

GRAPH_API_VERSION = "v24.0"
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class InstagramService(AbstractPlatformService):
    PLATFORM_NAME = "instagram"

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
        short_token = resp.json()
        # Exchange for long-lived token
        ll_resp = requests.get(
            f"{GRAPH_API_BASE}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": self._app_id(),
                "client_secret": self._app_secret(),
                "fb_exchange_token": short_token["access_token"],
            },
            timeout=30,
        )
        ll_resp.raise_for_status()
        ll_data = ll_resp.json()
        return {
            "access_token": ll_data["access_token"],
            "token_type": ll_data.get("token_type", "bearer"),
            "expires_in": ll_data.get("expires_in", 5184000),
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
        return {
            "access_token": data["access_token"],
            "expires_in": data.get("expires_in", 5184000),
        }

    def get_user_info(self, access_token: str) -> dict:
        # Get Facebook pages, then find IG business account
        resp = requests.get(
            f"{GRAPH_API_BASE}/me/accounts",
            params={"access_token": access_token, "fields": "id,name,instagram_business_account"},
            timeout=30,
        )
        resp.raise_for_status()
        pages = resp.json().get("data", [])
        for page in pages:
            ig = page.get("instagram_business_account")
            if ig:
                ig_resp = requests.get(
                    f"{GRAPH_API_BASE}/{ig[id]}",
                    params={
                        "access_token": access_token,
                        "fields": "id,username,name,profile_picture_url,followers_count,media_count",
                    },
                    timeout=30,
                )
                ig_resp.raise_for_status()
                ig_data = ig_resp.json()
                return {
                    "id": ig_data["id"],
                    "username": ig_data.get("username", ""),
                    "display_name": ig_data.get("name", ""),
                    "profile_image_url": ig_data.get("profile_picture_url", ""),
                    "followers_count": ig_data.get("followers_count", 0),
                    "media_count": ig_data.get("media_count", 0),
                    "page_id": page["id"],
                    "page_access_token": self._get_page_token(access_token, page["id"]),
                }
        raise ValueError("No Instagram Business Account found. Connect a Facebook Page with IG first.")

    def publish_post(self, access_token: str, post_data: dict) -> dict:
        ig_user_id = post_data["ig_user_id"]
        media_items = post_data.get("media", [])
        caption = post_data.get("caption", "")

        if len(media_items) > 1:
            return self._publish_carousel(access_token, ig_user_id, media_items, caption)
        elif media_items and media_items[0].get("media_type") == "video":
            return self._publish_video(access_token, ig_user_id, media_items[0], caption)
        elif media_items:
            return self._publish_image(access_token, ig_user_id, media_items[0], caption)
        else:
            raise ValueError("No media provided for Instagram post")

    def _publish_image(self, token, ig_user_id, media, caption):
        # Step 1: Create media container
        resp = requests.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/media",
            data={
                "image_url": media["url"],
                "caption": caption,
                "access_token": token,
            },
            timeout=60,
        )
        resp.raise_for_status()
        container_id = resp.json()["id"]
        # Step 2: Publish
        pub_resp = requests.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/media_publish",
            data={"creation_id": container_id, "access_token": token},
            timeout=60,
        )
        pub_resp.raise_for_status()
        post_id = pub_resp.json()["id"]
        permalink = self._get_permalink(token, post_id)
        return {"platform_post_id": post_id, "permalink": permalink}

    def _publish_video(self, token, ig_user_id, media, caption):
        # Step 1: Create video container
        data = {
            "video_url": media["url"],
            "caption": caption,
            "media_type": "REELS" if media.get("is_reel") else "VIDEO",
            "access_token": token,
        }
        resp = requests.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/media", data=data, timeout=60
        )
        resp.raise_for_status()
        container_id = resp.json()["id"]
        # Wait for processing
        self._wait_for_container(token, container_id)
        # Step 2: Publish
        pub_resp = requests.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/media_publish",
            data={"creation_id": container_id, "access_token": token},
            timeout=60,
        )
        pub_resp.raise_for_status()
        post_id = pub_resp.json()["id"]
        permalink = self._get_permalink(token, post_id)
        return {"platform_post_id": post_id, "permalink": permalink}

    def _publish_carousel(self, token, ig_user_id, media_items, caption):
        children_ids = []
        for item in media_items[:10]:
            data = {"access_token": token, "is_carousel_item": "true"}
            if item.get("media_type") == "video":
                data["video_url"] = item["url"]
                data["media_type"] = "VIDEO"
            else:
                data["image_url"] = item["url"]
            resp = requests.post(
                f"{GRAPH_API_BASE}/{ig_user_id}/media", data=data, timeout=60
            )
            resp.raise_for_status()
            children_ids.append(resp.json()["id"])
            if item.get("media_type") == "video":
                self._wait_for_container(token, children_ids[-1])
        # Create carousel container
        resp = requests.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/media",
            data={
                "media_type": "CAROUSEL",
                "children": ",".join(children_ids),
                "caption": caption,
                "access_token": token,
            },
            timeout=60,
        )
        resp.raise_for_status()
        container_id = resp.json()["id"]
        # Publish
        pub_resp = requests.post(
            f"{GRAPH_API_BASE}/{ig_user_id}/media_publish",
            data={"creation_id": container_id, "access_token": token},
            timeout=60,
        )
        pub_resp.raise_for_status()
        post_id = pub_resp.json()["id"]
        permalink = self._get_permalink(token, post_id)
        return {"platform_post_id": post_id, "permalink": permalink}

    def _wait_for_container(self, token, container_id, max_retries=30, interval=5):
        for _ in range(max_retries):
            resp = requests.get(
                f"{GRAPH_API_BASE}/{container_id}",
                params={"fields": "status_code", "access_token": token},
                timeout=30,
            )
            resp.raise_for_status()
            status_code = resp.json().get("status_code")
            if status_code == "FINISHED":
                return
            if status_code == "ERROR":
                raise RuntimeError(f"Media container {container_id} failed processing")
            time.sleep(interval)
        raise TimeoutError(f"Media container {container_id} processing timed out")

    def _get_permalink(self, token, post_id):
        try:
            resp = requests.get(
                f"{GRAPH_API_BASE}/{post_id}",
                params={"fields": "permalink", "access_token": token},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json().get("permalink", "")
        except Exception:
            return ""

    def _get_page_token(self, user_token, page_id):
        resp = requests.get(
            f"{GRAPH_API_BASE}/{page_id}",
            params={"fields": "access_token", "access_token": user_token},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json().get("access_token", user_token)

    def delete_post(self, access_token: str, platform_post_id: str) -> bool:
        resp = requests.delete(
            f"{GRAPH_API_BASE}/{platform_post_id}",
            params={"access_token": access_token},
            timeout=30,
        )
        return resp.status_code == 200

    def get_post_insights(self, access_token: str, platform_post_id: str) -> dict:
        metrics = "impressions,reach,likes,comments,saved,shares"
        resp = requests.get(
            f"{GRAPH_API_BASE}/{platform_post_id}/insights",
            params={"metric": metrics, "access_token": access_token},
            timeout=30,
        )
        resp.raise_for_status()
        result = {}
        for item in resp.json().get("data", []):
            name = item["name"]
            value = item["values"][0]["value"] if item.get("values") else 0
            result[name] = value
        return result

    def get_account_insights(self, access_token: str, user_id: str, date_range: tuple) -> dict:
        metrics = "impressions,reach,follower_count,profile_views,website_clicks"
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
        return ["image", "video", "carousel", "reel", "story"]

    def get_rate_limits(self):
        return {"posts_per_day": 50, "api_calls_per_hour": 200}

    def _app_id(self):
        from django.conf import settings
        return getattr(settings, "SOCIALCUBE_META_APP_ID", "656846287422494")

    def _app_secret(self):
        from django.conf import settings
        return getattr(settings, "SOCIALCUBE_META_APP_SECRET", "")
