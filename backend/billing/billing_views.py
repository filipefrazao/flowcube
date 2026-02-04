from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta

from .models import (
    Plan, Subscription, UsageMetrics, Invoice,
    PaymentMethodRecord, BillingEvent
)
from .serializers import (
    PlanSerializer, SubscriptionSerializer, UsageMetricsSerializer,
    InvoiceSerializer, PaymentMethodRecordSerializer, BillingEventSerializer
)
from .services import StripeService, UsageTracker


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Planos disponíveis para assinatura
    """
    queryset = Plan.objects.filter(is_active=True)
    serializer_class = PlanSerializer
    permission_classes = []  # Public endpoint

    def get_queryset(self):
        return Plan.objects.filter(is_active=True).order_by('display_order')

    @action(detail=False, methods=['get'])
    def comparison(self, request):
        """
        Retorna comparação de planos formatada para pricing page
        """
        plans = self.get_queryset()
        serializer = self.get_serializer(plans, many=True)

        return Response({
            'plans': serializer.data,
            'features_comparison': self._build_features_comparison(plans)
        })

    def _build_features_comparison(self, plans):
        """Constrói matriz de comparação de features"""
        all_features = set()
        for plan in plans:
            all_features.update(plan.features)

        comparison = []
        for feature in all_features:
            feature_row = {'feature': feature, 'plans': {}}
            for plan in plans:
                feature_row['plans'][plan.tier] = feature in plan.features

            comparison.append(feature_row)

        return comparison


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    Gerenciamento de assinaturas
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Retorna assinatura atual do usuário
        """
        try:
            subscription = request.user.subscription
            serializer = self.get_serializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No active subscription'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def create_subscription(self, request):
        """
        Cria nova assinatura
        """
        plan_id = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        payment_method_id = request.data.get('payment_method_id')

        if not plan_id:
            return Response(
                {'error': 'plan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        plan = get_object_or_404(Plan, id=plan_id, is_active=True)

        try:
            # Create subscription via Stripe
            stripe_service = StripeService()
            subscription = stripe_service.create_subscription(
                user=request.user,
                plan=plan,
                billing_cycle=billing_cycle,
                payment_method_id=payment_method_id
            )

            serializer = self.get_serializer(subscription)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def upgrade(self, request, pk=None):
        """
        Upgrade de plano
        """
        subscription = self.get_object()
        new_plan_id = request.data.get('plan_id')

        if not new_plan_id:
            return Response(
                {'error': 'plan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_plan = get_object_or_404(Plan, id=new_plan_id, is_active=True)

        try:
            stripe_service = StripeService()
            updated_subscription = stripe_service.upgrade_subscription(
                subscription, new_plan
            )

            serializer = self.get_serializer(updated_subscription)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancela assinatura (no final do período)
        """
        subscription = self.get_object()
        cancel_immediately = request.data.get('immediately', False)

        try:
            stripe_service = StripeService()
            updated_subscription = stripe_service.cancel_subscription(
                subscription, immediately=cancel_immediately
            )

            serializer = self.get_serializer(updated_subscription)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reactivate(self, request, pk=None):
        """
        Reativa assinatura cancelada
        """
        subscription = self.get_object()

        if not subscription.cancel_at_period_end:
            return Response(
                {'error': 'Subscription is not cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            stripe_service = StripeService()
            updated_subscription = stripe_service.reactivate_subscription(subscription)

            serializer = self.get_serializer(updated_subscription)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class UsageMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Métricas de uso do usuário
    """
    serializer_class = UsageMetricsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UsageMetrics.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """
        Retorna métricas do mês atual
        """
        metrics = UsageMetrics.get_current_month(request.user)
        serializer = self.get_serializer(metrics)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def check_limit(self, request):
        """
        Verifica se um limite específico foi atingido
        """
        limit_type = request.query_params.get('type')
        if not limit_type:
            return Response(
                {'error': 'type parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subscription = request.user.subscription
            metrics = UsageMetrics.get_current_month(request.user)

            current_value_map = {
                'workflows': metrics.workflows_count,
                'executions': metrics.executions_count,
                'ai_requests': metrics.ai_requests_count,
                'storage': metrics.storage_used_mb,
            }

            current_value = current_value_map.get(limit_type, 0)
            is_within_limit, limit_value = subscription.check_limit(
                limit_type, current_value
            )

            return Response({
                'limit_type': limit_type,
                'current_value': current_value,
                'limit_value': limit_value,
                'is_within_limit': is_within_limit,
                'exceeded': not is_within_limit
            })

        except Subscription.DoesNotExist:
            return Response(
                {'error': 'No active subscription'},
                status=status.HTTP_404_NOT_FOUND
            )


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Faturas do usuário
    """
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            subscription = self.request.user.subscription
            return Invoice.objects.filter(subscription=subscription)
        except Subscription.DoesNotExist:
            return Invoice.objects.none()

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """
        Retorna URL para download do PDF da fatura
        """
        invoice = self.get_object()

        if not invoice.stripe_invoice_pdf:
            return Response(
                {'error': 'PDF not available'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'pdf_url': invoice.stripe_invoice_pdf
        })


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """
    Métodos de pagamento do usuário
    """
    serializer_class = PaymentMethodRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentMethodRecord.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """
        Define método de pagamento como padrão
        """
        payment_method = self.get_object()

        # Remove default de todos os outros
        PaymentMethodRecord.objects.filter(
            user=request.user,
            is_default=True
        ).update(is_default=False)

        # Define este como default
        payment_method.is_default = True
        payment_method.save()

        serializer = self.get_serializer(payment_method)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def detach(self, request, pk=None):
        """
        Remove método de pagamento
        """
        payment_method = self.get_object()

        try:
            stripe_service = StripeService()
            stripe_service.detach_payment_method(
                payment_method.stripe_payment_method_id
            )

            payment_method.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
