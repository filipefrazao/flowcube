from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PixIntegrationViewSet,
    BankConnectionViewSet,
    PixTransactionViewSet,
    PaymentReconciliationViewSet,
    PixWebhookViewSet,
    PixDashboardViewSet
)

router = DefaultRouter()
router.register(r'integrations', PixIntegrationViewSet, basename='pixintegration')
router.register(r'connections', BankConnectionViewSet, basename='bankconnection')
router.register(r'transactions', PixTransactionViewSet, basename='pixtransaction')
router.register(r'reconciliations', PaymentReconciliationViewSet, basename='paymentreconciliation')
router.register(r'webhook', PixWebhookViewSet, basename='pixwebhook')
router.register(r'dashboard', PixDashboardViewSet, basename='pixdashboard')

urlpatterns = [
    path('', include(router.urls)),
]
