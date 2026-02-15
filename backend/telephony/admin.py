from django.contrib import admin
from .models import (
    CallQueue,
    CallRecord,
    CallStats,
    Extension,
    IVRMenu,
    IVROption,
    QueueMember,
    VoicemailMessage,
)


@admin.register(Extension)
class ExtensionAdmin(admin.ModelAdmin):
    list_display = ["extension_number", "user", "status", "webrtc_enabled"]
    list_filter = ["status", "webrtc_enabled"]
    search_fields = ["extension_number", "user__username", "user__first_name"]


@admin.register(CallRecord)
class CallRecordAdmin(admin.ModelAdmin):
    list_display = [
        "pabx_call_id",
        "direction",
        "status",
        "caller_number",
        "callee_number",
        "agent",
        "duration_seconds",
        "start_time",
    ]
    list_filter = ["direction", "status", "transcription_status"]
    search_fields = ["pabx_call_id", "caller_number", "callee_number"]
    date_hierarchy = "start_time"
    raw_id_fields = ["lead", "contact", "agent"]


@admin.register(VoicemailMessage)
class VoicemailMessageAdmin(admin.ModelAdmin):
    list_display = ["extension", "caller_number", "duration", "is_read", "created_at"]
    list_filter = ["is_read"]


@admin.register(IVRMenu)
class IVRMenuAdmin(admin.ModelAdmin):
    list_display = ["name", "timeout_seconds", "max_retries"]


@admin.register(IVROption)
class IVROptionAdmin(admin.ModelAdmin):
    list_display = ["ivr_menu", "digit", "label", "destination_type"]
    list_filter = ["destination_type"]


@admin.register(CallQueue)
class CallQueueAdmin(admin.ModelAdmin):
    list_display = ["name", "strategy", "timeout", "max_wait_time"]


@admin.register(QueueMember)
class QueueMemberAdmin(admin.ModelAdmin):
    list_display = ["queue", "extension", "priority"]
    list_filter = ["queue"]


@admin.register(CallStats)
class CallStatsAdmin(admin.ModelAdmin):
    list_display = [
        "date",
        "agent",
        "total_calls",
        "answered_calls",
        "missed_calls",
        "avg_duration",
    ]
    list_filter = ["date"]
    date_hierarchy = "date"
