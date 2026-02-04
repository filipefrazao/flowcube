from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q, Avg, F
from django.utils import timezone
from datetime import timedelta
from .models import (
    PixIntegration, BankConnection, PixTransaction, 
    PaymentReconciliation, PixWebhookLog
)
from .serializers import (
    PixIntegrationSerializer, PixIntegrationCreateSerializer,
    BankConnectionSerializer, PixTransactionSerializer,
    PixTransactionCreateSerializer, PaymentReconciliationSerializer,
    PixWebhookLogSerializer, PixDashboardSerializer,
    ReconcilePaymentSerializer
)
from .services import BankClientFactory
import logging

logger = logging.getLogger(__name__)


class PixIntegrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar integrações Pix
    """
    queryset = PixIntegration.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PixIntegrationCreateSerializer
        return PixIntegrationSerializer
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Testa conexão com o banco"""
        integration = self.get_object()
        
        try:
            client = BankClientFactory.create_client(
                integration.bank_code,
                integration.get_credentials(),
                integration.api_endpoint
            )
            
            success = client.authenticate()
            
            # Atualizar ou criar conexão
            connection, created = BankConnection.objects.get_or_create(
                integration=integration,
                bank_name=integration.get_bank_code_display()
            )
            
            connection.status = 'CONNECTED' if success else 'ERROR'
            connection.last_check = timezone.now()
            connection.error_message = '' if success else 'Falha na autenticação'
            connection.save()
            
            return Response({
                'success': success,
                'message': 'Conexão bem-sucedida' if success else 'Falha na conexão',
                'connection': BankConnectionSerializer(connection).data
            })
            
        except Exception as e:
            logger.error(f'Erro ao testar conexão: {str(e)}')
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BankConnectionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para visualizar conexões bancárias
    """
    queryset = BankConnection.objects.all()
    serializer_class = BankConnectionSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def status_summary(self, request):
        """Retorna resumo de status das conexões"""
        summary = BankConnection.objects.values('status').annotate(
            count=Count('id')
        )
        
        return Response({
            'summary': list(summary),
            'total': BankConnection.objects.count()
        })


class PixTransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar transações Pix
    """
    queryset = PixTransaction.objects.select_related('integration').all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PixTransactionCreateSerializer
        return PixTransactionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros
        status_filter = self.request.query_params.get('status')
        reconciliation_status = self.request.query_params.get('reconciliation_status')
        integration_id = self.request.query_params.get('integration_id')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if reconciliation_status:
            queryset = queryset.filter(reconciliation_status=reconciliation_status)
        
        if integration_id:
            queryset = queryset.filter(integration_id=integration_id)
        
        return queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Cria nova transação (gera QR Code)"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        integration = serializer.validated_data['integration']
        
        try:
            # Criar cliente bancário
            client = BankClientFactory.create_client(
                integration.bank_code,
                integration.get_credentials(),
                integration.api_endpoint
            )
            
            # Gerar QR Code
            result = client.generate_qr_code(
                amount=float(serializer.validated_data['amount']),
                description=serializer.validated_data.get('description', ''),
                expiration_minutes=60,
                metadata=serializer.validated_data.get('metadata', {})
            )
            
            if not result.get('success'):
                return Response({
                    'error': result.get('error', 'Erro ao gerar QR Code')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Criar transação
            transaction = PixTransaction.objects.create(
                integration=integration,
                external_id=result['external_id'],
                txid=result['txid'],
                qr_code=result['qr_code'],
                qr_code_image=result.get('qr_code_image', ''),
                amount=serializer.validated_data['amount'],
                original_amount=serializer.validated_data['amount'],
                payer_name=serializer.validated_data.get('payer_name', ''),
                payer_document=serializer.validated_data.get('payer_document', ''),
                description=serializer.validated_data.get('description', ''),
                expires_at=result.get('expires_at'),
                metadata=serializer.validated_data.get('metadata', {})
            )
            
            return Response(
                PixTransactionSerializer(transaction).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f'Erro ao criar transação: {str(e)}')
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def check_status(self, request, pk=None):
        """Verifica status da transação no banco"""
        transaction = self.get_object()
        
        try:
            client = BankClientFactory.create_client(
                transaction.integration.bank_code,
                transaction.integration.get_credentials(),
                transaction.integration.api_endpoint
            )
            
            result = client.check_payment_status(transaction.external_id)
            
            # Atualizar transação
            if result.get('status'):
                transaction.status = result['status']
                
                if result['status'] == 'PAID' and result.get('paid_at'):
                    transaction.paid_at = result['paid_at']
                
                if result.get('payer_info'):
                    transaction.payer_info = result['payer_info']
                
                transaction.save()
            
            return Response({
                'success': True,
                'transaction': PixTransactionSerializer(transaction).data
            })
            
        except Exception as e:
            logger.error(f'Erro ao verificar status: {str(e)}')
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Lista transações pendentes"""
        transactions = self.get_queryset().filter(status='PENDING')
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def not_reconciled(self, request):
        """Lista transações não reconciliadas"""
        transactions = self.get_queryset().filter(
            status='PAID',
            reconciliation_status='NOT_RECONCILED'
        )
        serializer = self.get_serializer(transactions, many=True)
        return Response(serializer.data)


class PaymentReconciliationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para reconciliação de pagamentos
    """
    queryset = PaymentReconciliation.objects.select_related('transaction').all()
    serializer_class = PaymentReconciliationSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def reconcile(self, request):
        """Reconcilia um pagamento com fatura/pedido"""
        serializer = ReconcilePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            transaction = PixTransaction.objects.get(id=serializer.validated_data['transaction_id'])
            
            if transaction.status != 'PAID':
                return Response({
                    'error': 'Transação ainda não está paga'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Criar reconciliação
            reconciliation = PaymentReconciliation.objects.create(
                transaction=transaction,
                invoice_id=serializer.validated_data.get('invoice_id', ''),
                order_id=serializer.validated_data.get('order_id', ''),
                customer_id=serializer.validated_data.get('customer_id', ''),
                matched_amount=transaction.amount,
                confidence_score=1.0,  # Manual = 100% confiança
                match_criteria={'type': 'manual'},
                status='MATCHED',
                notes=serializer.validated_data.get('notes', '')
            )
            
            # Auto-confirmar se solicitado
            if serializer.validated_data.get('auto_confirm'):
                reconciliation.confirm()
            
            return Response({
                'success': True,
                'reconciliation': PaymentReconciliationSerializer(reconciliation).data
            })
            
        except PixTransaction.DoesNotExist:
            return Response({
                'error': 'Transação não encontrada'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f'Erro ao reconciliar: {str(e)}')
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirma uma reconciliação"""
        reconciliation = self.get_object()
        reconciliation.confirm()
        
        return Response({
            'success': True,
            'reconciliation': self.get_serializer(reconciliation).data
        })


class PixWebhookViewSet(viewsets.GenericViewSet):
    """
    ViewSet para receber webhooks dos bancos
    """
    
    @action(detail=False, methods=['post'], permission_classes=[])
    def receive(self, request):
        """Recebe webhook de notificação bancária"""
        
        # Identificar integração pelo header ou query param
        integration_id = request.query_params.get('integration_id')
        
        if not integration_id:
            return Response({
                'error': 'integration_id não fornecido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            integration = PixIntegration.objects.get(id=integration_id)
            
            # Validar webhook secret (se configurado)
            webhook_secret = request.headers.get('X-Webhook-Secret')
            if integration.webhook_secret and webhook_secret != integration.webhook_secret:
                return Response({
                    'error': 'Webhook secret inválido'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Criar log
            webhook_log = PixWebhookLog.objects.create(
                integration=integration,
                event_type=request.data.get('event_type', 'unknown'),
                payload=request.data,
                headers=dict(request.headers)
            )
            
            # Processar webhook de forma assíncrona (pode usar Celery)
            # Por enquanto, processamento síncrono simples
            self._process_webhook(webhook_log)
            
            return Response({
                'success': True,
                'message': 'Webhook recebido'
            })
            
        except PixIntegration.DoesNotExist:
            return Response({
                'error': 'Integração não encontrada'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f'Erro ao processar webhook: {str(e)}')
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _process_webhook(self, webhook_log):
        """Processa webhook"""
        try:
            payload = webhook_log.payload
            event_type = webhook_log.event_type
            
            if event_type == 'pix.payment.received':
                # Atualizar transação
                external_id = payload.get('transaction_id')
                
                if external_id:
                    transaction = PixTransaction.objects.filter(external_id=external_id).first()
                    
                    if transaction:
                        transaction.mark_as_paid()
                        transaction.payer_info = payload.get('payer', {})
                        transaction.save()
            
            webhook_log.processed = True
            webhook_log.processed_at = timezone.now()
            webhook_log.save()
            
        except Exception as e:
            webhook_log.error = str(e)
            webhook_log.save()
            logger.error(f'Erro ao processar webhook {webhook_log.id}: {str(e)}')


class PixDashboardViewSet(viewsets.GenericViewSet):
    """
    ViewSet para métricas e dashboard
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Retorna métricas de fluxo de caixa"""
        
        # Período (últimos 30 dias por padrão)
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        transactions = PixTransaction.objects.filter(created_at__gte=start_date)
        
        # Métricas gerais
        total_transactions = transactions.count()
        total_paid = transactions.filter(status='PAID').count()
        total_pending = transactions.filter(status='PENDING').count()
        total_expired = transactions.filter(status='EXPIRED').count()
        
        # Valores
        total_amount = transactions.aggregate(total=Sum('amount'))['total'] or 0
        paid_amount = transactions.filter(status='PAID').aggregate(total=Sum('amount'))['total'] or 0
        pending_amount = transactions.filter(status='PENDING').aggregate(total=Sum('amount'))['total'] or 0
        
        # Reconciliação
        reconciled_count = transactions.filter(reconciliation_status='RECONCILED').count()
        not_reconciled_count = transactions.filter(
            status='PAID',
            reconciliation_status='NOT_RECONCILED'
        ).count()
        
        # Tempo médio de pagamento
        paid_transactions = transactions.filter(status='PAID', paid_at__isnull=False)
        avg_payment_time = None
        
        if paid_transactions.exists():
            avg_payment_time = paid_transactions.aggregate(
                avg=Avg(F('paid_at') - F('created_at'))
            )['avg']
        
        # Estatísticas diárias
        daily_stats = []
        for i in range(days):
            day = timezone.now() - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            day_transactions = transactions.filter(
                created_at__gte=day_start,
                created_at__lt=day_end
            )
            
            daily_stats.append({
                'date': day_start.date().isoformat(),
                'total': day_transactions.count(),
                'paid': day_transactions.filter(status='PAID').count(),
                'amount': float(day_transactions.aggregate(total=Sum('amount'))['total'] or 0)
            })
        
        daily_stats.reverse()
        
        data = {
            'total_transactions': total_transactions,
            'total_paid': total_paid,
            'total_pending': total_pending,
            'total_expired': total_expired,
            'total_amount': float(total_amount),
            'paid_amount': float(paid_amount),
            'pending_amount': float(pending_amount),
            'reconciled_count': reconciled_count,
            'not_reconciled_count': not_reconciled_count,
            'avg_payment_time': avg_payment_time,
            'daily_stats': daily_stats
        }
        
        serializer = PixDashboardSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data)
