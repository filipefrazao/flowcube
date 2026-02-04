"""
FlowCube Admin Configuration
"""
from django.contrib import admin
from .models import Workflow, Group, Block, Edge, Variable


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "is_published", "is_active", "created_at"]
    list_filter = ["is_published", "is_active", "created_at"]
    search_fields = ["name", "description", "owner__email"]


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ["title", "workflow", "created_at"]
    list_filter = ["created_at"]


@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ["id", "block_type", "workflow", "created_at"]
    list_filter = ["block_type", "created_at"]


@admin.register(Edge)
class EdgeAdmin(admin.ModelAdmin):
    list_display = ["id", "source_block", "target_block", "created_at"]


@admin.register(Variable)
class VariableAdmin(admin.ModelAdmin):
    list_display = ["name", "workflow", "is_system", "created_at"]
    list_filter = ["is_system"]
