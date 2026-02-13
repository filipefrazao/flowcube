from django.contrib import admin
from .models import AIAgent, KnowledgeBase, KnowledgeDocument, KnowledgeChunk


@admin.register(AIAgent)
class AIAgentAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "model", "active", "created_at"]
    list_filter = ["model", "active"]
    search_fields = ["name", "description"]


@admin.register(KnowledgeBase)
class KnowledgeBaseAdmin(admin.ModelAdmin):
    list_display = ["name", "agent", "created_at"]
    search_fields = ["name", "description"]


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "knowledge_base", "chunk_count", "indexed_at", "created_at"]
    search_fields = ["title", "file_name"]


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = ["document", "index", "token_count", "created_at"]
    list_filter = ["document"]
