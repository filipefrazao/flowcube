from django.contrib import admin
from .models import (
    PixIntegration, BankConnection, PixTransaction,
    PaymentReconciliation, PixWebhookLog
)


@admin.register(PixIntegration)
class PixIntegrationAdmin(admin.ModelAdmin):
    list_display = ['name', 'bank_code', 'is_active', 'auto_reconcile', 'created_at']
    list_filter = ['bank_code', 'is_active', 'auto_reconcile']
    search_fields = ['name', 'bank_code']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'bank_code', 'api_endpoint', 'is_active')
        }),
        ('Configurações', {
            'fields': ('webhook_secret', 'auto_reconcile')
        }),
        ('Credenciais (Criptografadas)', {
            'fields': ('api_credentials',),
            'description': 'Credenciais são armazenadas de forma criptografada'
        }),
        ('Datas', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(BankConnection)
class BankConnectionAdmin(admin.ModelAdmin):
    list_display = ['bank_name', 'integration', 'status', 'last_check', 'created_at']
    list_filter = ['status', 'integration__bank_code']
    search_fields = ['bank_name', 'integration__name']
    readonly_fields = ['created_at', 'updated_at', 'last_check']


@admin.register(PixTransaction)
class PixTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'external_id', 'integration', 'amount', 'status',
        'reconciliation_status', 'payer_name', 'created_at', 'paid_at'
    ]
    list_filter = ['status', 'reconciliation_status', 'integration__bank_code', 'created_at']
    search_fields = ['external_id', 'txid', 'payer_name', 'payer_document']
    readonly_fields = ['created_at', 'updated_at', 'paid_at']
    
    fieldsets = (
        ('Integração', {
            'fields': ('integration',)
        }),
        ('Identificação', {
            'fields': ('external_id', 'txid')
        }),
        ('QR Code', {
            'fields': ('qr_code', 'qr_code_image')
        }),
        ('Valores', {
            'fields': ('amount', 'original_amount')
        }),
        ('Pagador', {
            'fields': ('payer_name', 'payer_document', 'payer_info')
        }),
        ('Status', {
            'fields': ('status', 'reconciliation_status')
        }),
        ('Informações Adicionais', {
            'fields': ('description', 'metadata')
        }),
        ('Datas', {
            'fields': ('created_at', 'paid_at', 'expires_at', 'updated_at')
        }),
    )
    
    actions = ['mark_as_paid', 'mark_as_expired']
    
    def mark_as_paid(self, request, queryset):
        updated = queryset.update(status='PAID')
        self.message_user(request, f'{updated} transações marcadas como pagas.')
    mark_as_paid.short_description = 'Marcar como pago'
    
    def mark_as_expired(self, request, queryset):
        updated = queryset.update(status='EXPIRED')
        self.message_user(request, f'{updated} transações marcadas como expiradas.')
    mark_as_expired.short_description = 'Marcar como expirado'


@admin.register(PaymentReconciliation)
class PaymentReconciliationAdmin(admin.ModelAdmin):
    list_display = [
        'transaction', 'invoice_id', 'order_id', 'matched_amount',
        'confidence_score', 'status', 'reconciled_at', 'confirmed_at'
    ]
    list_filter = ['status', 'reconciled_at', 'confirmed_at']
    search_fields = ['invoice_id', 'order_id', 'customer_id', 'transaction__external_id']
    readonly_fields = ['reconciled_at', 'confirmed_at']
    
    fieldsets = (
        ('Transação', {
            'fields': ('transaction',)
        }),
        ('Referências', {
            'fields': ('invoice_id', 'order_id', 'customer_id')
        }),
        ('Match', {
            'fields': ('matched_amount', 'confidence_score', 'match_criteria')
        }),
        ('Status', {
            'fields': ('status', 'reconciled_at', 'confirmed_at')
        }),
        ('Observações', {
            'fields': ('notes',)
        }),
    )
    
    actions = ['confirm_reconciliations']
    
    def confirm_reconciliations(self, request, queryset):
        for reconciliation in queryset:
            reconciliation.confirm()
        self.message_user(request, f'{queryset.count()} reconciliações confirmadas.')
    confirm_reconciliations.short_description = 'Confirmar reconciliações'


@admin.register(PixWebhookLog)
class PixWebhookLogAdmin(admin.ModelAdmin):
    list_display = ['integration', 'event_type', 'processed', 'received_at', 'processed_at']
    list_filter = ['processed', 'event_type', 'integration__bank_code', 'received_at']
    search_fields = ['event_type', 'integration__name']
    readonly_fields = ['received_at', 'processed_at']
    
    fieldsets = (
        ('Integração', {
            'fields': ('integration',)
        }),
        ('Evento', {
            'fields': ('event_type', 'payload', 'headers')
        }),
        ('Processamento', {
            'fields': ('processed', 'processed_at', 'error')
        }),
        ('Datas', {
            'fields': ('received_at',)
        }),
    )
