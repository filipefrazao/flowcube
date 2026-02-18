from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from .models import Campaign, Contact, Group, GroupNote, GroupTask, Message, MessageTemplate, WhatsAppInstance

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_jid = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "instance",
            "remote_jid",
            "from_me",
            "message_type",
            "content",
            "media_url",
            "wa_message_id",
            "status",
            "timestamp",
            "metadata",
            "sender_name",
            "sender_jid",
        ]
        read_only_fields = ["id", "sender_name", "sender_jid"]

    def get_sender_name(self, obj):
        if obj.from_me:
            return None
        meta = obj.metadata or {}
        return meta.get("pushName") or meta.get("push_name") or meta.get("sender_name") or None

    def get_sender_jid(self, obj):
        if obj.from_me:
            return None
        meta = obj.metadata or {}
        return meta.get("participant") or meta.get("sender_jid") or None


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id",
            "instance",
            "jid",
            "name",
            "phone",
            "profile_picture",
            "is_business",
            "last_message_at",
        ]
        read_only_fields = ["id"]


class GroupNoteSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupNote
        fields = ["id", "group", "user", "user_name", "content", "note_type", "created_at"]
        read_only_fields = ["id", "group", "user", "user_name", "created_at"]

    def get_user_name(self, obj):
        if not obj.user:
            return "Sistema"
        return obj.user.get_full_name() or obj.user.username


class GroupTaskSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GroupTask
        fields = [
            "id", "group", "created_by", "created_by_name",
            "title", "description", "is_completed", "priority",
            "due_date", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "group", "created_by", "created_by_name", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "Sistema"
        return obj.created_by.get_full_name() or obj.created_by.username


class GroupSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(default=0, read_only=True)
    last_message_at = serializers.DateTimeField(default=None, read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            "id",
            "instance",
            "jid",
            "name",
            "description",
            "participants_count",
            "is_admin",
            "assigned_to",
            "assigned_to_name",
            "message_count",
            "last_message_at",
        ]
        read_only_fields = ["id", "assigned_to_name"]

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return None
        return obj.assigned_to.get_full_name() or obj.assigned_to.username


class WhatsAppInstanceSerializer(serializers.ModelSerializer):
    stats = serializers.SerializerMethodField()

    # Secrets should not be returned back to the client.
    access_token = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)
    webhook_secret = serializers.CharField(write_only=True, required=False, allow_null=True, allow_blank=True)

    class Meta:
        model = WhatsAppInstance
        fields = [
            "id",
            "owner",
            "name",
            "phone_number",
            "engine",
            "status",
            "quality_rating",
            "profile_picture",
            "phone_number_id",
            "waba_id",
            "access_token",
            "webhook_url",
            "webhook_secret",
            "webhook_events",
            "is_warmed_up",
            "messages_sent_today",
            "daily_limit",
            "warmup_day",
            "engine_instance_id",
            "created_at",
            "updated_at",
            "last_connected_at",
            "stats",
        ]
        read_only_fields = [
            "id",
            "owner",
            "engine_instance_id",
            "created_at",
            "updated_at",
            "last_connected_at",
            "stats",
        ]

    def get_stats(self, obj):
        now = timezone.now()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        qs = obj.messages.filter(timestamp__gte=start, timestamp__lt=end)
        return {
            "messages_sent_today": qs.filter(from_me=True).count(),
            "messages_received_today": qs.filter(from_me=False).count(),
        }


class MessageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageTemplate
        fields = [
            "id",
            "owner",
            "name",
            "content",
            "variables",
            "message_type",
            "media_url",
            "created_at",
        ]
        read_only_fields = ["id", "owner", "created_at"]


class CampaignSerializer(serializers.ModelSerializer):
    instance_name = serializers.CharField(source="instance.name", read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id",
            "owner",
            "instance",
            "instance_name",
            "name",
            "template",
            "recipients",
            "status",
            "sent_count",
            "delivered_count",
            "read_count",
            "failed_count",
            "scheduled_at",
            "started_at",
            "completed_at",
            "delay_between_messages_ms",
            "batch_size",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "instance_name",
            "sent_count",
            "delivered_count",
            "read_count",
            "failed_count",
            "started_at",
            "completed_at",
            "created_at",
        ]

