from rest_framework import serializers
from .models import (
    Plan, Subscription, UsageMetrics, Invoice,
    PaymentMethodRecord, BillingEvent
)


class PlanSerializer(serializers.ModelSerializer):
    yearly_savings = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = Plan
        fields = [
            'id', 'tier', 'name', 'description', 'tagline',
            'price_monthly', 'price_yearly', 'yearly_discount_percentage', 'yearly_savings',
            'max_workflows', 'max_executions_per_month', 'max_nodes_per_workflow',
            'max_active_workflows', 'max_ai_requests_per_month', 'max_storage_mb',
            'max_team_members',
            'has_ai_features', 'has_marketplace_access', 'has_marketplace_publish',
            'has_whatsapp_integration', 'has_advanced_analytics',
            'has_priority_support', 'has_whitelabel', 'has_api_access',
            'has_custom_domain', 'has_team_collaboration',
            'features', 'is_popular', 'trial_days',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    plan_id = serializers.UUIDField(write_only=True, required=False)
    is_active = serializers.BooleanField(read_only=True)
    is_trial = serializers.BooleanField(read_only=True)
    days_until_renewal = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'plan', 'plan_id',
            'stripe_subscription_id', 'stripe_customer_id',
            'billing_cycle', 'status', 'payment_method',
            'trial_ends_at', 'current_period_start', 'current_period_end',
            'cancel_at_period_end', 'canceled_at',
            'is_active', 'is_trial', 'days_until_renewal',
            'metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'stripe_subscription_id', 'stripe_customer_id',
            'created_at', 'updated_at'
        ]

    def create(self, validated_data):
        plan_id = validated_data.pop('plan_id', None)
        if plan_id:
            validated_data['plan'] = Plan.objects.get(id=plan_id)
        return super().create(validated_data)


class UsageMetricsSerializer(serializers.ModelSerializer):
    limits_status = serializers.SerializerMethodField()

    class Meta:
        model = UsageMetrics
        fields = [
            'id', 'user', 'month',
            'workflows_count', 'active_workflows_count', 'executions_count',
            'ai_requests_count', 'ai_tokens_used', 'storage_used_mb',
            'whatsapp_messages_sent', 'api_requests_count',
            'limits_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_limits_status(self, obj):
        return obj.check_limits()


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = [
            'id', 'subscription', 'stripe_invoice_id',
            'stripe_hosted_invoice_url', 'stripe_invoice_pdf',
            'invoice_number', 'amount', 'amount_paid', 'amount_due',
            'tax_percent', 'tax_amount', 'status',
            'period_start', 'period_end', 'due_date', 'paid_at',
            'payment_method', 'description', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at']


class PaymentMethodRecordSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = PaymentMethodRecord
        fields = [
            'id', 'user', 'payment_type', 'stripe_payment_method_id',
            'card_last4', 'card_brand', 'card_exp_month', 'card_exp_year',
            'pix_key', 'pix_key_type',
            'is_default', 'is_active',
            'display_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_display_name(self, obj):
        return str(obj)


class BillingEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingEvent
        fields = [
            'id', 'subscription', 'event_type', 'event_data',
            'stripe_event_id', 'processed', 'error_message',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
