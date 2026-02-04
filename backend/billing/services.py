import stripe
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from .models import (
    Plan, Subscription, UsageMetrics, Invoice,
    PaymentMethodRecord, BillingEvent,
    SubscriptionStatus, BillingCycle
)


# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


class StripeService:
    """Service para integração com Stripe"""

    def __init__(self):
        self.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
        if self.api_key:
            stripe.api_key = self.api_key

    def create_customer(self, user):
        """Cria customer no Stripe"""
        customer = stripe.Customer.create(
            email=user.email,
            name=user.get_full_name() or user.username,
            metadata={
                'user_id': str(user.id),
                'username': user.username
            }
        )
        return customer.id

    def create_subscription(self, user, plan, billing_cycle='monthly', payment_method_id=None):
        """
        Cria assinatura completa

        Args:
            user: User instance
            plan: Plan instance
            billing_cycle: 'monthly' ou 'yearly'
            payment_method_id: ID do método de pagamento (opcional para trial)

        Returns:
            Subscription instance
        """
        # Get or create Stripe customer
        if hasattr(user, 'subscription') and user.subscription.stripe_customer_id:
            customer_id = user.subscription.stripe_customer_id
        else:
            customer_id = self.create_customer(user)

        # Attach payment method if provided
        if payment_method_id:
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            # Set as default
            stripe.Customer.modify(
                customer_id,
                invoice_settings={
                    'default_payment_method': payment_method_id
                }
            )

        # Get Stripe price ID
        price_id = (
            plan.stripe_price_id_yearly if billing_cycle == 'yearly'
            else plan.stripe_price_id_monthly
        )

        if not price_id:
            raise ValueError(f'Stripe price ID not configured for plan {plan.name}')

        # Create subscription in Stripe
        stripe_subscription = stripe.Subscription.create(
            customer=customer_id,
            items=[{'price': price_id}],
            trial_period_days=plan.trial_days if plan.trial_days > 0 else None,
            metadata={
                'plan_tier': plan.tier,
                'user_id': str(user.id)
            }
        )

        # Calculate periods
        now = timezone.now()
        if plan.trial_days > 0:
            trial_ends = now + timedelta(days=plan.trial_days)
            period_start = trial_ends
        else:
            trial_ends = None
            period_start = now

        if billing_cycle == 'yearly':
            period_end = period_start + timedelta(days=365)
        else:
            period_end = period_start + timedelta(days=30)

        # Create or update local subscription
        subscription, created = Subscription.objects.update_or_create(
            user=user,
            defaults={
                'plan': plan,
                'stripe_subscription_id': stripe_subscription.id,
                'stripe_customer_id': customer_id,
                'billing_cycle': billing_cycle,
                'status': SubscriptionStatus.TRIALING if trial_ends else SubscriptionStatus.ACTIVE,
                'trial_ends_at': trial_ends,
                'current_period_start': period_start,
                'current_period_end': period_end,
            }
        )

        # Create billing event
        BillingEvent.objects.create(
            subscription=subscription,
            event_type='subscription.created',
            event_data={
                'plan_tier': plan.tier,
                'billing_cycle': billing_cycle,
                'trial_days': plan.trial_days
            },
            stripe_event_id=stripe_subscription.id,
            processed=True
        )

        return subscription

    def upgrade_subscription(self, subscription, new_plan):
        """
        Upgrade de plano (prorate automaticamente)
        """
        # Get new Stripe price ID
        price_id = (
            new_plan.stripe_price_id_yearly if subscription.billing_cycle == 'yearly'
            else new_plan.stripe_price_id_monthly
        )

        if not price_id:
            raise ValueError(f'Stripe price ID not configured for plan {new_plan.name}')

        # Update subscription in Stripe
        stripe_subscription = stripe.Subscription.retrieve(subscription.stripe_subscription_id)

        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            items=[{
                'id': stripe_subscription['items']['data'][0].id,
                'price': price_id,
            }],
            proration_behavior='create_prorations',  # Prorate difference
        )

        # Update local subscription
        subscription.plan = new_plan
        subscription.save()

        # Create billing event
        BillingEvent.objects.create(
            subscription=subscription,
            event_type='subscription.upgraded',
            event_data={
                'new_plan_tier': new_plan.tier,
                'old_plan_tier': subscription.plan.tier
            },
            processed=True
        )

        return subscription

    def cancel_subscription(self, subscription, immediately=False):
        """
        Cancela assinatura

        Args:
            subscription: Subscription instance
            immediately: Se True, cancela imediatamente. Se False, cancela no fim do período.
        """
        if immediately:
            # Cancel immediately
            stripe.Subscription.delete(subscription.stripe_subscription_id)

            subscription.status = SubscriptionStatus.CANCELED
            subscription.canceled_at = timezone.now()
            subscription.cancel_at_period_end = False
        else:
            # Cancel at period end
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )

            subscription.cancel_at_period_end = True

        subscription.save()

        # Create billing event
        BillingEvent.objects.create(
            subscription=subscription,
            event_type='subscription.cancelled',
            event_data={
                'immediately': immediately
            },
            processed=True
        )

        return subscription

    def reactivate_subscription(self, subscription):
        """Reativa assinatura cancelada"""
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=False
        )

        subscription.cancel_at_period_end = False
        subscription.canceled_at = None
        subscription.save()

        # Create billing event
        BillingEvent.objects.create(
            subscription=subscription,
            event_type='subscription.reactivated',
            processed=True
        )

        return subscription

    def detach_payment_method(self, payment_method_id):
        """Remove método de pagamento do Stripe"""
        stripe.PaymentMethod.detach(payment_method_id)

    def handle_webhook_event(self, event):
        """
        Processa eventos do webhook do Stripe

        Args:
            event: stripe.Event instance
        """
        event_type = event['type']
        data = event['data']['object']

        handlers = {
            'customer.subscription.updated': self._handle_subscription_updated,
            'customer.subscription.deleted': self._handle_subscription_deleted,
            'invoice.paid': self._handle_invoice_paid,
            'invoice.payment_failed': self._handle_invoice_payment_failed,
        }

        handler = handlers.get(event_type)
        if handler:
            try:
                handler(data)
                return True
            except Exception as e:
                # Log error
                BillingEvent.objects.create(
                    event_type=event_type,
                    event_data=data,
                    stripe_event_id=event['id'],
                    processed=False,
                    error_message=str(e)
                )
                return False

        return False

    def _handle_subscription_updated(self, data):
        """Atualiza assinatura local quando Stripe atualiza"""
        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=data['id']
            )

            subscription.status = data['status']
            subscription.current_period_start = timezone.datetime.fromtimestamp(
                data['current_period_start'], tz=timezone.utc
            )
            subscription.current_period_end = timezone.datetime.fromtimestamp(
                data['current_period_end'], tz=timezone.utc
            )
            subscription.save()

            BillingEvent.objects.create(
                subscription=subscription,
                event_type='subscription.updated',
                event_data=data,
                stripe_event_id=data['id'],
                processed=True
            )

        except Subscription.DoesNotExist:
            pass

    def _handle_subscription_deleted(self, data):
        """Marca assinatura como cancelada"""
        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=data['id']
            )

            subscription.status = SubscriptionStatus.CANCELED
            subscription.canceled_at = timezone.now()
            subscription.save()

            BillingEvent.objects.create(
                subscription=subscription,
                event_type='subscription.deleted',
                event_data=data,
                stripe_event_id=data['id'],
                processed=True
            )

        except Subscription.DoesNotExist:
            pass

    def _handle_invoice_paid(self, data):
        """Cria/atualiza invoice quando pago"""
        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=data['subscription']
            )

            Invoice.objects.update_or_create(
                stripe_invoice_id=data['id'],
                defaults={
                    'subscription': subscription,
                    'stripe_hosted_invoice_url': data.get('hosted_invoice_url', ''),
                    'stripe_invoice_pdf': data.get('invoice_pdf', ''),
                    'amount': Decimal(str(data['amount_due'] / 100)),
                    'amount_paid': Decimal(str(data['amount_paid'] / 100)),
                    'status': 'paid',
                    'period_start': timezone.datetime.fromtimestamp(
                        data['period_start'], tz=timezone.utc
                    ),
                    'period_end': timezone.datetime.fromtimestamp(
                        data['period_end'], tz=timezone.utc
                    ),
                    'paid_at': timezone.now()
                }
            )

            BillingEvent.objects.create(
                subscription=subscription,
                event_type='invoice.paid',
                event_data=data,
                stripe_event_id=data['id'],
                processed=True
            )

        except Subscription.DoesNotExist:
            pass

    def _handle_invoice_payment_failed(self, data):
        """Marca assinatura como past_due quando pagamento falha"""
        try:
            subscription = Subscription.objects.get(
                stripe_subscription_id=data['subscription']
            )

            subscription.status = SubscriptionStatus.PAST_DUE
            subscription.save()

            BillingEvent.objects.create(
                subscription=subscription,
                event_type='invoice.payment_failed',
                event_data=data,
                stripe_event_id=data['id'],
                processed=True
            )

        except Subscription.DoesNotExist:
            pass


