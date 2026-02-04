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
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta

from .models import Workflow, Group, Block, Edge, Variable, Execution
from .serializers import (
    WorkflowListSerializer, WorkflowDetailSerializer, WorkflowCreateSerializer,
    GroupSerializer, BlockSerializer, EdgeSerializer, VariableSerializer,
    ExecutionSerializer, ExecutionListSerializer
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
        """Publish workflow"""
        workflow = self.get_object()
        workflow.is_published = True
        workflow.save()
        return Response({"status": "published"})


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
        return Edge.objects.filter(workflow_id=workflow_id, workflow__owner=self.request.user)
    
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
        # Create new execution with same trigger_data
        new_execution = Execution.objects.create(
            workflow=execution.workflow,
            version=execution.version,
            trigger_data=execution.trigger_data,
            triggered_by='retry'
        )
        # TODO: Trigger async execution via Celery
        return Response(ExecutionListSerializer(new_execution).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get execution statistics for the current user"""
        queryset = self.get_queryset()
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent = queryset.filter(started_at__gte=thirty_days_ago)

        # Status breakdown
        status_counts = dict(recent.values('status').annotate(count=Count('id')).values_list('status', 'count'))

        # Average duration for completed executions
        avg_duration = recent.filter(
            status='completed',
            finished_at__isnull=False
        ).aggregate(avg=Avg('duration_ms'))['avg'] or 0

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
