from rest_framework import serializers
from django.db.models import Count, Sum

from .models import (
    Attachment,
    Campaign,
    Contact,
    EmailTemplate,
    Franchise,
    Invoice,
    InvoiceItem,
    Origin,
    Pitch,
    Pole,
    Reminder,
    ReportLog,
    ReportTemplate,
    Squad,
    TaskType,
    Ticket,
    TicketMessage,
    Category,
    FinancialRecord,
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
)


# ============================================================================
# Organizational Serializers
# ============================================================================


class FranchiseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Franchise
        fields = ["id", "name", "code", "is_active", "created_at", "updated_at"]


class PoleSerializer(serializers.ModelSerializer):
    franchise_name = serializers.SerializerMethodField()

    class Meta:
        model = Pole
        fields = ["id", "name", "franchise", "franchise_name", "is_active", "created_at", "updated_at"]

    def get_franchise_name(self, obj):
        return obj.franchise.name if obj.franchise else None


class SquadSerializer(serializers.ModelSerializer):
    franchise_name = serializers.SerializerMethodField()
    owners_count = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Squad
        fields = [
            "id", "name", "franchise", "franchise_name", "owners", "members",
            "owners_count", "members_count", "is_active", "created_at", "updated_at",
        ]

    def get_franchise_name(self, obj):
        return obj.franchise.name if obj.franchise else None

    def get_owners_count(self, obj):
        return obj.owners.count()

    def get_members_count(self, obj):
        return obj.members.count()


class OriginSerializer(serializers.ModelSerializer):
    leads_count = serializers.SerializerMethodField()

    class Meta:
        model = Origin
        fields = ["id", "name", "is_active", "leads_count", "created_at"]

    def get_leads_count(self, obj):
        return obj.leads.count()


class TaskTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskType
        fields = ["id", "name", "color", "is_active", "created_at"]


# ============================================================================
# Sprint 1 Serializers
# ============================================================================


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


class PipelineDetailSerializer(serializers.ModelSerializer):
    """Pipeline with stages including lead counts and totals."""
    stages = serializers.SerializerMethodField()
    total_leads = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = Pipeline
        fields = [
            "id", "name", "description", "created_by",
            "is_default", "stages", "total_leads", "total_value",
            "created_at", "updated_at",
        ]

    def get_stages(self, obj):
        stages = obj.stages.annotate(
            leads_count=Count("leads"),
            total_value=Sum("leads__value"),
        ).order_by("order")
        return PipelineStageSerializer(stages, many=True).data

    def get_total_leads(self, obj):
        return Lead.objects.filter(stage__pipeline=obj).count()

    def get_total_value(self, obj):
        agg = Lead.objects.filter(stage__pipeline=obj).aggregate(total=Sum("value"))
        return float(agg["total"] or 0)


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


class LeadCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadComment
        fields = ["id", "lead", "author", "author_name", "text", "created_at", "updated_at"]
        read_only_fields = ["author"]

    def get_author_name(self, obj):
        if obj.author:
            full = obj.author.get_full_name()
            return full if full else obj.author.username
        return None


class LeadTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadTag
        fields = ["id", "name", "color", "created_at"]


class LeadTagAssignmentSerializer(serializers.ModelSerializer):
    tag_name = serializers.SerializerMethodField()
    tag_color = serializers.SerializerMethodField()

    class Meta:
        model = LeadTagAssignment
        fields = ["id", "lead", "tag", "tag_name", "tag_color", "created_at"]

    def get_tag_name(self, obj):
        return obj.tag.name if obj.tag else None

    def get_tag_color(self, obj):
        return obj.tag.color if obj.tag else None


class LeadSerializer(serializers.ModelSerializer):
    stage_name = serializers.SerializerMethodField()
    stage_color = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    origin_name = serializers.SerializerMethodField()
    responsibles_names = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id", "name", "email", "phone", "company", "stage",
            "stage_name", "stage_color", "assigned_to", "assigned_to_name",
            "responsibles", "responsibles_names",
            "origin", "origin_name", "score",
            "source", "notes", "value", "lost_reason",
            "squads", "franchises",
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

    def get_origin_name(self, obj):
        return obj.origin.name if obj.origin else None

    def get_responsibles_names(self, obj):
        return [
            {"id": u.id, "name": u.get_full_name() or u.username}
            for u in obj.responsibles.all()
        ]


