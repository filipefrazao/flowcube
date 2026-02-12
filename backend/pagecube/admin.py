from django.contrib import admin

from .models import (
    CustomDomain,
    FormSchema,
    FormSubmission,
    Page,
    PageAnalytics,
    PageTemplate,
)


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'status', 'user', 'published_at', 'updated_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('title', 'slug', 'meta_title')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user',)


@admin.register(FormSchema)
class FormSchemaAdmin(admin.ModelAdmin):
    list_display = ('name', 'page', 'distribution_mode', 'submissions_count', 'is_active', 'created_at')
    list_filter = ('distribution_mode', 'is_active', 'created_at')
    search_fields = ('name', 'page__title')
    readonly_fields = ('submissions_count', 'created_at', 'updated_at')
    raw_id_fields = ('page',)


@admin.register(FormSubmission)
class FormSubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'form', 'ip_address', 'distributed', 'created_at')
    list_filter = ('distributed', 'created_at', 'form__distribution_mode')
    search_fields = ('form__name', 'ip_address', 'utm_source', 'utm_campaign')
    readonly_fields = ('created_at',)
    raw_id_fields = ('form',)


@admin.register(CustomDomain)
class CustomDomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'page', 'ssl_status', 'verified', 'verified_at')
    list_filter = ('ssl_status', 'verified')
    search_fields = ('domain', 'page__title')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('page',)


@admin.register(PageTemplate)
class PageTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'is_public', 'created_at')
    list_filter = ('category', 'is_public')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at',)


@admin.register(PageAnalytics)
class PageAnalyticsAdmin(admin.ModelAdmin):
    list_display = ('page', 'date', 'views', 'unique_visitors', 'form_submissions', 'conversion_rate')
    list_filter = ('date',)
    search_fields = ('page__title',)
    raw_id_fields = ('page',)
