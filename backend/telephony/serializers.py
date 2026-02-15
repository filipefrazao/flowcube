from rest_framework import serializers
from .models import (
    Extension,
    CallRecord,
    VoicemailMessage,
    IVRMenu,
    IVROption,
    CallQueue,
    QueueMember,
    CallStats,
)


class ExtensionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = Extension
        fields = [
            "id",
            "user",
            "user_name",
            "extension_number",
            "sip_password",
            "webrtc_enabled",
            "status",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {"sip_password": {"write_only": True}}

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class CallRecordSerializer(serializers.ModelSerializer):
    agent_name = serializers.SerializerMethodField()
    lead_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()

    class Meta:
        model = CallRecord
        fields = [
            "id",
            "pabx_call_id",
            "direction",
            "status",
            "caller_number",
            "callee_number",
            "lead",
            "lead_name",
            "contact",
            "contact_name",
            "agent",
            "agent_name",
            "start_time",
            "answer_time",
            "end_time",
            "duration_seconds",
            "recording_s3_key",
            "transcription",
            "transcription_status",
            "disposition",
            "notes",
        ]
        read_only_fields = [
            "id",
            "pabx_call_id",
            "start_time",
            "recording_s3_key",
            "transcription",
            "transcription_status",
        ]

    def get_agent_name(self, obj):
        if obj.agent:
            return obj.agent.get_full_name() or obj.agent.username
        return None

    def get_lead_name(self, obj):
        if obj.lead:
            return obj.lead.name
        return None

    def get_contact_name(self, obj):
        if obj.contact:
            return obj.contact.name
        return None


class CallRecordListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views (no transcription)."""

    agent_name = serializers.SerializerMethodField()
    lead_name = serializers.SerializerMethodField()

    class Meta:
        model = CallRecord
        fields = [
            "id",
            "direction",
            "status",
            "caller_number",
            "callee_number",
            "lead",
            "lead_name",
            "agent",
            "agent_name",
            "start_time",
            "duration_seconds",
            "disposition",
            "transcription_status",
        ]

    def get_agent_name(self, obj):
        if obj.agent:
            return obj.agent.get_full_name() or obj.agent.username
        return None

    def get_lead_name(self, obj):
        if obj.lead:
            return obj.lead.name
        return None


class VoicemailMessageSerializer(serializers.ModelSerializer):
    extension_number = serializers.CharField(
        source="extension.extension_number", read_only=True
    )

    class Meta:
        model = VoicemailMessage
        fields = [
            "id",
            "extension",
            "extension_number",
            "caller_number",
            "duration",
            "audio_s3_key",
            "transcription",
            "is_read",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class IVROptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = IVROption
        fields = [
            "id",
            "ivr_menu",
            "digit",
            "label",
            "destination_type",
            "destination_id",
        ]


class IVRMenuSerializer(serializers.ModelSerializer):
    options = IVROptionSerializer(many=True, read_only=True)

    class Meta:
        model = IVRMenu
        fields = [
            "id",
            "name",
            "greeting_audio_s3_key",
            "timeout_seconds",
            "timeout_destination",
            "invalid_destination",
            "max_retries",
            "options",
        ]


class QueueMemberSerializer(serializers.ModelSerializer):
    extension_number = serializers.CharField(
        source="extension.extension_number", read_only=True
    )
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = QueueMember
        fields = [
            "id",
            "queue",
            "extension",
            "extension_number",
            "user_name",
            "priority",
        ]

    def get_user_name(self, obj):
        return obj.extension.user.get_full_name() or obj.extension.user.username


class CallQueueSerializer(serializers.ModelSerializer):
    members = QueueMemberSerializer(many=True, read_only=True)

    class Meta:
        model = CallQueue
        fields = [
            "id",
            "name",
            "strategy",
            "timeout",
            "max_wait_time",
            "music_on_hold",
            "members",
        ]


class CallStatsSerializer(serializers.ModelSerializer):
    agent_name = serializers.SerializerMethodField()

    class Meta:
        model = CallStats
        fields = [
            "id",
            "date",
            "agent",
            "agent_name",
            "total_calls",
            "answered_calls",
            "missed_calls",
            "outbound_calls",
            "avg_duration",
            "total_talk_time",
        ]

    def get_agent_name(self, obj):
        return obj.agent.get_full_name() or obj.agent.username


class InitiateCallSerializer(serializers.Serializer):
    to_number = serializers.CharField(max_length=50)
    lead_id = serializers.UUIDField(required=False, allow_null=True)
