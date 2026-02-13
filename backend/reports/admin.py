from django.contrib import admin

from .models import ReportDefinition, ReportExecution


@admin.register(ReportDefinition)
class ReportDefinitionAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "chart_type", "created_at"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(ReportExecution)
class ReportExecutionAdmin(admin.ModelAdmin):
    list_display = ["definition", "user", "row_count", "created_at"]
    list_filter = ["definition"]
    readonly_fields = ["result"]
