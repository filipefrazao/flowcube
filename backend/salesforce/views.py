from rest_framework import viewsets, permissions
from salesforce.models import SalesforceCredential, SalesCubeSyncState
from salesforce.serializers import (
    SalesforceCredentialSerializer,
    SalesforceCredentialWriteSerializer,
    SalesCubeSyncStateSerializer,
)


class SalesforceCredentialViewSet(viewsets.ModelViewSet):
    queryset = SalesforceCredential.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return SalesforceCredentialWriteSerializer
        return SalesforceCredentialSerializer


class SalesCubeSyncStateViewSet(viewsets.ModelViewSet):
    queryset = SalesCubeSyncState.objects.all()
    serializer_class = SalesCubeSyncStateSerializer
    permission_classes = [permissions.IsAuthenticated]
