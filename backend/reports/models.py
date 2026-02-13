from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class ReportDefinition(models.Model):
    CHART_CHOICES = [
        ("bar", "Bar"),
        ("line", "Line"),
        ("pie", "Pie"),
        ("table", "Table"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, default="")
    query_template = models.TextField(help_text="SQL query template with %(param)s placeholders")
    parameters = models.JSONField(
        default=list, blank=True,
        help_text="List of parameter definitions: [{name, type, label, default}]",
    )
    chart_type = models.CharField(max_length=10, choices=CHART_CHOICES, default="table")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ReportExecution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    definition = models.ForeignKey(
        ReportDefinition, on_delete=models.CASCADE, related_name="executions",
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="report_executions",
    )
    params = models.JSONField(default=dict, blank=True)
    result = models.JSONField(default=dict, blank=True)
    row_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.definition.name} - {self.created_at}"
