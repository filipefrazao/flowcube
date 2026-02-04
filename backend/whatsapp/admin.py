from django.contrib import admin
from .models import WhatsAppFlow, WhatsAppTemplate, WhatsAppInteraction, WhatsAppConversation, WhatsAppAnalytics


@admin.register(WhatsAppFlow)
class WhatsAppFlowAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone_number_id', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'phone_number_id']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(WhatsAppTemplate)
class WhatsAppTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'language', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'category', 'language', 'created_at']
    search_fields = ['name', 'body']
    readonly_fields = ['template_id', 'rejection_reason', 'created_at', 'updated_at']


@admin.register(WhatsAppInteraction)
class WhatsAppInteractionAdmin(admin.ModelAdmin):
    list_display = ['user_phone', 'flow', 'message_type', 'current_node', 'timestamp']
    list_filter = ['message_type', 'timestamp']
    search_fields = ['user_phone', 'user_name']
    readonly_fields = ['timestamp']


@admin.register(WhatsAppConversation)
class WhatsAppConversationAdmin(admin.ModelAdmin):
    list_display = ['user_phone', 'flow', 'is_active', 'messages_sent', 'messages_received', 'completed', 'last_interaction']
    list_filter = ['is_active', 'completed', 'started_at']
    search_fields = ['user_phone', 'user_name']
    readonly_fields = ['started_at', 'last_interaction']


@admin.register(WhatsAppAnalytics)
class WhatsAppAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['flow', 'date', 'messages_sent', 'conversations_started', 'completion_rate']
    list_filter = ['date', 'flow']
    readonly_fields = ['created_at']
