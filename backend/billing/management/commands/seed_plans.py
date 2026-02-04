from django.core.management.base import BaseCommand
from billing.models import Plan, PlanTier


class Command(BaseCommand):
    help = 'Seeds initial SaaS plans into database'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding initial plans...')

        plans_data = [
            {
                'tier': PlanTier.FREE,
                'name': 'Free',
                'description': 'Perfect for getting started with automation',
                'tagline': 'Start automating for free',
                'price_monthly': 0,
                'price_yearly': 0,
                'yearly_discount_percentage': 0,
                'max_workflows': 5,
                'max_executions_per_month': 100,
                'max_nodes_per_workflow': 10,
                'max_active_workflows': 3,
                'max_ai_requests_per_month': 0,
                'max_storage_mb': 100,
                'max_team_members': 1,
                'has_ai_features': False,
                'has_marketplace_access': True,
                'has_marketplace_publish': False,
                'has_whatsapp_integration': False,
                'has_advanced_analytics': False,
                'has_priority_support': False,
                'has_whitelabel': False,
                'has_api_access': False,
                'has_custom_domain': False,
                'has_team_collaboration': False,
                'features': [
                    '5 workflows',
                    '100 executions/month',
                    'Up to 10 nodes per workflow',
                    'Basic marketplace access',
                    'Community support'
                ],
                'is_popular': False,
                'is_active': True,
                'display_order': 0,
                'trial_days': 0
            },
            {
                'tier': PlanTier.STARTER,
                'name': 'Starter',
                'description': 'Great for small businesses and growing teams',
                'tagline': 'Power up your automation',
                'price_monthly': 29,
                'price_yearly': 278.40,  # 20% discount
                'yearly_discount_percentage': 20,
                'max_workflows': 50,
                'max_executions_per_month': 10000,
                'max_nodes_per_workflow': 50,
                'max_active_workflows': 25,
                'max_ai_requests_per_month': 0,
                'max_storage_mb': 1000,
                'max_team_members': 3,
                'has_ai_features': False,
                'has_marketplace_access': True,
                'has_marketplace_publish': True,
                'has_whatsapp_integration': True,
                'has_advanced_analytics': False,
                'has_priority_support': False,
                'has_whitelabel': False,
                'has_api_access': True,
                'has_custom_domain': False,
                'has_team_collaboration': True,
                'features': [
                    '50 workflows',
                    '10,000 executions/month',
                    'Up to 50 nodes per workflow',
                    'WhatsApp integration',
                    'Marketplace publishing',
                    'API access',
                    'Team collaboration (up to 3 members)',
                    'Email support'
                ],
                'is_popular': False,
                'is_active': True,
                'display_order': 1,
                'trial_days': 14
            },
            {
                'tier': PlanTier.PRO,
                'name': 'Pro',
                'description': 'Advanced features for power users and agencies',
                'tagline': 'Unlock AI & advanced features',
                'price_monthly': 99,
                'price_yearly': 950.40,  # 20% discount
                'yearly_discount_percentage': 20,
                'max_workflows': None,  # Unlimited
                'max_executions_per_month': 100000,
                'max_nodes_per_workflow': None,  # Unlimited
                'max_active_workflows': 100,
                'max_ai_requests_per_month': 1000,
                'max_storage_mb': 10000,
                'max_team_members': 10,
                'has_ai_features': True,
                'has_marketplace_access': True,
                'has_marketplace_publish': True,
                'has_whatsapp_integration': True,
                'has_advanced_analytics': True,
                'has_priority_support': True,
                'has_whitelabel': False,
                'has_api_access': True,
                'has_custom_domain': True,
                'has_team_collaboration': True,
                'features': [
                    'Unlimited workflows',
                    '100,000 executions/month',
                    'Unlimited nodes per workflow',
                    'AI Node Builder',
                    'AI Debugger',
                    'AI Assistant (1,000 requests/month)',
                    'WhatsApp integration',
                    'Advanced analytics',
                    'Custom domain',
                    'API access',
                    'Team collaboration (up to 10 members)',
                    'Priority support'
                ],
                'is_popular': True,
                'is_active': True,
                'display_order': 2,
                'trial_days': 14
            },
            {
                'tier': PlanTier.ENTERPRISE,
                'name': 'Enterprise',
                'description': 'Custom solutions for large organizations',
                'tagline': 'Complete control & unlimited scale',
                'price_monthly': 499,
                'price_yearly': 4790.40,  # 20% discount
                'yearly_discount_percentage': 20,
                'max_workflows': None,  # Unlimited
                'max_executions_per_month': None,  # Unlimited
                'max_nodes_per_workflow': None,  # Unlimited
                'max_active_workflows': None,  # Unlimited
                'max_ai_requests_per_month': None,  # Unlimited
                'max_storage_mb': None,  # Unlimited
                'max_team_members': None,  # Unlimited
                'has_ai_features': True,
                'has_marketplace_access': True,
                'has_marketplace_publish': True,
                'has_whatsapp_integration': True,
                'has_advanced_analytics': True,
                'has_priority_support': True,
                'has_whitelabel': True,
                'has_api_access': True,
                'has_custom_domain': True,
                'has_team_collaboration': True,
                'features': [
                    'Everything in Pro',
                    'Unlimited executions',
                    'Unlimited AI requests',
                    'Unlimited storage',
                    'White label',
                    'Dedicated support',
                    'Custom integrations',
                    'SLA guarantee',
                    'Unlimited team members',
                    'Advanced security',
                    'Custom contracts'
                ],
                'is_popular': False,
                'is_active': True,
                'display_order': 3,
                'trial_days': 30
            }
        ]

        created_count = 0
        updated_count = 0

        for plan_data in plans_data:
            plan, created = Plan.objects.update_or_create(
                tier=plan_data['tier'],
                defaults=plan_data
            )

            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created plan: {plan.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Updated plan: {plan.name}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone! Created {created_count}, Updated {updated_count} plans.'
            )
        )
