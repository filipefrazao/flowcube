"""
Instagram Automation Admin
instagram_automation/admin.py

Django Admin configuration for Instagram models.
Created: 2026-02-02
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse

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


@admin.register(InstagramAccount)
class InstagramAccountAdmin(admin.ModelAdmin):
    """Admin for InstagramAccount model"""
    
    list_display = [
        'display_username',
        'name',
        'owner',
        'is_active',
        'is_verified',
        'conversation_count',
        'daily_message_count',
        'token_status',
        'created_at',
    ]
    list_filter = ['is_active', 'is_verified', 'webhook_subscribed', 'created_at']
    search_fields = ['username', 'name', 'instagram_id', 'owner__username']
    readonly_fields = [
        'id', 'instagram_id', 'username', 'name', 'profile_picture_url',
        'biography', 'is_verified', 'daily_message_count', 'daily_message_reset_at',
        'last_error', 'last_error_at', 'consecutive_errors',
        'created_at', 'updated_at'
    ]
    fieldsets = (
        ('Account Information', {
            'fields': ('id', 'owner', 'instagram_id', 'description')
        }),
        ('Instagram Details (from API)', {
            'fields': ('username', 'name', 'profile_picture_url', 'biography', 'is_verified'),
            'classes': ('collapse',)
        }),
        ('Facebook Connection', {
            'fields': ('facebook_page_id', 'facebook_page_name')
        }),
        ('Access Token', {
            'fields': ('access_token', 'token_expires_at', 'permissions'),
            'classes': ('collapse',)
        }),
        ('Webhook', {
            'fields': ('webhook_subscribed', 'webhook_subscribed_at')
        }),
        ('Workflow', {
            'fields': ('workflow', 'auto_reply_enabled', 'human_handover_enabled')
        }),
        ('Rate Limiting', {
            'fields': ('daily_message_count', 'daily_message_reset_at')
        }),
        ('Status', {
            'fields': ('is_active', 'last_error', 'last_error_at', 'consecutive_errors')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_username(self, obj):
        if obj.username:
            return format_html('<strong>@{}</strong>', obj.username)
        return f'Account {obj.instagram_id}'
    display_username.short_description = 'Username'
    
    def conversation_count(self, obj):
        count = obj.conversations.count()
        url = reverse('admin:instagram_automation_instagramconversation_changelist')
        return format_html('<a href="{}?account__id__exact={}">{}</a>', url, obj.id, count)
    conversation_count.short_description = 'Conversations'
    
    def token_status(self, obj):
        if obj.is_token_expired:
            return format_html('<span style="color: red;">Expired</span>')
        if obj.token_expires_soon:
            return format_html('<span style="color: orange;">Expires Soon</span>')
        return format_html('<span style="color: green;">Valid</span>')
    token_status.short_description = 'Token'


@admin.register(InstagramConversation)
class InstagramConversationAdmin(admin.ModelAdmin):
    """Admin for InstagramConversation model"""
    
    list_display = [
        'display_name',
        'account_link',
        'participant_id',
        'status',
        'window_status',
        'is_human_agent_active',
        'message_count',
        'unread_count',
        'last_message_at',
    ]
    list_filter = ['status', 'is_human_agent_active', 'messaging_window_open', 'account']
    search_fields = ['participant_id', 'participant_username', 'participant_name']
    readonly_fields = [
        'id', 'participant_id', 'message_count', 'unread_count',
        'last_message_at', 'last_user_message_at', 'handover_at',
        'created_at', 'updated_at'
    ]
    raw_id_fields = ['account', 'human_agent_user']
    
    fieldsets = (
        ('Conversation', {
            'fields': ('id', 'account', 'participant_id')
        }),
        ('Participant Info', {
            'fields': ('participant_username', 'participant_name', 'participant_profile_pic')
        }),
        ('Status', {
            'fields': ('status', 'messaging_window_open', 'last_user_message_at')
        }),
        ('Human Agent', {
            'fields': ('is_human_agent_active', 'human_agent_user', 'handover_at')
        }),
        ('Workflow State', {
            'fields': ('current_node_id', 'variables', 'context', 'labels'),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('message_count', 'unread_count', 'last_message_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def account_link(self, obj):
        if obj.account.username:
            url = reverse('admin:instagram_automation_instagramaccount_change', args=[obj.account.id])
            return format_html('<a href="{}">@{}</a>', url, obj.account.username)
        return str(obj.account_id)
    account_link.short_description = 'Account'
    
    def window_status(self, obj):
        if obj.is_window_open:
            return format_html('<span style="color: green;">Open</span>')
        return format_html('<span style="color: red;">Closed</span>')
    window_status.short_description = 'Window'


@admin.register(InstagramMessage)
class InstagramMessageAdmin(admin.ModelAdmin):
    """Admin for InstagramMessage model"""
    
    list_display = [
        'direction_icon',
        'message_type',
        'content_preview',
        'conversation_link',
        'send_status',
        'is_ai_generated',
        'created_at',
    ]
    list_filter = ['direction', 'message_type', 'send_status', 'is_ai_generated']
    search_fields = ['content', 'mid']
    readonly_fields = [
        'id', 'mid', 'direction', 'message_type', 'send_status',
        'is_read', 'is_deleted', 'is_unsent', 'error_message', 'retry_count',
        'created_at', 'instagram_timestamp', 'sent_at', 'delivered_at', 'read_at'
    ]
    raw_id_fields = ['conversation']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Message', {
            'fields': ('id', 'conversation', 'mid', 'direction', 'message_type')
        }),
        ('Content', {
            'fields': ('content', 'metadata')
        }),
        ('Reply', {
            'fields': ('reply_to_mid',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('send_status', 'is_read', 'is_deleted', 'is_unsent')
        }),
        ('Processing', {
            'fields': ('from_node_id', 'is_ai_generated', 'ai_model'),
            'classes': ('collapse',)
        }),
        ('Error', {
            'fields': ('error_message', 'retry_count'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'instagram_timestamp', 'sent_at', 'delivered_at', 'read_at')
        }),
    )
    
    def direction_icon(self, obj):
        if obj.direction == InstagramMessage.Direction.INBOUND:
            return format_html('<span style="color: blue;">IN</span>')
        return format_html('<span style="color: green;">OUT</span>')
    direction_icon.short_description = 'Dir'
    
    def content_preview(self, obj):
        if obj.content:
            preview = obj.content[:50]
            if len(obj.content) > 50:
                preview += '...'
            return preview
        return f'[{obj.message_type}]'
    content_preview.short_description = 'Content'
    
    def conversation_link(self, obj):
        url = reverse('admin:instagram_automation_instagramconversation_change', args=[obj.conversation.id])
        return format_html('<a href="{}">{}</a>', url, obj.conversation.display_name)
    conversation_link.short_description = 'Conversation'


@admin.register(InstagramMediaAttachment)
class InstagramMediaAttachmentAdmin(admin.ModelAdmin):
    """Admin for InstagramMediaAttachment model"""
    
    list_display = ['media_type', 'message_link', 'url_preview', 'created_at']
    list_filter = ['media_type']
    readonly_fields = ['id', 'created_at']
    raw_id_fields = ['message']
    
    def message_link(self, obj):
        url = reverse('admin:instagram_automation_instagrammessage_change', args=[obj.message.id])
        return format_html('<a href="{}">Message</a>', url)
    message_link.short_description = 'Message'
    
    def url_preview(self, obj):
        return obj.url[:50] + '...' if len(obj.url) > 50 else obj.url
    url_preview.short_description = 'URL'


@admin.register(InstagramQuickReply)
class InstagramQuickReplyAdmin(admin.ModelAdmin):
    """Admin for InstagramQuickReply model"""
    
    list_display = ['title', 'account_link', 'category', 'order', 'is_active']
    list_filter = ['is_active', 'category', 'account']
    search_fields = ['title', 'payload']
    raw_id_fields = ['account']
    
    def account_link(self, obj):
        return format_html('@{}', obj.account.username or obj.account.instagram_id)
    account_link.short_description = 'Account'


@admin.register(InstagramIceBreaker)
class InstagramIceBreakerAdmin(admin.ModelAdmin):
    """Admin for InstagramIceBreaker model"""
    
    list_display = ['question', 'account_link', 'order', 'is_active']
    list_filter = ['is_active', 'account']
    search_fields = ['question', 'payload']
    raw_id_fields = ['account']
    
    def account_link(self, obj):
        return format_html('@{}', obj.account.username or obj.account.instagram_id)
    account_link.short_description = 'Account'


@admin.register(InstagramMessageTemplate)
class InstagramMessageTemplateAdmin(admin.ModelAdmin):
    """Admin for InstagramMessageTemplate model"""
    
    list_display = ['name', 'account_link', 'category', 'approval_status', 'is_active']
    list_filter = ['approval_status', 'category', 'is_active', 'account']
    search_fields = ['name', 'template_text']
    raw_id_fields = ['account']
    
    def account_link(self, obj):
        return format_html('@{}', obj.account.username or obj.account.instagram_id)
    account_link.short_description = 'Account'


@admin.register(InstagramWebhookLog)
class InstagramWebhookLogAdmin(admin.ModelAdmin):
    """Admin for InstagramWebhookLog model"""
    
    list_display = [
        'event_type',
        'sender_id',
        'account_link',
        'processed_status',
        'has_error',
        'retry_count',
        'created_at',
    ]
    list_filter = ['event_type', 'processed', 'account']
    search_fields = ['sender_id', 'recipient_id', 'error']
    readonly_fields = [
        'id', 'event_type', 'sender_id', 'recipient_id', 'timestamp',
        'payload', 'processed', 'processed_at', 'error', 'retry_count',
        'conversation', 'message', 'request_headers', 'created_at'
    ]
    raw_id_fields = ['account', 'conversation', 'message']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Event', {
            'fields': ('id', 'account', 'event_type', 'sender_id', 'recipient_id', 'timestamp')
        }),
        ('Payload', {
            'fields': ('payload',),
            'classes': ('collapse',)
        }),
        ('Processing', {
            'fields': ('processed', 'processed_at', 'error', 'retry_count')
        }),
        ('Related', {
            'fields': ('conversation', 'message'),
            'classes': ('collapse',)
        }),
        ('Request', {
            'fields': ('request_headers',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    def account_link(self, obj):
        if obj.account:
            if obj.account.username:
                url = reverse('admin:instagram_automation_instagramaccount_change', args=[obj.account.id])
                return format_html('<a href="{}">@{}</a>', url, obj.account.username)
        return '-'
    account_link.short_description = 'Account'
    
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
