from django.contrib import admin

from .models import (
    AnalyticsClient,
    AnalyticsDashboard,
    AnalyticsEvent,
    AnalyticsEventMeta,
    AnalyticsNotificationRule,
    AnalyticsProfile,
    AnalyticsProject,
    AnalyticsReference,
    AnalyticsReport,
    AnalyticsSalt,
    AnalyticsSession,
)


@admin.register(AnalyticsProject)
class AnalyticsProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "domain", "owner", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "domain"]


@admin.register(AnalyticsClient)
class AnalyticsClientAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "key_type", "is_active", "created_at"]
    list_filter = ["key_type", "is_active"]


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "device_id", "path", "created_at"]
    list_filter = ["name"]
    date_hierarchy = "created_at"


@admin.register(AnalyticsSession)
class AnalyticsSessionAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "device_id", "is_bounce", "event_count", "created_at"]
    list_filter = ["is_bounce"]


@admin.register(AnalyticsProfile)
class AnalyticsProfileAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "email", "first_name", "last_name", "created_at"]
    search_fields = ["email", "first_name", "last_name"]


@admin.register(AnalyticsDashboard)
class AnalyticsDashboardAdmin(admin.ModelAdmin):
    list_display = ["name", "project", "owner", "created_at"]


@admin.register(AnalyticsReport)
class AnalyticsReportAdmin(admin.ModelAdmin):
    list_display = ["name", "chart_type", "project", "dashboard", "created_at"]
    list_filter = ["chart_type"]


@admin.register(AnalyticsEventMeta)
class AnalyticsEventMetaAdmin(admin.ModelAdmin):
    list_display = ["event_name", "project", "is_conversion"]


@admin.register(AnalyticsSalt)
class AnalyticsSaltAdmin(admin.ModelAdmin):
    list_display = ["project", "date"]


@admin.register(AnalyticsReference)
class AnalyticsReferenceAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "date"]


@admin.register(AnalyticsNotificationRule)
class AnalyticsNotificationRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "event_name", "condition", "channel", "is_active"]
    list_filter = ["condition", "channel", "is_active"]
