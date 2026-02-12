from rest_framework import serializers
from socialcube.models import PostInsight, PlatformAnalytics


class PostInsightSerializer(serializers.ModelSerializer):
    post_title = serializers.CharField(source="post_platform.post.title", read_only=True)
    account_username = serializers.CharField(source="post_platform.account.username", read_only=True)
    platform = serializers.CharField(source="post_platform.account.platform", read_only=True)

    class Meta:
        model = PostInsight
        fields = [
            "id", "post_title", "account_username", "platform",
            "impressions", "reach", "likes", "comments", "shares",
            "saves", "clicks", "engagement_rate", "fetched_at",
        ]
        read_only_fields = fields


class PlatformAnalyticsSerializer(serializers.ModelSerializer):
    account_username = serializers.CharField(source="account.username", read_only=True)
    platform = serializers.CharField(source="account.platform", read_only=True)

    class Meta:
        model = PlatformAnalytics
        fields = [
            "id", "account_username", "platform", "date",
            "followers", "following", "posts_count",
            "impressions", "reach", "engagement_rate",
            "profile_views", "website_clicks",
            "best_posting_hour", "audience_data",
        ]
        read_only_fields = fields
