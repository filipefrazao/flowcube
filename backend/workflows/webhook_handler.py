"""
FlowCube - Webhook Trigger Handler

This module handles incoming webhooks that trigger workflow executions.

Usage:
1. Each workflow with a webhook trigger gets a unique token
2. External systems POST to /api/v1/webhooks/{token}/
3. System matches token to workflow and starts/resumes execution
"""
import uuid
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils import timezone

from .models import Workflow, Execution
from .tasks import execute_workflow_task

logger = logging.getLogger(__name__)


def get_webhook_url(workflow):
    """Generate webhook URL for a workflow"""
    # Get or create webhook token from workflow graph
    graph = workflow.graph or {}
    webhook_token = graph.get('webhook_token')
    
    if not webhook_token:
        # Generate new token and save to graph
        webhook_token = str(uuid.uuid4())
        workflow.graph['webhook_token'] = webhook_token
        workflow.save(update_fields=['graph'])
    
    return f"/api/v1/webhooks/{webhook_token}/"


def find_workflow_by_webhook_token(token):
    """Find a workflow by its webhook token"""
    # Search for workflow with this token in graph
    workflows = Workflow.objects.filter(
        is_active=True,
        is_published=True,
        graph__webhook_token=token
    )
    return workflows.first()


@csrf_exempt
@require_POST
def webhook_receiver(request, token):
    """
    Receive incoming webhook and trigger workflow execution
    
    POST /api/v1/webhooks/{token}/
    
    The webhook payload becomes the trigger_data for the execution.
    """
    try:
        # Find workflow by token
        workflow = find_workflow_by_webhook_token(token)
        
        if not workflow:
            logger.warning(f"Webhook received for unknown token: {token}")
            return JsonResponse({
                'status': 'error',
                'message': 'Invalid webhook token'
            }, status=404)
        
        # Parse webhook payload
        import json
        try:
            if request.content_type == 'application/json':
                payload = json.loads(request.body)
            else:
                payload = dict(request.POST)
        except json.JSONDecodeError:
            payload = {'raw_body': request.body.decode('utf-8', errors='replace')}
        
        # Use payload directly as trigger_data so handlers access fields at root level
        # (e.g., facebook_lead_ads reads trigger_data.nome_completo directly)
        if isinstance(payload, dict):
            trigger_data = payload
        else:
            trigger_data = {'raw_body': payload}

        # Store webhook metadata under reserved key
        trigger_data['_webhook'] = {
            'headers': {k: v for k, v in request.headers.items() if k.lower() not in ('authorization', 'cookie')},
            'method': request.method,
            'path': request.path,
            'query_params': dict(request.GET),
            'received_at': timezone.now().isoformat(),
        }
        
        logger.info(f"Webhook received for workflow {workflow.id}: {workflow.name}")
        
        # Create execution
        execution = Execution.objects.create(
            workflow=workflow,
            version=workflow.get_published_version(),
            status=Execution.Status.PENDING,
            trigger_data=trigger_data,
            triggered_by='webhook'
        )
        
        # Dispatch async execution
        task = execute_workflow_task.delay(str(execution.id))
        
        return JsonResponse({
            'status': 'accepted',
            'execution_id': str(execution.id),
            'workflow': workflow.name,
            'task_id': task.id
        }, status=202)
        
    except Exception as e:
        logger.exception(f"Error processing webhook: {e}")
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        }, status=500)


def setup_webhook_trigger(workflow):
    """
    Setup webhook trigger for a workflow
    
    Called when a workflow is published and has webhook trigger nodes.
    Returns the webhook URL that external systems should POST to.
    """
    # Check if workflow has webhook trigger node
    graph = workflow.graph or {}
    nodes = graph.get('nodes', [])
    
    has_webhook_trigger = any(
        node.get('type') in ['trigger', 'webhook', 'webhook_trigger', 'premium_trigger', 'facebook_lead_ads', 'whatsapp_trigger', 'evolution_trigger', 'manual_trigger', 'schedule']
        for node in nodes
    )
    
    if not has_webhook_trigger:
        return None
    
    # Generate/retrieve webhook URL
    webhook_url = get_webhook_url(workflow)
    
    logger.info(f"Webhook trigger setup for workflow {workflow.id}: {webhook_url}")
    
    return webhook_url
