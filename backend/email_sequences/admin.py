"""
Email Sequences Django Admin Configuration
email_sequences/admin.py

Admin interface for managing email sequences.
Created: 2026-02-02
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone

from .models import (
    EmailProvider,
    EmailTemplate,
    EmailSequence,
    EmailStep,
    EmailRecipient,
    SequenceEnrollment,
    EmailSend,
    EmailEvent,
)


@admin.register(EmailProvider)
class EmailProviderAdmin(admin.ModelAdmin):
    """Admin for EmailProvider model."""

    list_display = [
        "name",
        "provider_type",
        "default_from_email",
        "is_active",
        "is_verified",
        "emails_sent_today",
        "emails_sent_total",
        "created_at",
    ]
    list_filter = ["provider_type", "is_active", "is_verified", "created_at"]
    search_fields = ["name", "default_from_email", "owner__email"]
    readonly_fields = [
        "id",
        "is_verified",
        "last_verified_at",
        "emails_sent_today",
        "emails_sent_total",
        "last_sent_at",
        "last_error",
        "last_error_at",
        "created_at",
        "updated_at",
    ]
    fieldsets = [
        ("General", {
            "fields": ["id", "owner", "name", "provider_type", "is_active"]
        }),
        ("SMTP Configuration", {
            "fields": [
                "smtp_host", "smtp_port", "smtp_username", "smtp_password",
                "smtp_use_tls", "smtp_use_ssl"
            ],
            "classes": ["collapse"]
        }),
        ("API Configuration", {
            "fields": ["api_key", "api_secret", "api_region", "api_endpoint"],
            "classes": ["collapse"]
        }),
        ("Sender Defaults", {
            "fields": ["default_from_email", "default_from_name", "default_reply_to"]
        }),
        ("Rate Limiting", {
            "fields": ["rate_limit_per_hour", "rate_limit_per_day"]
        }),
        ("Webhook", {
            "fields": ["webhook_url", "webhook_secret"],
            "classes": ["collapse"]
        }),
        ("Status", {
            "fields": [
                "is_verified", "last_verified_at", "last_error", "last_error_at"
            ]
        }),
        ("Statistics", {
            "fields": ["emails_sent_today", "emails_sent_total", "last_sent_at"]
        }),
        ("Timestamps", {
            "fields": ["created_at", "updated_at"]
        }),
    ]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("owner")


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    """Admin for EmailTemplate model."""

    list_display = [
        "name",
        "category",
        "subject_preview",
        "is_active",
        "times_used",
        "updated_at",
    ]
    list_filter = ["category", "is_active", "is_public", "created_at"]
    search_fields = ["name", "subject", "description", "owner__email"]
    readonly_fields = ["id", "times_used", "last_used_at", "created_at", "updated_at"]
    fieldsets = [
        ("General", {
            "fields": ["id", "owner", "name", "description", "category", "tags"]
        }),
        ("Content", {
            "fields": ["subject", "preheader", "html_content", "text_content"]
        }),
        ("Variables", {
            "fields": ["variables"],
            "classes": ["collapse"]
        }),
        ("Design", {
            "fields": ["design_json", "thumbnail_url"],
            "classes": ["collapse"]
        }),
        ("Settings", {
            "fields": ["is_active", "is_public"]
        }),
        ("Statistics", {
            "fields": ["times_used", "last_used_at"]
        }),
        ("Timestamps", {
            "fields": ["created_at", "updated_at"]
        }),
    ]

    def subject_preview(self, obj):
        return obj.subject[:50] + "..." if len(obj.subject) > 50 else obj.subject
    subject_preview.short_description = "Subject"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("owner")


class EmailStepInline(admin.TabularInline):
    """Inline admin for EmailStep within EmailSequence."""

    model = EmailStep
    extra = 0
    fields = [
        "order", "name", "template", "delay_days", "delay_hours",
        "delay_minutes", "is_active", "total_sent"
    ]
    readonly_fields = ["total_sent"]
    ordering = ["order"]


@admin.register(EmailSequence)
class EmailSequenceAdmin(admin.ModelAdmin):
    """Admin for EmailSequence model."""

    list_display = [
        "name",
        "trigger_type",
        "status",
        "is_active",
        "step_count_display",
        "total_enrolled",
        "total_completed",
        "completion_rate_display",
        "created_at",
    ]
    list_filter = ["status", "is_active", "trigger_type", "created_at"]
    search_fields = ["name", "description", "owner__email"]
    readonly_fields = [
        "id", "status", "is_active", "total_enrolled", "total_completed",
        "total_unsubscribed", "activated_at", "created_at", "updated_at"
    ]
    inlines = [EmailStepInline]
    fieldsets = [
        ("General", {
            "fields": ["id", "owner", "name", "description", "tags"]
        }),
        ("Trigger", {
            "fields": ["trigger_type", "trigger_config"]
        }),
        ("Configuration", {
            "fields": ["provider", "workflow", "settings"]
        }),
        ("Status", {
            "fields": ["status", "is_active", "activated_at"]
        }),
        ("Statistics", {
            "fields": ["total_enrolled", "total_completed", "total_unsubscribed"]
        }),
        ("Timestamps", {
            "fields": ["created_at", "updated_at"]
        }),
    ]

    def step_count_display(self, obj):
        return obj.step_count
    step_count_display.short_description = "Steps"

    def completion_rate_display(self, obj):
        if obj.total_enrolled == 0:
            return "0%"
        rate = (obj.total_completed / obj.total_enrolled) * 100
        return f"{rate:.1f}%"
    completion_rate_display.short_description = "Completion"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("owner", "provider").prefetch_related("steps")


@admin.register(EmailStep)
class EmailStepAdmin(admin.ModelAdmin):
    """Admin for EmailStep model."""

    list_display = [
        "sequence",
        "order",
        "name",
        "template",
        "delay_display",
        "is_active",
        "total_sent",
        "open_rate_display",
        "click_rate_display",
    ]
    list_filter = ["is_active", "condition_type", "sequence__status"]
    search_fields = ["name", "sequence__name", "template__name"]
    readonly_fields = [
        "id", "total_sent", "total_opened", "total_clicked",
        "total_bounced", "created_at", "updated_at"
    ]
    fieldsets = [
        ("General", {
            "fields": ["id", "sequence", "order", "name", "is_active"]
        }),
        ("Content", {
            "fields": ["template", "subject", "html_content", "text_content"]
        }),
        ("Timing", {
            "fields": [
                "delay_days", "delay_hours", "delay_minutes",
                "send_after_time", "send_before_time", "send_on_days"
            ]
        }),
        ("Conditions", {
            "fields": ["condition_type", "condition_config"]
        }),
        ("A/B Testing", {
            "fields": ["ab_test_enabled", "ab_variants"],
            "classes": ["collapse"]
        }),
        ("Statistics", {
            "fields": ["total_sent", "total_opened", "total_clicked", "total_bounced"]
        }),
        ("Timestamps", {
            "fields": ["created_at", "updated_at"]
        }),
    ]

    def delay_display(self, obj):
        parts = []
        if obj.delay_days:
            parts.append(f"{obj.delay_days}d")
        if obj.delay_hours:
            parts.append(f"{obj.delay_hours}h")
        if obj.delay_minutes:
            parts.append(f"{obj.delay_minutes}m")
        return " ".join(parts) if parts else "Immediate"
    delay_display.short_description = "Delay"

    def open_rate_display(self, obj):
        return f"{obj.open_rate:.1f}%"
    open_rate_display.short_description = "Open Rate"

    def click_rate_display(self, obj):
        return f"{obj.click_rate:.1f}%"
    click_rate_display.short_description = "Click Rate"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("sequence", "template")


@admin.register(EmailRecipient)
class EmailRecipientAdmin(admin.ModelAdmin):
    """Admin for EmailRecipient model."""

    list_display = [
        "email",
        "name",
        "is_subscribed",
        "is_bounced",
        "is_complained",
        "emails_received",
        "emails_opened",
        "tag_list",
        "created_at",
    ]
    list_filter = ["is_subscribed", "is_bounced", "is_complained", "source", "created_at"]
    search_fields = ["email", "name", "first_name", "last_name", "external_id"]
    readonly_fields = [
        "id", "subscribed_at", "unsubscribed_at", "bounced_at", "complained_at",
        "emails_received", "emails_opened", "emails_clicked",
        "last_email_at", "last_opened_at", "last_clicked_at",
        "created_at", "updated_at"
    ]
    fieldsets = [
        ("General", {
            "fields": ["id", "owner", "email", "name", "first_name", "last_name"]
        }),
        ("Custom Data", {
            "fields": ["variables", "tags", "lists", "external_id"]
        }),
        ("Source", {
            "fields": ["source", "source_details"]
        }),
        ("Subscription", {
            "fields": [
                "is_subscribed", "subscribed_at", "unsubscribed_at", "unsubscribe_reason"
            ]
        }),
        ("Bounce/Complaint", {
            "fields": [
                "is_bounced", "bounced_at", "bounce_type",
                "is_complained", "complained_at"
            ]
        }),
        ("Statistics", {
            "fields": [
                "emails_received", "emails_opened", "emails_clicked",
                "last_email_at", "last_opened_at", "last_clicked_at"
            ]
        }),
        ("Timestamps", {
            "fields": ["created_at", "updated_at"]
        }),
    ]
    actions = ["unsubscribe_selected", "resubscribe_selected"]

    def tag_list(self, obj):
        return ", ".join(obj.tags[:3]) + ("..." if len(obj.tags) > 3 else "")
    tag_list.short_description = "Tags"

    def unsubscribe_selected(self, request, queryset):
        count = 0
        for recipient in queryset:
            recipient.unsubscribe("Bulk unsubscribe by admin")
            count += 1
        self.message_user(request, f"Unsubscribed {count} recipients")
    unsubscribe_selected.short_description = "Unsubscribe selected recipients"

    def resubscribe_selected(self, request, queryset):
        count = 0
        for recipient in queryset.filter(is_bounced=False, is_complained=False):
            recipient.resubscribe()
            count += 1
        self.message_user(request, f"Resubscribed {count} recipients")
    resubscribe_selected.short_description = "Resubscribe selected recipients"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("owner")


@admin.register(SequenceEnrollment)
class SequenceEnrollmentAdmin(admin.ModelAdmin):
    """Admin for SequenceEnrollment model."""

    list_display = [
        "recipient",
        "sequence",
        "status",
        "current_step",
        "completed_steps",
        "next_send_at",
        "enrolled_at",
    ]
    list_filter = ["status", "sequence", "enrolled_at"]
    search_fields = ["recipient__email", "sequence__name"]
    readonly_fields = [
        "id", "completed_steps", "enrolled_at", "completed_at", "paused_at"
    ]
    fieldsets = [
        ("General", {
            "fields": ["id", "sequence", "recipient", "status"]
        }),
        ("Progress", {
            "fields": ["current_step", "completed_steps", "next_send_at"]
        }),
        ("Variables", {
            "fields": ["variables"]
        }),
        ("Timestamps", {
            "fields": ["enrolled_at", "completed_at", "paused_at"]
        }),
    ]
    actions = ["pause_selected", "resume_selected"]

    def pause_selected(self, request, queryset):
        count = queryset.filter(status="active").update(
            status="paused",
            paused_at=timezone.now()
        )
        self.message_user(request, f"Paused {count} enrollments")
    pause_selected.short_description = "Pause selected enrollments"

    def resume_selected(self, request, queryset):
        count = queryset.filter(status="paused").update(
            status="active",
            paused_at=None
        )
        self.message_user(request, f"Resumed {count} enrollments")
    resume_selected.short_description = "Resume selected enrollments"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "sequence", "recipient", "current_step"
        )


@admin.register(EmailSend)
class EmailSendAdmin(admin.ModelAdmin):
    """Admin for EmailSend model."""

    list_display = [
        "to_email",
        "subject_preview",
        "status",
        "status_badge",
        "open_count",
        "click_count",
        "sent_at",
        "created_at",
    ]
    list_filter = ["status", "provider", "created_at", "sent_at"]
    search_fields = ["to_email", "subject", "provider_message_id"]
    readonly_fields = [
        "id", "provider_message_id", "status", "error_message", "error_code",
        "retry_count", "open_count", "click_count", "unique_opens", "unique_clicks",
        "created_at", "sent_at", "delivered_at", "opened_at", "clicked_at",
        "bounced_at", "failed_at"
    ]
    fieldsets = [
        ("General", {
            "fields": ["id", "step", "enrollment", "recipient", "provider"]
        }),
        ("Email", {
            "fields": [
                "from_email", "from_name", "to_email", "reply_to",
                "subject", "html_content", "text_content"
            ]
        }),
        ("Provider", {
            "fields": ["provider_message_id"]
        }),
        ("Status", {
            "fields": [
                "status", "error_message", "error_code",
                "retry_count", "max_retries", "scheduled_at"
            ]
        }),
        ("Engagement", {
            "fields": ["open_count", "click_count", "unique_opens", "unique_clicks"]
        }),
        ("Timestamps", {
            "fields": [
                "created_at", "sent_at", "delivered_at",
                "opened_at", "clicked_at", "bounced_at", "failed_at"
            ]
        }),
        ("Metadata", {
            "fields": ["metadata"],
            "classes": ["collapse"]
        }),
    ]

    def subject_preview(self, obj):
        return obj.subject[:40] + "..." if len(obj.subject) > 40 else obj.subject
    subject_preview.short_description = "Subject"

    def status_badge(self, obj):
        colors = {
            "pending": "gray",
            "queued": "blue",
            "sending": "blue",
            "sent": "green",
            "delivered": "green",
            "opened": "teal",
            "clicked": "purple",
            "bounced": "red",
            "failed": "red",
            "dropped": "orange",
            "spam": "red",
        }
        color = colors.get(obj.status, "gray")
        return format_html(
            '<span style="background-color: {}; color: white; padding: 2px 8px; border-radius: 4px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = "Status"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "recipient", "provider", "step"
        )


@admin.register(EmailEvent)
class EmailEventAdmin(admin.ModelAdmin):
    """Admin for EmailEvent model."""

    list_display = [
        "send_email",
        "event_type",
        "timestamp",
        "url_preview",
        "ip_address",
        "country",
        "device_type",
    ]
    list_filter = ["event_type", "timestamp", "device_type", "country"]
    search_fields = ["send__to_email", "url", "ip_address"]
    readonly_fields = ["id", "created_at"]
    fieldsets = [
        ("General", {
            "fields": ["id", "send", "event_type", "timestamp"]
        }),
        ("Click Data", {
            "fields": ["url"]
        }),
        ("Client Info", {
            "fields": [
                "ip_address", "user_agent", "device_type",
                "client_name", "client_os"
            ]
        }),
        ("Location", {
            "fields": ["country", "region", "city"]
        }),
        ("Provider", {
            "fields": ["provider_event_id"]
        }),
        ("Metadata", {
            "fields": ["metadata"],
            "classes": ["collapse"]
        }),
        ("Timestamps", {
            "fields": ["created_at"]
        }),
    ]

    def send_email(self, obj):
        return obj.send.to_email
    send_email.short_description = "Email"

    def url_preview(self, obj):
        if obj.url:
            return obj.url[:50] + "..." if len(obj.url) > 50 else obj.url
        return "-"
    url_preview.short_description = "URL"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("send")
