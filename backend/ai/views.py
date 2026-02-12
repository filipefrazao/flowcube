from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .debug_assistant import AIDebugAssistant
from .node_builder import AINodeBuilder

import os
import json


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_node_stream(request):
    """Stream node generation with Server-Sent Events."""
    description = request.data.get("description")
    context = request.data.get("context", {})

    if not description:
        return Response({"error": "Description is required"}, status=status.HTTP_400_BAD_REQUEST)

    builder = AINodeBuilder()

    def event_stream():
        try:
            for chunk in builder.stream_generate_node(description, context):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_node(request):
    """Generate a node configuration from natural language description."""
    description = request.data.get("description")
    context = request.data.get("context", {})

    if not description:
        return Response({"error": "Description is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        builder = AINodeBuilder()
        result = builder.generate_node(description, context)

        # Try to parse as JSON to validate
        node_config = json.loads(result)

        return Response({"success": True, "node": node_config})
    except json.JSONDecodeError as e:
        return Response(
            {"error": "Failed to parse AI response", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def debug_workflow(request):
    """Analyze a workflow execution error and suggest fixes.

    NOTE: The workflows app uses the Execution/NodeExecutionLog models.
    Older references to WorkflowExecution were removed.
    """
    execution_id = request.data.get("execution_id")

    if not execution_id:
        return Response({"error": "execution_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Import here to avoid circular imports
        from workflows.models import Execution, NodeExecutionLog

        execution = (
            Execution.objects.select_related("workflow")
            .prefetch_related("node_logs")
            .get(id=execution_id)
        )

        workflow = execution.workflow

        # Find the first error node log (if any)
        ordered_logs = list(execution.node_logs.all().order_by("started_at"))
        failed_log = None
        previous_nodes: list[str] = []

        for log in ordered_logs:
            if log.status == NodeExecutionLog.Status.ERROR:
                failed_log = log
                break
            previous_nodes.append(log.node_id)

        failed_node_id = failed_log.node_id if failed_log else None

        execution_log = {
            "error": execution.error_message or (failed_log.error_details if failed_log else ""),
            "error_type": "node_error" if failed_log else "execution_failed",
            "node_id": failed_node_id,
            "node_config": None,
            "input_data": (failed_log.input_data if failed_log else execution.trigger_data),
            "stack_trace": (failed_log.error_details if failed_log else None),
            "previous_nodes": previous_nodes,
        }

        workflow_data = {
            "name": workflow.name,
            "nodes": (workflow.graph or {}).get("nodes", []),
            "edges": (workflow.graph or {}).get("edges", []),
        }

        assistant = AIDebugAssistant()
        analysis = assistant.analyze_error(execution_log=execution_log, workflow_data=workflow_data)

        return Response({"success": True, "analysis": analysis})

    except Execution.DoesNotExist:
        return Response({"error": "Execution not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def apply_quick_fix(request):
    """Apply suggested fix to node configuration."""
    node_id = request.data.get("node_id")
    workflow_id = request.data.get("workflow_id")
    fix_config = request.data.get("fix_config")

    if not all([node_id, workflow_id, fix_config]):
        return Response(
            {"error": "node_id, workflow_id, and fix_config are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # Import here to avoid circular imports
        from workflows.models import Workflow

        workflow = Workflow.objects.get(id=workflow_id)
        graph = workflow.graph

        nodes = graph.get("nodes", [])
        node_found = False

        for node in nodes:
            if node.get("id") == node_id:
                if "data" not in node:
                    node["data"] = {}
                if "config" not in node["data"]:
                    node["data"]["config"] = {}

                node["data"]["config"].update(fix_config)
                node_found = True
                break

        if not node_found:
            return Response({"error": "Node not found in workflow"}, status=status.HTTP_404_NOT_FOUND)

        workflow.graph = graph
        workflow.save()

        return Response({"success": True, "message": "Fix applied successfully", "updated_node": node})

    except Workflow.DoesNotExist:
        return Response({"error": "Workflow not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def analyze_workflow_health(request):
    """Analyze overall workflow health using recent executions."""
    workflow_id = request.data.get("workflow_id")
    limit = request.data.get("limit", 50)

    if not workflow_id:
        # Also acts as a lightweight AI service health endpoint.
        return Response(
            {
                "success": True,
                "status": "ok",
                "openai_configured": bool(os.environ.get("OPENAI_API_KEY")),
                "message": "Provide workflow_id to analyze workflow health.",
            },
            status=status.HTTP_200_OK,
        )

    try:
        # Import here to avoid circular imports
        from workflows.models import Workflow, Execution

        workflow = Workflow.objects.get(id=workflow_id)
        executions = Execution.objects.filter(workflow=workflow).order_by("-started_at")[: int(limit)]

        workflow_data = {
            "name": workflow.name,
            "nodes": (workflow.graph or {}).get("nodes", []),
            "edges": (workflow.graph or {}).get("edges", []),
        }

        execution_history = []
        for execution in executions:
            # Normalize status to what the AI helper expects.
            normalized_status = "error" if execution.status == Execution.Status.FAILED else execution.status
            execution_history.append(
                {
                    "id": str(execution.id),
                    "status": normalized_status,
                    "duration": execution.duration_ms or 0,
                    "error": execution.error_message if normalized_status == "error" else None,
                    "created_at": execution.started_at.isoformat() if execution.started_at else None,
                }
            )

        assistant = AIDebugAssistant()
        health_analysis = assistant.analyze_workflow_health(workflow_data=workflow_data, execution_history=execution_history)

        return Response({"success": True, "health": health_analysis})

    except Workflow.DoesNotExist:
        return Response({"error": "Workflow not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
