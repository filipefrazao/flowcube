from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum, Q, Avg, F
from django.db.models.functions import TruncMonth, TruncDate, Coalesce
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import (
    FinancialRecordFilter,
    LeadFilter,
    ProductFilter,
    SaleFilter,
    TaskFilter,
)
from .models import (
    Contact,
    EmailTemplate,
    Invoice,
    InvoiceItem,
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
from .serializers import (
    ContactSerializer,
    EmailTemplateSerializer,
    InvoiceItemSerializer,
    InvoiceSerializer,
    TicketListSerializer,
    TicketMessageSerializer,
    TicketSerializer,
    CategorySerializer,
    FinancialRecordSerializer,
    LeadActivitySerializer,
    LeadCommentSerializer,
    LeadDetailSerializer,
    LeadNoteSerializer,
    LeadSerializer,
    LeadTagAssignmentSerializer,
    LeadTagSerializer,
    PaymentSerializer,
    PipelineDetailSerializer,
    PipelineSerializer,
    PipelineStageSerializer,
    ProductSerializer,
    SaleAttachmentSerializer,
    SaleDetailSerializer,
    SaleLineItemSerializer,
    SaleSerializer,
    TaskSerializer,
)


class PipelineViewSet(viewsets.ModelViewSet):
    queryset = Pipeline.objects.prefetch_related("stages")
    serializer_class = PipelineSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PipelineDetailSerializer
        return PipelineSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.prefetch_related("stages")

    @action(detail=True, methods=["get"], url_path="kanban")
    def kanban(self, request, pk=None):
        """
        Kanban board view: returns stages with paginated leads for a pipeline.
        Query params:
          - page_size: leads per column (default 50)
          - search: text search on lead name/email/phone
          - stage: filter specific stage UUID
        """
        pipeline = self.get_object()
        page_size = int(request.query_params.get("page_size", 50))
        search = request.query_params.get("search", "")

        stages = pipeline.stages.order_by("order")
        columns = []

        for stage in stages:
            leads_qs = Lead.objects.filter(stage=stage).select_related(
                "assigned_to"
            ).order_by("-created_at")

            if search:
                leads_qs = leads_qs.filter(
                    Q(name__icontains=search)
                    | Q(email__icontains=search)
                    | Q(phone__icontains=search)
                )

            # Per-stage pagination
            page_param = request.query_params.get(f"stage_{stage.id}_page", "1")
            try:
                page_num = int(page_param)
            except (ValueError, TypeError):
                page_num = 1
            offset = (page_num - 1) * page_size
            total_leads = leads_qs.count()
            total_pages = max(1, (total_leads + page_size - 1) // page_size)
            page_leads = leads_qs[offset:offset + page_size]

            agg = Lead.objects.filter(stage=stage).aggregate(
                total_value=Sum("value")
            )

            lead_cards = []
            for lead in page_leads:
                assigned_name = None
                if lead.assigned_to:
                    full = lead.assigned_to.get_full_name()
                    assigned_name = full if full else lead.assigned_to.username

                lead_cards.append({
                    "id": str(lead.id),
                    "name": lead.name,
                    "email": lead.email,
                    "phone": lead.phone,
                    "company": lead.company,
                    "score": lead.score,
                    "source": lead.source,
                    "value": str(lead.value),
                    "assigned_to": lead.assigned_to_id,
                    "assigned_to_name": assigned_name,
                    "created_at": lead.created_at.isoformat(),
                })

            columns.append({
                "stage_id": str(stage.id),
                "stage_name": stage.name,
                "color": stage.color,
                "order": stage.order,
                "probability": stage.probability,
                "count": total_leads,
                "total_value": str(agg["total_value"] or 0),
                "total_pages": total_pages,
                "current_page": page_num,
                "leads": lead_cards,
            })

        return Response({
            "pipeline_id": str(pipeline.id),
            "pipeline_name": pipeline.name,
            "columns": columns,
        })


class PipelineStageViewSet(viewsets.ModelViewSet):
    queryset = PipelineStage.objects.all()
    serializer_class = PipelineStageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["pipeline"]
    ordering_fields = ["order"]

    def get_queryset(self):
        return PipelineStage.objects.annotate(
            leads_count=Count("leads"),
            total_value=Sum("leads__value"),
        )


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related("stage", "assigned_to")
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = LeadFilter
    search_fields = ["name", "email", "phone", "company"]
    ordering_fields = ["name", "score", "value", "created_at", "updated_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return LeadDetailSerializer
        return LeadSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                "lead_notes", "activities", "comments", "tag_assignments__tag",
                "tasks", "sales",
            )
        pipeline = self.request.query_params.get("pipeline")
        if pipeline:
            qs = qs.filter(stage__pipeline_id=pipeline)
        return qs

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        lead = self.get_object()
        stage_id = request.data.get("stage_id")
        if not stage_id:
            return Response(
                {"error": "stage_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stage = PipelineStage.objects.get(pk=stage_id)
        except PipelineStage.DoesNotExist:
            return Response(
                {"error": "Stage not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        old_stage = lead.stage
        lead.stage = stage
        lead.save(update_fields=["stage", "updated_at"])
        LeadActivity.objects.create(
            lead=lead,
            user=request.user,
            action="stage_changed",
            old_value=old_stage.name if old_stage else "",
            new_value=stage.name,
        )
        return Response(LeadSerializer(lead).data)

    @action(detail=False, methods=["post"], url_path="bulk-move")
    def bulk_move(self, request):
        lead_ids = request.data.get("lead_ids", [])
        stage_id = request.data.get("stage_id")
        if not lead_ids or not stage_id:
            return Response(
                {"error": "lead_ids and stage_id are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            stage = PipelineStage.objects.get(pk=stage_id)
        except PipelineStage.DoesNotExist:
            return Response(
                {"error": "Stage not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        leads = Lead.objects.filter(pk__in=lead_ids)
        count = leads.update(stage=stage)
        return Response({"moved": count})

    @action(detail=False, methods=["post"], url_path="bulk-assign")
    def bulk_assign(self, request):
        lead_ids = request.data.get("lead_ids", [])
        user_id = request.data.get("user_id")
        if not lead_ids:
            return Response(
                {"error": "lead_ids is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = None
        if user_id:
            try:
                user = User.objects.get(pk=user_id)
            except User.DoesNotExist:
                return Response(
                    {"error": "User not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )
        leads = Lead.objects.filter(pk__in=lead_ids)
        count = leads.update(assigned_to=user)
        return Response({"assigned": count})

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        lead_ids = request.data.get("lead_ids", [])
        if not lead_ids:
            return Response(
                {"error": "lead_ids is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        leads = Lead.objects.filter(pk__in=lead_ids)
        count = leads.count()
        leads.delete()
        return Response({"deleted": count})

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            notes = LeadNote.objects.filter(lead=lead).select_related("user")
            serializer = LeadNoteSerializer(notes, many=True)
            return Response(serializer.data)
        else:
            serializer = LeadNoteSerializer(data={**request.data, "lead": lead.id})
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user, lead=lead)
            LeadActivity.objects.create(
                lead=lead,
                user=request.user,
                action="note_added",
                new_value=request.data.get("note_type", "note"),
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="activities")
    def activities(self, request, pk=None):
        lead = self.get_object()
        activities = LeadActivity.objects.filter(lead=lead).select_related("user")
        serializer = LeadActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            comments = LeadComment.objects.filter(lead=lead).select_related("author")
            serializer = LeadCommentSerializer(comments, many=True)
            return Response(serializer.data)
        else:
            serializer = LeadCommentSerializer(data={**request.data, "lead": lead.id})
            serializer.is_valid(raise_exception=True)
            serializer.save(author=request.user, lead=lead)
            LeadActivity.objects.create(
                lead=lead,
                user=request.user,
                action="comment_added",
                new_value=request.data.get("text", "")[:100],
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post", "delete"], url_path="tags")
    def tags(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            assignments = LeadTagAssignment.objects.filter(lead=lead).select_related("tag")
            serializer = LeadTagAssignmentSerializer(assignments, many=True)
            return Response(serializer.data)
        elif request.method == "POST":
            tag_id = request.data.get("tag_id")
            if not tag_id:
                return Response({"error": "tag_id required"}, status=status.HTTP_400_BAD_REQUEST)
            try:
                tag = LeadTag.objects.get(pk=tag_id)
            except LeadTag.DoesNotExist:
                return Response({"error": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)
            assignment, created = LeadTagAssignment.objects.get_or_create(lead=lead, tag=tag)
            if created:
                LeadActivity.objects.create(
                    lead=lead,
                    user=request.user,
                    action="tag_added",
                    new_value=tag.name,
                )
            return Response(
                LeadTagAssignmentSerializer(assignment).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        else:
            tag_id = request.data.get("tag_id")
            if tag_id:
                deleted, _ = LeadTagAssignment.objects.filter(lead=lead, tag_id=tag_id).delete()
                if deleted:
                    try:
                        tag = LeadTag.objects.get(pk=tag_id)
                        LeadActivity.objects.create(
                            lead=lead,
                            user=request.user,
                            action="tag_removed",
                            old_value=tag.name,
                        )
                    except LeadTag.DoesNotExist:
                        pass
            return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        now = timezone.now()
        days = int(request.query_params.get("days", 30))
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        pipeline_id = request.query_params.get("pipeline")

        if start_date:
            from datetime import datetime
            start = datetime.strptime(start_date, "%Y-%m-%d")
            start = timezone.make_aware(start) if timezone.is_naive(start) else start
        else:
            start = now - timedelta(days=days)

        if end_date:
            from datetime import datetime
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = timezone.make_aware(end) if timezone.is_naive(end) else end
        else:
            end = now

        leads_qs = Lead.objects.filter(created_at__gte=start, created_at__lte=end)
        sales_qs = Sale.objects.filter(created_at__gte=start, created_at__lte=end)

        if pipeline_id:
            leads_qs = leads_qs.filter(stage__pipeline_id=pipeline_id)
            sales_qs = sales_qs.filter(lead__stage__pipeline_id=pipeline_id)

        total_leads = leads_qs.count()
        total_sales = sales_qs.count()
        total_revenue = sales_qs.filter(stage="won").aggregate(
            total=Sum("total_value")
        )["total"] or 0

        # Leads per stage grouped by pipeline
        stage_qs = Lead.objects.filter(stage__isnull=False)
        if pipeline_id:
            stage_qs = stage_qs.filter(stage__pipeline_id=pipeline_id)
        leads_per_stage = list(
            stage_qs
            .values(
                "stage__name", "stage__color", "stage__order",
                "stage__pipeline__name", "stage__pipeline_id"
            )
            .annotate(count=Count("id"), total_value=Sum("value"))
            .order_by("stage__pipeline__name", "stage__order")
        )

        # Leads per day
        leads_per_day = list(
            leads_qs.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        # Top assignees
        assignees_qs = Lead.objects.filter(assigned_to__isnull=False)
        if pipeline_id:
            assignees_qs = assignees_qs.filter(stage__pipeline_id=pipeline_id)
        top_assignees = list(
            assignees_qs
            .values("assigned_to__username", "assigned_to__first_name", "assigned_to__last_name")
            .annotate(count=Count("id"), total_value=Sum("value"))
            .order_by("-count")[:10]
        )

        # Leads per source
        source_qs = leads_qs if pipeline_id else Lead.objects.all()
        if pipeline_id:
            source_qs = source_qs.filter(stage__pipeline_id=pipeline_id)
        leads_per_source = list(
            source_qs
            .values("source")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Pipeline summary
        pipeline_summary = list(
            Lead.objects.filter(stage__isnull=False)
            .values("stage__pipeline__name", "stage__pipeline_id")
            .annotate(
                count=Count("id"),
                total_value=Sum("value"),
            )
            .order_by("-count")
        )

        # Sales pipeline stages
        sales_by_stage = list(
            Sale.objects.values("stage")
            .annotate(count=Count("id"), total=Sum("total_value"))
            .order_by("stage")
        )

        # Conversion rate
        base_qs = leads_qs if pipeline_id else Lead.objects.all()
        converted_count = base_qs.filter(
            stage__name__in=["Convertido", "Finalizado"]
        ).count()
        all_leads_count = base_qs.count()
        conversion_rate = (converted_count / all_leads_count * 100) if all_leads_count > 0 else 0

        # Average deal size
        avg_deal = sales_qs.filter(stage="won").aggregate(
            avg=Avg("total_value")
        )["avg"] or 0

        return Response({
            "total_leads": total_leads,
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
            "conversion_rate": round(conversion_rate, 1),
            "avg_deal_size": float(avg_deal),
            "leads_per_stage": [
                {
                    "name": s["stage__name"],
                    "color": s["stage__color"],
                    "count": s["count"],
                    "total_value": float(s["total_value"] or 0),
                    "pipeline": s["stage__pipeline__name"],
                    "pipeline_id": str(s["stage__pipeline_id"]),
                }
                for s in leads_per_stage
            ],
            "leads_per_day": [
                {
                    "date": d["date"].isoformat() if d["date"] else None,
                    "count": d["count"],
                }
                for d in leads_per_day
            ],
            "top_assignees": [
                {
                    "name": a.get("assigned_to__first_name", "") + " " + a.get("assigned_to__last_name", "") if a.get("assigned_to__first_name") else a["assigned_to__username"],
                    "count": a["count"],
                    "total_value": float(a["total_value"] or 0),
                }
                for a in top_assignees
            ],
            "leads_per_source": [
                {
                    "source": s["source"] or "unknown",
                    "count": s["count"],
                }
                for s in leads_per_source
            ],
            "pipeline_summary": [
                {
                    "name": p["stage__pipeline__name"],
                    "pipeline_id": str(p["stage__pipeline_id"]),
                    "count": p["count"],
                    "total_value": float(p["total_value"] or 0),
                }
                for p in pipeline_summary
            ],
            "sales_pipeline": [
                {
                    "stage": s["stage"],
                    "count": s["count"],
                    "total": float(s["total"] or 0),
                }
                for s in sales_by_stage
            ],
        })


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related("lead", "assigned_to")
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TaskFilter
    search_fields = ["title"]
    ordering_fields = ["due_date", "priority", "created_at"]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["type", "parent"]
    search_fields = ["name"]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category")
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter
    search_fields = ["name", "sku"]
    ordering_fields = ["name", "price", "created_at"]


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("lead", "created_by").prefetch_related("line_items")
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SaleFilter
    search_fields = ["notes"]
    ordering_fields = ["total_value", "created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SaleDetailSerializer
        return SaleSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "retrieve":
            qs = qs.prefetch_related("payments", "attachments", "line_items__product")
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="line-items")
    def add_line_item(self, request, pk=None):
        sale = self.get_object()
        data = {**request.data, "sale": sale.id}
        serializer = SaleLineItemSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        total = sale.line_items.aggregate(total=Sum("subtotal"))["total"] or 0
        sale.total_value = total
        sale.save(update_fields=["total_value", "updated_at"])
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="line-items-list")
    def list_line_items(self, request, pk=None):
        sale = self.get_object()
        items = sale.line_items.select_related("product").all()
        serializer = SaleLineItemSerializer(items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="kpis")
    def kpis(self, request):
        """Sales KPIs: totals by stage, conversion rate, average ticket, top products, top sellers."""
        qs = self.filter_queryset(self.get_queryset())

        total_sales = qs.count()
        total_amount = float(qs.aggregate(
            total=Coalesce(Sum("total_value"), Decimal("0"))
        )["total"])
        avg_ticket = float(qs.aggregate(
            avg=Coalesce(Avg("total_value"), Decimal("0"))
        )["avg"])

        # By stage
        by_stage = {}
        for stage_code, stage_label in Sale.STAGE_CHOICES:
            stage_qs = qs.filter(stage=stage_code)
            count = stage_qs.count()
            amount = float(stage_qs.aggregate(
                total=Coalesce(Sum("total_value"), Decimal("0"))
            )["total"])
            stage_avg = float(stage_qs.aggregate(
                avg=Coalesce(Avg("total_value"), Decimal("0"))
            )["avg"])
            by_stage[stage_code] = {
                "label": stage_label,
                "count": count,
                "total_amount": amount,
                "average_ticket": stage_avg,
                "percentage": round((count / total_sales * 100), 2) if total_sales > 0 else 0,
                "amount_percentage": round((amount / total_amount * 100), 2) if total_amount > 0 else 0,
            }

        # Conversion rates
        won_count = by_stage.get("won", {}).get("count", 0)
        lost_count = by_stage.get("lost", {}).get("count", 0)
        concluded = won_count + lost_count
        conversion_rate = round((won_count / concluded * 100), 2) if concluded > 0 else 0
        loss_rate = round((lost_count / concluded * 100), 2) if concluded > 0 else 0

        # Top products
        top_products = list(
            SaleLineItem.objects.filter(sale__in=qs, product__isnull=False)
            .values("product__name")
            .annotate(
                total_quantity=Sum("quantity"),
                total_revenue=Sum("subtotal"),
            )
            .order_by("-total_revenue")[:10]
        )

        # Top sellers
        top_sellers = list(
            qs.filter(created_by__isnull=False)
            .values("created_by__username")
            .annotate(
                count=Count("id"),
                total_amount=Sum("total_value"),
            )
            .order_by("-total_amount")[:10]
        )

        return Response({
            "summary": {
                "total_sales": total_sales,
                "total_amount": total_amount,
                "average_ticket": avg_ticket,
                "conversion_rate": conversion_rate,
                "loss_rate": loss_rate,
            },
            "by_stage": by_stage,
            "top_products": [
                {
                    "name": p["product__name"],
                    "quantity": p["total_quantity"],
                    "revenue": float(p["total_revenue"] or 0),
                }
                for p in top_products
            ],
            "top_sellers": [
                {
                    "name": s["created_by__username"],
                    "count": s["count"],
                    "total_amount": float(s["total_amount"] or 0),
                }
                for s in top_sellers
            ],
        })


class SaleLineItemViewSet(viewsets.ModelViewSet):
    queryset = SaleLineItem.objects.select_related("product", "sale")
    serializer_class = SaleLineItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["sale"]

    def perform_destroy(self, instance):
        sale = instance.sale
        instance.delete()
        total = sale.line_items.aggregate(total=Sum("subtotal"))["total"] or 0
        sale.total_value = total
        sale.save(update_fields=["total_value", "updated_at"])


class FinancialRecordViewSet(viewsets.ModelViewSet):
    queryset = FinancialRecord.objects.select_related("sale")
    serializer_class = FinancialRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = FinancialRecordFilter
    ordering_fields = ["date", "value", "created_at"]


class LeadCommentViewSet(viewsets.ModelViewSet):
    queryset = LeadComment.objects.select_related("lead", "author")
    serializer_class = LeadCommentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["lead"]
    search_fields = ["text"]
    ordering_fields = ["created_at"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class LeadTagViewSet(viewsets.ModelViewSet):
    queryset = LeadTag.objects.all()
    serializer_class = LeadTagSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["name"]


class LeadTagAssignmentViewSet(viewsets.ModelViewSet):
    queryset = LeadTagAssignment.objects.select_related("lead", "tag")
    serializer_class = LeadTagAssignmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["lead", "tag"]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("sale", "taker")
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["sale", "method", "status"]
    ordering_fields = ["amount", "due_date", "created_at"]

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        qs = self.filter_queryset(self.get_queryset())
        total = float(qs.aggregate(total=Coalesce(Sum("amount"), Decimal("0")))["total"])
        by_method = list(
            qs.values("method").annotate(
                count=Count("id"), total=Sum("amount")
            ).order_by("-total")
        )
        by_status = list(
            qs.values("status").annotate(
                count=Count("id"), total=Sum("amount")
            ).order_by("-total")
        )
        return Response({
            "total_payments": qs.count(),
            "total_amount": total,
            "by_method": [
                {"method": m["method"], "count": m["count"], "total": float(m["total"] or 0)}
                for m in by_method
            ],
            "by_status": [
                {"status": s["status"], "count": s["count"], "total": float(s["total"] or 0)}
                for s in by_status
            ],
        })


class SaleAttachmentViewSet(viewsets.ModelViewSet):
    queryset = SaleAttachment.objects.select_related("sale", "uploaded_by")
    serializer_class = SaleAttachmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["sale"]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class FinancialOverviewView(APIView):
    """Financial overview based on actual Sale data (won sales as revenue)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        year = int(request.query_params.get("year", now.year))

        # Check if FinancialRecord has data
        fr_count = FinancialRecord.objects.filter(date__year=year).count()

        if fr_count > 0:
            records = FinancialRecord.objects.filter(date__year=year)
            total_revenue = float(
                records.filter(type="revenue").aggregate(total=Sum("value"))["total"] or 0
            )
            total_expenses = float(
                records.filter(type="expense").aggregate(total=Sum("value"))["total"] or 0
            )
            total_refunds = float(
                records.filter(type="refund").aggregate(total=Sum("value"))["total"] or 0
            )

            monthly = (
                records.annotate(month=TruncMonth("date"))
                .values("month", "type")
                .annotate(total=Sum("value"))
                .order_by("month")
            )
            monthly_breakdown = {}
            for row in monthly:
                key = row["month"].strftime("%Y-%m")
                if key not in monthly_breakdown:
                    monthly_breakdown[key] = {"revenue": 0.0, "expense": 0.0, "refund": 0.0}
                monthly_breakdown[key][row["type"]] = float(row["total"])
        else:
            sales_qs = Sale.objects.filter(created_at__year=year)

            total_revenue = float(
                sales_qs.filter(stage="won").aggregate(
                    total=Coalesce(Sum("total_value"), Decimal("0"))
                )["total"]
            )
            total_refunds = float(
                sales_qs.filter(stage="lost").aggregate(
                    total=Coalesce(Sum("total_value"), Decimal("0"))
                )["total"]
            )
            total_expenses = 0.0

            monthly_won = (
                sales_qs.filter(stage="won")
                .annotate(month=TruncMonth("created_at"))
                .values("month")
                .annotate(total=Sum("total_value"))
                .order_by("month")
            )
            monthly_lost = (
                sales_qs.filter(stage="lost")
                .annotate(month=TruncMonth("created_at"))
                .values("month")
                .annotate(total=Sum("total_value"))
                .order_by("month")
            )

            monthly_breakdown = {}
            for row in monthly_won:
                key = row["month"].strftime("%Y-%m")
                monthly_breakdown[key] = {
                    "revenue": float(row["total"] or 0),
                    "expense": 0.0,
                    "refund": 0.0,
                }
            for row in monthly_lost:
                key = row["month"].strftime("%Y-%m")
                if key not in monthly_breakdown:
                    monthly_breakdown[key] = {"revenue": 0.0, "expense": 0.0, "refund": 0.0}
                monthly_breakdown[key]["refund"] = float(row["total"] or 0)

        net = total_revenue - total_expenses - total_refunds

        response_data = {
            "year": year,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "total_refunds": total_refunds,
            "net": net,
            "monthly_breakdown": monthly_breakdown,
        }

        if fr_count == 0:
            sales_qs = Sale.objects.filter(created_at__year=year)
            response_data["sales_pipeline"] = {
                "negotiation": {
                    "count": sales_qs.filter(stage="negotiation").count(),
                    "total": float(sales_qs.filter(stage="negotiation").aggregate(
                        total=Coalesce(Sum("total_value"), Decimal("0"))
                    )["total"]),
                },
                "proposal": {
                    "count": sales_qs.filter(stage="proposal").count(),
                    "total": float(sales_qs.filter(stage="proposal").aggregate(
                        total=Coalesce(Sum("total_value"), Decimal("0"))
                    )["total"]),
                },
                "won": {
                    "count": sales_qs.filter(stage="won").count(),
                    "total": total_revenue,
                },
                "lost": {
                    "count": sales_qs.filter(stage="lost").count(),
                    "total": total_refunds,
                },
            }

        return Response(response_data)


# ============================================================================
# Sprint 2 Views - Contacts, Invoices, Tickets, Email, Calendar, Notes
# ============================================================================


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.select_related("lead", "owner").prefetch_related("tags")
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["source", "is_active", "city", "state", "owner"]
    search_fields = ["name", "email", "phone", "company", "cpf"]
    ordering_fields = ["name", "created_at", "updated_at"]

    @action(detail=False, methods=["post"], url_path="import-csv")
    def import_csv(self, request):
        import csv, io
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "CSV file required"}, status=status.HTTP_400_BAD_REQUEST)
        decoded = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(decoded))
        created = 0
        skipped = 0
        for row in reader:
            name = row.get("name", row.get("nome", "")).strip()
            if not name:
                skipped += 1
                continue
            Contact.objects.create(
                name=name,
                email=row.get("email", "").strip(),
                phone=row.get("phone", row.get("telefone", "")).strip(),
                company=row.get("company", row.get("empresa", "")).strip(),
                position=row.get("position", row.get("cargo", "")).strip(),
                cpf=row.get("cpf", "").strip(),
                city=row.get("city", row.get("cidade", "")).strip(),
                state=row.get("state", row.get("estado", "")).strip(),
                source="import",
                owner=request.user,
            )
            created += 1
        return Response({"created": created, "skipped": skipped})

    @action(detail=False, methods=["post"], url_path="merge")
    def merge(self, request):
        primary_id = request.data.get("primary_id")
        merge_ids = request.data.get("merge_ids", [])
        if not primary_id or not merge_ids:
            return Response({"error": "primary_id and merge_ids required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            primary = Contact.objects.get(pk=primary_id)
        except Contact.DoesNotExist:
            return Response({"error": "Primary contact not found"}, status=status.HTTP_404_NOT_FOUND)
        duplicates = Contact.objects.filter(pk__in=merge_ids).exclude(pk=primary_id)
        for dup in duplicates:
            if not primary.email and dup.email:
                primary.email = dup.email
            if not primary.phone and dup.phone:
                primary.phone = dup.phone
            if not primary.company and dup.company:
                primary.company = dup.company
            if not primary.cpf and dup.cpf:
                primary.cpf = dup.cpf
            for tag in dup.tags.all():
                primary.tags.add(tag)
        primary.save()
        merged = duplicates.count()
        duplicates.delete()
        return Response({"merged": merged, "primary": ContactSerializer(primary).data})

    @action(detail=False, methods=["get"], url_path="export")
    def export(self, request):
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="contacts.csv"'
        writer = csv.writer(response)
        writer.writerow(["Nome", "Email", "Telefone", "Empresa", "Cargo", "CPF", "Cidade", "Estado", "Fonte"])
        for c in self.filter_queryset(self.get_queryset()):
            writer.writerow([c.name, c.email, c.phone, c.company, c.position, c.cpf, c.city, c.state, c.source])
        return response


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related("lead", "contact", "sale", "created_by").prefetch_related("items")
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "lead", "contact"]
    search_fields = ["number", "notes"]
    ordering_fields = ["issue_date", "due_date", "total", "created_at"]

    def perform_create(self, serializer):
        last = Invoice.objects.order_by("-number").first()
        if last and last.number.isdigit():
            next_num = str(int(last.number) + 1).zfill(6)
        else:
            next_num = "000001"
        serializer.save(created_by=self.request.user, number=next_num)

    @action(detail=True, methods=["post"], url_path="add-item")
    def add_item(self, request, pk=None):
        invoice = self.get_object()
        data = {**request.data, "invoice": invoice.id}
        serializer = InvoiceItemSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        invoice.recalculate()
        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="remove-item/(?P<item_id>[^/.]+)")
    def remove_item(self, request, pk=None, item_id=None):
        invoice = self.get_object()
        InvoiceItem.objects.filter(pk=item_id, invoice=invoice).delete()
        invoice.recalculate()
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = "paid"
        invoice.paid_at = timezone.now()
        invoice.save(update_fields=["status", "paid_at", "updated_at"])
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        from django.db.models.functions import Coalesce
        qs = self.filter_queryset(self.get_queryset())
        by_status = list(
            qs.values("status").annotate(count=Count("id"), total=Sum("total")).order_by("status")
        )
        overdue_count = qs.filter(status__in=["sent", "draft"], due_date__lt=timezone.now().date()).count()
        return Response({
            "total_invoices": qs.count(),
            "total_value": float(qs.aggregate(t=Sum("total"))["t"] or 0),
            "by_status": [{"status": s["status"], "count": s["count"], "total": float(s["total"] or 0)} for s in by_status],
            "overdue_count": overdue_count,
        })


class InvoiceItemViewSet(viewsets.ModelViewSet):
    queryset = InvoiceItem.objects.select_related("product", "invoice")
    serializer_class = InvoiceItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["invoice"]


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.select_related("lead", "contact", "assigned_to", "created_by")
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "priority", "category", "assigned_to", "lead", "contact"]
    search_fields = ["title", "description"]
    ordering_fields = ["priority", "status", "created_at", "updated_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return TicketListSerializer
        return TicketSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        ticket = self.get_object()
        if request.method == "GET":
            msgs = ticket.messages.select_related("author").all()
            return Response(TicketMessageSerializer(msgs, many=True).data)
        serializer = TicketMessageSerializer(data={**request.data, "ticket": ticket.id})
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = "resolved"
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=["status", "resolved_at", "updated_at"])
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = "closed"
        ticket.closed_at = timezone.now()
        ticket.save(update_fields=["status", "closed_at", "updated_at"])
        return Response(TicketSerializer(ticket).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        qs = self.filter_queryset(self.get_queryset())
        total = qs.count()
        status_counts = dict(qs.values_list("status").annotate(count=Count("id")).values_list("status", "count"))
        return Response({
            "total": total,
            "open": status_counts.get("open", 0),
            "in_progress": status_counts.get("in_progress", 0),
            "waiting": status_counts.get("waiting", 0),
            "resolved": status_counts.get("resolved", 0),
            "closed": status_counts.get("closed", 0),
        })


class TicketMessageViewSet(viewsets.ModelViewSet):
    queryset = TicketMessage.objects.select_related("ticket", "author")
    serializer_class = TicketMessageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["ticket", "is_internal"]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class EmailTemplateViewSet(viewsets.ModelViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, DjangoFilterBackend]
    filterset_fields = ["category", "is_active"]
    search_fields = ["name", "subject"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="send")
    def send_email(self, request, pk=None):
        template = self.get_object()
        to_email = request.data.get("to")
        variables = request.data.get("variables", {})
        if not to_email:
            return Response({"error": "to email required"}, status=status.HTTP_400_BAD_REQUEST)
        subject = template.subject
        body = template.body_html
        for key, val in variables.items():
            subject = subject.replace("{{" + key + "}}", str(val))
            body = body.replace("{{" + key + "}}", str(val))
        from django.core.mail import send_mail
        try:
            send_mail(subject, template.body_text or "", None, [to_email], html_message=body)
            return Response({"sent": True, "to": to_email})
        except Exception as e:
            return Response({"sent": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CalendarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")
        events = []
        task_qs = Task.objects.filter(due_date__isnull=False).select_related("lead", "assigned_to")
        if start:
            task_qs = task_qs.filter(due_date__gte=start)
        if end:
            task_qs = task_qs.filter(due_date__lte=end)
        for t in task_qs:
            events.append({
                "id": str(t.id),
                "title": t.title,
                "start": t.due_date.isoformat() if t.due_date else None,
                "type": "task",
                "status": t.status,
                "priority": t.priority,
                "lead_id": str(t.lead_id) if t.lead_id else None,
                "lead_name": t.lead.name if t.lead else None,
                "assigned_to_name": t.assigned_to.get_full_name() or t.assigned_to.username if t.assigned_to else None,
            })
        ticket_qs = Ticket.objects.filter(created_at__isnull=False).select_related("lead", "assigned_to")
        if start:
            ticket_qs = ticket_qs.filter(created_at__gte=start)
        if end:
            ticket_qs = ticket_qs.filter(created_at__lte=end)
        for tk in ticket_qs[:50]:
            events.append({
                "id": str(tk.id),
                "title": tk.title,
                "start": tk.created_at.isoformat(),
                "type": "ticket",
                "status": tk.status,
                "priority": tk.priority,
                "lead_id": str(tk.lead_id) if tk.lead_id else None,
                "lead_name": tk.lead.name if tk.lead else None,
            })
        return Response(events)


class AllNotesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        note_type = request.query_params.get("note_type")
        lead_id = request.query_params.get("lead")
        search = request.query_params.get("search", "")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))
        qs = LeadNote.objects.select_related("lead", "user").all()
        if note_type:
            qs = qs.filter(note_type=note_type)
        if lead_id:
            qs = qs.filter(lead_id=lead_id)
        if search:
            qs = qs.filter(content__icontains=search)
        total = qs.count()
        offset = (page - 1) * page_size
        notes = qs[offset:offset + page_size]
        data = []
        for n in notes:
            data.append({
                "id": str(n.id),
                "lead_id": str(n.lead_id),
                "lead_name": n.lead.name if n.lead else None,
                "user_name": (n.user.get_full_name() or n.user.username) if n.user else None,
                "content": n.content,
                "note_type": n.note_type,
                "created_at": n.created_at.isoformat(),
            })
        return Response({"count": total, "page": page, "page_size": page_size, "results": data})
