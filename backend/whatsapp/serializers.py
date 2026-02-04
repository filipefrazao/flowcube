from rest_framework import serializers
from .models import WhatsAppFlow, WhatsAppTemplate, WhatsAppInteraction, WhatsAppConversation, WhatsAppAnalytics


class WhatsAppFlowSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    workflow_name = serializers.CharField(source='workflow.name', read_only=True)

    class Meta:
        model = WhatsAppFlow
        fields = [
            'id', 'name', 'description', 'workflow', 'workflow_name',
            'phone_number_id', 'flow_data', 'is_active',
            'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']


class WhatsAppTemplateSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = WhatsAppTemplate
        fields = [
            'id', 'name', 'category', 'language',
            'header', 'body', 'footer', 'buttons',
            'status', 'template_id', 'rejection_reason',
            'created_by', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'status', 'template_id', 'rejection_reason', 'created_at', 'updated_at']


class WhatsAppInteractionSerializer(serializers.ModelSerializer):
    flow_name = serializers.CharField(source='flow.name', read_only=True)

    class Meta:
        model = WhatsAppInteraction
        fields = [
            'id', 'flow', 'flow_name', 'user_phone', 'user_name',
            'message_type', 'message_data', 'response',
            'current_node', 'flow_state', 'timestamp'
        ]
        read_only_fields = ['timestamp']


class WhatsAppConversationSerializer(serializers.ModelSerializer):
    flow_name = serializers.CharField(source='flow.name', read_only=True)
    duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = WhatsAppConversation
        fields = [
            'id', 'flow', 'flow_name', 'user_phone', 'user_name',
            'is_active', 'current_node', 'session_data',
            'messages_sent', 'messages_received', 'completed',
            'started_at', 'last_interaction', 'duration_minutes'
        ]
        read_only_fields = ['started_at', 'last_interaction']

    def get_duration_minutes(self, obj):
        delta = obj.last_interaction - obj.started_at
        return round(delta.total_seconds() / 60, 2)


class WhatsAppAnalyticsSerializer(serializers.ModelSerializer):
    flow_name = serializers.CharField(source='flow.name', read_only=True)

    class Meta:
        model = WhatsAppAnalytics
        fields = [
            'id', 'flow', 'flow_name', 'date',
            'messages_sent', 'messages_received', 'template_messages',
            'conversations_started', 'conversations_completed', 'unique_users',
            'avg_messages_per_conversation', 'completion_rate',
            'created_at'
        ]
        read_only_fields = ['created_at']
