from rest_framework import serializers

from .models import ReportDefinition, ReportExecution


class ReportDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportDefinition
        fields = [
            "id", "name", "slug", "description", "query_template",
            "parameters", "chart_type", "created_at", "updated_at",
        ]


class ReportExecutionSerializer(serializers.ModelSerializer):
    definition_name = serializers.SerializerMethodField()

    class Meta:
        model = ReportExecution
        fields = [
            "id", "definition", "definition_name", "user",
            "params", "result", "row_count", "created_at",
        ]
        read_only_fields = ["user", "result", "row_count"]

    def get_definition_name(self, obj):
        return obj.definition.name if obj.definition else None


class ReportExecuteSerializer(serializers.Serializer):
    params = serializers.DictField(required=False, default=dict)
