from rest_framework import serializers
from socialcube.models import Competitor, CompetitorSnapshot


class CompetitorSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitorSnapshot
        fields = [
            "id", "date", "followers", "following", "posts_count",
            "avg_likes", "avg_comments", "engagement_rate", "fetched_at",
        ]
        read_only_fields = fields


class CompetitorSerializer(serializers.ModelSerializer):
    latest_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = Competitor
        fields = [
            "id", "platform", "username", "display_name",
            "profile_image_url", "is_active", "created_at",
            "latest_snapshot",
        ]
        read_only_fields = ["id", "display_name", "profile_image_url", "created_at"]

    def get_latest_snapshot(self, obj):
        snapshot = obj.snapshots.order_by("-date").first()
        if snapshot:
            return CompetitorSnapshotSerializer(snapshot).data
        return None
