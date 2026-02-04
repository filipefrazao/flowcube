# FlowCube - SaaS Billing & Monetization System

## Implementation Summary

Sistema completo de monetização SaaS implementado no FlowCube com 4 tiers de planos, usage tracking, billing via Stripe, e upgrade prompts contextuais.

---

## Backend Implementation

### 📁 App Structure

```
backend/billing/
├── __init__.py
├── admin.py                    # Django admin configuration
├── apps.py                     # App configuration
├── models.py                   # Database models
├── serializers.py              # DRF serializers
├── views.py                    # API views
├── urls.py                     # URL routing
├── services.py                 # Business logic (Stripe, Usage tracking)
├── signals.py                  # Django signals
├── middleware.py               # Middleware for limit enforcement
├── migrations/
│   └── __init__.py
└── management/
    └── commands/
        └── seed_plans.py       # Seed initial plans
```

---

## Models

### 1. Plan
Defines available SaaS plans with pricing and limits.

**Fields:**
- `tier`: FREE, STARTER, PRO, ENTERPRISE
- `price_monthly` / `price_yearly`: Pricing
- `max_workflows`: Workflow creation limit
- `max_executions_per_month`: Monthly execution limit
- `max_ai_requests_per_month`: AI requests limit
- `max_storage_mb`: Storage limit
- `max_team_members`: Team size limit
- Feature flags: `has_ai_features`, `has_marketplace_publish`, `has_whatsapp_integration`, etc.

### 2. Subscription
User's active subscription.

**Fields:**
- `user`: OneToOne to User
- `plan`: ForeignKey to Plan
- `stripe_subscription_id` / `stripe_customer_id`: Stripe integration
- `billing_cycle`: MONTHLY or YEARLY
- `status`: ACTIVE, TRIALING, PAST_DUE, CANCELED, etc.
- `trial_ends_at`: Trial period expiration
- `current_period_start` / `current_period_end`: Billing periods

**Properties:**
- `is_active`: Check if subscription is active
- `is_trial`: Check if in trial period
- `days_until_renewal`: Days until next billing

**Methods:**
- `check_limit(limit_type, current_value)`: Check if limit exceeded

### 3. UsageMetrics
Tracks monthly usage per user.

**Fields:**
- `user`: ForeignKey to User
- `month`: Date (first day of month)
- `workflows_count`: Total workflows created
- `active_workflows_count`: Active workflows
- `executions_count`: Monthly executions
- `ai_requests_count`: AI requests made
- `ai_tokens_used`: AI tokens consumed
- `storage_used_mb`: Storage used
- `whatsapp_messages_sent` / `api_requests_count`: Integration metrics

**Methods:**
- `get_current_month(user)`: Get or create current month metrics
- `check_limits()`: Check all plan limits

### 4. Invoice
Generated invoices for billing.

**Fields:**
- `subscription`: ForeignKey to Subscription
- `stripe_invoice_id` / `stripe_hosted_invoice_url` / `stripe_invoice_pdf`: Stripe data
- `invoice_number`: Auto-generated (INV-YYYYMM-00001)
- `amount` / `amount_paid` / `amount_due`: Amounts
- `status`: DRAFT, OPEN, PAID, VOID, UNCOLLECTIBLE
- `period_start` / `period_end`: Billing period
- `payment_method`: CREDIT_CARD, PIX, BOLETO

### 5. PaymentMethodRecord
Saved payment methods.

**Fields:**
- `user`: ForeignKey to User
- `payment_type`: CREDIT_CARD, PIX, BOLETO
- `stripe_payment_method_id`: Stripe ID
- `card_last4` / `card_brand` / `card_exp_month` / `card_exp_year`: Card info
- `pix_key` / `pix_key_type`: Pix info
- `is_default`: Default payment method flag

### 6. BillingEvent
Webhook event logs.

**Fields:**
- `subscription`: ForeignKey to Subscription
- `event_type`: Event name
- `event_data`: JSON payload
- `stripe_event_id`: Stripe event ID
- `processed`: Processing status
- `error_message`: Error details

---

## Services

### StripeService

