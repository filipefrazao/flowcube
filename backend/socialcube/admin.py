from django.contrib import admin
from .models import (
    SocialAccount, ScheduledPost, PostMedia, PostPlatform,
    PostInsight, PlatformAnalytics, Competitor, CompetitorSnapshot,
    SmartLinkPage, SmartLinkButton, ContentApproval,
)


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = ["username", "platform", "user", "is_active", "connected_at"]
    list_filter = ["platform", "is_active"]
    search_fields = ["username", "display_name"]


class PostMediaInline(admin.TabularInline):
    model = PostMedia
    extra = 0


class PostPlatformInline(admin.TabularInline):
    model = PostPlatform
    extra = 0


@admin.register(ScheduledPost)
class ScheduledPostAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "status", "scheduled_at", "created_at"]
    list_filter = ["status"]
    inlines = [PostMediaInline, PostPlatformInline]


@admin.register(PlatformAnalytics)
class PlatformAnalyticsAdmin(admin.ModelAdmin):
    list_display = ["account", "date", "followers", "total_engagement"]
    list_filter = ["account__platform"]


@admin.register(Competitor)
class CompetitorAdmin(admin.ModelAdmin):
    list_display = ["username", "platform", "user", "is_active"]
    list_filter = ["platform"]


@admin.register(SmartLinkPage)
class SmartLinkPageAdmin(admin.ModelAdmin):
    list_display = ["title", "slug", "user", "total_views", "is_active"]


@admin.register(ContentApproval)
class ContentApprovalAdmin(admin.ModelAdmin):
    list_display = ["post", "reviewer", "status", "reviewed_at"]
    list_filter = ["status"]
