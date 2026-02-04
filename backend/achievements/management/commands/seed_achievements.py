from django.core.management.base import BaseCommand
from achievements.models import Achievement

class Command(BaseCommand):
    help = 'Seed achievements database'

    def handle(self, *args, **options):
        achievements_data = [
            {
                "code": "first_workflow",
                "name": "Primeiro Workflow",
                "description": "Crie seu primeiro workflow",
                "icon": "trophy",
                "rarity": "common",
                "unlock_condition": {"action": "create_workflow", "count": 1},
                "xp_reward": 10
            },
            {
                "code": "automator",
                "name": "Automator",
                "description": "Crie 10 workflows",
                "icon": "zap",
                "rarity": "rare",
                "unlock_condition": {"action": "create_workflow", "count": 10},
                "xp_reward": 50
            },
            {
                "code": "power_user",
                "name": "Power User",
                "description": "Execute 100 workflows com sucesso",
                "icon": "star",
                "rarity": "epic",
                "unlock_condition": {"action": "successful_executions", "count": 100},
                "xp_reward": 100
            },
            {
                "code": "speed_demon",
                "name": "Speed Demon",
                "description": "Execute workflow em menos de 1 segundo",
                "icon": "rocket",
                "rarity": "legendary",
                "unlock_condition": {"action": "fast_execution", "threshold_ms": 1000},
                "xp_reward": 200
            },
            {
                "code": "integration_master",
                "name": "Integration Master",
                "description": "Conecte 5 integrações diferentes",
                "icon": "link",
                "rarity": "rare",
                "unlock_condition": {"action": "integrations_connected", "count": 5},
                "xp_reward": 75
            },
            {
                "code": "ai_assistant",
                "name": "AI Assistant",
                "description": "Use IA para criar 5 nodes",
                "icon": "brain",
                "rarity": "epic",
                "unlock_condition": {"action": "ai_node_created", "count": 5},
                "xp_reward": 150
            },
            {
                "code": "bug_hunter",
                "name": "Bug Hunter",
                "description": "Resolva 10 erros com AI Debug",
                "icon": "bug",
                "rarity": "rare",
                "unlock_condition": {"action": "ai_debug_used", "count": 10},
                "xp_reward": 80
            },
            {
                "code": "enterprise",
                "name": "Enterprise",
                "description": "Faça upgrade para plano Enterprise",
                "icon": "crown",
                "rarity": "legendary",
                "unlock_condition": {"action": "upgrade_plan", "plan": "enterprise"},
                "xp_reward": 500
            },
            {
                "code": "marathon_runner",
                "name": "Marathon Runner",
                "description": "Execute 1000 workflows",
                "icon": "activity",
                "rarity": "epic",
                "unlock_condition": {"action": "total_executions", "count": 1000},
                "xp_reward": 120
            },
            {
                "code": "colaborador",
                "name": "Colaborador",
                "description": "Compartilhe um workflow com a comunidade",
                "icon": "users",
                "rarity": "common",
                "unlock_condition": {"action": "share_workflow", "count": 1},
                "xp_reward": 30
            }
        ]

        created_count = 0
        for data in achievements_data:
            achievement, created = Achievement.objects.get_or_create(
                code=data["code"],
                defaults=data
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✅ Created: {achievement.name}'))
            else:
                self.stdout.write(self.style.WARNING(f'⚠️  Already exists: {achievement.name}'))

        self.stdout.write(self.style.SUCCESS(f'\n🎉 Seeded {created_count} achievements!'))
