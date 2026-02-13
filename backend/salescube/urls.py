from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    FinancialOverviewView,
    FinancialRecordViewSet,
    LeadViewSet,
    PipelineStageViewSet,
    PipelineViewSet,
    ProductViewSet,
    SaleLineItemViewSet,
    SaleViewSet,
    TaskViewSet,
)

router = DefaultRouter()
router.register("pipelines", PipelineViewSet)
router.register("stages", PipelineStageViewSet)
router.register("leads", LeadViewSet)
router.register("tasks", TaskViewSet)
router.register("categories", CategoryViewSet)
router.register("products", ProductViewSet)
router.register("sales", SaleViewSet)
router.register("sale-line-items", SaleLineItemViewSet)
router.register("financial-records", FinancialRecordViewSet)

urlpatterns = [
    path("financial-overview/", FinancialOverviewView.as_view(), name="financial-overview"),
    path("", include(router.urls)),
]
