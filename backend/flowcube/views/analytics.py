"""
FlowCube Analytics Views
Simple placeholder analytics endpoints
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta


class AnalyticsOverviewView(APIView):
    """Overview analytics for the dashboard"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Placeholder analytics data
        return Response({
            'total_workflows': 0,
            'total_executions': 0,
            'success_rate': 100,
            'avg_duration_ms': 0,
        })
