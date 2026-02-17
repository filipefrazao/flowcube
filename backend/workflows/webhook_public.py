"""
Public webhook endpoint for triggering workflows via external HTTP calls.

URL: POST /api/v1/workflows/webhook/<workflow_id>/

Uses AllowAny + no throttle (DRF public endpoint pattern).
"""
import json
import logging

from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes, throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

logger = logging.getLogger("flowcube.webhook")


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def public_webhook_trigger(request, workflow_id):
    """
    Public webhook to trigger a workflow execution.

    POST /api/v1/workflows/webhook/<workflow_id>/

    Accepts JSON body as trigger_data.  Returns 202 with execution_id.
    Only published + active workflows can be triggered.
    """
    from .models import Workflow, Execution
    from .tasks import execute_workflow_task

    try:
        workflow = Workflow.objects.get(
            id=workflow_id,
            is_published=True,
            is_active=True,
        )
    except Workflow.DoesNotExist:
        return Response(
            {"error": "Workflow not found or not active"},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Parse payload
    try:
        if request.content_type == "application/json":
            payload = request.data
        else:
            payload = dict(request.POST)
    except Exception:
        payload = {}

    trigger_data = {
        "payload": payload,
        "headers": dict(request.headers),
        "method": request.method,
        "query_params": dict(request.query_params),
        "received_at": timezone.now().isoformat(),
    }

    execution = Execution.objects.create(
        workflow=workflow,
        version=workflow.get_published_version(),
        status=Execution.Status.PENDING,
        trigger_data=trigger_data,
        triggered_by="webhook",
    )

    task = execute_workflow_task.delay(str(execution.id))

    return Response(
        {
            "status": "accepted",
            "execution_id": str(execution.id),
            "workflow": workflow.name,
            "task_id": task.id,
        },
        status=status.HTTP_202_ACCEPTED,
    )
