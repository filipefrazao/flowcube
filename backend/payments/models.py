from django.db import models
from django.utils import timezone
from cryptography.fernet import Fernet
from django.conf import settings
import json


class PixIntegration(models.Model):
    """
    Armazena configurações de integração com APIs bancárias Pix
    """
    BANK_CHOICES = [
        ('ITAU', 'Itaú'),
        ('BRADESCO', 'Bradesco'),
        ('SANTANDER', 'Santander'),
        ('NUBANK', 'Nubank'),
        ('BANCO_INTER', 'Banco Inter'),
        ('BANCO_DO_BRASIL', 'Banco do Brasil'),
        ('CAIXA', 'Caixa Econômica Federal'),
    ]
    
    name = models.CharField(max_length=100, verbose_name='Nome da Integração')
    bank_code = models.CharField(max_length=20, choices=BANK_CHOICES, verbose_name='Código do Banco')
    api_credentials = models.TextField(verbose_name='Credenciais API (Criptografadas)', help_text='JSON com client_id, client_secret, api_key, etc')
    api_endpoint = models.URLField(max_length=500, verbose_name='Endpoint da API')
    is_active = models.BooleanField(default=True, verbose_name='Ativo')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    # Configurações adicionais
    webhook_secret = models.CharField(max_length=255, blank=True, verbose_name='Webhook Secret')
    auto_reconcile = models.BooleanField(default=True, verbose_name='Reconciliação Automática')
    
    class Meta:
        verbose_name = 'Integração Pix'
        verbose_name_plural = 'Integrações Pix'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'{self.get_bank_code_display()} - {self.name}'
    
    def set_credentials(self, credentials_dict):
        """Criptografa e salva credenciais"""
        key = settings.SECRET_KEY.encode()[:32]  # Usar os primeiros 32 bytes da SECRET_KEY
        cipher = Fernet(key)
        credentials_json = json.dumps(credentials_dict)
        self.api_credentials = cipher.encrypt(credentials_json.encode()).decode()
    
    def get_credentials(self):
        """Descriptografa e retorna credenciais"""
        try:
            key = settings.SECRET_KEY.encode()[:32]
            cipher = Fernet(key)
            decrypted = cipher.decrypt(self.api_credentials.encode())
            return json.loads(decrypted.decode())
        except Exception as e:
            return {}


class BankConnection(models.Model):
    """
    Armazena status de conexão com cada banco
    """
    STATUS_CHOICES = [
        ('CONNECTED', 'Conectado'),
        ('DISCONNECTED', 'Desconectado'),
        ('ERROR', 'Erro'),
        ('PENDING', 'Pendente'),
    ]
    
    integration = models.ForeignKey(PixIntegration, on_delete=models.CASCADE, related_name='connections', verbose_name='Integração')
    bank_name = models.CharField(max_length=100, verbose_name='Nome do Banco')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name='Status')
    last_check = models.DateTimeField(null=True, blank=True, verbose_name='Última Verificação')
    error_message = models.TextField(blank=True, verbose_name='Mensagem de Erro')
    connection_metadata = models.JSONField(default=dict, blank=True, verbose_name='Metadados da Conexão')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    class Meta:
        verbose_name = 'Conexão Bancária'
        verbose_name_plural = 'Conexões Bancárias'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'{self.bank_name} - {self.get_status_display()}'


