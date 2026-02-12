from abc import ABC, abstractmethod


class AbstractPlatformService(ABC):
    """Interface for all social media platform services."""

    PLATFORM_NAME = ""

    @abstractmethod
    def authenticate(self, auth_code: str, redirect_uri: str) -> dict:
        """Exchange auth code for access_token. Returns token data dict."""

    @abstractmethod
    def refresh_access_token(self, refresh_token: str) -> dict:
        """Refresh the access token. Returns new token data dict."""

    @abstractmethod
    def get_user_info(self, access_token: str) -> dict:
        """Get user profile info. Returns {id, username, display_name, profile_image_url}."""

    @abstractmethod
    def publish_post(self, access_token: str, post_data: dict) -> dict:
        """Publish a post. Returns {platform_post_id, permalink}."""

    @abstractmethod
    def delete_post(self, access_token: str, platform_post_id: str) -> bool:
        """Delete a post from the platform."""

    @abstractmethod
    def get_post_insights(self, access_token: str, platform_post_id: str) -> dict:
        """Get metrics for a specific post."""

    @abstractmethod
    def get_account_insights(self, access_token: str, user_id: str, date_range: tuple) -> dict:
        """Get aggregated account metrics."""

    def get_supported_content_types(self) -> list:
        return ["image"]

    def get_rate_limits(self) -> dict:
        return {"posts_per_day": 50, "api_calls_per_hour": 200}
