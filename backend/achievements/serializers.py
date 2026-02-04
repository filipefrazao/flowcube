from rest_framework import serializers
from .models import Achievement, UserAchievement, UserProgress


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = [
            'id', 'code', 'name', 'description', 'icon',
            'rarity', 'xp_reward', 'is_hidden', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'unlocked_at', 'progress']
        read_only_fields = ['id', 'unlocked_at']


class UserProgressSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    achievements_unlocked = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = UserProgress
        fields = [
            'id', 'username', 'total_xp', 'level',
            'workflows_created', 'workflows_published', 'workflows_shared',
            'nodes_created', 'unique_node_types_used',
            'executions_count', 'successful_executions', 'failed_executions',
            'workflows_forked', 'comments_posted', 'likes_received',
            'days_active', 'streak_days', 'last_active_date',
            'achievements_unlocked', 'success_rate',
            'updated_at'
        ]
        read_only_fields = ['id', 'username', 'updated_at']
    
    def get_achievements_unlocked(self, obj):
        return obj.user.unlocked_achievements.count()
    
    def get_success_rate(self, obj):
        if obj.executions_count == 0:
            return 0.0
        return round((obj.successful_executions / obj.executions_count) * 100, 2)
