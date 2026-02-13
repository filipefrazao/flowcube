from datetime import timedelta

from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
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
    Pipeline,
    PipelineStage,
    Product,
    Sale,
    Task,
)
from .serializers import (
    CategorySerializer,
    FinancialRecordSerializer,
    LeadSerializer,
    PipelineSerializer,
    PipelineStageSerializer,
    ProductSerializer,
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
        return qs.prefetch_related(
            "stages",
        )


class PipelineStageViewSet(viewsets.ModelViewSet):
    queryset = PipelineStage.objects.all()
    serializer_class = PipelineStageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["pipeline"]
    ordering_fields = ["order"]

    def get_queryset(self):
        return PipelineStage.objects.annotate(leads_count=Count("leads"))


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related("stage", "assigned_to")
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = LeadFilter
    search_fields = ["name", "email", "phone", "company"]
    ordering_fields = ["name", "score", "value", "created_at", "updated_at"]

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
        lead.stage = stage
        lead.save(update_fields=["stage", "updated_at"])
        return Response(LeadSerializer(lead).data)


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
    queryset = Sale.objects.select_related("lead", "created_by")
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SaleFilter
    search_fields = ["notes"]
    ordering_fields = ["total_value", "created_at"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


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
