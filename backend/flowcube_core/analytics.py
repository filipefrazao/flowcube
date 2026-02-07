"""
FlowCube Analytics Views (merged from analytics app)
Dashboard and statistics endpoints - part of core.
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta


class AnalyticsViewSet(viewsets.ViewSet):
    """Analytics ViewSet for dashboard metrics"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """GET /api/v1/analytics/dashboard/"""
        from workflows.models import Workflow, Execution

        user = request.user

        total_workflows = Workflow.objects.filter(owner=user).count()
        active_workflows = Workflow.objects.filter(owner=user, is_active=True).count()
        published_workflows = Workflow.objects.filter(owner=user, is_published=True).count()

        executions = Execution.objects.filter(workflow__owner=user)
        total_executions = executions.count()

        successful = executions.filter(status="completed").count()
        failed = executions.filter(status="failed").count()
        running = executions.filter(status="running").count()
        pending = executions.filter(status="pending").count()

        success_rate = (successful / total_executions * 100) if total_executions > 0 else 0

        last_7_days = timezone.now() - timedelta(days=7)
        recent_executions = executions.filter(
            started_at__gte=last_7_days
        ).values("started_at__date").annotate(
            count=Count("id")
        ).order_by("started_at__date")

        daily_activity = [
            {"date": str(item["started_at__date"]), "count": item["count"]}
            for item in recent_executions
        ]

        top_workflows = Workflow.objects.filter(owner=user).annotate(
            execution_count=Count("executions")
        ).order_by("-execution_count")[:5]

        top_workflows_data = [
            {"id": str(w.id), "name": w.name, "executions": w.execution_count}
            for w in top_workflows
        ]

        return Response({
            "workflows": {
                "total": total_workflows,
                "active": active_workflows,
                "inactive": total_workflows - active_workflows,
                "published": published_workflows
            },
            "executions": {
                "total": total_executions,
                "successful": successful,
                "failed": failed,
                "running": running,
                "pending": pending,
                "success_rate": round(success_rate, 2)
            },
            "recent_activity": daily_activity,
            "top_workflows": top_workflows_data,
            "period": "last_7_days"
        })
