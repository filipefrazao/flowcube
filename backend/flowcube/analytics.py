
# flowcube/models.py
from django.db import models
from django.utils import timezone
import uuid

class FlowExecution(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    flow = models.ForeignKey('flows.Flow', on_delete=models.CASCADE, related_name='executions')
    start_at = models.DateTimeField(default=timezone.now)
    end_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=['success', 'failed', 'running'])
    steps = models.ManyToManyField('flows.Step', through='FlowExecutionStep')
    results = models.JSONField()

class FlowExecutionStep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution = models.ForeignKey(FlowExecution, on_delete=models.CASCADE, related_name='steps')
    step = models.ForeignKey('flows.Step', on_delete=models.CASCADE, related_name='executions')
    started_at = models.DateTimeField(default=timezone.now)
    finished_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=['success', 'failed', 'running'])
    input_data = models.JSONField()
    output_data = models.JSONField()

# flowcube/analytics.py
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from django.db.models import Q, Count, Avg
from .models import FlowExecution

class FlowAnalyticsService:
    def get_executions_by_period(self) -> List[Dict]:
        executions = FlowExecution.objects.all()
        metrics = []
        
        for execution in executions:
            metrics.append({
                'date': execution.start_at.date(),
                'total': 1,
                'success': 1 if execution.status == 'success' else 0,
                'failed': 1 if execution.status == 'failed' else 0
            })
            
        return metrics

    def get_success_rate(self) -> float:
        total = FlowExecution.objects.count()
        success = FlowExecution.objects.filter(status='success').count()
        return (success / total) * 100 if total > 0 else 0

    def get_average_time(self) -> Optional[float]:
        executions = FlowExecution.objects.filter(end_at__isnull=False)
        if not executions:
            return None
            
        total_time = 0
        for execution in executions:
            delta = execution.end_at - execution.start_at
            total_time += delta.total_seconds()
            
        average = total_time / executions.count()
        return round(average, 2)

# flowcube/views/analytics.py
from rest_framework.response import Response
from rest_framework.views import APIView
from .analytics import FlowAnalyticsService

class DashboardView(APIView):
    def get(self, request):
        analytics_service = FlowAnalyticsService()
        
        data = {
            'executions_by_period': analytics_service.get_executions_by_period(),
            'success_rate': analytics_service.get_success_rate(),
            'average_time': analytics_service.get_average_time()
        }
        
        return Response(data)