class UsageTracker:
    """Service para tracking de uso e enforcement de limites"""

    @staticmethod
    def track_workflow_creation(user):
        """
        Incrementa contador de workflows criados

        Raises:
            PermissionError: Se limite foi atingido
        """
        metrics = UsageMetrics.get_current_month(user)

        # Check limit
        if hasattr(user, 'subscription'):
            subscription = user.subscription
            is_within_limit, limit = subscription.check_limit(
                'workflows', metrics.workflows_count
            )

            if not is_within_limit:
                raise PermissionError(
                    f'Workflow limit reached ({limit}). Upgrade your plan to create more workflows.'
                )

        # Increment
        metrics.workflows_count += 1
        metrics.save()

    @staticmethod
    def track_workflow_execution(user):
        """
        Incrementa contador de execuções

        Raises:
            PermissionError: Se limite foi atingido
        """
        metrics = UsageMetrics.get_current_month(user)

        # Check limit
        if hasattr(user, 'subscription'):
            subscription = user.subscription
            is_within_limit, limit = subscription.check_limit(
                'executions', metrics.executions_count
            )

            if not is_within_limit:
                raise PermissionError(
                    f'Execution limit reached ({limit}). Upgrade your plan to continue.'
                )

        # Increment
        metrics.executions_count += 1
        metrics.save()

    @staticmethod
    def track_ai_request(user, tokens_used=0):
        """
        Incrementa contador de requisições AI

        Raises:
            PermissionError: Se limite foi atingido
        """
        metrics = UsageMetrics.get_current_month(user)

        # Check limit
        if hasattr(user, 'subscription'):
            subscription = user.subscription
            is_within_limit, limit = subscription.check_limit(
                'ai_requests', metrics.ai_requests_count
            )

            if not is_within_limit:
                raise PermissionError(
                    f'AI request limit reached ({limit}). Upgrade to Pro to access AI features.'
                )

        # Increment
        metrics.ai_requests_count += 1
        metrics.ai_tokens_used += tokens_used
        metrics.save()

    @staticmethod
    def track_storage(user, mb_used):
        """Atualiza armazenamento usado"""
        metrics = UsageMetrics.get_current_month(user)
        metrics.storage_used_mb = mb_used
        metrics.save()

    @staticmethod
    def check_feature_access(user, feature):
        """
        Verifica se usuário tem acesso a uma feature

        Args:
            user: User instance
            feature: Nome da feature (has_ai_features, has_whatsapp_integration, etc)

        Returns:
            bool: True se tem acesso

        Raises:
            PermissionError: Se não tem acesso
        """
        if not hasattr(user, 'subscription'):
            raise PermissionError('No active subscription')

        subscription = user.subscription
        has_access = getattr(subscription.plan, feature, False)

        if not has_access:
            raise PermissionError(
                f'This feature requires an upgrade. Current plan: {subscription.plan.name}'
            )

        return True
