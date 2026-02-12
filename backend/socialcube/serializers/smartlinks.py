from rest_framework import serializers
from socialcube.models import SmartLinkPage, SmartLinkButton


class SmartLinkButtonSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmartLinkButton
        fields = ["id", "label", "url", "icon", "order", "is_active", "clicks"]
        read_only_fields = ["id", "clicks"]


class SmartLinkPageSerializer(serializers.ModelSerializer):
    buttons = SmartLinkButtonSerializer(many=True, read_only=True)
    public_url = serializers.SerializerMethodField()

    class Meta:
        model = SmartLinkPage
        fields = [
            "id", "slug", "title", "bio", "avatar_url",
            "theme", "is_active", "total_views",
            "created_at", "buttons", "public_url",
        ]
        read_only_fields = ["id", "total_views", "created_at"]

    def get_public_url(self, obj):
        return f"/s/{obj.slug}"
