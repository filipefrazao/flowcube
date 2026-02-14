from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AllNotesView,
    CalendarView,
    CategoryViewSet,
    ContactViewSet,
    EmailTemplateViewSet,
    FinancialOverviewView,
    FinancialRecordViewSet,
    InvoiceItemViewSet,
    InvoiceViewSet,
    LeadCommentViewSet,
    LeadTagAssignmentViewSet,
    LeadTagViewSet,
    LeadViewSet,
    PaymentViewSet,
    PipelineStageViewSet,
    PipelineViewSet,
    ProductViewSet,
    SaleAttachmentViewSet,
    SaleLineItemViewSet,
    SaleViewSet,
    TaskViewSet,
    TicketMessageViewSet,
    TicketViewSet,
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
router.register("comments", LeadCommentViewSet)
router.register("tags", LeadTagViewSet)
router.register("tag-assignments", LeadTagAssignmentViewSet)
router.register("payments", PaymentViewSet)
router.register("attachments", SaleAttachmentViewSet)
# Sprint 2
router.register("contacts", ContactViewSet)
router.register("invoices", InvoiceViewSet)
router.register("invoice-items", InvoiceItemViewSet)
router.register("tickets", TicketViewSet)
router.register("ticket-messages", TicketMessageViewSet)
router.register("email-templates", EmailTemplateViewSet)

urlpatterns = [
    path("financial-overview/", FinancialOverviewView.as_view(), name="financial-overview"),
    path("calendar/", CalendarView.as_view(), name="calendar"),
    path("all-notes/", AllNotesView.as_view(), name="all-notes"),
    path("", include(router.urls)),
]
