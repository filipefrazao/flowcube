from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid
from decimal import Decimal

User = get_user_model()


class PlanTier(models.TextChoices):
    """Tiers de planos SaaS"""
    FREE = 'free', 'Free'
    STARTER = 'starter', 'Starter'
    PRO = 'pro', 'Pro'
    ENTERPRISE = 'enterprise', 'Enterprise'


class BillingCycle(models.TextChoices):
    """Ciclos de cobrança"""
    MONTHLY = 'monthly', 'Monthly'
    YEARLY = 'yearly', 'Yearly'


class SubscriptionStatus(models.TextChoices):
    """Status da assinatura"""
    ACTIVE = 'active', 'Active'
    TRIALING = 'trialing', 'Trialing'
    PAST_DUE = 'past_due', 'Past Due'
    CANCELED = 'canceled', 'Canceled'
    INCOMPLETE = 'incomplete', 'Incomplete'
    INCOMPLETE_EXPIRED = 'incomplete_expired', 'Incomplete Expired'
    PAUSED = 'paused', 'Paused'


class InvoiceStatus(models.TextChoices):
    """Status da fatura"""
    DRAFT = 'draft', 'Draft'
    OPEN = 'open', 'Open'
    PAID = 'paid', 'Paid'
    VOID = 'void', 'Void'
    UNCOLLECTIBLE = 'uncollectible', 'Uncollectible'


class PaymentMethod(models.TextChoices):
    """Métodos de pagamento"""
    CREDIT_CARD = 'credit_card', 'Credit Card'
    PIX = 'pix', 'Pix'
    BOLETO = 'boleto', 'Boleto'


