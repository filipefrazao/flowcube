from rest_framework import serializers
from socialcube.models import SocialAccount


class SocialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = [
            "id", "platform", "platform_user_id", "username", "display_name",
            "profile_image_url", "is_active", "connected_at", "last_synced_at",
            "token_expires_at", "scopes", "metadata",
        ]
        read_only_fields = [
            "id", "platform_user_id", "username", "display_name",
            "profile_image_url", "connected_at", "last_synced_at",
            "token_expires_at", "scopes", "metadata",
        ]


class SocialAccountListSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAccount
        fields = [
            "id", "platform", "username", "display_name",
            "profile_image_url", "is_active", "connected_at",
        ]


class OAuthConnectSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=["instagram", "facebook"])
    access_token = serializers.CharField(help_text="Short-lived token from OAuth redirect")
    page_id = serializers.CharField(required=False, allow_blank=True, help_text="Facebook Page ID (for IG business)")
