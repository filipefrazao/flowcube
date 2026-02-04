"""
Telegram Integration Serializers
telegram_integration/serializers.py

DRF serializers for Telegram models.
Created: 2026-02-02
"""
from rest_framework import serializers
from django.utils import timezone

from telegram_integration.models import (
    TelegramBot,
    TelegramChat,
    TelegramMessage,
    TelegramCallback,
    TelegramWebhookLog
)


class TelegramBotSerializer(serializers.ModelSerializer):
    """Serializer for TelegramBot model"""
    
    owner_username = serializers.CharField(
        source='owner.username',
        read_only=True
    )
    workflow_name = serializers.CharField(
        source='workflow.name',
        read_only=True,
        allow_null=True
    )
    chat_count = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TelegramBot
        fields = [
            'id',
            'owner',
            'owner_username',
            'token',
            'bot_id',
            'username',
            'first_name',
            'webhook_url',
            'webhook_secret',
            'webhook_set_at',
            'is_active',
            'is_verified',
            'last_error',
            'last_error_at',
            'workflow',
            'workflow_name',
            'description',
            'created_at',
            'updated_at',
            'chat_count',
            'message_count',
        ]
        read_only_fields = [
            'id',
            'owner',
            'bot_id',
            'username',
            'first_name',
            'webhook_url',
            'webhook_set_at',
            'is_verified',
            'last_error',
            'last_error_at',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'token': {'write_only': True},
            'webhook_secret': {'write_only': True},
        }
    
    def get_chat_count(self, obj) -> int:
        return obj.chats.count()
    
    def get_message_count(self, obj) -> int:
        return TelegramMessage.objects.filter(chat__bot=obj).count()
    
    def validate_token(self, value):
        """Validate bot token format"""
        if not value:
            raise serializers.ValidationError("Token is required")
        
        # Basic token format validation
        parts = value.split(':')
        if len(parts) != 2:
            raise serializers.ValidationError(
                "Invalid token format. Should be 'bot_id:secret'")
        
        try:
            int(parts[0])
        except ValueError:
            raise serializers.ValidationError(
                "Invalid token format. Bot ID should be numeric")
        
        return value


class TelegramBotCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new TelegramBot"""
    
    class Meta:
        model = TelegramBot
        fields = [
            'token',
            'description',
            'workflow',
        ]
    
    def validate_token(self, value):
        """Validate bot token format and uniqueness"""
        if not value:
            raise serializers.ValidationError("Token is required")
        
        # Check format
        parts = value.split(':')
        if len(parts) != 2:
            raise serializers.ValidationError(
                "Invalid token format. Should be 'bot_id:secret'")
        
        # Check if already exists
        if TelegramBot.objects.filter(token=value).exists():
            raise serializers.ValidationError(
                "A bot with this token already exists")
        
        return value
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class TelegramBotListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing bots"""
    
    chat_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TelegramBot
        fields = [
            'id',
            'username',
            'first_name',
            'is_active',
            'is_verified',
            'chat_count',
            'created_at',
            'updated_at',
        ]
    
    def get_chat_count(self, obj) -> int:
        return obj.chats.filter(is_active=True).count()


class TelegramChatSerializer(serializers.ModelSerializer):
    """Serializer for TelegramChat model"""
    
    bot_username = serializers.CharField(
        source='bot.username',
        read_only=True
    )
    display_name = serializers.CharField(read_only=True)
    recent_messages = serializers.SerializerMethodField()
    
    class Meta:
        model = TelegramChat
        fields = [
            'id',
            'bot',
            'bot_username',
            'chat_id',
            'chat_type',
            'title',
            'username',
            'first_name',
            'last_name',
            'display_name',
            'is_active',
            'is_blocked',
            'current_node_id',
            'variables',
            'context',
            'message_count',
            'last_message_at',
            'created_at',
            'updated_at',
            'recent_messages',
        ]
        read_only_fields = [
            'id',
            'chat_id',
            'chat_type',
            'title',
            'username',
            'first_name',
            'last_name',
            'is_blocked',
            'message_count',
            'last_message_at',
            'created_at',
            'updated_at',
        ]
    
    def get_recent_messages(self, obj) -> list:
        """Get last 5 messages for quick preview"""
        messages = obj.messages.order_by('-created_at')[:5]
        return TelegramMessageListSerializer(messages, many=True).data


class TelegramChatListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing chats"""
    
    display_name = serializers.CharField(read_only=True)
    last_message_preview = serializers.SerializerMethodField()
    
    class Meta:
        model = TelegramChat
        fields = [
            'id',
            'chat_id',
            'chat_type',
            'display_name',
            'is_active',
            'message_count',
            'last_message_at',
            'last_message_preview',
        ]
    
    def get_last_message_preview(self, obj) -> str:
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            content = last_msg.content
            if len(content) > 50:
                return content[:50] + '...'
            return content
        return ''


class TelegramMessageSerializer(serializers.ModelSerializer):
    """Serializer for TelegramMessage model"""
    
    chat_display_name = serializers.CharField(
        source='chat.display_name',
        read_only=True
    )
    
    class Meta:
        model = TelegramMessage
        fields = [
            'id',
            'chat',
            'chat_display_name',
            'message_id',
            'direction',
            'message_type',
            'content',
            'media_url',
            'media_file_id',
            'reply_to_message_id',
            'metadata',
            'from_node_id',
            'is_ai_generated',
            'ai_model',
            'is_edited',
            'is_deleted',
            'created_at',
            'telegram_date',
            'edited_at',
        ]
        read_only_fields = [
            'id',
            'message_id',
            'direction',
            'message_type',
            'media_file_id',
            'from_node_id',
            'is_ai_generated',
            'ai_model',
            'is_edited',
            'is_deleted',
            'created_at',
            'telegram_date',
            'edited_at',
        ]


class TelegramMessageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing messages"""
    
    class Meta:
        model = TelegramMessage
        fields = [
            'id',
            'message_id',
            'direction',
            'message_type',
            'content',
            'created_at',
        ]


