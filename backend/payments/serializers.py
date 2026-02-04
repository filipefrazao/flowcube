from rest_framework import serializers
from .models import PixIntegration, BankConnection, PixTransaction, PaymentReconciliation, PixWebhookLog


class PixIntegrationSerializer(serializers.ModelSerializer):
    """Serializer para PixIntegration"""
    bank_name = serializers.CharField(source='get_bank_code_display', read_only=True)
    connections_count = serializers.SerializerMethodField()
    transactions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PixIntegration
        fields = [
            'id', 'name', 'bank_code', 'bank_name', 'api_endpoint', 
            'is_active', 'auto_reconcile', 'created_at', 'updated_at',
            'connections_count', 'transactions_count'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_connections_count(self, obj):
        return obj.connections.count()
    
    def get_transactions_count(self, obj):
        return obj.transactions.count()


class PixIntegrationCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar integração com credenciais"""
    credentials = serializers.JSONField(write_only=True)
    
    class Meta:
        model = PixIntegration
        fields = [
            'id', 'name', 'bank_code', 'api_endpoint', 'is_active', 
            'auto_reconcile', 'webhook_secret', 'credentials'
        ]
    
    def create(self, validated_data):
        credentials = validated_data.pop('credentials')
        integration = PixIntegration(**validated_data)
        integration.set_credentials(credentials)
        integration.save()
        return integration


class BankConnectionSerializer(serializers.ModelSerializer):
    """Serializer para BankConnection"""
    integration_name = serializers.CharField(source='integration.name', read_only=True)
    bank_code = serializers.CharField(source='integration.bank_code', read_only=True)
    
    class Meta:
        model = BankConnection
        fields = [
            'id', 'integration', 'integration_name', 'bank_code',
            'bank_name', 'status', 'last_check', 'error_message',
            'connection_metadata', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_check']


class PixTransactionSerializer(serializers.ModelSerializer):
    """Serializer para PixTransaction"""
    integration_name = serializers.CharField(source='integration.name', read_only=True)
    bank_name = serializers.CharField(source='integration.get_bank_code_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reconciliation_status_display = serializers.CharField(source='get_reconciliation_status_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PixTransaction
        fields = [
            'id', 'integration', 'integration_name', 'bank_name',
            'external_id', 'txid', 'qr_code', 'qr_code_image',
            'amount', 'original_amount', 'payer_info', 'payer_name',
            'payer_document', 'status', 'status_display',
            'reconciliation_status', 'reconciliation_status_display',
            'description', 'metadata', 'created_at', 'paid_at',
            'expires_at', 'updated_at', 'is_expired'
        ]
        read_only_fields = ['created_at', 'updated_at', 'paid_at']


class PixTransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar transação Pix (gerar QR Code)"""
    
    class Meta:
        model = PixTransaction
        fields = [
            'integration', 'amount', 'description', 'payer_name',
            'payer_document', 'expires_at', 'metadata'
        ]
    
    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('O valor deve ser maior que zero.')
        return value


class PaymentReconciliationSerializer(serializers.ModelSerializer):
    """Serializer para PaymentReconciliation"""
    transaction_details = PixTransactionSerializer(source='transaction', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentReconciliation
        fields = [
            'id', 'transaction', 'transaction_details', 'invoice_id',
            'order_id', 'customer_id', 'matched_amount', 'confidence_score',
            'match_criteria', 'status', 'status_display', 'reconciled_at',
            'confirmed_at', 'notes'
        ]
        read_only_fields = ['reconciled_at', 'confirmed_at']


class PixWebhookLogSerializer(serializers.ModelSerializer):
    """Serializer para PixWebhookLog"""
    integration_name = serializers.CharField(source='integration.name', read_only=True)
    
    class Meta:
        model = PixWebhookLog
        fields = [
            'id', 'integration', 'integration_name', 'event_type',
            'payload', 'headers', 'processed', 'error',
            'received_at', 'processed_at'
        ]
        read_only_fields = ['received_at', 'processed_at']


class PixDashboardSerializer(serializers.Serializer):
    """Serializer para métricas do dashboard"""
    total_transactions = serializers.IntegerField()
    total_paid = serializers.IntegerField()
    total_pending = serializers.IntegerField()
    total_expired = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    reconciled_count = serializers.IntegerField()
    not_reconciled_count = serializers.IntegerField()
    avg_payment_time = serializers.DurationField(allow_null=True)
    daily_stats = serializers.ListField(child=serializers.DictField())


class ReconcilePaymentSerializer(serializers.Serializer):
    """Serializer para reconciliar pagamento"""
    transaction_id = serializers.IntegerField()
    invoice_id = serializers.CharField(required=False, allow_blank=True)
    order_id = serializers.CharField(required=False, allow_blank=True)
    customer_id = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    auto_confirm = serializers.BooleanField(default=False)