**Methods:**
- `create_customer(user)`: Create Stripe customer
- `create_subscription(user, plan, billing_cycle, payment_method_id)`: Create subscription
- `upgrade_subscription(subscription, new_plan)`: Upgrade plan (with proration)
- `cancel_subscription(subscription, immediately=False)`: Cancel subscription
- `reactivate_subscription(subscription)`: Reactivate cancelled subscription
- `detach_payment_method(payment_method_id)`: Remove payment method
- `handle_webhook_event(event)`: Process Stripe webhooks

**Webhook Handlers:**
- `_handle_subscription_updated`: Sync subscription status
- `_handle_subscription_deleted`: Mark as cancelled
- `_handle_invoice_paid`: Create/update invoice
- `_handle_invoice_payment_failed`: Mark as past_due

### UsageTracker

**Methods:**
- `track_workflow_creation(user)`: Increment workflows count (checks limit)
- `track_workflow_execution(user)`: Increment executions count (checks limit)
- `track_ai_request(user, tokens_used)`: Increment AI requests (checks limit)
- `track_storage(user, mb_used)`: Update storage usage
- `check_feature_access(user, feature)`: Check if user has access to feature

**Raises:**
- `PermissionError`: When limit exceeded or feature not available

---

## API Endpoints

### Plans
- `GET /api/v1/billing/plans/`: List available plans
- `GET /api/v1/billing/plans/comparison/`: Get plans comparison table

### Subscriptions
- `GET /api/v1/billing/subscriptions/current/`: Get current user subscription
- `POST /api/v1/billing/subscriptions/create_subscription/`: Create new subscription
- `POST /api/v1/billing/subscriptions/{id}/upgrade/`: Upgrade plan
- `POST /api/v1/billing/subscriptions/{id}/cancel/`: Cancel subscription
- `POST /api/v1/billing/subscriptions/{id}/reactivate/`: Reactivate subscription

### Usage Metrics
- `GET /api/v1/billing/usage/`: List usage history
- `GET /api/v1/billing/usage/current/`: Get current month usage
- `GET /api/v1/billing/usage/check_limit/?type={limit_type}`: Check specific limit

### Invoices
- `GET /api/v1/billing/invoices/`: List invoices
- `GET /api/v1/billing/invoices/{id}/`: Get invoice details
- `GET /api/v1/billing/invoices/{id}/download_pdf/`: Get PDF download URL

### Payment Methods
- `GET /api/v1/billing/payment-methods/`: List payment methods
- `POST /api/v1/billing/payment-methods/`: Add payment method
- `POST /api/v1/billing/payment-methods/{id}/set_default/`: Set as default
- `POST /api/v1/billing/payment-methods/{id}/detach/`: Remove payment method

---

## Plan Tiers

### Free - $0/month
- ✅ 5 workflows
- ✅ 100 executions/month
- ✅ Up to 10 nodes per workflow
- ✅ Basic marketplace access
- ✅ Community support
- ❌ No AI features
- ❌ No WhatsApp integration
- ❌ No API access

### Starter - $29/month ($278.40/year)
- ✅ 50 workflows
- ✅ 10,000 executions/month
- ✅ Up to 50 nodes per workflow
- ✅ WhatsApp integration
- ✅ Marketplace publishing
- ✅ API access
- ✅ Team collaboration (up to 3 members)
- ✅ 14-day free trial
- ❌ No AI features

### Pro - $99/month ($950.40/year) ⭐ Most Popular
- ✅ Unlimited workflows
- ✅ 100,000 executions/month
- ✅ Unlimited nodes per workflow
- ✅ AI Node Builder
- ✅ AI Debugger
- ✅ AI Assistant (1,000 requests/month)
- ✅ WhatsApp integration
- ✅ Advanced analytics
- ✅ Custom domain
- ✅ API access
- ✅ Team collaboration (up to 10 members)
- ✅ Priority support
- ✅ 14-day free trial

### Enterprise - $499/month ($4,790.40/year)
- ✅ Everything in Pro
- ✅ Unlimited executions
- ✅ Unlimited AI requests
- ✅ Unlimited storage
- ✅ White label
- ✅ Dedicated support
- ✅ Custom integrations
- ✅ SLA guarantee
- ✅ Unlimited team members
- ✅ Advanced security
- ✅ Custom contracts
- ✅ 30-day free trial

---

## Middleware & Decorators

### PlanLimitMiddleware
Adds `request.subscription` and `request.plan` to all requests for easy access.

### @require_feature(feature_name)
Decorator for views that require specific features.