class TelegramMessageCreateSerializer(serializers.Serializer):
    """Serializer for sending a new message"""
    
    chat_id = serializers.UUIDField()
    text = serializers.CharField(max_length=4096)
    parse_mode = serializers.ChoiceField(
        choices=['HTML', 'Markdown', 'MarkdownV2'],
        required=False,
        allow_null=True
    )
    reply_to_message_id = serializers.IntegerField(required=False, allow_null=True)
    reply_markup = serializers.JSONField(required=False, allow_null=True)
    
    def validate_chat_id(self, value):
        try:
            TelegramChat.objects.get(id=value)
        except TelegramChat.DoesNotExist:
            raise serializers.ValidationError("Chat not found")
        return value


class TelegramCallbackSerializer(serializers.ModelSerializer):
    """Serializer for TelegramCallback model"""
    
    chat_display_name = serializers.CharField(
        source='chat.display_name',
        read_only=True
    )
    
    class Meta:
        model = TelegramCallback
        fields = [
            'id',
            'chat',
            'chat_display_name',
            'callback_query_id',
            'data',
            'message_id',
            'inline_message_id',
            'from_user_id',
            'answered',
            'answer_text',
            'answer_show_alert',
            'created_at',
            'answered_at',
        ]
        read_only_fields = [
            'id',
            'callback_query_id',
            'data',
            'message_id',
            'inline_message_id',
            'from_user_id',
            'created_at',
            'answered_at',
        ]


class TelegramWebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for TelegramWebhookLog model"""
    
    bot_username = serializers.CharField(
        source='bot.username',
        read_only=True
    )
    
    class Meta:
        model = TelegramWebhookLog
        fields = [
            'id',
            'bot',
            'bot_username',
            'update_id',
            'event_type',
            'payload',
            'processed',
            'processed_at',
            'error',
            'retry_count',
            'chat',
            'message',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'update_id',
            'event_type',
            'payload',
            'processed',
            'processed_at',
            'error',
            'retry_count',
            'chat',
            'message',
            'created_at',
        ]


class TelegramWebhookLogListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing webhook logs"""
    
    class Meta:
        model = TelegramWebhookLog
        fields = [
            'id',
            'update_id',
            'event_type',
            'processed',
            'error',
            'created_at',
        ]


# ==================== WEBHOOK PAYLOAD SERIALIZERS ====================

class TelegramWebhookUpdateSerializer(serializers.Serializer):
    """Serializer for incoming Telegram webhook updates"""
    
    update_id = serializers.IntegerField()
    message = serializers.JSONField(required=False)
    edited_message = serializers.JSONField(required=False)
    channel_post = serializers.JSONField(required=False)
    edited_channel_post = serializers.JSONField(required=False)
    callback_query = serializers.JSONField(required=False)
    inline_query = serializers.JSONField(required=False)
    chosen_inline_result = serializers.JSONField(required=False)
    poll = serializers.JSONField(required=False)
    poll_answer = serializers.JSONField(required=False)
    my_chat_member = serializers.JSONField(required=False)
    chat_member = serializers.JSONField(required=False)
    
    def get_event_type(self) -> str:
        """Determine the type of update"""
        data = self.validated_data
        
        if 'message' in data and data['message']:
            return 'message'
        elif 'edited_message' in data and data['edited_message']:
            return 'edited_message'
        elif 'callback_query' in data and data['callback_query']:
            return 'callback_query'
        elif 'channel_post' in data and data['channel_post']:
            return 'channel_post'
        elif 'edited_channel_post' in data and data['edited_channel_post']:
            return 'edited_channel_post'
        elif 'inline_query' in data and data['inline_query']:
            return 'inline_query'
        elif 'poll' in data and data['poll']:
            return 'poll'
        elif 'poll_answer' in data and data['poll_answer']:
            return 'poll_answer'
        elif 'my_chat_member' in data and data['my_chat_member']:
            return 'my_chat_member'
        elif 'chat_member' in data and data['chat_member']:
            return 'chat_member'
        
        return 'unknown'


class SendMessageRequestSerializer(serializers.Serializer):
    """Serializer for send message API request"""
    
    bot_id = serializers.UUIDField()
    chat_id = serializers.IntegerField()
    text = serializers.CharField(max_length=4096)
    parse_mode = serializers.ChoiceField(
        choices=['HTML', 'Markdown', 'MarkdownV2'],
        required=False,
        default=None
    )
    reply_to_message_id = serializers.IntegerField(required=False, default=None)
    disable_notification = serializers.BooleanField(required=False, default=False)
    reply_markup = serializers.JSONField(required=False, default=None)
    
    def validate_bot_id(self, value):
        try:
            TelegramBot.objects.get(id=value, is_active=True)
        except TelegramBot.DoesNotExist:
            raise serializers.ValidationError("Bot not found or inactive")
        return value


class SetWebhookRequestSerializer(serializers.Serializer):
    """Serializer for setting webhook"""
    
    bot_id = serializers.UUIDField()
    url = serializers.URLField(required=False, allow_blank=True)
    secret_token = serializers.CharField(
        max_length=256,
        required=False,
        allow_blank=True
    )
    allowed_updates = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=['message', 'callback_query', 'edited_message']
    )
    drop_pending_updates = serializers.BooleanField(required=False, default=False)
    
    def validate_bot_id(self, value):
        try:
            TelegramBot.objects.get(id=value)
        except TelegramBot.DoesNotExist:
            raise serializers.ValidationError("Bot not found")
        return value
