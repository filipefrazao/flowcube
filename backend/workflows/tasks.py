"""
FlowCube - Celery Tasks for Workflow Execution
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def execute_workflow_task(self, execution_id):
    """
    Execute workflow asynchronously
    
    Args:
        execution_id: UUID of the Execution instance
        
    Returns:
        dict: {'status': 'completed', 'execution_id': str(execution_id)}
    """
    from .models import Execution
    
    try:
        # Get execution instance
        execution = Execution.objects.select_related('workflow', 'version').get(id=execution_id)
        
        # Update status to running
        execution.status = Execution.Status.RUNNING
        execution.save(update_fields=['status'])
        
        logger.info(f"Starting execution {execution_id} for workflow {execution.workflow.name}")
        
        # Get workflow graph
        graph = execution.workflow.graph
        nodes = graph.get('nodes', [])
        edges = graph.get('edges', [])
        
        if not nodes:
            raise ValueError("Workflow has no nodes to execute")
        
        # Simple sequential execution (for MVP)
        results = {}
        
        for node in nodes:
            node_id = node.get('id')
            node_type = node.get('type', 'unknown')
            node_data = node.get('data', {})
            
            logger.info(f"Executing node {node_id} (type: {node_type})")
            
            # Execute based on node type
            try:
                if node_type == 'trigger':
                    # Trigger nodes just mark the start
                    results[node_id] = {
                        'status': 'triggered',
                        'timestamp': timezone.now().isoformat()
                    }
                    
                elif node_type == 'action':
                    # Action nodes perform operations
                    action_type = node_data.get('action_type', 'unknown')
                    results[node_id] = {
                        'status': 'executed',
                        'action_type': action_type,
                        'timestamp': timezone.now().isoformat()
                    }
                    
                elif node_type == 'condition':
                    # Condition nodes evaluate boolean expressions
                    condition = node_data.get('condition', True)
                    results[node_id] = {
                        'status': 'evaluated',
                        'result': bool(condition),
                        'timestamp': timezone.now().isoformat()
                    }
                    
                elif node_type in ['text_input', 'email_input', 'phone_input', 'choice']:
                    # Input nodes collect data
                    results[node_id] = {
                        'status': 'input_requested',
                        'input_type': node_type,
                        'timestamp': timezone.now().isoformat()
                    }
                    
                elif node_type in ['text_response', 'image_response', 'whatsapp_template']:
                    # Response nodes send messages
                    results[node_id] = {
                        'status': 'sent',
                        'response_type': node_type,
                        'timestamp': timezone.now().isoformat()
                    }
                    
                else:
                    # Unknown node types are skipped
                    results[node_id] = {
                        'status': 'skipped',
                        'reason': f'Unknown node type: {node_type}',
                        'timestamp': timezone.now().isoformat()
                    }
                
                # Create NodeExecutionLog for debugging
                from .models import NodeExecutionLog
                NodeExecutionLog.objects.create(
                    execution=execution,
                    node_id=node_id,
                    node_type=node_type,
                    node_label=node_data.get('label', node_id),
                    status=NodeExecutionLog.Status.SUCCESS,
                    input_data=node_data,
                    output_data=results[node_id],
                    duration_ms=0  # TODO: track actual duration
                )
                
            except Exception as node_error:
                logger.error(f"Error executing node {node_id}: {node_error}")
                results[node_id] = {
                    'status': 'error',
                    'error': str(node_error),
                    'timestamp': timezone.now().isoformat()
                }
                
                # Log the error
                from .models import NodeExecutionLog
                NodeExecutionLog.objects.create(
                    execution=execution,
                    node_id=node_id,
                    node_type=node_type,
                    node_label=node_data.get('label', node_id),
                    status=NodeExecutionLog.Status.ERROR,
                    input_data=node_data,
                    error_details=str(node_error),
                    duration_ms=0
                )
        
        # Mark execution as completed
        execution.status = Execution.Status.COMPLETED
        execution.result_data = results
        execution.finished_at = timezone.now()
        execution.save(update_fields=['status', 'result_data', 'finished_at'])
        
        logger.info(f"Execution {execution_id} completed successfully")
        
        return {
            'status': 'completed',
            'execution_id': str(execution_id),
            'nodes_executed': len(results)
        }
        
    except Execution.DoesNotExist:
        logger.error(f"Execution {execution_id} not found")
        return {
            'status': 'error',
            'message': 'Execution not found'
        }
    
    except Exception as e:
        logger.exception(f"Error executing workflow {execution_id}")
        
        # Try to update execution status to failed
        try:
            execution = Execution.objects.get(id=execution_id)
            execution.status = Execution.Status.FAILED
            execution.error_message = str(e)
            execution.finished_at = timezone.now()
            execution.save(update_fields=['status', 'error_message', 'finished_at'])
        except Exception as save_error:
            logger.error(f"Failed to save error state: {save_error}")
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
