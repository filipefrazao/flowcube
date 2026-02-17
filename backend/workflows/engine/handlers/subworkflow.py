"""
Sub-workflow handler.

Executes another workflow inline within the current execution,
creating a child Execution record linked via parent_execution.
"""
import logging

from asgiref.sync import sync_to_async

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class SubWorkflowHandler(BaseNodeHandler):
    """
    Execute a child workflow inline.

    node_data config:
        workflow_id: UUID of the child workflow
        input_mapping: dict mapping child variable names to parent values
        output_variable: variable name to store child result
    """
    node_type = "sub_workflow"

    def validate(self, node_data: dict) -> str | None:
        config = node_data.get("config", node_data)
        if not config.get("workflow_id"):
            return "workflow_id is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        from workflows.models import Workflow, Execution
        from workflows.engine.executor import WorkflowExecutor

        config = node_data.get("config", node_data)
        child_workflow_id = config.get("workflow_id")
        input_mapping = config.get("input_mapping", {})
        output_var = config.get("output_variable", "sub_workflow_result")

        try:
            child_workflow = await sync_to_async(Workflow.objects.get)(id=child_workflow_id)
        except Workflow.DoesNotExist:
            return NodeResult(error=f"Child workflow '{child_workflow_id}' not found")

        child_graph = child_workflow.graph
        if not child_graph.get("nodes"):
            return NodeResult(error="Child workflow has no nodes")

        # Create child execution
        child_execution = await sync_to_async(Execution.objects.create)(
            workflow=child_workflow,
            status=Execution.Status.RUNNING,
            trigger_data={"parent_execution_id": context.execution_id, **input_mapping},
            triggered_by="sub_workflow",
        )

        # Build child context with mapped variables
        child_variables = {}
        for child_var, parent_expr in input_mapping.items():
            if isinstance(parent_expr, str):
                child_variables[child_var] = context.resolve_template(parent_expr)
            else:
                child_variables[child_var] = parent_expr

        child_context = ExecutionContext(
            execution_id=str(child_execution.id),
            workflow_id=str(child_workflow.id),
            trigger_data=child_execution.trigger_data,
            variables=child_variables,
        )

        # Execute child workflow
        import workflows.engine.handlers  # noqa: F401
        executor = WorkflowExecutor(child_graph, child_context)
        summary = await executor.execute()

        # Update child execution
        from django.utils import timezone
        child_execution.status = (
            Execution.Status.COMPLETED
            if summary.get("error_count", 0) == 0
            else Execution.Status.FAILED
        )
        child_execution.result_data = {
            "summary": summary,
            "variables": child_context.variables,
        }
        child_execution.finished_at = timezone.now()
        await sync_to_async(child_execution.save)(
            update_fields=["status", "result_data", "finished_at"]
        )

        # Store child result in parent context
        child_result = {
            "execution_id": str(child_execution.id),
            "status": child_execution.status,
            "variables": child_context.variables,
            "node_outputs": child_context.node_outputs,
        }
        context.set_variable(output_var, child_result)

        if child_execution.status == Execution.Status.FAILED:
            return NodeResult(error=f"Sub-workflow failed: {summary}")

        return NodeResult(output=child_result)
