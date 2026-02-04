from django.contrib import admin
from .models import Achievement, UserAchievement, UserProgress


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'rarity', 'xp_reward', 'is_hidden', 'created_at']
    list_filter = ['rarity', 'is_hidden']
    search_fields = ['name', 'code', 'description']
    ordering = ['rarity', 'name']


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ['user', 'achievement', 'unlocked_at']
    list_filter = ['achievement__rarity', 'unlocked_at']
    search_fields = ['user__username', 'achievement__name']
    raw_id_fields = ['user', 'achievement']
    ordering = ['-unlocked_at']


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'level', 'total_xp', 'workflows_created',
        'executions_count', 'streak_days', 'updated_at'
    ]
    list_filter = ['level']
    search_fields = ['user__username']
    raw_id_fields = ['user']
    ordering = ['-total_xp']
    
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('User Info', {
            'fields': ('user', 'total_xp', 'level')
        }),
        ('Workflow Stats', {
            'fields': ('workflows_created', 'workflows_published', 'workflows_shared', 'nodes_created', 'unique_node_types_used')
        }),
        ('Execution Stats', {
            'fields': ('executions_count', 'successful_executions', 'failed_executions')
        }),
        ('Social Stats', {
            'fields': ('workflows_forked', 'comments_posted', 'likes_received')
        }),
        ('Activity Stats', {
            'fields': ('days_active', 'streak_days', 'last_active_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
