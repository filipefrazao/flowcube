from rest_framework import serializers
from salesforce.models import SalesforceCredential, SalesCubeSyncState


class SalesforceCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesforceCredential
        fields = ["id", "name", "username", "domain", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SalesforceCredentialWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesforceCredential
        fields = ["id", "name", "username", "password", "security_token", "domain", "is_active"]
        read_only_fields = ["id"]


class SalesCubeSyncStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesCubeSyncState
        fields = ["id", "last_synced_at", "workflow_id", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
