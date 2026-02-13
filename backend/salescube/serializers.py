from rest_framework import serializers
from django.db.models import Count

from .models import (
    Category,
    FinancialRecord,
    Lead,
    Pipeline,
    PipelineStage,
    Product,
    Sale,
    Task,
)


class PipelineStageSerializer(serializers.ModelSerializer):
    leads_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = PipelineStage
        fields = [
            "id", "pipeline", "name", "order", "color",
            "probability", "leads_count",
        ]


class PipelineSerializer(serializers.ModelSerializer):
    stages = PipelineStageSerializer(many=True, read_only=True)

    class Meta:
        model = Pipeline
        fields = [
            "id", "name", "description", "created_by",
            "is_default", "stages", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]


class LeadSerializer(serializers.ModelSerializer):
    stage_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id", "name", "email", "phone", "company", "stage",
            "stage_name", "assigned_to", "assigned_to_name", "score",
            "source", "notes", "value", "lost_reason",
            "created_at", "updated_at",
        ]

    def get_stage_name(self, obj):
        return obj.stage.name if obj.stage else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "due_date", "lead",
            "assigned_to", "status", "priority", "reminder_at",
            "completed_at", "created_at", "updated_at",
        ]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "type", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "price", "cost", "sku",
            "category", "active", "image_url", "created_at", "updated_at",
        ]


class SaleSerializer(serializers.ModelSerializer):
    lead_name = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id", "lead", "lead_name", "products", "total_value",
            "stage", "notes", "closed_at", "created_by",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None


class FinancialRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialRecord
        fields = [
            "id", "sale", "type", "value", "date",
            "description", "created_at",
        ]
