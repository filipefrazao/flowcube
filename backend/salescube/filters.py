import django_filters

from .models import FinancialRecord, Lead, Product, Reminder, Sale, Task


class LeadFilter(django_filters.FilterSet):
    score_min = django_filters.NumberFilter(field_name="score", lookup_expr="gte")
    score_max = django_filters.NumberFilter(field_name="score", lookup_expr="lte")
    pipeline = django_filters.UUIDFilter(field_name="stage__pipeline")
    origin = django_filters.UUIDFilter(field_name="origin")
    squad = django_filters.UUIDFilter(field_name="squads")
    franchise = django_filters.UUIDFilter(field_name="franchises")

    class Meta:
        model = Lead
        fields = ["stage", "assigned_to", "source", "origin", "score_min", "score_max", "pipeline", "squad", "franchise"]


class TaskFilter(django_filters.FilterSet):
    task_type = django_filters.UUIDFilter(field_name="task_type")

    class Meta:
        model = Task
        fields = ["status", "priority", "assigned_to", "lead", "task_type"]


class ProductFilter(django_filters.FilterSet):
    class Meta:
        model = Product
        fields = ["category", "active"]


class SaleFilter(django_filters.FilterSet):
    squad = django_filters.UUIDFilter(field_name="squads")

    class Meta:
        model = Sale
        fields = ["stage", "lead", "created_by", "squad"]


class FinancialRecordFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = FinancialRecord
        fields = ["type", "sale", "date_from", "date_to"]


class ReminderFilter(django_filters.FilterSet):
    remind_from = django_filters.DateTimeFilter(field_name="remind_at", lookup_expr="gte")
    remind_to = django_filters.DateTimeFilter(field_name="remind_at", lookup_expr="lte")

    class Meta:
        model = Reminder
        fields = ["is_completed", "assigned_to", "lead", "task", "remind_from", "remind_to"]