class Plan(models.Model):
    """Planos SaaS disponíveis"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Basic info
    tier = models.CharField(max_length=20, choices=PlanTier.choices, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=200, blank=True, help_text='Frase de destaque para marketing')

    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    yearly_discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=20,
        help_text='Desconto aplicado no plano anual (padrão 20%)'
    )

    # Stripe IDs
    stripe_price_id_monthly = models.CharField(max_length=255, blank=True)
    stripe_price_id_yearly = models.CharField(max_length=255, blank=True)
    stripe_product_id = models.CharField(max_length=255, blank=True)

    # Workflow limits
    max_workflows = models.IntegerField(
        default=5,
        help_text='Número máximo de workflows que podem ser criados'
    )
    max_executions_per_month = models.IntegerField(
        default=100,
        help_text='Número máximo de execuções de workflow por mês'
    )
    max_nodes_per_workflow = models.IntegerField(
        null=True, blank=True,
        help_text='Número máximo de nodes por workflow (null = ilimitado)'
    )
    max_active_workflows = models.IntegerField(
        default=3,
        help_text='Número máximo de workflows ativos simultaneamente'
    )

    # AI Features limits
    max_ai_requests_per_month = models.IntegerField(
        default=0,
        help_text='Número máximo de requisições AI por mês (0 = sem acesso)'
    )

    # Storage limits
    max_storage_mb = models.IntegerField(
        default=100,
        help_text='Armazenamento máximo em MB'
    )

    # Features flags
    has_ai_features = models.BooleanField(
        default=False,
        help_text='Acesso a AI Node Builder, AI Debugger, AI Assistant'
    )
    has_marketplace_access = models.BooleanField(
        default=True,
        help_text='Acesso ao Marketplace de workflows'
    )
    has_marketplace_publish = models.BooleanField(
        default=False,
        help_text='Pode publicar workflows no Marketplace'
    )
    has_whatsapp_integration = models.BooleanField(
        default=False,
        help_text='Integração com WhatsApp Business API'
    )
    has_advanced_analytics = models.BooleanField(
        default=False,
        help_text='Analytics avançado com métricas premium'
    )
    has_priority_support = models.BooleanField(
        default=False,
        help_text='Suporte prioritário'
    )
    has_whitelabel = models.BooleanField(
        default=False,
        help_text='Pode usar marca própria (white label)'
    )
    has_api_access = models.BooleanField(
        default=False,
        help_text='Acesso à API REST do FlowCube'
    )
    has_custom_domain = models.BooleanField(
        default=False,
        help_text='Pode usar domínio customizado'
    )
    has_team_collaboration = models.BooleanField(
        default=False,
        help_text='Recursos de colaboração em equipe'
    )
    max_team_members = models.IntegerField(
        default=1,
        help_text='Número máximo de membros da equipe'
    )

    # Features list (JSON)
    features = models.JSONField(
        default=list,
        help_text='Lista de features para exibição (ex: ["Feature 1", "Feature 2"])'
    )

    # Display settings
    is_popular = models.BooleanField(default=False, help_text='Marcar como plano mais popular')
    is_active = models.BooleanField(default=True, help_text='Plano disponível para compra')
    display_order = models.IntegerField(default=0, help_text='Ordem de exibição (menor primeiro)')

    # Trial
    trial_days = models.IntegerField(default=14, help_text='Dias de trial gratuito')

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'price_monthly']

    def __str__(self):
        return f'{self.name} ({self.get_tier_display()})'

    @property
    def yearly_savings(self):
        """Calcula economia anual"""
        monthly_total = self.price_monthly * 12
        return monthly_total - self.price_yearly


class Subscription(models.Model):
    """Assinatura de usuário"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='subscriptions'
    )

    # Stripe integration
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True)

    # Billing
    billing_cycle = models.CharField(
        max_length=10,
        choices=BillingCycle.choices,
        default=BillingCycle.MONTHLY
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE
    )

    # Payment method
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CREDIT_CARD
    )

    # Periods
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField()

    # Cancellation
    cancel_at_period_end = models.BooleanField(default=False)
    canceled_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} - {self.plan.name}'

    @property
    def is_active(self):
        """Verifica se assinatura está ativa"""
        return self.status in [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING
        ]

    @property
    def is_trial(self):
        """Verifica se está em período de trial"""
        if not self.trial_ends_at:
            return False
        return timezone.now() < self.trial_ends_at

    @property
    def days_until_renewal(self):
        """Dias até renovação"""
        if not self.current_period_end:
            return 0
        delta = self.current_period_end - timezone.now()
        return max(0, delta.days)

    def check_limit(self, limit_type, current_value):
        """
        Verifica se um limite foi atingido

        Args:
            limit_type: tipo do limite (workflows, executions, ai_requests, etc)
            current_value: valor atual do recurso

        Returns:
            tuple: (is_within_limit: bool, limit_value: int)
        """
        limit_map = {
            'workflows': self.plan.max_workflows,
            'executions': self.plan.max_executions_per_month,
            'nodes': self.plan.max_nodes_per_workflow,
            'active_workflows': self.plan.max_active_workflows,
            'ai_requests': self.plan.max_ai_requests_per_month,
            'storage': self.plan.max_storage_mb,
            'team_members': self.plan.max_team_members,
        }

        limit = limit_map.get(limit_type)
        if limit is None:  # Unlimited
            return True, None

        return current_value < limit, limit


