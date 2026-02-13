import csv
import io

from django.db import connection
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ReportDefinition, ReportExecution
from .serializers import (
    ReportDefinitionSerializer,
    ReportExecuteSerializer,
    ReportExecutionSerializer,
)


class ReportDefinitionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReportDefinition.objects.all()
    serializer_class = ReportDefinitionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ["name", "description"]
    lookup_field = "slug"


class ReportExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ReportExecution.objects.select_related("definition")
    serializer_class = ReportExecutionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReportExecution.objects.filter(
            user=self.request.user
        ).select_related("definition")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def report_execute(request, slug):
    try:
        definition = ReportDefinition.objects.get(slug=slug)
    except ReportDefinition.DoesNotExist:
        return Response(
            {"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND
        )

    serializer = ReportExecuteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    params = serializer.validated_data.get("params", {})

    try:
        with connection.cursor() as cursor:
            cursor.execute(definition.query_template, params)
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            result = {
                "columns": columns,
                "rows": [dict(zip(columns, row)) for row in rows],
            }
    except Exception as e:
        return Response(
            {"error": str(e)}, status=status.HTTP_400_BAD_REQUEST
        )

    execution = ReportExecution.objects.create(
        definition=definition,
        user=request.user,
        params=params,
        result=result,
        row_count=len(rows),
    )

    return Response(
        ReportExecutionSerializer(execution).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_export(request, execution_id):
    try:
        execution = ReportExecution.objects.get(
            pk=execution_id, user=request.user
        )
    except ReportExecution.DoesNotExist:
        return Response(
            {"error": "Execution not found"}, status=status.HTTP_404_NOT_FOUND
        )

    fmt = request.query_params.get("format", "csv")
    result = execution.result

    if not result or "columns" not in result:
        return Response(
            {"error": "No data to export"}, status=status.HTTP_400_BAD_REQUEST
        )

    if fmt == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=result["columns"])
        writer.writeheader()
        for row in result.get("rows", []):
            writer.writerow(row)
        response = HttpResponse(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="{execution.definition.slug}_{execution.created_at.strftime("%Y%m%d")}.csv"'
        )
        return response

    return Response(
        {"error": f"Unsupported format: {fmt}"},
        status=status.HTTP_400_BAD_REQUEST,
    )
