from django.contrib import admin

from .models import (
    Category,
    FinancialRecord,
    Lead,
    LeadActivity,
    LeadNote,
    Pipeline,
    PipelineStage,
    Product,
    Sale,
    SaleLineItem,
    Task,
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
