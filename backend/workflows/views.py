"""
FlowCube API Views
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Avg, Max
from django.utils import timezone
from datetime import timedelta

from .models import Workflow, Group, Block, Edge, Variable, Execution, WorkflowSchedule
from .serializers import (
    WorkflowListSerializer, WorkflowDetailSerializer, WorkflowCreateSerializer,
    GroupSerializer, BlockSerializer, EdgeSerializer, VariableSerializer,
    ExecutionSerializer, ExecutionListSerializer, WorkflowScheduleSerializer
)


class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workflow CRUD operations.
    
    list: Get all workflows for current user
    create: Create a new workflow
    retrieve: Get workflow with all blocks, edges, variables
    update: Update workflow metadata
    destroy: Delete workflow
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Workflow.objects.filter(owner=self.request.user)
    
    def get_serializer_class(self):
        if self.action == "retrieve":
            return WorkflowDetailSerializer
        elif self.action in ["create", "update", "partial_update"]:
            return WorkflowCreateSerializer
        return WorkflowListSerializer
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
    
    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate an existing workflow"""
        workflow = self.get_object()
        new_workflow = Workflow.objects.create(
            name=f"{workflow.name} (Copy)",
            description=workflow.description,
            graph=workflow.graph,
            owner=request.user
        )
        return Response(WorkflowDetailSerializer(new_workflow).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish workflow - creates immutable version snapshot"""
        from .models import WorkflowVersion
        
        workflow = self.get_object()
        
        # Get next version number
        last_version = workflow.versions.order_by('-version_number').first()
        next_version = (last_version.version_number + 1) if last_version else 1
        
        # Create immutable version snapshot
        version = WorkflowVersion.objects.create(
            workflow=workflow,
            graph=workflow.graph,
            version_number=next_version,
            tag="published",
            notes=request.data.get('notes', ''),
            created_by=request.user
        )
        
        # Update workflow status
        workflow.is_published = True
        workflow.published_at = timezone.now()
        workflow.save(update_fields=['is_published', 'published_at'])
        
        # Setup webhook trigger if applicable
        from .webhook_handler import setup_webhook_trigger
        webhook_url = setup_webhook_trigger(workflow)
        
        return Response({
            "status": "published",
            "version": next_version,
            "version_id": str(version.id),
            "published_at": workflow.published_at.isoformat(),
            "webhook_url": webhook_url
        })


    @action(detail=True, methods=["get"], url_path="webhook-url")
    def webhook_url(self, request, pk=None):
        """Get webhook URL for this workflow"""
        from .webhook_handler import get_webhook_url
        
        workflow = self.get_object()
        
        # Only published workflows can have webhook URLs
        if not workflow.is_published:
            return Response({
                "error": "Workflow must be published to get webhook URL",
                "is_published": False
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create webhook URL
        webhook_url = get_webhook_url(workflow)
        base_url = request.build_absolute_uri("/").rstrip("/")
        full_url = f"{base_url}{webhook_url}"
        
        return Response({
            "webhook_url": full_url,
            "token": workflow.graph.get("webhook_token"),
            "workflow_id": str(workflow.id),
            "workflow_name": workflow.name
        })

    @action(detail=True, methods=["post"], url_path="execute")
    def execute(self, request, pk=None):
        """Execute workflow asynchronously"""
        workflow = self.get_object()
        
        # Import task and execution model
        from .tasks import execute_workflow_task
        from .models import Execution
        
        # Create execution record
        execution = Execution.objects.create(
            workflow=workflow,
            status=Execution.Status.PENDING,
            trigger_data=request.data.get("input_data", {}),
            triggered_by="api"
        )
        
        # Dispatch Celery task
        task = execute_workflow_task.delay(str(execution.id))
        
        return Response({
            "execution_id": str(execution.id),
            "status": "pending",
            "task_id": task.id
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["get", "put", "patch"], url_path="schedule")
    def schedule(self, request, pk=None):
        """Get or update the schedule for a workflow."""
        workflow = self.get_object()
        schedule, created = WorkflowSchedule.objects.get_or_create(workflow=workflow)

        if request.method == "GET":
            return Response(WorkflowScheduleSerializer(schedule).data)

        serializer = WorkflowScheduleSerializer(schedule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Sync to celery-beat
        from .schedule_sync import sync_schedule_to_celery_beat
        sync_schedule_to_celery_beat(schedule)

        return Response(WorkflowScheduleSerializer(schedule).data)

    @action(detail=False, methods=["post"], url_path="ai-build")
    def ai_build(self, request):
        """
        Generate a workflow graph from natural language description.

        POST /api/v1/workflows/ai-build/
        {"description": "When a webhook is received, send an email", "provider": "openai"}
        """
        import asyncio
        from .ai_builder import generate_workflow_graph

        description = request.data.get("description", "")
        if not description:
            return Response({"error": "description is required"}, status=status.HTTP_400_BAD_REQUEST)

        provider = request.data.get("provider", "openai")

        try:
            graph = asyncio.run(generate_workflow_graph(description, provider))
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Optionally create the workflow directly
        if request.data.get("create", False):
            workflow = Workflow.objects.create(
                name=request.data.get("name", "AI-Generated Workflow"),
                description=description,
                graph=graph,
                owner=request.user,
                tags=["ai-generated"],
            )
            return Response({
                "workflow_id": str(workflow.id),
                "graph": graph,
            }, status=status.HTTP_201_CREATED)

        return Response({"graph": graph})

    @action(detail=False, methods=["get"], url_path="stats")
    def workflow_stats(self, request):
        """
        GET /api/v1/workflows/stats/

        Returns workflow statistics:
        - Most executed workflows
        - Average execution time
        - Workflows by status
        """
        user = request.user
        
        # Top workflows by execution count
        workflows = Workflow.objects.filter(owner=user).annotate(
            execution_count=Count("executions"),
            last_executed=Max("executions__started_at")
        ).order_by("-execution_count")[:10]
        
        # Workflows by status
        by_status = {
            "draft": Workflow.objects.filter(owner=user, is_published=False).count(),
            "published": Workflow.objects.filter(owner=user, is_published=True, is_active=True).count(),
            "inactive": Workflow.objects.filter(owner=user, is_active=False).count(),
        }
        
        return Response({
            "top_workflows": [
                {
                    "id": str(w.id),
                    "name": w.name,
                    "execution_count": w.execution_count or 0,
                    "avg_duration_ms": round(w.avg_duration or 0, 2),
                    "last_executed": w.last_executed.isoformat() if w.last_executed else None
                }
                for w in workflows
            ],
            "by_status": by_status,
            "total": Workflow.objects.filter(owner=user).count()
        })



class GroupViewSet(viewsets.ModelViewSet):
    """ViewSet for Group operations"""
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        workflow_id = self.kwargs.get("workflow_pk")
        return Group.objects.filter(workflow_id=workflow_id, workflow__owner=self.request.user)
    
    def perform_create(self, serializer):
        workflow_id = self.kwargs.get("workflow_pk")
        workflow = get_object_or_404(Workflow, id=workflow_id, owner=self.request.user)
        serializer.save(workflow=workflow)


class BlockViewSet(viewsets.ModelViewSet):
    """ViewSet for Block operations"""
    serializer_class = BlockSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        workflow_id = self.kwargs.get("workflow_pk")
        return Block.objects.filter(workflow_id=workflow_id, workflow__owner=self.request.user)
    
    def perform_create(self, serializer):
        workflow_id = self.kwargs.get("workflow_pk")
        workflow = get_object_or_404(Workflow, id=workflow_id, owner=self.request.user)
        serializer.save(workflow=workflow)


class EdgeViewSet(viewsets.ModelViewSet):
    """ViewSet for Edge operations"""
    serializer_class = EdgeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        workflow_id = self.kwargs.get("workflow_pk")
        return Edge.objects.filter(workflow_id=workflow_id, workflow__owner=self.request.user).order_by("created_at")
    
    def perform_create(self, serializer):
        workflow_id = self.kwargs.get("workflow_pk")
        workflow = get_object_or_404(Workflow, id=workflow_id, owner=self.request.user)
        serializer.save(workflow=workflow)


class VariableViewSet(viewsets.ModelViewSet):
    """ViewSet for Variable operations"""
    serializer_class = VariableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        workflow_id = self.kwargs.get("workflow_pk")
        return Variable.objects.filter(workflow_id=workflow_id, workflow__owner=self.request.user)

    def perform_create(self, serializer):
        workflow_id = self.kwargs.get("workflow_pk")
        workflow = get_object_or_404(Workflow, id=workflow_id, owner=self.request.user)
        serializer.save(workflow=workflow)


class ExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing workflow executions.
    Read-only - executions are created by the execution engine.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'workflow', 'triggered_by']
    search_fields = ['workflow__name']
    ordering_fields = ['started_at', 'finished_at', 'status']
    ordering = ['-started_at']

    def get_queryset(self):
        return Execution.objects.filter(
            workflow__owner=self.request.user
        ).select_related('workflow', 'version')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ExecutionSerializer  # Includes node_logs
        return ExecutionListSerializer  # Lightweight

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed execution"""
        execution = self.get_object()
        if execution.status != Execution.Status.FAILED:
            return Response(
                {"error": "Only failed executions can be retried"},
                status=status.HTTP_400_BAD_REQUEST
            )
        from .tasks import execute_workflow_task
        new_execution = Execution.objects.create(
            workflow=execution.workflow,
            version=execution.version,
            trigger_data=execution.trigger_data,
            triggered_by='retry'
        )
        task = execute_workflow_task.delay(str(new_execution.id))
        return Response({
            **ExecutionListSerializer(new_execution).data,
            "task_id": task.id,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def replay(self, request, pk=None):
        """
        Replay execution from a specific node.
        Uses pinned data from node.data.pinned_output if available.
        """
        execution = self.get_object()
        from_node_id = request.data.get("from_node_id")
        if not from_node_id:
            return Response({"error": "from_node_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        from .tasks import execute_workflow_task
        new_execution = Execution.objects.create(
            workflow=execution.workflow,
            version=execution.version,
            trigger_data={
                **(execution.trigger_data or {}),
                "_replay_from": from_node_id,
                "_pinned_outputs": execution.result_data.get("node_outputs", {}) if execution.result_data else {},
            },
            triggered_by="replay",
        )
        task = execute_workflow_task.delay(str(new_execution.id))
        return Response({
            "execution_id": str(new_execution.id),
            "status": "pending",
            "task_id": task.id,
            "replay_from": from_node_id,
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get execution statistics for the current user"""
        queryset = self.get_queryset()
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent = queryset.filter(started_at__gte=thirty_days_ago)

        # Status breakdown
        status_counts = dict(recent.values('status').annotate(count=Count('id')).values_list('status', 'count'))

        # Average duration for completed executions (calculated from started_at/finished_at)
        completed_execs = recent.filter(
            status='completed',
            finished_at__isnull=False,
            started_at__isnull=False
        )
        
        durations = []
        for exec in completed_execs:
            if exec.started_at and exec.finished_at:
                duration = (exec.finished_at - exec.started_at).total_seconds() * 1000
                durations.append(duration)
        
        avg_duration = sum(durations) / len(durations) if durations else 0

        # Daily execution counts for chart
        daily_counts = []
        for i in range(30, -1, -1):
            day = timezone.now().date() - timedelta(days=i)
            count = recent.filter(
                started_at__date=day
            ).count()
            daily_counts.append({'date': day.isoformat(), 'count': count})

        stats = {
            'total': queryset.count(),
            'last_30_days': recent.count(),
            'by_status': {
                'completed': status_counts.get('completed', 0),
                'failed': status_counts.get('failed', 0),
                'running': status_counts.get('running', 0),
                'pending': status_counts.get('pending', 0),
                'cancelled': status_counts.get('cancelled', 0),
            },
            'avg_duration_ms': int(avg_duration) if avg_duration else 0,
            'success_rate': round(
                (status_counts.get('completed', 0) / recent.count() * 100) if recent.count() > 0 else 0,
                2
            ),
            'daily_counts': daily_counts,
        }
        return Response(stats)


# ==========================================
# AI Assistant Views
# ==========================================

from .models import AIAssistant, BrazilianContext, AutomationSuggestion
from .serializers import (
    AIAssistantSerializer, BrazilianContextSerializer,
    AutomationSuggestionSerializer, AutomationSuggestionListSerializer,
    AIAnalyzeRequestSerializer, AIAnalyzeResponseSerializer
)
from .ai_service import ai_service


class AIAssistantViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciamento de assistentes IA
    """
    permission_classes = [IsAuthenticated]
    serializer_class = AIAssistantSerializer
    queryset = AIAssistant.objects.all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering = ['-created_at']

    @action(detail=False, methods=['post'])
    def analyze(self, request):
        """
        Analisa o contexto fornecido e retorna sugestões de automação
        
        POST /api/v1/ai-assistant/analyze/
        {
            "context": {...},
            "business_description": "E-commerce de roupas",
            "automation_goal": "Automatizar confirmação de pagamento",
            "preferred_channels": ["whatsapp", "email"]
        }
        """
        # Valida request
        request_serializer = AIAnalyzeRequestSerializer(data=request.data)
        if not request_serializer.is_valid():
            return Response(
                request_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Analisa com IA
        user_context = request_serializer.validated_data
        ai_result = ai_service.analyze_context(user_context)
        
        # Cria ou pega assistente padrão
        assistant, _ = AIAssistant.objects.get_or_create(
            name="Assistente FlowCube",
            defaults={
                'description': 'Assistente IA contextual para automações brasileiras',
                'context_patterns': {
                    'pix': ['pix', 'pagamento', 'payment'],
                    'whatsapp': ['whatsapp', 'wpp', 'zap'],
                    'nfe': ['nfe', 'nota fiscal', 'invoice'],
                    'ecommerce': ['ecommerce', 'loja', 'shop'],
                    'crm': ['crm', 'leads', 'vendas']
                }
            }
        )
        
        # Salva sugestões no banco
        suggestions_objs = []
        for suggestion_data in ai_result['suggestions']:
            suggestion = AutomationSuggestion.objects.create(
                assistant=assistant,
                workflow_template=suggestion_data['workflow_template'],
                confidence_score=suggestion_data['confidence_score'],
                context_type=suggestion_data['context_type'],
                user_context=suggestion_data['user_context'],
                explanation=suggestion_data['explanation']
            )
            suggestions_objs.append(suggestion)
        
        # Serializa resposta
        response_data = {
            'suggestions': AutomationSuggestionSerializer(suggestions_objs, many=True).data,
            'brazilian_contexts': ai_result['brazilian_contexts'],
            'recommendations': ai_result['recommendations']
        }
        
        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Lista todas as sugestões de automação
        
        GET /api/v1/ai-assistant/suggestions/
        GET /api/v1/ai-assistant/suggestions/?is_applied=false
        GET /api/v1/ai-assistant/suggestions/?context_type=whatsapp
        """
        queryset = AutomationSuggestion.objects.all().select_related('assistant')
        
        # Filtros
        is_applied = request.query_params.get('is_applied')
        if is_applied is not None:
            is_applied_bool = is_applied.lower() == 'true'
            queryset = queryset.filter(is_applied=is_applied_bool)
        
        context_type = request.query_params.get('context_type')
        if context_type:
            queryset = queryset.filter(context_type=context_type)
        
        # Ordena por score
        queryset = queryset.order_by('-confidence_score', '-created_at')
        
        # Paginação
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = AutomationSuggestionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = AutomationSuggestionListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='apply/(?P<suggestion_id>[^/.]+)')
    def apply_suggestion(self, request, suggestion_id=None):
        """
        Aplica uma sugestão criando um novo workflow
        
        POST /api/v1/ai-assistant/apply/{suggestion_id}/
        {
            "workflow_name": "Meu Workflow Custom" (opcional)
        }
        """
        # Busca sugestão
        try:
            suggestion = AutomationSuggestion.objects.get(id=suggestion_id)
        except AutomationSuggestion.DoesNotExist:
            return Response(
                {'error': 'Sugestão não encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if suggestion.is_applied:
            return Response(
                {'error': 'Esta sugestão já foi aplicada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Nome do workflow
        workflow_name = request.data.get('workflow_name')
        if not workflow_name:
            workflow_name = suggestion.workflow_template.get('name', 'Workflow IA')
        
        # Cria workflow
        workflow_graph = ai_service.generate_workflow_from_template(
            suggestion.workflow_template
        )
        
        workflow = Workflow.objects.create(
            name=workflow_name,
            description=suggestion.workflow_template.get('description', suggestion.explanation),
            owner=request.user,
            graph=workflow_graph,
            is_published=False,
            is_active=False,
            tags=['ai-generated', suggestion.context_type]
        )
        
        # Atualiza sugestão
        suggestion.is_applied = True
        suggestion.applied_to_workflow = workflow
        suggestion.applied_at = timezone.now()
        suggestion.save()
        
        # Retorna workflow criado
        from .serializers import WorkflowDetailSerializer
        return Response(
            {
                'success': True,
                'workflow': WorkflowDetailSerializer(workflow).data,
                'suggestion': AutomationSuggestionSerializer(suggestion).data
            },
            status=status.HTTP_201_CREATED
        )


class BrazilianContextViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet somente leitura para contextos brasileiros pré-configurados
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BrazilianContextSerializer
    queryset = BrazilianContext.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['context_type']
