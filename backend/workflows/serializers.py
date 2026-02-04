"""
FlowCube 3.0 Serializers
"""
from rest_framework import serializers
from django.utils.html import escape
from .models import (
    AIAssistant, BrazilianContext, AutomationSuggestion,
    Workflow, WorkflowVersion, Execution, NodeExecutionLog,
    NodeAnalytics, Group, Block, Edge, Variable
)


class NodeAnalyticsSerializer(serializers.ModelSerializer):
    conversion_rate = serializers.ReadOnlyField()
    drop_off_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = NodeAnalytics
        fields = [
            'id', 'node_id', 'views', 'conversions', 'drop_offs',
            'revenue', 'avg_time_on_node_ms', 'conversion_rate',
            'drop_off_rate', 'period_start', 'period_end', 'updated_at'
        ]


class NodeExecutionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NodeExecutionLog
        fields = [
            'id', 'node_id', 'node_type', 'node_label', 'status',
            'input_data', 'output_data', 'error_details',
            'duration_ms', 'started_at'
        ]


class ExecutionSerializer(serializers.ModelSerializer):
    node_logs = NodeExecutionLogSerializer(many=True, read_only=True)
    duration_ms = serializers.ReadOnlyField()
    
    class Meta:
        model = Execution
        fields = [
            'id', 'workflow', 'version', 'status', 'trigger_data',
            'result_data', 'error_message', 'started_at', 'finished_at',
            'triggered_by', 'duration_ms', 'node_logs'
        ]


class ExecutionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing executions"""
    duration_ms = serializers.ReadOnlyField()
    
    class Meta:
        model = Execution
        fields = [
            'id', 'workflow', 'status', 'started_at', 'finished_at',
            'triggered_by', 'duration_ms'
        ]


class WorkflowVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowVersion
        fields = [
            'id', 'workflow', 'graph', 'version_number', 'tag',
            'notes', 'created_at', 'created_by'
        ]
        read_only_fields = ['created_at', 'created_by']


class VariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Variable
        fields = ['id', 'workflow', 'name', 'value', 'is_system', 'created_at']


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'workflow', 'title', 'position_x', 'position_y', 'width', 'height', 'color', 'created_at']


class BlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = ['id', 'workflow', 'group', 'block_type', 'content', 'position_x', 'position_y', 'created_at', 'updated_at']


class EdgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Edge
        fields = ['id', 'workflow', 'source_block', 'target_block', 'source_handle', 'target_handle', 'condition', 'created_at']


class WorkflowListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing workflows"""
    executions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'description', 'is_published', 'is_active',
            'folder', 'tags', 'created_at', 'updated_at', 'executions_count'
        ]
    
    def get_executions_count(self, obj):
        return obj.executions.count()


class WorkflowDetailSerializer(serializers.ModelSerializer):
    """Full serializer for workflow detail with graph and analytics"""
    versions = WorkflowVersionSerializer(many=True, read_only=True)
    variables = VariableSerializer(many=True, read_only=True)
    node_analytics = serializers.SerializerMethodField()
    
    class Meta:
        model = Workflow
        fields = [
            'id', 'name', 'description', 'owner', 'graph',
            'is_published', 'is_active', 'created_at', 'updated_at',
            'published_at', 'folder', 'tags', 'versions', 'variables',
            'node_analytics'
        ]
        read_only_fields = ['owner', 'created_at', 'updated_at', 'published_at']
    
    def get_node_analytics(self, obj):
        """Get latest analytics for all nodes"""
        from datetime import date, timedelta
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        analytics = NodeAnalytics.objects.filter(
            workflow=obj,
            period_start__gte=start_date,
            period_end__lte=end_date
        )
        return NodeAnalyticsSerializer(analytics, many=True).data


class WorkflowCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating workflows"""
    class Meta:
        model = Workflow
        fields = ['id', 'name', 'description', 'graph', 'is_published', 'is_active', 'folder', 'tags']
    
    def validate_name(self, value):
        """Sanitize name field to prevent XSS"""
        return escape(value)
    
    def validate_description(self, value):
        """Sanitize description field to prevent XSS"""
        if value:
            return escape(value)
        return value
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class WorkflowGraphSerializer(serializers.ModelSerializer):
    """Serializer for updating just the graph (auto-save)"""
    class Meta:
        model = Workflow
        fields = ['graph']


class PublishWorkflowSerializer(serializers.Serializer):
    """Serializer for publishing a workflow"""
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def create(self, validated_data):
        workflow = self.context['workflow']
        user = self.context['request'].user
        
        # Get next version number
        last_version = workflow.versions.order_by('-version_number').first()
        next_version = (last_version.version_number + 1) if last_version else 1
        
        # Create version
        version = WorkflowVersion.objects.create(
            workflow=workflow,
            graph=workflow.graph,
            version_number=next_version,
            tag="published",
            notes=validated_data.get('notes', ''),
            created_by=user
        )
        
        # Update workflow
        from django.utils import timezone
        workflow.is_published = True
        workflow.published_at = timezone.now()
        workflow.save()
        
        return version


# ==========================================
# AI Assistant Serializers
# ==========================================

class AIAssistantSerializer(serializers.ModelSerializer):
    """Serializer para AIAssistant"""
    suggestions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AIAssistant
        fields = [
            'id', 'name', 'description', 'context_patterns',
            'is_active', 'created_at', 'updated_at', 'suggestions_count'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_suggestions_count(self, obj):
        return obj.suggestions.count()


class BrazilianContextSerializer(serializers.ModelSerializer):
    """Serializer para BrazilianContext"""
    context_type_display = serializers.CharField(source='get_context_type_display', read_only=True)
    
    class Meta:
        model = BrazilianContext
        fields = [
            'id', 'context_type', 'context_type_display',
            'patterns', 'templates', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class AutomationSuggestionSerializer(serializers.ModelSerializer):
    """Serializer para AutomationSuggestion"""
    confidence_level = serializers.ReadOnlyField()
    assistant_name = serializers.CharField(source='assistant.name', read_only=True)
    workflow_name = serializers.CharField(source='applied_to_workflow.name', read_only=True, allow_null=True)
    
    class Meta:
        model = AutomationSuggestion
        fields = [
            'id', 'assistant', 'assistant_name', 'workflow_template',
            'confidence_score', 'confidence_level', 'context_type',
            'user_context', 'explanation', 'is_applied',
            'applied_to_workflow', 'workflow_name',
            'created_at', 'applied_at'
        ]
        read_only_fields = ['created_at', 'applied_at', 'confidence_level']


class AutomationSuggestionListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listagem de sugestões"""
    confidence_level = serializers.ReadOnlyField()
    assistant_name = serializers.CharField(source='assistant.name', read_only=True)
    
    class Meta:
        model = AutomationSuggestion
        fields = [
            'id', 'assistant_name', 'context_type',
            'confidence_score', 'confidence_level', 'explanation',
            'is_applied', 'created_at'
        ]


class AIAnalyzeRequestSerializer(serializers.Serializer):
    """Serializer para requisição de análise de contexto"""
    context = serializers.JSONField(
        help_text="Contexto do usuário: descrição do negócio, objetivo, etc."
    )
    business_description = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Descrição detalhada do negócio"
    )
    automation_goal = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Objetivo da automação"
    )
    preferred_channels = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Canais preferidos: whatsapp, email, sms, etc."
    )


class AIAnalyzeResponseSerializer(serializers.Serializer):
    """Serializer para resposta de análise"""
    suggestions = AutomationSuggestionSerializer(many=True)
    brazilian_contexts = serializers.ListField(
        child=serializers.CharField(),
        help_text="Contextos brasileiros identificados"
    )
    recommendations = serializers.ListField(
        child=serializers.CharField(),
        help_text="Recomendações gerais"
    )
