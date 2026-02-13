from rest_framework import serializers
from django.db.models import Count, Sum

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


class PipelineStageSerializer(serializers.ModelSerializer):
    leads_count = serializers.IntegerField(read_only=True, default=0)
    total_value = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True, default=0
    )

    class Meta:
        model = PipelineStage
        fields = [
            "id", "pipeline", "name", "order", "color",
            "probability", "leads_count", "total_value",
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


class LeadNoteSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadNote
        fields = ["id", "lead", "user", "user_name", "content", "note_type", "created_at"]
        read_only_fields = ["user"]

    def get_user_name(self, obj):
        if obj.user:
            full = obj.user.get_full_name()
            return full if full else obj.user.username
        return None


class LeadActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadActivity
        fields = ["id", "lead", "user", "user_name", "action", "old_value", "new_value", "created_at"]

    def get_user_name(self, obj):
        if obj.user:
            full = obj.user.get_full_name()
            return full if full else obj.user.username
        return None


class LeadSerializer(serializers.ModelSerializer):
    stage_name = serializers.SerializerMethodField()
    stage_color = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id", "name", "email", "phone", "company", "stage",
            "stage_name", "stage_color", "assigned_to", "assigned_to_name", "score",
            "source", "notes", "value", "lost_reason",
            "created_at", "updated_at",
        ]

    def get_stage_name(self, obj):
        return obj.stage.name if obj.stage else None

    def get_stage_color(self, obj):
        return obj.stage.color if obj.stage else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None


class LeadDetailSerializer(serializers.ModelSerializer):
    stage_name = serializers.SerializerMethodField()
    stage_color = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    lead_notes = LeadNoteSerializer(many=True, read_only=True)
    activities = LeadActivitySerializer(many=True, read_only=True)
    tasks = serializers.SerializerMethodField()
    sales = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id", "name", "email", "phone", "company", "stage",
            "stage_name", "stage_color", "assigned_to", "assigned_to_name", "score",
            "source", "notes", "value", "lost_reason",
            "created_at", "updated_at",
            "lead_notes", "activities", "tasks", "sales",
        ]

    def get_stage_name(self, obj):
        return obj.stage.name if obj.stage else None

    def get_stage_color(self, obj):
        return obj.stage.color if obj.stage else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None

    def get_tasks(self, obj):
        return TaskSerializer(obj.tasks.all()[:10], many=True).data

    def get_sales(self, obj):
        return SaleSerializer(obj.sales.all()[:10], many=True).data


class TaskSerializer(serializers.ModelSerializer):
    lead_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "due_date", "lead", "lead_name",
            "assigned_to", "assigned_to_name", "status", "priority", "reminder_at",
            "completed_at", "created_at", "updated_at",
        ]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "type", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "price", "cost", "sku",
            "category", "category_name", "active", "image_url",
            "created_at", "updated_at",
        ]

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None


class SaleLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = SaleLineItem
        fields = [
            "id", "sale", "product", "product_name", "quantity",
            "unit_price", "subtotal", "created_at",
        ]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None


class SaleSerializer(serializers.ModelSerializer):
    lead_name = serializers.SerializerMethodField()
    line_items = SaleLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id", "lead", "lead_name", "products", "total_value",
            "stage", "notes", "closed_at", "created_by",
            "line_items", "created_at", "updated_at",
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
