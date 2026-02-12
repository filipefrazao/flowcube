from rest_framework import serializers
from socialcube.models import LeadAdsAppConfig, LeadAdsConnection, LeadAdsForm, LeadEntry


class LeadAdsAppConfigSerializer(serializers.ModelSerializer):
    app_secret = serializers.CharField(write_only=True, required=False)
    system_user_token = serializers.CharField(write_only=True, required=False)
    has_secret = serializers.SerializerMethodField()
    has_system_token = serializers.SerializerMethodField()

    class Meta:
        model = LeadAdsAppConfig
        fields = [
            "id", "app_id", "app_secret", "has_secret",
            "system_user_token", "has_system_token",
            "verify_token", "webhook_url", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_has_secret(self, obj):
        return bool(obj._app_secret)

    def get_has_system_token(self, obj):
        return bool(obj._system_user_token)

    def create(self, validated_data):
        secret = validated_data.pop("app_secret", "")
        system_token = validated_data.pop("system_user_token", "")
        instance = LeadAdsAppConfig(**validated_data)
        if secret:
            instance.app_secret = secret
        if system_token:
            instance.system_user_token = system_token
        instance.save()
        return instance

    def update(self, instance, validated_data):
        secret = validated_data.pop("app_secret", None)
        system_token = validated_data.pop("system_user_token", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if secret:
            instance.app_secret = secret
        if system_token:
            instance.system_user_token = system_token
        instance.save()
        return instance


class LeadAdsConnectionSerializer(serializers.ModelSerializer):
    social_account_username = serializers.SerializerMethodField()
    social_account_platform = serializers.SerializerMethodField()
    forms_count = serializers.SerializerMethodField()

    class Meta:
        model = LeadAdsConnection
        fields = [
            "id", "social_account", "social_account_username", "social_account_platform",
            "page_id", "page_name", "is_subscribed", "webhook_verified_at",
            "forms_count", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "page_name", "is_subscribed", "webhook_verified_at",
            "forms_count", "created_at", "updated_at",
        ]

    def get_social_account_username(self, obj):
        return obj.social_account.username if obj.social_account else ""

    def get_social_account_platform(self, obj):
        return obj.social_account.platform if obj.social_account else ""

    def get_forms_count(self, obj):
        return obj.forms.count()


class LeadAdsConnectionCreateSerializer(serializers.Serializer):
    social_account_id = serializers.IntegerField()
    page_id = serializers.CharField(max_length=64)


class LeadAdsFormSerializer(serializers.ModelSerializer):
    connection_page_name = serializers.CharField(source="connection.page_name", read_only=True)

    class Meta:
        model = LeadAdsForm
        fields = [
            "id", "connection", "connection_page_name", "form_id", "form_name",
            "form_status", "distribution_mode", "distribution_config",
            "leads_count", "last_lead_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "connection", "form_id", "form_name",
            "leads_count", "last_lead_at", "created_at", "updated_at",
        ]


class LeadEntrySerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(source="form.form_name", read_only=True)
    form_id_str = serializers.CharField(source="form.form_id", read_only=True)

    class Meta:
        model = LeadEntry
        fields = [
            "id", "form", "form_name", "form_id_str", "leadgen_id",
            "data", "name", "email", "phone",
            "distributed", "distributed_at", "distribution_result",
            "created_at",
        ]
        read_only_fields = fields


class LeadEntryListSerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(source="form.form_name", read_only=True)

    class Meta:
        model = LeadEntry
        fields = [
            "id", "form", "form_name", "leadgen_id",
            "name", "email", "phone",
            "distributed", "created_at",
        ]
        read_only_fields = fields
