from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AllNotesView,
    AttachmentViewSet,
    CalendarView,
    CampaignViewSet,
    CategoryViewSet,
    ContactViewSet,
    EmailTemplateViewSet,
    FinancialOverviewView,
    FinancialRecordViewSet,
    FranchiseViewSet,
    InvoiceItemViewSet,
    InvoiceViewSet,
    LeadCommentViewSet,
    LeadTagAssignmentViewSet,
    LeadTagViewSet,
    LeadViewSet,
    OriginViewSet,
    PaymentViewSet,
    PipelineStageViewSet,
    PipelineViewSet,
    PitchViewSet,
    PoleViewSet,
    ProductViewSet,
    ReminderViewSet,
    ReportLogViewSet,
    ReportTemplateViewSet,
    SaleAttachmentViewSet,
    SaleLineItemViewSet,
    SaleViewSet,
    SquadViewSet,
    TaskTypeViewSet,
    TaskViewSet,
    TicketMessageViewSet,
    TicketViewSet,
)

router = DefaultRouter()
# Organizational
router.register("franchises", FranchiseViewSet)
router.register("poles", PoleViewSet)
router.register("squads", SquadViewSet)
router.register("origins", OriginViewSet)
router.register("task-types", TaskTypeViewSet)
# Sprint 1
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
# Sprint 3 - PROD Parity
router.register("reminders", ReminderViewSet)
router.register("pitches", PitchViewSet)
router.register("campaigns", CampaignViewSet)
router.register("report-templates", ReportTemplateViewSet)
router.register("report-logs", ReportLogViewSet)
router.register("generic-attachments", AttachmentViewSet)

urlpatterns = [
    path("financial-overview/", FinancialOverviewView.as_view(), name="financial-overview"),
    path("calendar/", CalendarView.as_view(), name="calendar"),
    path("all-notes/", AllNotesView.as_view(), name="all-notes"),
    path("", include(router.urls)),
]
