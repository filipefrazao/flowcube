import django_filters

from .models import FinancialRecord, Lead, Product, Sale, Task


class LeadFilter(django_filters.FilterSet):
    score_min = django_filters.NumberFilter(field_name="score", lookup_expr="gte")
    score_max = django_filters.NumberFilter(field_name="score", lookup_expr="lte")

    class Meta:
        model = Lead
        fields = ["stage", "assigned_to", "source", "score_min", "score_max"]


class TaskFilter(django_filters.FilterSet):
    class Meta:
        model = Task
        fields = ["status", "priority", "assigned_to", "lead"]


class ProductFilter(django_filters.FilterSet):
    class Meta:
        model = Product
        fields = ["category", "active"]


class SaleFilter(django_filters.FilterSet):
    class Meta:
        model = Sale
        fields = ["stage", "lead", "created_by"]


class FinancialRecordFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = FinancialRecord
        fields = ["type", "sale", "date_from", "date_to"]
