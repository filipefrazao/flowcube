from django.contrib import admin
from salesforce.models import SalesforceCredential, SalesCubeSyncState


@admin.register(SalesforceCredential)
class SalesforceCredentialAdmin(admin.ModelAdmin):
    list_display = ["name", "username", "domain", "is_active", "created_at"]
    list_filter = ["is_active", "domain"]
    search_fields = ["name", "username"]


@admin.register(SalesCubeSyncState)
class SalesCubeSyncStateAdmin(admin.ModelAdmin):
    list_display = ["workflow_id", "last_synced_at", "is_active", "created_at"]
    list_filter = ["is_active"]