class LeadDetailSerializer(serializers.ModelSerializer):
    """Lead detail with all nested relations."""
    stage_name = serializers.SerializerMethodField()
    stage_color = serializers.SerializerMethodField()
    pipeline_id = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    origin_name = serializers.SerializerMethodField()
    responsibles_names = serializers.SerializerMethodField()
    squad_names = serializers.SerializerMethodField()
    franchise_names = serializers.SerializerMethodField()
    lead_notes = LeadNoteSerializer(many=True, read_only=True)
    activities = LeadActivitySerializer(many=True, read_only=True)
    comments = LeadCommentSerializer(many=True, read_only=True)
    tags = serializers.SerializerMethodField()
    tasks = serializers.SerializerMethodField()
    sales = serializers.SerializerMethodField()
    total_comments = serializers.SerializerMethodField()
    total_activities = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id", "name", "email", "phone", "company", "stage",
            "stage_name", "stage_color", "pipeline_id",
            "assigned_to", "assigned_to_name",
            "responsibles", "responsibles_names",
            "origin", "origin_name",
            "squads", "squad_names", "franchises", "franchise_names",
            "score", "source", "notes", "value", "lost_reason",
            "created_at", "updated_at",
            "lead_notes", "activities", "comments", "tags",
            "tasks", "sales",
            "total_comments", "total_activities",
        ]

    def get_stage_name(self, obj):
        return obj.stage.name if obj.stage else None

    def get_stage_color(self, obj):
        return obj.stage.color if obj.stage else None

    def get_pipeline_id(self, obj):
        return str(obj.stage.pipeline_id) if obj.stage else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None

    def get_origin_name(self, obj):
        return obj.origin.name if obj.origin else None

    def get_responsibles_names(self, obj):
        return [
            {"id": u.id, "name": u.get_full_name() or u.username}
            for u in obj.responsibles.all()
        ]

    def get_squad_names(self, obj):
        return [{"id": str(s.id), "name": s.name} for s in obj.squads.all()]

    def get_franchise_names(self, obj):
        return [{"id": str(f.id), "name": f.name} for f in obj.franchises.all()]

    def get_tags(self, obj):
        assignments = obj.tag_assignments.select_related("tag").all()
        return LeadTagAssignmentSerializer(assignments, many=True).data

    def get_tasks(self, obj):
        return TaskSerializer(obj.tasks.all()[:10], many=True).data

    def get_sales(self, obj):
        return SaleSerializer(obj.sales.all()[:10], many=True).data

    def get_total_comments(self, obj):
        return obj.comments.count()

    def get_total_activities(self, obj):
        return obj.activities.count()


class LeadStatsSerializer(serializers.Serializer):
    """Serializer for lead statistics response."""
    total_leads = serializers.IntegerField()
    total_sales = serializers.IntegerField()
    total_revenue = serializers.FloatField()
    conversion_rate = serializers.FloatField()
    avg_deal_size = serializers.FloatField()
    leads_per_stage = serializers.ListField()
    leads_per_day = serializers.ListField()
    top_assignees = serializers.ListField()
    leads_per_source = serializers.ListField()
    pipeline_summary = serializers.ListField()
    sales_pipeline = serializers.ListField()


class TaskSerializer(serializers.ModelSerializer):
    lead_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    task_type_name = serializers.SerializerMethodField()
    responsibles_names = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "due_date", "lead", "lead_name",
            "assigned_to", "assigned_to_name",
            "responsibles", "responsibles_names",
            "task_type", "task_type_name",
            "status", "priority", "reminder_at",
            "completed_at", "created_at", "updated_at",
        ]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None

    def get_task_type_name(self, obj):
        return obj.task_type.name if obj.task_type else None

    def get_responsibles_names(self, obj):
        return [
            {"id": u.id, "name": u.get_full_name() or u.username}
            for u in obj.responsibles.all()
        ]


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


class PaymentSerializer(serializers.ModelSerializer):
    taker_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id", "sale", "taker", "taker_name", "method", "amount",
            "status", "protocol", "due_date", "paid_at",
            "created_at", "updated_at",
        ]

    def get_taker_name(self, obj):
        if obj.taker:
            full = obj.taker.get_full_name()
            return full if full else obj.taker.username
        return None


class SaleAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SaleAttachment
        fields = [
            "id", "sale", "file", "file_name", "file_url",
            "uploaded_by", "uploaded_by_name", "created_at",
        ]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            full = obj.uploaded_by.get_full_name()
            return full if full else obj.uploaded_by.username
        return None


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


class SaleDetailSerializer(serializers.ModelSerializer):
    """Sale detail with all nested relations: line items, payments, attachments."""
    lead_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    line_items = SaleLineItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    attachments = SaleAttachmentSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    total_pending = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id", "lead", "lead_name", "products", "total_value",
            "stage", "notes", "closed_at",
            "created_by", "created_by_name",
            "line_items", "payments", "attachments",
            "total_paid", "total_pending",
            "created_at", "updated_at",
        ]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_created_by_name(self, obj):
        if obj.created_by:
            full = obj.created_by.get_full_name()
            return full if full else obj.created_by.username
        return None

    def get_total_paid(self, obj):
        from django.db.models import Sum
        result = obj.payments.filter(status="approved").aggregate(total=Sum("amount"))
        return float(result["total"] or 0)

    def get_total_pending(self, obj):
        from django.db.models import Sum
        result = obj.payments.filter(status="pending").aggregate(total=Sum("amount"))
        return float(result["total"] or 0)


class FinancialRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialRecord
        fields = [
            "id", "sale", "type", "value", "date",
            "description", "created_at",
        ]


# ============================================================================
# Sprint 2 Serializers - Contacts, Invoices, Tickets, Email
# ============================================================================


class ContactSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    lead_name = serializers.SerializerMethodField()
    tag_names = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            "id", "name", "email", "phone", "company", "position", "cpf",
            "address", "city", "state", "source", "notes", "lead", "lead_name",
            "tags", "tag_names", "owner", "owner_name", "is_active",
            "created_at", "updated_at",
        ]

    def get_owner_name(self, obj):
        if obj.owner:
            full = obj.owner.get_full_name()
            return full if full else obj.owner.username
        return None

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_tag_names(self, obj):
        return [{"id": str(t.id), "name": t.name, "color": t.color} for t in obj.tags.all()]


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = ["id", "invoice", "product", "product_name", "description", "quantity", "unit_price", "subtotal"]

    def get_product_name(self, obj):
        return obj.product.name if obj.product else None


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    lead_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "lead", "lead_name", "contact", "contact_name",
            "sale", "status", "issue_date", "due_date", "subtotal", "discount",
            "tax", "total", "notes", "payment_method", "created_by",
            "created_by_name", "paid_at", "items", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_contact_name(self, obj):
        return obj.contact.name if obj.contact else None

    def get_created_by_name(self, obj):
        if obj.created_by:
            full = obj.created_by.get_full_name()
            return full if full else obj.created_by.username
        return None


class TicketMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketMessage
        fields = ["id", "ticket", "author", "author_name", "content", "is_internal", "created_at"]
        read_only_fields = ["author"]

    def get_author_name(self, obj):
        if obj.author:
            full = obj.author.get_full_name()
            return full if full else obj.author.username
        return None


class TicketSerializer(serializers.ModelSerializer):
    messages = TicketMessageSerializer(many=True, read_only=True)
    lead_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "description", "lead", "lead_name", "contact",
            "contact_name", "status", "priority", "category", "assigned_to",
            "assigned_to_name", "resolved_at", "closed_at", "created_by",
            "created_by_name", "messages", "messages_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_contact_name(self, obj):
        return obj.contact.name if obj.contact else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            full = obj.created_by.get_full_name()
            return full if full else obj.created_by.username
        return None

    def get_messages_count(self, obj):
        return obj.messages.count()


class TicketListSerializer(serializers.ModelSerializer):
    lead_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    messages_count = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = [
            "id", "title", "lead", "lead_name", "contact", "contact_name",
            "status", "priority", "category", "assigned_to", "assigned_to_name",
            "messages_count", "created_at", "updated_at",
        ]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_contact_name(self, obj):
        return obj.contact.name if obj.contact else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None

    def get_messages_count(self, obj):
        return obj.messages.count()


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            "id", "name", "subject", "body_html", "body_text",
            "category", "variables", "is_active", "created_by",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]


# ============================================================================
# Sprint 3 Serializers - PROD Parity
# ============================================================================


class ReminderSerializer(serializers.ModelSerializer):
    lead_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Reminder
        fields = [
            "id", "title", "description", "remind_at", "lead", "lead_name",
            "task", "assigned_to", "assigned_to_name", "is_completed",
            "completed_at", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = obj.assigned_to.get_full_name()
            return full if full else obj.assigned_to.username
        return None


class PitchSerializer(serializers.ModelSerializer):
    lead_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Pitch
        fields = [
            "id", "title", "description", "sale", "lead", "lead_name",
            "status", "value", "sent_at", "accepted_at",
            "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_lead_name(self, obj):
        return obj.lead.name if obj.lead else None

    def get_created_by_name(self, obj):
        if obj.created_by:
            full = obj.created_by.get_full_name()
            return full if full else obj.created_by.username
        return None


class CampaignSerializer(serializers.ModelSerializer):
    pipeline_name = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            "id", "name", "description", "pipeline", "pipeline_name",
            "status", "start_date", "end_date", "budget",
            "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]

    def get_pipeline_name(self, obj):
        return obj.pipeline.name if obj.pipeline else None


class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = [
            "id", "name", "description", "template_type", "config",
            "is_active", "created_by", "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]


class ReportLogSerializer(serializers.ModelSerializer):
    template_name = serializers.SerializerMethodField()
    generated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ReportLog
        fields = [
            "id", "template", "template_name", "generated_by",
            "generated_by_name", "parameters", "result_url", "created_at",
        ]

    def get_template_name(self, obj):
        return obj.template.name if obj.template else None

    def get_generated_by_name(self, obj):
        if obj.generated_by:
            full = obj.generated_by.get_full_name()
            return full if full else obj.generated_by.username
        return None


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id", "entity_type", "entity_id", "file", "file_name",
            "file_url", "file_size", "mime_type", "uploaded_by",
            "uploaded_by_name", "created_at",
        ]

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            full = obj.uploaded_by.get_full_name()
            return full if full else obj.uploaded_by.username
        return None