class PixTransaction(models.Model):
    """
    Armazena transações Pix (recebimentos)
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pendente'),
        ('PAID', 'Pago'),
        ('EXPIRED', 'Expirado'),
        ('CANCELLED', 'Cancelado'),
    ]
    
    RECONCILIATION_STATUS_CHOICES = [
        ('NOT_RECONCILED', 'Não Reconciliado'),
        ('RECONCILED', 'Reconciliado'),
        ('PARTIALLY_RECONCILED', 'Parcialmente Reconciliado'),
        ('ERROR', 'Erro na Reconciliação'),
    ]
    
    integration = models.ForeignKey(PixIntegration, on_delete=models.CASCADE, related_name='transactions', verbose_name='Integração')
    external_id = models.CharField(max_length=255, unique=True, verbose_name='ID Externo', help_text='ID da transação no banco')
    txid = models.CharField(max_length=255, blank=True, verbose_name='TxID', help_text='Transaction ID Pix')
    
    # Dados do QR Code
    qr_code = models.TextField(verbose_name='QR Code (Pix Copia e Cola)')
    qr_code_image = models.URLField(max_length=500, blank=True, verbose_name='URL da Imagem QR Code')
    
    # Valores
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Valor')
    original_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name='Valor Original')
    
    # Informações do pagador
    payer_info = models.JSONField(default=dict, verbose_name='Informações do Pagador', help_text='Nome, CPF/CNPJ, telefone, etc')
    payer_name = models.CharField(max_length=255, blank=True, verbose_name='Nome do Pagador')
    payer_document = models.CharField(max_length=20, blank=True, verbose_name='CPF/CNPJ do Pagador')
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name='Status')
    reconciliation_status = models.CharField(max_length=30, choices=RECONCILIATION_STATUS_CHOICES, default='NOT_RECONCILED', verbose_name='Status de Reconciliação')
    
    # Metadados
    description = models.TextField(blank=True, verbose_name='Descrição')
    metadata = models.JSONField(default=dict, blank=True, verbose_name='Metadados Adicionais')
    
    # Datas
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name='Pago em')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='Expira em')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Atualizado em')
    
    class Meta:
        verbose_name = 'Transação Pix'
        verbose_name_plural = 'Transações Pix'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['external_id']),
            models.Index(fields=['txid']),
            models.Index(fields=['status']),
            models.Index(fields=['reconciliation_status']),
            models.Index(fields=['payer_document']),
        ]
    
    def __str__(self):
        return f'Pix R$ {self.amount} - {self.get_status_display()}'
    
    def mark_as_paid(self):
        """Marca transação como paga"""
        self.status = 'PAID'
        self.paid_at = timezone.now()
        self.save()
    
    def is_expired(self):
        """Verifica se transação está expirada"""
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False


class PaymentReconciliation(models.Model):
    """
    Armazena reconciliações de pagamentos com faturas/pedidos
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pendente'),
        ('MATCHED', 'Match Encontrado'),
        ('CONFIRMED', 'Confirmado'),
        ('REJECTED', 'Rejeitado'),
    ]
    
    transaction = models.ForeignKey(PixTransaction, on_delete=models.CASCADE, related_name='reconciliations', verbose_name='Transação')
    
    # Referência ao pedido/fatura (pode ser integrado com outro sistema)
    invoice_id = models.CharField(max_length=255, blank=True, verbose_name='ID da Fatura')
    order_id = models.CharField(max_length=255, blank=True, verbose_name='ID do Pedido')
    customer_id = models.CharField(max_length=255, blank=True, verbose_name='ID do Cliente')
    
    # Dados da reconciliação
    matched_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='Valor Reconciliado')
    confidence_score = models.FloatField(default=0.0, verbose_name='Score de Confiança', help_text='0.0 a 1.0')
    match_criteria = models.JSONField(default=dict, verbose_name='Critérios de Match', help_text='Campos que deram match')
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name='Status')
    
    # Datas
    reconciled_at = models.DateTimeField(auto_now_add=True, verbose_name='Reconciliado em')
    confirmed_at = models.DateTimeField(null=True, blank=True, verbose_name='Confirmado em')
    
    # Observações
    notes = models.TextField(blank=True, verbose_name='Observações')
    
    class Meta:
        verbose_name = 'Reconciliação de Pagamento'
        verbose_name_plural = 'Reconciliações de Pagamentos'
        ordering = ['-reconciled_at']
        indexes = [
            models.Index(fields=['invoice_id']),
            models.Index(fields=['order_id']),
            models.Index(fields=['customer_id']),
        ]
    
    def __str__(self):
        return f'Reconciliação {self.transaction.external_id} - {self.get_status_display()}'
    
    def confirm(self):
        """Confirma a reconciliação"""
        self.status = 'CONFIRMED'
        self.confirmed_at = timezone.now()
        self.save()
        
        # Atualiza status da transação
        self.transaction.reconciliation_status = 'RECONCILED'
        self.transaction.save()


class PixWebhookLog(models.Model):
    """
    Log de webhooks recebidos dos bancos
    """
    integration = models.ForeignKey(PixIntegration, on_delete=models.CASCADE, related_name='webhook_logs', verbose_name='Integração')
    event_type = models.CharField(max_length=100, verbose_name='Tipo de Evento')
    payload = models.JSONField(verbose_name='Payload')
    headers = models.JSONField(default=dict, verbose_name='Headers')
    processed = models.BooleanField(default=False, verbose_name='Processado')
    error = models.TextField(blank=True, verbose_name='Erro')
    received_at = models.DateTimeField(auto_now_add=True, verbose_name='Recebido em')
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name='Processado em')
    
    class Meta:
        verbose_name = 'Log de Webhook Pix'
        verbose_name_plural = 'Logs de Webhooks Pix'
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['event_type']),
            models.Index(fields=['processed']),
        ]
    
    def __str__(self):
        return f'{self.event_type} - {self.received_at}'
