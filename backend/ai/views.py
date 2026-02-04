from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .node_builder import AINodeBuilder
from .debug_assistant import AIDebugAssistant
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_node_stream(request):
    """Stream node generation with Server-Sent Events"""
    description = request.data.get('description')
    context = request.data.get('context', {})

    if not description:
        return Response(
            {'error': 'Description is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    builder = AINodeBuilder()

    def event_stream():
        try:
            for chunk in builder.stream_generate_node(description, context):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_node(request):
    """Generate a node configuration from natural language description"""
    description = request.data.get('description')
    context = request.data.get('context', {})

    if not description:
        return Response(
            {'error': 'Description is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        builder = AINodeBuilder()
        result = builder.generate_node(description, context)

        # Try to parse as JSON to validate
        node_config = json.loads(result)

        return Response({
            'success': True,
            'node': node_config
        })
    except json.JSONDecodeError as e:
        return Response(
            {'error': 'Failed to parse AI response', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def debug_workflow(request):
    """Analyze workflow execution error and suggest fixes"""
    execution_id = request.data.get('execution_id')

    if not execution_id:
        return Response(
            {'error': 'execution_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Import here to avoid circular imports
        from workflows.models import WorkflowExecution

        execution = WorkflowExecution.objects.get(id=execution_id)
        workflow = execution.workflow

        # Build execution log from execution object
        execution_log = {
            'error': execution.error_message,
            'error_type': execution.error_type or 'unknown',
            'node_id': execution.failed_node_id,
            'node_config': execution.failed_node_config,
            'input_data': execution.input_data,
            'stack_trace': execution.stack_trace,
            'previous_nodes': execution.completed_nodes or []
        }

        # Build workflow data from workflow object
        workflow_data = {
            'name': workflow.name,
            'nodes': workflow.graph.get('nodes', []),
            'edges': workflow.graph.get('edges', [])
        }

        assistant = AIDebugAssistant()
        analysis = assistant.analyze_error(
            execution_log=execution_log,
            workflow_data=workflow_data
        )

        return Response({
            'success': True,
            'analysis': analysis
        })

    except WorkflowExecution.DoesNotExist:
        return Response(
            {'error': 'Execution not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_quick_fix(request):
    """Apply suggested fix to node configuration"""
    node_id = request.data.get('node_id')
    workflow_id = request.data.get('workflow_id')
    fix_config = request.data.get('fix_config')

    if not all([node_id, workflow_id, fix_config]):
        return Response(
            {'error': 'node_id, workflow_id, and fix_config are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Import here to avoid circular imports
        from workflows.models import Workflow

        workflow = Workflow.objects.get(id=workflow_id)
        graph = workflow.graph

        # Find and update the node
        nodes = graph.get('nodes', [])
        node_found = False

        for node in nodes:
            if node.get('id') == node_id:
                # Merge fix config into existing config
                if 'data' not in node:
                    node['data'] = {}
                if 'config' not in node['data']:
                    node['data']['config'] = {}

                node['data']['config'].update(fix_config)
                node_found = True
                break

        if not node_found:
            return Response(
                {'error': 'Node not found in workflow'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Save updated graph
        workflow.graph = graph
        workflow.save()

        return Response({
            'success': True,
            'message': 'Fix applied successfully',
            'updated_node': node
        })

    except Workflow.DoesNotExist:
        return Response(
            {'error': 'Workflow not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_workflow_health(request):
    """Analyze overall workflow health"""
    workflow_id = request.data.get('workflow_id')
    limit = request.data.get('limit', 50)  # Number of recent executions to analyze

    if not workflow_id:
        return Response(
            {'error': 'workflow_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Import here to avoid circular imports
        from workflows.models import Workflow, WorkflowExecution

        workflow = Workflow.objects.get(id=workflow_id)
        executions = WorkflowExecution.objects.filter(
            workflow=workflow
        ).order_by('-created_at')[:limit]

        # Build workflow data
        workflow_data = {
            'name': workflow.name,
            'nodes': workflow.graph.get('nodes', []),
            'edges': workflow.graph.get('edges', [])
        }

        # Build execution history
        execution_history = []
        for execution in executions:
            execution_history.append({
                'id': str(execution.id),
                'status': execution.status,
                'duration': execution.duration,
                'error': execution.error_message if execution.status == 'error' else None,
                'created_at': execution.created_at.isoformat()
            })

        assistant = AIDebugAssistant()
        health_analysis = assistant.analyze_workflow_health(
            workflow_data=workflow_data,
            execution_history=execution_history
        )

        return Response({
            'success': True,
            'health': health_analysis
        })

    except Workflow.DoesNotExist:
        return Response(
            {'error': 'Workflow not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