class UsageMetrics(models.Model):
    """Métricas de uso mensal do usuário"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='usage_metrics')
    month = models.DateField(help_text='Primeiro dia do mês de referência')

    # Workflow metrics
    workflows_count = models.IntegerField(default=0, help_text='Total de workflows criados')
    active_workflows_count = models.IntegerField(default=0, help_text='Workflows ativos')
    executions_count = models.IntegerField(default=0, help_text='Execuções de workflow')

    # AI metrics
    ai_requests_count = models.IntegerField(default=0, help_text='Requisições AI')
    ai_tokens_used = models.BigIntegerField(default=0, help_text='Tokens AI consumidos')

    # Storage metrics
    storage_used_mb = models.FloatField(default=0, help_text='Armazenamento usado em MB')

    # Integration metrics
    whatsapp_messages_sent = models.IntegerField(default=0)
    api_requests_count = models.IntegerField(default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'month']
        ordering = ['-month']
        indexes = [
            models.Index(fields=['user', 'month']),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.month.strftime("%Y-%m")}'

    @classmethod
    def get_current_month(cls, user):
        """Retorna ou cria métricas do mês atual"""
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        metrics, created = cls.objects.get_or_create(
            user=user,
            month=month_start.date()
        )
        return metrics

    def check_limits(self):
        """
        Verifica todos os limites do plano

        Returns:
            dict: {limit_type: {'current': int, 'limit': int, 'exceeded': bool}}
        """
        if not hasattr(self.user, 'subscription'):
            return {}

        subscription = self.user.subscription

        return {
            'workflows': {
                'current': self.workflows_count,
                'limit': subscription.plan.max_workflows,
                'exceeded': self.workflows_count >= subscription.plan.max_workflows
            },
            'executions': {
                'current': self.executions_count,
                'limit': subscription.plan.max_executions_per_month,
                'exceeded': self.executions_count >= subscription.plan.max_executions_per_month
            },
            'ai_requests': {
                'current': self.ai_requests_count,
                'limit': subscription.plan.max_ai_requests_per_month,
                'exceeded': self.ai_requests_count >= subscription.plan.max_ai_requests_per_month
            },
            'storage': {
                'current': self.storage_used_mb,
                'limit': subscription.plan.max_storage_mb,
                'exceeded': self.storage_used_mb >= subscription.plan.max_storage_mb
            }
        }


class Invoice(models.Model):
    """Faturas geradas"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='invoices'
    )

    # Stripe integration
    stripe_invoice_id = models.CharField(max_length=255, blank=True)
    stripe_hosted_invoice_url = models.URLField(blank=True)
    stripe_invoice_pdf = models.URLField(blank=True)

    # Invoice details
    invoice_number = models.CharField(max_length=50, unique=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Tax
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Status
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.DRAFT
    )

    # Dates
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    due_date = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # Payment
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CREDIT_CARD
    )

    # Metadata
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subscription', 'status']),
            models.Index(fields=['stripe_invoice_id']),
        ]

    def __str__(self):
        return f'Invoice {self.invoice_number} - R$ {self.amount}'

    def save(self, *args, **kwargs):
        # Generate invoice number if not exists
        if not self.invoice_number:
            year_month = timezone.now().strftime('%Y%m')
            last_invoice = Invoice.objects.filter(
                invoice_number__startswith=f'INV-{year_month}'
            ).order_by('-invoice_number').first()

            if last_invoice:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1

            self.invoice_number = f'INV-{year_month}-{new_num:05d}'

        # Calculate amount due
        self.amount_due = self.amount - self.amount_paid

        super().save(*args, **kwargs)


class PaymentMethodRecord(models.Model):
    """Registro de métodos de pagamento salvos"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payment_methods')

    # Payment method info
    payment_type = models.CharField(max_length=20, choices=PaymentMethod.choices)

    # Stripe
    stripe_payment_method_id = models.CharField(max_length=255, blank=True)

    # Card info (last 4 digits, brand)
    card_last4 = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_exp_month = models.IntegerField(null=True, blank=True)
    card_exp_year = models.IntegerField(null=True, blank=True)

    # Pix info
    pix_key = models.CharField(max_length=255, blank=True)
    pix_key_type = models.CharField(max_length=20, blank=True)

    # Settings
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def __str__(self):
        if self.payment_type == PaymentMethod.CREDIT_CARD:
            return f'{self.card_brand} •••• {self.card_last4}'
        elif self.payment_type == PaymentMethod.PIX:
            return f'Pix - {self.pix_key_type}'
        return self.get_payment_type_display()


class BillingEvent(models.Model):
    """Log de eventos relacionados a billing"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='billing_events',
        null=True,
        blank=True
    )

    event_type = models.CharField(max_length=50)
    event_data = models.JSONField(default=dict)

    # Stripe event
    stripe_event_id = models.CharField(max_length=255, blank=True)

    processed = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['stripe_event_id']),
        ]

    def __str__(self):
        return f'{self.event_type} - {self.created_at}'
