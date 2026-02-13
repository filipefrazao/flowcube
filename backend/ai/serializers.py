from rest_framework import serializers
from .models import AIAgent, KnowledgeBase, KnowledgeDocument, KnowledgeChunk


class KnowledgeChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnowledgeChunk
        fields = ["id", "index", "text", "token_count", "created_at"]
        read_only_fields = ["id", "created_at"]


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    chunks_count = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeDocument
        fields = [
            "id", "knowledge_base", "title", "file_name", "content_text",
            "chunk_count", "chunks_count", "indexed_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "chunk_count"]

    def get_chunks_count(self, obj):
        return obj.chunks.count()


class KnowledgeBaseSerializer(serializers.ModelSerializer):
    documents_count = serializers.SerializerMethodField()

    class Meta:
        model = KnowledgeBase
        fields = [
            "id", "agent", "name", "description",
            "documents_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_documents_count(self, obj):
        return obj.documents.count()


class AIAgentSerializer(serializers.ModelSerializer):
    knowledge_bases_count = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)

    class Meta:
        model = AIAgent
        fields = [
            "id", "owner", "owner_name", "name", "description",
            "system_prompt", "model", "temperature", "max_tokens",
            "fallback_message", "active", "tools",
            "knowledge_bases_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_knowledge_bases_count(self, obj):
        return obj.knowledge_bases.count()


class AIAgentListSerializer(serializers.ModelSerializer):
    knowledge_bases_count = serializers.SerializerMethodField()

    class Meta:
        model = AIAgent
        fields = [
            "id", "name", "description", "model", "active",
            "knowledge_bases_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_knowledge_bases_count(self, obj):
        return obj.knowledge_bases.count()


class TestChatSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)
