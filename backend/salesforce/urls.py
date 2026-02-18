from rest_framework.routers import DefaultRouter
from salesforce.views import SalesforceCredentialViewSet, SalesCubeSyncStateViewSet

router = DefaultRouter()
router.register(r"credentials", SalesforceCredentialViewSet, basename="sf-credential")
router.register(r"sync-states", SalesCubeSyncStateViewSet, basename="sf-sync-state")

urlpatterns = router.urls
