"""
Instagram Automation Serializers
instagram_automation/serializers.py

DRF serializers for Instagram models.
Created: 2026-02-02
"""
from rest_framework import serializers
from django.utils import timezone

from instagram_automation.models import (
    InstagramAccount,
    InstagramConversation,
    InstagramMessage,
    InstagramMediaAttachment,
    InstagramQuickReply,
    InstagramIceBreaker,
    InstagramMessageTemplate,
    InstagramWebhookLog
)


# ==================== ACCOUNT SERIALIZERS ====================

class InstagramAccountSerializer(serializers.ModelSerializer):
    """Serializer for InstagramAccount model"""
    
    owner_username = serializers.CharField(
        source='owner.username',
        read_only=True
    )
    workflow_name = serializers.CharField(
        source='workflow.name',
        read_only=True,
        allow_null=True
    )
    conversation_count = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    is_token_expired = serializers.BooleanField(read_only=True)
    token_expires_soon = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = InstagramAccount
        fields = [
            'id',
            'owner',
            'owner_username',
            'instagram_id',
            'username',
            'name',
            'profile_picture_url',
            'biography',
            'facebook_page_id',
            'facebook_page_name',
            'access_token',
            'token_expires_at',
            'is_token_expired',
            'token_expires_soon',
            'webhook_subscribed',
            'webhook_subscribed_at',
            'permissions',
            'is_active',
            'is_verified',
            'daily_message_count',
            'last_error',
            'last_error_at',
            'consecutive_errors',
            'workflow',
            'workflow_name',
            'auto_reply_enabled',
            'human_handover_enabled',
            'description',
            'created_at',
            'updated_at',
            'conversation_count',
            'message_count',
        ]
        read_only_fields = [
            'id',
            'owner',
            'instagram_id',
            'username',
            'name',
            'profile_picture_url',
            'biography',
            'is_verified',
            'daily_message_count',
            'last_error',
            'last_error_at',
            'consecutive_errors',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'access_token': {'write_only': True},
        }
    
    def get_conversation_count(self, obj) -> int:
        return obj.conversations.count()
    
    def get_message_count(self, obj) -> int:
        return InstagramMessage.objects.filter(
            conversation__account=obj
        ).count()


class InstagramAccountCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new InstagramAccount"""
    
    class Meta:
        model = InstagramAccount
        fields = [
            'instagram_id',
            'facebook_page_id',
            'access_token',
            'description',
            'workflow',
        ]
    
    def validate_instagram_id(self, value):
        """Validate Instagram ID uniqueness"""
        if InstagramAccount.objects.filter(instagram_id=value).exists():
            raise serializers.ValidationError(
                "An account with this Instagram ID already exists"
            )
        return value
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class InstagramAccountListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing accounts"""
    
    conversation_count = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InstagramAccount
        fields = [
            'id',
            'username',
            'name',
            'profile_picture_url',
            'is_active',
            'is_verified',
            'conversation_count',
            'unread_count',
            'created_at',
            'updated_at',
        ]
    
    def get_conversation_count(self, obj) -> int:
        return obj.conversations.filter(
            status='active'
        ).count()
    
    def get_unread_count(self, obj) -> int:
        return obj.conversations.aggregate(
            total=models.Sum('unread_count')
        )['total'] or 0


# ==================== CONVERSATION SERIALIZERS ====================

