from django.contrib import admin

from .models import (
    Attachment,
    Campaign,
    Category,
    Contact,
    EmailTemplate,
    FinancialRecord,
    Franchise,
    Invoice,
    InvoiceItem,
    Lead,
    LeadActivity,
    LeadComment,
    LeadNote,
    LeadTag,
    LeadTagAssignment,
    Origin,
    Payment,
    Pipeline,
    PipelineStage,
    Pitch,
    Pole,
    Product,
    Reminder,
    ReportLog,
    ReportTemplate,
    Sale,
    SaleAttachment,
    SaleLineItem,
    Squad,
    Task,
    TaskType,
    Ticket,
    TicketMessage,
)


# ============================================================================
# Organizational
# ============================================================================


@admin.register(Franchise)
class FranchiseAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "code"]


@admin.register(Pole)
class PoleAdmin(admin.ModelAdmin):
    list_display = ["name", "franchise", "is_active", "created_at"]
    list_filter = ["is_active", "franchise"]
    search_fields = ["name"]


@admin.register(Squad)
class SquadAdmin(admin.ModelAdmin):
    list_display = ["name", "franchise", "is_active", "created_at"]
    list_filter = ["is_active", "franchise"]
    search_fields = ["name"]
    filter_horizontal = ["owners", "members"]


@admin.register(Origin)
class OriginAdmin(admin.ModelAdmin):
    list_display = ["name", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name"]


@admin.register(TaskType)
class TaskTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name"]


# ============================================================================
# Sprint 1
# ============================================================================


@admin.register(Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = ["name", "is_default", "created_by", "created_at"]
    list_filter = ["is_default"]
    search_fields = ["name"]
    filter_horizontal = ["squads", "franchises"]


@admin.register(PipelineStage)
class PipelineStageAdmin(admin.ModelAdmin):
    list_display = ["name", "pipeline", "order", "probability"]
    list_filter = ["pipeline"]
    ordering = ["pipeline", "order"]


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone", "stage", "assigned_to", "origin", "score", "source"]
    list_filter = ["source", "stage", "origin"]
    search_fields = ["name", "email", "phone", "company"]
    filter_horizontal = ["responsibles", "squads", "franchises"]


@admin.register(LeadNote)
class LeadNoteAdmin(admin.ModelAdmin):
    list_display = ["lead", "user", "note_type", "created_at"]
    list_filter = ["note_type"]
    search_fields = ["content"]


@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ["lead", "user", "action", "created_at"]
    list_filter = ["action"]
    readonly_fields = ["lead", "user", "action", "old_value", "new_value", "created_at"]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "task_type", "assigned_to", "due_date"]
    list_filter = ["status", "priority", "task_type"]
    search_fields = ["title"]
    filter_horizontal = ["responsibles"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "type", "parent"]
    list_filter = ["type"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "price", "cost", "sku", "category", "active"]
    list_filter = ["active", "category"]
    search_fields = ["name", "sku"]


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ["id", "lead", "total_value", "stage", "created_by", "created_at"]
    list_filter = ["stage"]
    search_fields = ["notes"]
    filter_horizontal = ["squads"]


@admin.register(SaleLineItem)
class SaleLineItemAdmin(admin.ModelAdmin):
    list_display = ["sale", "product", "quantity", "unit_price", "subtotal"]
    list_filter = ["sale"]


@admin.register(FinancialRecord)
class FinancialRecordAdmin(admin.ModelAdmin):
    list_display = ["type", "value", "date", "sale", "description"]
    list_filter = ["type"]
    date_hierarchy = "date"


@admin.register(LeadComment)
class LeadCommentAdmin(admin.ModelAdmin):
    list_display = ["lead", "author", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["text"]


@admin.register(LeadTag)
class LeadTagAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "created_at"]
    search_fields = ["name"]


@admin.register(LeadTagAssignment)
class LeadTagAssignmentAdmin(admin.ModelAdmin):
    list_display = ["lead", "tag", "created_at"]
    list_filter = ["tag"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["sale", "method", "amount", "status", "due_date", "paid_at"]
    list_filter = ["method", "status"]


@admin.register(SaleAttachment)
class SaleAttachmentAdmin(admin.ModelAdmin):
    list_display = ["sale", "file_name", "uploaded_by", "created_at"]


# ============================================================================
# Sprint 2
# ============================================================================


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone", "company", "source", "is_active"]
    list_filter = ["source", "is_active", "state"]
    search_fields = ["name", "email", "phone", "cpf"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["number", "lead", "status", "total", "issue_date", "due_date"]
    list_filter = ["status"]
    search_fields = ["number"]


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ["invoice", "description", "quantity", "unit_price", "subtotal"]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "priority", "category", "assigned_to", "created_at"]
    list_filter = ["status", "priority", "category"]
    search_fields = ["title", "description"]


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ["ticket", "author", "is_internal", "created_at"]
    list_filter = ["is_internal"]


@admin.register(EmailTemplate)
class EmailTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "subject", "category", "is_active", "created_at"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "subject"]


# ============================================================================
# Sprint 3 - PROD Parity
# ============================================================================


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ["title", "remind_at", "lead", "assigned_to", "is_completed", "created_at"]
    list_filter = ["is_completed"]
    search_fields = ["title"]
    date_hierarchy = "remind_at"


@admin.register(Pitch)
class PitchAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "value", "lead", "sale", "created_by", "created_at"]
    list_filter = ["status"]
    search_fields = ["title"]


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "pipeline", "budget", "start_date", "end_date"]
    list_filter = ["status"]
    search_fields = ["name"]


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "template_type", "is_active", "created_by", "created_at"]
    list_filter = ["template_type", "is_active"]
    search_fields = ["name"]


@admin.register(ReportLog)
class ReportLogAdmin(admin.ModelAdmin):
    list_display = ["template", "generated_by", "created_at"]
    list_filter = ["template"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["entity_type", "file_name", "mime_type", "uploaded_by", "created_at"]
    list_filter = ["entity_type"]
    search_fields = ["file_name"]
