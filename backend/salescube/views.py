from datetime import timedelta

from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth, TruncDate
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
from .serializers import (
    CategorySerializer,
    FinancialRecordSerializer,
    LeadActivitySerializer,
    LeadDetailSerializer,
    LeadNoteSerializer,
    LeadSerializer,
    PipelineSerializer,
    PipelineStageSerializer,
    ProductSerializer,
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

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.prefetch_related("stages")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        # Add leads_count and total_value to each stage
        for stage_data in data.get("stages", []):
            stage_id = stage_data["id"]
            agg = Lead.objects.filter(stage_id=stage_id).aggregate(
                count=Count("id"), total=Sum("value")
            )
            stage_data["leads_count"] = agg["count"] or 0
            stage_data["total_value"] = float(agg["total"] or 0)
        return Response(data)


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
            qs = qs.prefetch_related("lead_notes", "activities", "tasks", "sales")
        # Support filtering by pipeline
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
        # Log activity
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

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            notes = LeadNote.objects.filter(lead=lead)
            serializer = LeadNoteSerializer(notes, many=True)
            return Response(serializer.data)
        else:
            serializer = LeadNoteSerializer(data={**request.data, "lead": lead.id})
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user, lead=lead)
            # Log activity
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
        activities = LeadActivity.objects.filter(lead=lead)
        serializer = LeadActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        now = timezone.now()
        days = int(request.query_params.get("days", 30))
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

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

        total_leads = leads_qs.count()
        total_sales = sales_qs.count()
        total_revenue = sales_qs.filter(stage="won").aggregate(
            total=Sum("total_value")
        )["total"] or 0

        # Leads per stage
        leads_per_stage = list(
            Lead.objects.filter(stage__isnull=False)
            .values("stage__name", "stage__color", "stage__order")
            .annotate(count=Count("id"), total_value=Sum("value"))
            .order_by("stage__order")
        )

        # Leads per day
        leads_per_day = list(
            leads_qs.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        # Top assignees
        top_assignees = list(
            Lead.objects.filter(assigned_to__isnull=False)
            .values("assigned_to__username")
            .annotate(count=Count("id"), total_value=Sum("value"))
            .order_by("-count")[:10]
        )

        return Response({
            "total_leads": total_leads,
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
            "leads_per_stage": [
                {
                    "name": s["stage__name"],
                    "color": s["stage__color"],
                    "count": s["count"],
                    "total_value": float(s["total_value"] or 0),
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
                    "name": a["assigned_to__username"],
                    "count": a["count"],
                    "total_value": float(a["total_value"] or 0),
                }
                for a in top_assignees
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

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="line-items")
    def add_line_item(self, request, pk=None):
        sale = self.get_object()
        data = {**request.data, "sale": sale.id}
        serializer = SaleLineItemSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Recalculate total
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


class SaleLineItemViewSet(viewsets.ModelViewSet):
    queryset = SaleLineItem.objects.select_related("product", "sale")
    serializer_class = SaleLineItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["sale"]

    def perform_destroy(self, instance):
        sale = instance.sale
        instance.delete()
        # Recalculate total
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


class FinancialOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        year = int(request.query_params.get("year", now.year))

        records = FinancialRecord.objects.filter(date__year=year)

        total_revenue = (
            records.filter(type="revenue").aggregate(total=Sum("value"))["total"] or 0
        )
        total_expenses = (
            records.filter(type="expense").aggregate(total=Sum("value"))["total"] or 0
        )
        total_refunds = (
            records.filter(type="refund").aggregate(total=Sum("value"))["total"] or 0
        )
        net = total_revenue - total_expenses - total_refunds

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
                monthly_breakdown[key] = {"revenue": 0, "expense": 0, "refund": 0}
            monthly_breakdown[key][row["type"]] = float(row["total"])

        return Response(
            {
                "year": year,
                "total_revenue": float(total_revenue),
                "total_expenses": float(total_expenses),
                "total_refunds": float(total_refunds),
                "net": float(net),
                "monthly_breakdown": monthly_breakdown,
            }
        )
