from django.contrib import admin
from .models import (
    Plan, Subscription, UsageMetrics, Invoice,
    PaymentMethodRecord, BillingEvent
)


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'tier', 'price_monthly', 'price_yearly',
        'max_workflows', 'max_executions_per_month',
        'has_ai_features', 'is_popular', 'is_active'
    ]
    list_filter = ['tier', 'is_active', 'is_popular', 'has_ai_features']
    search_fields = ['name', 'description']
    ordering = ['display_order', 'price_monthly']

    fieldsets = (
        ('Basic Info', {
            'fields': ('tier', 'name', 'description', 'tagline')
        }),
        ('Pricing', {
            'fields': (
                'price_monthly', 'price_yearly', 'yearly_discount_percentage',
                'stripe_price_id_monthly', 'stripe_price_id_yearly', 'stripe_product_id'
            )
        }),
        ('Limits', {
            'fields': (
                'max_workflows', 'max_executions_per_month', 'max_nodes_per_workflow',
                'max_active_workflows', 'max_ai_requests_per_month', 'max_storage_mb',
                'max_team_members'
            )
        }),
        ('Features', {
            'fields': (
                'has_ai_features', 'has_marketplace_access', 'has_marketplace_publish',
                'has_whatsapp_integration', 'has_advanced_analytics',
                'has_priority_support', 'has_whitelabel', 'has_api_access',
                'has_custom_domain', 'has_team_collaboration', 'features'
            )
        }),
        ('Display Settings', {
            'fields': ('is_popular', 'is_active', 'display_order')
        }),
        ('Trial', {
            'fields': ('trial_days',)
        })
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'plan', 'status', 'billing_cycle',
        'payment_method', 'current_period_end',
        'cancel_at_period_end', 'created_at'
    ]
    list_filter = ['status', 'billing_cycle', 'payment_method', 'cancel_at_period_end']
    search_fields = ['user__username', 'user__email', 'stripe_subscription_id', 'stripe_customer_id']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    fieldsets = (
        ('User & Plan', {
            'fields': ('user', 'plan')
        }),
        ('Stripe', {
            'fields': ('stripe_subscription_id', 'stripe_customer_id')
        }),
        ('Billing', {
            'fields': ('billing_cycle', 'status', 'payment_method')
        }),
        ('Periods', {
            'fields': (
                'trial_ends_at', 'current_period_start',
                'current_period_end', 'cancel_at_period_end', 'canceled_at'
            )
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at')
        })
    )


@admin.register(UsageMetrics)
class UsageMetricsAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'month', 'workflows_count', 'active_workflows_count',
        'executions_count', 'ai_requests_count', 'storage_used_mb'
    ]
    list_filter = ['month']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-month', 'user']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number', 'subscription', 'amount',
        'amount_paid', 'amount_due', 'status',
        'payment_method', 'created_at'
    ]
    list_filter = ['status', 'payment_method']
    search_fields = ['invoice_number', 'stripe_invoice_id', 'subscription__user__username']
    readonly_fields = ['invoice_number', 'created_at', 'updated_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Subscription', {
            'fields': ('subscription',)
        }),
        ('Stripe', {
            'fields': ('stripe_invoice_id', 'stripe_hosted_invoice_url', 'stripe_invoice_pdf')
        }),
        ('Invoice Details', {
            'fields': (
                'invoice_number', 'amount', 'amount_paid', 'amount_due',
                'tax_percent', 'tax_amount', 'status'
            )
        }),
        ('Dates', {
            'fields': (
                'period_start', 'period_end', 'due_date', 'paid_at'
            )
        }),
        ('Payment', {
            'fields': ('payment_method',)
        }),
        ('Metadata', {
            'fields': ('description', 'metadata', 'created_at', 'updated_at')
        })
    )


@admin.register(PaymentMethodRecord)
class PaymentMethodRecordAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'payment_type', 'card_brand', 'card_last4',
        'is_default', 'is_active', 'created_at'
    ]
    list_filter = ['payment_type', 'is_default', 'is_active']
    search_fields = ['user__username', 'user__email', 'stripe_payment_method_id']
    ordering = ['-is_default', '-created_at']


@admin.register(BillingEvent)
class BillingEventAdmin(admin.ModelAdmin):
    list_display = [
        'event_type', 'subscription', 'processed',
        'stripe_event_id', 'created_at'
    ]
    list_filter = ['event_type', 'processed']
    search_fields = ['event_type', 'stripe_event_id']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
