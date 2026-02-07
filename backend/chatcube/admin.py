from django.contrib import admin

from .models import Campaign, Contact, Group, Message, MessageTemplate, WhatsAppInstance


@admin.register(WhatsAppInstance)
class WhatsAppInstanceAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "owner",
        "phone_number",
        "engine",
        "status",
        "messages_sent_today",
        "daily_limit",
        "is_warmed_up",
        "created_at",
        "last_connected_at",
    ]
    list_filter = ["engine", "status", "is_warmed_up", "created_at"]
    search_fields = ["id", "name", "phone_number", "engine_instance_id", "phone_number_id", "waba_id"]
    readonly_fields = ["created_at", "updated_at", "last_connected_at", "engine_instance_id"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = [
        "timestamp",
        "instance",
        "remote_jid",
        "from_me",
        "message_type",
        "status",
        "wa_message_id",
    ]
    list_filter = ["message_type", "status", "from_me", "timestamp", "instance"]
    search_fields = ["id", "remote_jid", "wa_message_id", "content"]
    readonly_fields = ["timestamp"]


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = [
        "jid",
        "name",
        "phone",
        "instance",
        "is_business",
        "last_message_at",
    ]
    list_filter = ["is_business", "instance"]
    search_fields = ["jid", "name", "phone"]


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = [
        "jid",
        "name",
        "instance",
        "participants_count",
        "is_admin",
    ]
    list_filter = ["is_admin", "instance"]
    search_fields = ["jid", "name", "description"]


@admin.register(MessageTemplate)
class MessageTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "message_type", "created_at"]
    list_filter = ["message_type", "created_at"]
    search_fields = ["id", "name", "content", "owner__username", "owner__email"]
    readonly_fields = ["created_at"]


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "owner",
        "instance",
        "status",
        "scheduled_at",
        "started_at",
        "completed_at",
        "sent_count",
        "delivered_count",
        "read_count",
        "failed_count",
        "created_at",
    ]
    list_filter = ["status", "created_at", "scheduled_at", "instance"]
    search_fields = ["id", "name", "owner__username", "owner__email", "instance__name"]
    readonly_fields = ["created_at", "started_at", "completed_at", "sent_count", "delivered_count", "read_count", "failed_count"]