class InstagramConversationSerializer(serializers.ModelSerializer):
    """Serializer for InstagramConversation model"""
    
    account_username = serializers.CharField(
        source='account.username',
        read_only=True
    )
    display_name = serializers.CharField(read_only=True)
    is_window_open = serializers.BooleanField(read_only=True)
    window_closes_at = serializers.DateTimeField(read_only=True)
    recent_messages = serializers.SerializerMethodField()
    human_agent_username = serializers.CharField(
        source='human_agent_user.username',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = InstagramConversation
        fields = [
            'id',
            'account',
            'account_username',
            'participant_id',
            'participant_username',
            'participant_name',
            'participant_profile_pic',
            'display_name',
            'status',
            'messaging_window_open',
            'is_window_open',
            'window_closes_at',
            'last_user_message_at',
            'is_human_agent_active',
            'human_agent_user',
            'human_agent_username',
            'handover_at',
            'current_node_id',
            'variables',
            'context',
            'labels',
            'message_count',
            'unread_count',
            'last_message_at',
            'created_at',
            'updated_at',
            'recent_messages',
        ]
        read_only_fields = [
            'id',
            'participant_id',
            'participant_username',
            'participant_name',
            'participant_profile_pic',
            'messaging_window_open',
            'last_user_message_at',
            'handover_at',
            'message_count',
            'unread_count',
            'last_message_at',
            'created_at',
            'updated_at',
        ]
    
    def get_recent_messages(self, obj) -> list:
        """Get last 5 messages for quick preview"""
        messages = obj.messages.order_by('-created_at')[:5]
        return InstagramMessageListSerializer(messages, many=True).data


class InstagramConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing conversations"""
    
    display_name = serializers.CharField(read_only=True)
    is_window_open = serializers.BooleanField(read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = InstagramConversation
        fields = [
            'id',
            'participant_id',
            'participant_username',
            'participant_profile_pic',
            'display_name',
            'status',
            'is_window_open',
            'is_human_agent_active',
            'message_count',
            'unread_count',
            'last_message_at',
            'last_message_preview',
        ]
    
    def get_last_message_preview(self, obj) -> str:
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            content = last_msg.content
            if len(content) > 50:
                return content[:50] + '...'
            return content or f'[{last_msg.message_type}]'
        return ''


# ==================== MESSAGE SERIALIZERS ====================

class InstagramMediaAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for InstagramMediaAttachment model"""
    
    class Meta:
        model = InstagramMediaAttachment
        fields = [
            'id',
            'media_type',
            'url',
            'mime_type',
            'file_size',
            'width',
            'height',
            'duration',
            'share_type',
            'share_id',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class InstagramMessageSerializer(serializers.ModelSerializer):
    """Serializer for InstagramMessage model"""
    
    conversation_display_name = serializers.CharField(
        source='conversation.display_name',
        read_only=True
    )
    attachments = InstagramMediaAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = InstagramMessage
        fields = [
            'id',
            'conversation',
            'conversation_display_name',
            'mid',
            'direction',
            'message_type',
            'content',
            'send_status',
            'reply_to_mid',
            'metadata',
            'from_node_id',
            'is_ai_generated',
            'ai_model',
            'is_read',
            'is_deleted',
            'is_unsent',
            'error_message',
            'retry_count',
            'created_at',
            'instagram_timestamp',
            'sent_at',
            'delivered_at',
            'read_at',
            'attachments',
        ]
        read_only_fields = [
            'id',
            'mid',
            'direction',
            'message_type',
            'send_status',
            'from_node_id',
            'is_ai_generated',
            'ai_model',
            'is_read',
            'is_deleted',
            'is_unsent',
            'error_message',
            'retry_count',
            'created_at',
            'instagram_timestamp',
            'sent_at',
            'delivered_at',
            'read_at',
        ]


class InstagramMessageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing messages"""
    
    class Meta:
        model = InstagramMessage
        fields = [
            'id',
            'mid',
            'direction',
            'message_type',
            'content',
            'send_status',
            'is_read',
            'created_at',
        ]


class InstagramMessageCreateSerializer(serializers.Serializer):
    """Serializer for sending a new message"""
    
    conversation_id = serializers.UUIDField()
    text = serializers.CharField(max_length=2000)
    quick_replies = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_null=True,
        max_length=13
    )
    message_tag = serializers.ChoiceField(
        choices=[
            'CONFIRMED_EVENT_UPDATE',
            'POST_PURCHASE_UPDATE',
            'ACCOUNT_UPDATE',
            'HUMAN_AGENT'
        ],
        required=False,
        allow_null=True
    )
    
    def validate_conversation_id(self, value):
        try:
            InstagramConversation.objects.get(id=value)
        except InstagramConversation.DoesNotExist:
            raise serializers.ValidationError("Conversation not found")
        return value
    
    def validate_quick_replies(self, value):
        if value:
            for qr in value:
                if 'title' not in qr or 'payload' not in qr:
                    raise serializers.ValidationError(
                        "Each quick reply must have 'title' and 'payload'"
                    )
                if len(qr['title']) > 80:
                    raise serializers.ValidationError(
                        "Quick reply title cannot exceed 80 characters"
                    )
        return value


class SendImageMessageSerializer(serializers.Serializer):
    """Serializer for sending an image message"""
    
    conversation_id = serializers.UUIDField()
    image_url = serializers.URLField()
    message_tag = serializers.ChoiceField(
        choices=[
            'CONFIRMED_EVENT_UPDATE',
            'POST_PURCHASE_UPDATE',
            'ACCOUNT_UPDATE',
            'HUMAN_AGENT'
        ],
        required=False,
        allow_null=True
    )
    
    def validate_conversation_id(self, value):
        try:
            InstagramConversation.objects.get(id=value)
        except InstagramConversation.DoesNotExist:
            raise serializers.ValidationError("Conversation not found")
        return value


class SendGenericTemplateSerializer(serializers.Serializer):
    """Serializer for sending a generic template message"""
    
    conversation_id = serializers.UUIDField()
    elements = serializers.ListField(
        child=serializers.DictField(),
        max_length=10
    )
    message_tag = serializers.ChoiceField(
        choices=[
            'CONFIRMED_EVENT_UPDATE',
            'POST_PURCHASE_UPDATE',
            'ACCOUNT_UPDATE',
            'HUMAN_AGENT'
        ],
        required=False,
        allow_null=True
    )
    
    def validate_conversation_id(self, value):
        try:
            InstagramConversation.objects.get(id=value)
        except InstagramConversation.DoesNotExist:
            raise serializers.ValidationError("Conversation not found")
        return value
    
    def validate_elements(self, value):
        if not value:
            raise serializers.ValidationError("At least one element is required")
        for elem in value:
            if 'title' not in elem:
                raise serializers.ValidationError(
                    "Each element must have a 'title'"
                )
        return value


# ==================== QUICK REPLY SERIALIZERS ====================

class InstagramQuickReplySerializer(serializers.ModelSerializer):
    """Serializer for InstagramQuickReply model"""
    
    class Meta:
        model = InstagramQuickReply
        fields = [
            'id',
            'account',
            'title',
            'payload',
            'content_type',
            'image_url',
            'category',
            'order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_title(self, value):
        if len(value) > 80:
            raise serializers.ValidationError(
                "Title cannot exceed 80 characters"
            )
        return value
    
    def validate_payload(self, value):
        if len(value) > 1000:
            raise serializers.ValidationError(
                "Payload cannot exceed 1000 characters"
            )
        return value


class InstagramQuickReplyListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing quick replies"""
    
    class Meta:
        model = InstagramQuickReply
        fields = [
            'id',
            'title',
            'payload',
            'category',
            'is_active',
        ]


# ==================== ICE BREAKER SERIALIZERS ====================

class InstagramIceBreakerSerializer(serializers.ModelSerializer):
    """Serializer for InstagramIceBreaker model"""
    
    class Meta:
        model = InstagramIceBreaker
        fields = [
            'id',
            'account',
            'question',
            'payload',
            'order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_question(self, value):
        if len(value) > 80:
            raise serializers.ValidationError(
                "Question cannot exceed 80 characters"
            )
        return value
    
    def validate_order(self, value):
        if value > 3:
            raise serializers.ValidationError(
                "Maximum 4 ice breakers allowed (order 0-3)"
            )
        return value
    
    def validate(self, data):
        """Ensure max 4 ice breakers per account"""
        account = data.get('account') or self.instance.account if self.instance else None
        if account:
            existing_count = InstagramIceBreaker.objects.filter(
                account=account,
                is_active=True
            ).exclude(pk=self.instance.pk if self.instance else None).count()
            
            if existing_count >= 4 and data.get('is_active', True):
                raise serializers.ValidationError(
                    "Maximum 4 active ice breakers per account"
                )
        return data


# ==================== MESSAGE TEMPLATE SERIALIZERS ====================

class InstagramMessageTemplateSerializer(serializers.ModelSerializer):
    """Serializer for InstagramMessageTemplate model"""
    
    class Meta:
        model = InstagramMessageTemplate
        fields = [
            'id',
            'account',
            'name',
            'category',
            'template_text',
            'approval_status',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'approval_status',
            'created_at',
            'updated_at',
        ]


# ==================== WEBHOOK LOG SERIALIZERS ====================

class InstagramWebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for InstagramWebhookLog model"""
    
    account_username = serializers.CharField(
        source='account.username',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = InstagramWebhookLog
        fields = [
            'id',
            'account',
            'account_username',
            'event_type',
            'sender_id',
            'recipient_id',
            'timestamp',
            'payload',
            'processed',
            'processed_at',
            'error',
            'retry_count',
            'conversation',
            'message',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'event_type',
            'sender_id',
            'recipient_id',
            'timestamp',
            'payload',
            'processed',
            'processed_at',
            'error',
            'retry_count',
            'conversation',
            'message',
            'created_at',
        ]


class InstagramWebhookLogListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing webhook logs"""
    
    class Meta:
        model = InstagramWebhookLog
        fields = [
            'id',
            'event_type',
            'sender_id',
            'processed',
            'error',
            'created_at',
        ]


# ==================== WEBHOOK PAYLOAD SERIALIZERS ====================

class InstagramWebhookEntrySerializer(serializers.Serializer):
    """Serializer for a single webhook entry"""
    
    id = serializers.CharField()
    time = serializers.IntegerField()
    messaging = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
    changes = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


class InstagramWebhookPayloadSerializer(serializers.Serializer):
    """Serializer for incoming Instagram webhook payloads"""
    
    object = serializers.CharField()
    entry = serializers.ListField(
        child=InstagramWebhookEntrySerializer()
    )
    
    def validate_object(self, value):
        if value not in ('instagram', 'page'):
            raise serializers.ValidationError(
                f"Invalid object type: {value}"
            )
        return value


class SendMessageRequestSerializer(serializers.Serializer):
    """Serializer for send message API request"""
    
    account_id = serializers.UUIDField()
    recipient_id = serializers.CharField(max_length=50)
    text = serializers.CharField(max_length=2000)
    quick_replies = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=None
    )
    message_tag = serializers.ChoiceField(
        choices=[
            'CONFIRMED_EVENT_UPDATE',
            'POST_PURCHASE_UPDATE',
            'ACCOUNT_UPDATE',
            'HUMAN_AGENT'
        ],
        required=False,
        default=None
    )
    
    def validate_account_id(self, value):
        try:
            InstagramAccount.objects.get(id=value, is_active=True)
        except InstagramAccount.DoesNotExist:
            raise serializers.ValidationError("Account not found or inactive")
        return value


class HandoverRequestSerializer(serializers.Serializer):
    """Serializer for human agent handover request"""
    
    conversation_id = serializers.UUIDField()
    agent_user_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_conversation_id(self, value):
        try:
            InstagramConversation.objects.get(id=value)
        except InstagramConversation.DoesNotExist:
            raise serializers.ValidationError("Conversation not found")
        return value


class BulkMessageSerializer(serializers.Serializer):
    """Serializer for bulk message sending"""
    
    account_id = serializers.UUIDField()
    messages = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=100
    )
    
    def validate_account_id(self, value):
        try:
            InstagramAccount.objects.get(id=value, is_active=True)
        except InstagramAccount.DoesNotExist:
            raise serializers.ValidationError("Account not found or inactive")
        return value
    
    def validate_messages(self, value):
        for msg in value:
            if 'recipient_id' not in msg:
                raise serializers.ValidationError(
                    "Each message must have 'recipient_id'"
                )
            if 'text' not in msg:
                raise serializers.ValidationError(
                    "Each message must have 'text'"
                )
            if len(msg['text']) > 2000:
                raise serializers.ValidationError(
                    "Message text cannot exceed 2000 characters"
                )
        return value


class ConversationStatsSerializer(serializers.Serializer):
    """Serializer for conversation statistics"""
    
    total_conversations = serializers.IntegerField()
    active_conversations = serializers.IntegerField()
    human_agent_conversations = serializers.IntegerField()
    resolved_conversations = serializers.IntegerField()
    total_messages = serializers.IntegerField()
    messages_today = serializers.IntegerField()
    messages_this_week = serializers.IntegerField()
    avg_response_time_minutes = serializers.FloatField()
    open_windows = serializers.IntegerField()


class AccountStatsSerializer(serializers.Serializer):
    """Serializer for account statistics"""
    
    account_id = serializers.UUIDField()
    username = serializers.CharField()
    total_conversations = serializers.IntegerField()
    total_messages_sent = serializers.IntegerField()
    total_messages_received = serializers.IntegerField()
    daily_message_count = serializers.IntegerField()
    daily_message_limit = serializers.IntegerField()
    messages_remaining_today = serializers.IntegerField()
    active_conversations = serializers.IntegerField()
    unread_messages = serializers.IntegerField()
