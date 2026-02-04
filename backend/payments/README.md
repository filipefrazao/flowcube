# Central de Integracao Pix Inteligente

Sistema completo de integracao com APIs bancarias Pix.

## Funcionalidades

- Integracao multi-banco (Itau, Bradesco, Nubank, etc)
- Geracao de QR codes Pix dinamicos
- Reconciliacao automatica de pagamentos
- Dashboard com metricas de fluxo de caixa
- Webhooks para notificacoes bancarias
- Credenciais criptografadas

## Endpoints Principais

POST /api/v1/pix/integrations/ - Criar integracao
POST /api/v1/pix/transactions/ - Gerar QR Code
GET /api/v1/pix/transactions/pending/ - Transacoes pendentes
POST /api/v1/pix/reconciliations/reconcile/ - Reconciliar
GET /api/v1/pix/dashboard/metrics/ - Dashboard

## Estrutura

- models.py: PixIntegration, BankConnection, PixTransaction, PaymentReconciliation
- serializers.py: Serializers para API REST
- views.py: ViewSets para endpoints
- services.py: Clientes de API bancaria (ItauPixClient, etc)
- admin.py: Interface administrativa Django
