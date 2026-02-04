from django.contrib import admin
from .models import *


@admin.register(TemplateCategory)
class TemplateCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon', 'parent', 'order', 'is_active']
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'creator', 'category', 'pricing_type', 'price', 'is_featured', 'is_published', 'rating_avg', 'downloads_count']
    list_filter = ['pricing_type', 'is_featured', 'is_published', 'category']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['downloads_count', 'rating_avg', 'rating_count', 'revenue_total']


@admin.register(TemplatePurchase)
class TemplatePurchaseAdmin(admin.ModelAdmin):
    list_display = ['template', 'buyer', 'amount', 'platform_fee', 'creator_revenue', 'status', 'purchased_at']
    list_filter = ['status']
    readonly_fields = ['platform_fee', 'creator_revenue', 'purchased_at']


@admin.register(TemplateReview)
class TemplateReviewAdmin(admin.ModelAdmin):
    list_display = ['template', 'user', 'rating', 'is_verified_purchase', 'helpful_count', 'is_published']
    list_filter = ['rating', 'is_verified_purchase', 'is_published']


@admin.register(TemplateVersion)
class TemplateVersionAdmin(admin.ModelAdmin):
    list_display = ['template', 'version', 'downloads_count', 'created_at']
    readonly_fields = ['created_at', 'downloads_count']


@admin.register(TemplateDownload)
class TemplateDownloadAdmin(admin.ModelAdmin):
    list_display = ['template', 'user', 'version', 'downloaded_at']
    readonly_fields = ['downloaded_at']
