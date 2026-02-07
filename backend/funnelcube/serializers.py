from rest_framework import serializers

from .models import (
    AnalyticsClient,
    AnalyticsDashboard,
    AnalyticsEvent,
    AnalyticsEventMeta,
    AnalyticsNotificationRule,
    AnalyticsProfile,
    AnalyticsProject,
    AnalyticsReference,
    AnalyticsReport,
    AnalyticsSession,
)


class AnalyticsProjectSerializer(serializers.ModelSerializer):
    client_id = serializers.SerializerMethodField()
    client_secret = serializers.SerializerMethodField()

    class Meta:
        model = AnalyticsProject
        fields = [
            "id", "name", "domain", "timezone", "is_active",
            "created_at", "updated_at", "owner",
            "client_id", "client_secret",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_client_id(self, obj):
        client = obj.clients.filter(is_active=True).first()
        return client.client_id if client else None

    def get_client_secret(self, obj):
        client = obj.clients.filter(is_active=True).first()
        return client.client_secret if client else None


class AnalyticsClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsClient
        fields = "__all__"
        read_only_fields = ["id", "client_id", "client_secret", "created_at"]


class AnalyticsEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsEvent
        fields = "__all__"


class AnalyticsSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsSession
        fields = "__all__"


class AnalyticsProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsProfile
        fields = "__all__"


class AnalyticsDashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsDashboard
        fields = "__all__"
        read_only_fields = ["id", "owner", "created_at", "updated_at"]


class AnalyticsReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsReport
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class AnalyticsEventMetaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsEventMeta
        fields = "__all__"
        read_only_fields = ["id"]


class AnalyticsReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsReference
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class AnalyticsNotificationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsNotificationRule
        fields = "__all__"
        read_only_fields = ["id", "created_at"]


class TrackEventSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    properties = serializers.DictField(required=False, default=dict)
    profile_id = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    timestamp = serializers.DateTimeField(required=False, allow_null=True)
    path = serializers.CharField(max_length=2048, required=False, default="", allow_blank=True)
    referrer = serializers.CharField(max_length=2048, required=False, default="", allow_blank=True)
    origin = serializers.CharField(max_length=255, required=False, default="", allow_blank=True)
    revenue = serializers.FloatField(required=False, default=0)
    duration = serializers.IntegerField(required=False, default=0)


class IdentifySerializer(serializers.Serializer):
    profile_id = serializers.CharField(max_length=255)
    first_name = serializers.CharField(max_length=255, required=False, default="")
    last_name = serializers.CharField(max_length=255, required=False, default="")
    email = serializers.EmailField(required=False, default="")
    avatar = serializers.URLField(required=False, default="")
    properties = serializers.DictField(required=False, default=dict)
