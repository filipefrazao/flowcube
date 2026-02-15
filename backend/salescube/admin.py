from django.contrib import admin

from .models import (
    Category,
    Contact,
    EmailTemplate,
    FinancialRecord,
    Invoice,
    InvoiceItem,
    Lead,
    LeadActivity,
    LeadComment,
    LeadNote,
    LeadTag,
    LeadTagAssignment,
    Payment,
    Pipeline,
    PipelineStage,
    Product,
    Sale,
    SaleAttachment,
    SaleLineItem,
    Task,
    Ticket,
    TicketMessage,
)


@admin.register(Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = ["name", "is_default", "created_by", "created_at"]
    list_filter = ["is_default"]
    search_fields = ["name"]


@admin.register(PipelineStage)
class PipelineStageAdmin(admin.ModelAdmin):
    list_display = ["name", "pipeline", "order", "probability"]
    list_filter = ["pipeline"]
    ordering = ["pipeline", "order"]


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "phone", "stage", "assigned_to", "score", "source"]
    list_filter = ["source", "stage"]
    search_fields = ["name", "email", "phone", "company"]


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
    list_display = ["title", "status", "priority", "assigned_to", "due_date"]
    list_filter = ["status", "priority"]
    search_fields = ["title"]


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
