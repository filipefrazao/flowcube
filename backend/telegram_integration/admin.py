"""
Telegram Integration Admin
telegram_integration/admin.py

Django Admin configuration for Telegram models.
Created: 2026-02-02
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse

from telegram_integration.models import (
    TelegramBot,
    TelegramChat,
    TelegramMessage,
    TelegramCallback,
    TelegramWebhookLog
)


@admin.register(TelegramBot)
class TelegramBotAdmin(admin.ModelAdmin):
    """Admin for TelegramBot model"""
    
    list_display = [
        'display_username',
        'first_name',
        'owner',
        'is_active',
        'is_verified',
        'chat_count',
        'webhook_status',
        'created_at',
    ]
    list_filter = ['is_active', 'is_verified', 'created_at']
    search_fields = ['username', 'first_name', 'owner__username']
    readonly_fields = [
        'id', 'bot_id', 'username', 'first_name',
        'is_verified', 'webhook_set_at', 'last_error',
        'last_error_at', 'created_at', 'updated_at'
    ]
    fieldsets = (
        ('Bot Information', {
            'fields': ('id', 'owner', 'token', 'description')
        }),
        ('Bot Details (from Telegram)', {
            'fields': ('bot_id', 'username', 'first_name', 'is_verified'),
            'classes': ('collapse',)
        }),
        ('Webhook Configuration', {
            'fields': ('webhook_url', 'webhook_secret', 'webhook_set_at')
        }),
        ('Workflow', {
            'fields': ('workflow',)
        }),
        ('Status', {
            'fields': ('is_active', 'last_error', 'last_error_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_username(self, obj):
        if obj.username:
            return format_html('<strong>@{}</strong>', obj.username)
        return f'Bot {obj.id}'
    display_username.short_description = 'Username'
    
    def chat_count(self, obj):
        count = obj.chats.count()
        url = reverse('admin:telegram_integration_telegramchat_changelist')
        return format_html('<a href="{}?bot__id__exact={}">{}</a>', url, obj.id, count)
    chat_count.short_description = 'Chats'
    
    def webhook_status(self, obj):
        if obj.webhook_url:
            return format_html(
                '<span style="color: green;">Active</span>'
            )
        return format_html('<span style="color: gray;">Not set</span>')
    webhook_status.short_description = 'Webhook'


@admin.register(TelegramChat)
class TelegramChatAdmin(admin.ModelAdmin):
    """Admin for TelegramChat model"""
    
    list_display = [
        'display_name',
        'bot_link',
        'chat_id',
        'chat_type',
        'is_active',
        'message_count',
        'last_message_at',
    ]
    list_filter = ['chat_type', 'is_active', 'is_blocked', 'bot']
    search_fields = ['chat_id', 'first_name', 'last_name', 'username', 'title']
    readonly_fields = [
        'id', 'chat_id', 'chat_type', 'message_count',
        'last_message_at', 'created_at', 'updated_at'
    ]
    raw_id_fields = ['bot']
    
    fieldsets = (
        ('Chat Information', {
            'fields': ('id', 'bot', 'chat_id', 'chat_type')
        }),
        ('User/Group Info', {
            'fields': ('title', 'first_name', 'last_name', 'username')
        }),
        ('Status', {
            'fields': ('is_active', 'is_blocked')
        }),
        ('Workflow State', {
            'fields': ('current_node_id', 'variables', 'context'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('message_count', 'last_message_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def bot_link(self, obj):
        if obj.bot.username:
            url = reverse('admin:telegram_integration_telegrambot_change', args=[obj.bot.id])
            return format_html('<a href="{}">@{}</a>', url, obj.bot.username)
        return str(obj.bot_id)
    bot_link.short_description = 'Bot'


@admin.register(TelegramMessage)
class TelegramMessageAdmin(admin.ModelAdmin):
    """Admin for TelegramMessage model"""
    
    list_display = [
        'direction_icon',
        'message_type',
        'content_preview',
        'chat_link',
        'message_id',
        'is_ai_generated',
        'created_at',
    ]
    list_filter = ['direction', 'message_type', 'is_ai_generated', 'chat__bot']
    search_fields = ['content', 'message_id']
    readonly_fields = [
        'id', 'message_id', 'direction', 'message_type',
        'media_file_id', 'is_edited', 'is_deleted',
        'created_at', 'telegram_date', 'edited_at'
    ]
    raw_id_fields = ['chat']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Message', {
            'fields': ('id', 'chat', 'message_id', 'direction', 'message_type')
        }),
        ('Content', {
            'fields': ('content', 'media_url', 'media_file_id', 'metadata')
        }),
        ('Reply', {
            'fields': ('reply_to_message_id',),
            'classes': ('collapse',)
        }),
        ('Processing', {
            'fields': ('from_node_id', 'is_ai_generated', 'ai_model'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_edited', 'is_deleted')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'telegram_date', 'edited_at')
        }),
    )
    
    def direction_icon(self, obj):
        if obj.direction == TelegramMessage.Direction.INBOUND:
            return format_html('<span style="color: blue;">← IN</span>')
        return format_html('<span style="color: green;">→ OUT</span>')
    direction_icon.short_description = 'Dir'
    
    def content_preview(self, obj):
        if obj.content:
            preview = obj.content[:50]
            if len(obj.content) > 50:
                preview += '...'
            return preview
        return f'[{obj.message_type}]'
    content_preview.short_description = 'Content'
    
    def chat_link(self, obj):
        url = reverse('admin:telegram_integration_telegramchat_change', args=[obj.chat.id])
        return format_html('<a href="{}">{}</a>', url, obj.chat.display_name)
    chat_link.short_description = 'Chat'


@admin.register(TelegramCallback)
class TelegramCallbackAdmin(admin.ModelAdmin):
    """Admin for TelegramCallback model"""
    
    list_display = [
        'callback_query_id',
        'data',
        'chat_link',
        'answered_status',
        'created_at',
    ]
    list_filter = ['answered', 'chat__bot']
    search_fields = ['callback_query_id', 'data']
    readonly_fields = [
        'id', 'callback_query_id', 'data', 'message_id',
        'inline_message_id', 'from_user_id', 'created_at', 'answered_at'
    ]
    raw_id_fields = ['chat']
    
    def chat_link(self, obj):
        if obj.chat:
            url = reverse('admin:telegram_integration_telegramchat_change', args=[obj.chat.id])
            return format_html('<a href="{}">{}</a>', url, obj.chat.display_name)
        return '-'
    chat_link.short_description = 'Chat'
    
    def answered_status(self, obj):
        if obj.answered:
            return format_html('<span style="color: green;">Yes</span>')
        return format_html('<span style="color: orange;">No</span>')
    answered_status.short_description = 'Answered'


@admin.register(TelegramWebhookLog)
class TelegramWebhookLogAdmin(admin.ModelAdmin):
    """Admin for TelegramWebhookLog model"""
    
    list_display = [
        'update_id',
        'event_type',
        'bot_link',
        'processed_status',
        'has_error',
        'retry_count',
        'created_at',
    ]
    list_filter = ['event_type', 'processed', 'bot']
    search_fields = ['update_id', 'error']
    readonly_fields = [
        'id', 'update_id', 'event_type', 'payload',
        'processed', 'processed_at', 'error', 'retry_count',
        'chat', 'message', 'created_at'
    ]
    raw_id_fields = ['bot', 'chat', 'message']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Update', {
            'fields': ('id', 'bot', 'update_id', 'event_type')
        }),
        ('Payload', {
            'fields': ('payload',),
            'classes': ('collapse',)
        }),
        ('Processing', {
            'fields': ('processed', 'processed_at', 'error', 'retry_count')
        }),
        ('Related', {
            'fields': ('chat', 'message'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    def bot_link(self, obj):
        if obj.bot.username:
            url = reverse('admin:telegram_integration_telegrambot_change', args=[obj.bot.id])
            return format_html('<a href="{}">@{}</a>', url, obj.bot.username)
        return str(obj.bot_id)
    bot_link.short_description = 'Bot'
    
    def processed_status(self, obj):
        if obj.processed:
            return format_html('<span style="color: green;">Yes</span>')
        return format_html('<span style="color: orange;">No</span>')
    processed_status.short_description = 'Processed'
    
    def has_error(self, obj):
        if obj.error:
            return format_html(
                '<span style="color: red;" title="{}">Yes</span>',
                obj.error[:100]
            )
        return format_html('<span style="color: green;">No</span>')
    has_error.short_description = 'Error'