**Usage:**
```python
@require_feature('has_ai_features')
def my_ai_view(request):
    # Only accessible to Pro/Enterprise users
    ...
```

### @track_usage(usage_type)
Decorator for tracking usage and enforcing limits.

**Usage:**
```python
@track_usage('workflow_execution')
def execute_workflow(request):
    # Tracks execution and checks limit before running
    ...
```

**Usage Types:**
- `workflow_creation`
- `workflow_execution`
- `ai_request`

---

## Signals

### User Post-Save Signal
Automatically creates:
1. Free plan subscription for new users
2. Initial UsageMetrics record

### Subscription Post-Save Signal
Initializes UsageMetrics for new subscriptions.

---

## Management Commands

### seed_plans
Populates database with initial 4 plans.

**Usage:**
```bash
python manage.py seed_plans
```

**Output:**
- Creates or updates Free, Starter, Pro, Enterprise plans
- Sets pricing, limits, and features
- Configures display order and popular flag

---

## Configuration

### Settings (backend/flowcube_project/settings.py)

```python
INSTALLED_APPS = [
    ...
    "billing",  # SaaS billing & subscriptions
]

# Stripe Configuration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.environ.get("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
```

### URLs (backend/flowcube_project/urls.py)

```python
urlpatterns = [
    ...
    path("api/v1/billing/", include("billing.urls")),
]
```

### Requirements (backend/requirements.txt)

```
stripe>=11.0.0
```

---

## Environment Variables

Required environment variables:

```bash
# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe (Test)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Next Steps - Frontend

### 1. Pricing Page (`src/app/pricing/page.tsx`)
- Display 4 plan cards
- Comparison table
- Monthly/Yearly toggle (20% discount)
- FAQ section
- CTA buttons

### 2. Billing Portal (`src/app/billing/page.tsx`)
- Current plan overview
- Usage stats with progress bars
- Upgrade/downgrade buttons
- Payment method management
- Invoice history
- Cancel subscription

### 3. Upgrade Prompts (`src/components/UpgradePrompt.tsx`)
- Contextual prompts when limits reached
- Modal with plan comparison
- Direct upgrade CTA
- Display in:
  - Workflow editor (when creating new workflow)
  - Execution results (when execution limit reached)
  - AI features (when not available on plan)

### 4. Hooks
- `useSubscription.ts`: Fetch and manage subscription
- `useUsage.ts`: Fetch usage metrics
- `useBilling.ts`: Billing operations (upgrade, cancel, etc.)

---

## Deployment Checklist

### Database
- [ ] Run migrations: `python manage.py makemigrations billing`
- [ ] Apply migrations: `python manage.py migrate`
- [ ] Seed plans: `python manage.py seed_plans`

### Stripe
- [ ] Create Stripe account
- [ ] Create products and prices for each plan tier
- [ ] Update Plan model with Stripe product/price IDs
- [ ] Configure webhook endpoint
- [ ] Test webhook events

### Environment
- [ ] Set Stripe environment variables
- [ ] Restart backend service
- [ ] Test API endpoints

### Testing
- [ ] Test subscription creation
- [ ] Test plan upgrade/downgrade
- [ ] Test usage tracking
- [ ] Test limit enforcement
- [ ] Test webhook processing
- [ ] Test invoice generation

---

## Status: ✅ Backend Complete

**Implemented:**
- ✅ All Django models (Plan, Subscription, UsageMetrics, Invoice, PaymentMethodRecord, BillingEvent)
- ✅ Complete Stripe integration (StripeService)
- ✅ Usage tracking and limit enforcement (UsageTracker)
- ✅ REST API endpoints (DRF viewsets)
- ✅ Admin interface
- ✅ Signals for automatic subscription creation
- ✅ Middleware and decorators
- ✅ Management command for seeding plans
- ✅ Configuration in settings.py and urls.py
- ✅ Stripe dependency added to requirements.txt

**Pending:**
- ⏳ Frontend implementation (Pricing Page, Billing Portal, Upgrade Prompts)
- ⏳ Database migrations
- ⏳ Stripe product/price creation
- ⏳ Webhook configuration
- ⏳ Testing

**Files Location:**
```
/mnt/HC_Volume_104489558/flowcube/backend/billing/
```

---

**Implementation Date:** February 4, 2026
**Author:** Claude Sonnet 4.5 + Filipe Frazão
