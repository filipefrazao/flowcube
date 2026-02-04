from django.contrib.auth.models import User
from .models import Achievement, UserAchievement, UserProgress
from typing import List, Dict


class AchievementService:
    ACHIEVEMENTS: Dict[str, Dict] = {
        'first_workflow': {
            'name': 'First Steps',
            'description': 'Create your first workflow',
            'icon': '🎯',
            'rarity': 'common',
            'xp': 100,
            'condition': lambda p: p.workflows_created >= 1,
        },
        'first_execution': {
            'name': 'In Motion',
            'description': 'Execute your first workflow',
            'icon': '▶️',
            'rarity': 'common',
            'xp': 50,
            'condition': lambda p: p.executions_count >= 1,
        },
        'first_success': {
            'name': 'Success!',
            'description': 'Complete a workflow successfully',
            'icon': '✅',
            'rarity': 'common',
            'xp': 100,
            'condition': lambda p: p.successful_executions >= 1,
        },
        'week_streak': {
            'name': 'Consistent Creator',
            'description': 'Maintain a 7-day activity streak',
            'icon': '🔥',
            'rarity': 'common',
            'xp': 200,
            'condition': lambda p: p.streak_days >= 7,
        },
        '10_workflows': {
            'name': 'Workflow Architect',
            'description': 'Create 10 workflows',
            'icon': '🏗️',
            'rarity': 'rare',
            'xp': 500,
            'condition': lambda p: p.workflows_created >= 10,
        },
        '100_executions': {
            'name': 'Automation Enthusiast',
            'description': 'Execute workflows 100 times',
            'icon': '⚡',
            'rarity': 'rare',
            'xp': 500,
            'condition': lambda p: p.executions_count >= 100,
        },
        'publisher': {
            'name': 'Publisher',
            'description': 'Publish 5 workflows',
            'icon': '📢',
            'rarity': 'rare',
            'xp': 300,
            'condition': lambda p: p.workflows_published >= 5,
        },
        'node_explorer': {
            'name': 'Node Explorer',
            'description': 'Use 20 different node types',
            'icon': '🧩',
            'rarity': 'rare',
            'xp': 400,
            'condition': lambda p: p.unique_node_types_used >= 20,
        },
        'month_streak': {
            'name': 'Dedicated Developer',
            'description': 'Maintain a 30-day activity streak',
            'icon': '💪',
            'rarity': 'rare',
            'xp': 1000,
            'condition': lambda p: p.streak_days >= 30,
        },
        '50_workflows': {
            'name': 'Workflow Master',
            'description': 'Create 50 workflows',
            'icon': '👑',
            'rarity': 'epic',
            'xp': 2000,
            'condition': lambda p: p.workflows_created >= 50,
        },
        'power_user': {
            'name': 'Power User',
            'description': 'Execute workflows 1000 times',
            'icon': '💥',
            'rarity': 'epic',
            'xp': 2000,
            'condition': lambda p: p.executions_count >= 1000,
        },
        'perfectionist': {
            'name': 'Perfectionist',
            'description': 'Achieve 100 successful executions with 95% success rate',
            'icon': '💎',
            'rarity': 'epic',
            'xp': 1500,
            'condition': lambda p: (
                p.successful_executions >= 100 and
                p.executions_count > 0 and
                (p.successful_executions / p.executions_count) >= 0.95
            ),
        },
        'influencer': {
            'name': 'Community Influencer',
            'description': 'Receive 100 likes on your workflows',
            'icon': '⭐',
            'rarity': 'epic',
            'xp': 1000,
            'condition': lambda p: p.likes_received >= 100,
        },
        '100_workflows': {
            'name': 'Automation Legend',
            'description': 'Create 100 workflows',
            'icon': '🏆',
            'rarity': 'legendary',
            'xp': 5000,
            'condition': lambda p: p.workflows_created >= 100,
        },
        'ultra_power_user': {
            'name': 'Automation God',
            'description': 'Execute workflows 10,000 times',
            'icon': '👾',
            'rarity': 'legendary',
            'xp': 10000,
            'condition': lambda p: p.executions_count >= 10000,
        },
        'year_streak': {
            'name': 'Unstoppable',
            'description': 'Maintain a 365-day activity streak',
            'icon': '🔥',
            'rarity': 'legendary',
            'xp': 10000,
            'condition': lambda p: p.streak_days >= 365,
        },
        'master_publisher': {
            'name': 'Publishing Tycoon',
            'description': 'Publish 50 workflows',
            'icon': '📚',
            'rarity': 'legendary',
            'xp': 5000,
            'condition': lambda p: p.workflows_published >= 50,
        },
    }
    
    @classmethod
    def check_and_unlock(cls, user: User) -> List[Achievement]:
        progress, _ = UserProgress.objects.get_or_create(user=user)
        newly_unlocked = []
        
        for code, data in cls.ACHIEVEMENTS.items():
            try:
                if data['condition'](progress):
                    achievement, _ = Achievement.objects.get_or_create(
                        code=code,
                        defaults={
                            'name': data['name'],
                            'description': data['description'],
                            'icon': data['icon'],
                            'rarity': data['rarity'],
                            'xp_reward': data['xp'],
                        }
                    )
                    
                    user_achievement, created = UserAchievement.objects.get_or_create(
                        user=user,
                        achievement=achievement
                    )
                    
                    if created:
                        progress.add_xp(data['xp'])
                        newly_unlocked.append(achievement)
            
            except Exception as e:
                print(f"Error checking achievement {code}: {e}")
                continue
        
        return newly_unlocked
