from rest_framework import serializers
from socialcube.models import ScheduledPost, PostMedia, PostPlatform, SocialAccount


class PostMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostMedia
        fields = ["id", "file", "media_type", "alt_text", "order", "created_at"]
        read_only_fields = ["id", "created_at"]


class PostPlatformSerializer(serializers.ModelSerializer):
    account_username = serializers.CharField(source="account.username", read_only=True)
    account_platform = serializers.CharField(source="account.platform", read_only=True)

    class Meta:
        model = PostPlatform
        fields = [
            "id", "account", "account_username", "account_platform",
            "platform_post_id", "status", "error_message", "published_at",
        ]
        read_only_fields = ["id", "platform_post_id", "status", "error_message", "published_at"]


class ScheduledPostListSerializer(serializers.ModelSerializer):
    platforms = PostPlatformSerializer(many=True, read_only=True)
    media_count = serializers.SerializerMethodField()
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ScheduledPost
        fields = [
            "id", "title", "caption", "status", "post_type",
            "scheduled_at", "created_at", "media_count", "platforms",
            "user_name",
        ]
        read_only_fields = fields

    def get_media_count(self, obj):
        return obj.media_items.count()


class ScheduledPostSerializer(serializers.ModelSerializer):
    platforms = PostPlatformSerializer(many=True, read_only=True)
    media_items = PostMediaSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = ScheduledPost
        fields = [
            "id", "title", "caption", "hashtags", "status", "post_type",
            "scheduled_at", "created_at", "updated_at",
            "first_comment", "location_id", "location_name",
            "platforms", "media_items", "user_name",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at", "user_name"]


class ScheduledPostCreateSerializer(serializers.ModelSerializer):
    account_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        help_text="List of SocialAccount IDs to post to",
    )
    media_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="List of PostMedia IDs to attach",
    )

    class Meta:
        model = ScheduledPost
        fields = [
            "title", "caption", "hashtags", "post_type",
            "scheduled_at", "first_comment", "location_id", "location_name",
            "account_ids", "media_ids",
        ]

    def validate_account_ids(self, value):
        user = self.context["request"].user
        accounts = SocialAccount.objects.filter(id__in=value, user=user, is_active=True)
        if accounts.count() != len(value):
            raise serializers.ValidationError("One or more accounts are invalid or inactive.")
        return value

    def create(self, validated_data):
        account_ids = validated_data.pop("account_ids")
        media_ids = validated_data.pop("media_ids", [])
        validated_data["user"] = self.context["request"].user

        if validated_data.get("scheduled_at"):
            validated_data["status"] = "scheduled"
        else:
            validated_data["status"] = "draft"

        post = ScheduledPost.objects.create(**validated_data)

        for account_id in account_ids:
            PostPlatform.objects.create(post=post, account_id=account_id)

        if media_ids:
            PostMedia.objects.filter(id__in=media_ids, post__isnull=True).update(post=post)

        return post
