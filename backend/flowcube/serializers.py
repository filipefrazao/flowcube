# flowcube/serializers.py
from rest_framework import serializers
from .models import UserPreference, Credential


class UserPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for user preferences"""
    class Meta:
        model = UserPreference
        fields = [
            'id',
            'theme',
            'sidebar_collapsed',
            'default_zoom',
            'show_minimap',
            'show_node_stats',
            'email_notifications',
            'execution_failure_alerts',
            'weekly_digest',
            'auto_save',
            'auto_save_interval_seconds',
            'snap_to_grid',
            'grid_size',
        ]
        read_only_fields = ['id']


class CredentialListSerializer(serializers.ModelSerializer):
    """Serializer for listing credentials (no sensitive data)"""
    masked_preview = serializers.SerializerMethodField()
    credential_type_display = serializers.CharField(source='get_credential_type_display', read_only=True)

    class Meta:
        model = Credential
        fields = [
            'id', 'name', 'credential_type', 'credential_type_display',
            'description', 'base_url', 'is_active', 'created_at',
            'updated_at', 'last_used_at', 'masked_preview'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_used_at']

    def get_masked_preview(self, obj):
        return obj.get_masked_preview()


class CredentialDetailSerializer(serializers.ModelSerializer):
    """Full serializer for credential detail/create/update"""
    data = serializers.JSONField(write_only=True, required=False)
    masked_preview = serializers.SerializerMethodField()
    credential_type_display = serializers.CharField(source='get_credential_type_display', read_only=True)

    class Meta:
        model = Credential
        fields = [
            'id', 'name', 'credential_type', 'credential_type_display',
            'description', 'base_url', 'is_active', 'data', 'masked_preview',
            'created_at', 'updated_at', 'last_used_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_used_at']

    def get_masked_preview(self, obj):
        return obj.get_masked_preview()

    def create(self, validated_data):
        data = validated_data.pop('data', {})
        validated_data['owner'] = self.context['request'].user
        credential = Credential(**validated_data)
        credential.data = data
        credential.save()
        return credential

    def update(self, instance, validated_data):
        data = validated_data.pop('data', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if data is not None:
            instance.data = data
        instance.save()
        return instance


# ============================================================================
# CHATBOT SERIALIZERS - Added by Multi-Agent Orchestration
# ============================================================================

from flowcube.models import ChatSession, ChatMessage, HandoffRequest, WhatsAppWebhookLog


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'direction', 'message_type', 'content', 'media_url',
            'metadata', 'is_ai_generated', 'ai_model', 'whatsapp_status',
            'created_at', 'delivered_at', 'read_at'
        ]
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    
    class Meta:
        model = ChatSession
        fields = [
            'id', 'workflow', 'workflow_name', 'contact_phone', 'contact_name',
            'contact_email', 'whatsapp_instance', 'current_node_id', 'status',
            'variables', 'message_count', 'assigned_to', 'assigned_to_name',
            'handoff_reason', 'salescube_lead_id', 'created_at', 'updated_at',
            'last_message_at', 'messages'
        ]
        read_only_fields = ['id', 'message_count', 'created_at', 'updated_at']


class ChatSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing sessions"""
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)
    last_message = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = [
            'id', 'workflow_name', 'contact_phone', 'contact_name',
            'status', 'message_count', 'last_message_at', 'last_message'
        ]
    
    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content[:100],
                'direction': last_msg.direction,
                'created_at': last_msg.created_at
            }
        return None


class HandoffRequestSerializer(serializers.ModelSerializer):
    session_info = ChatSessionListSerializer(source='session', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    
    class Meta:
        model = HandoffRequest
        fields = [
            'id', 'session', 'session_info', 'reason', 'reason_details',
            'status', 'assigned_to', 'assigned_to_name', 'conversation_summary',
            'collected_variables', 'sentiment_score', 'created_at',
            'accepted_at', 'completed_at'
        ]
        read_only_fields = ['id', 'created_at']
