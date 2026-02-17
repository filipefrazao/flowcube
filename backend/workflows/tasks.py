"""
FlowCube - Celery Tasks for Workflow Execution

Uses the new graph-based WorkflowExecutor engine.
"""
import asyncio
import logging

from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from synchronous Celery context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@shared_task(bind=True, max_retries=3)
def execute_workflow_task(self, execution_id):
    """
    Execute workflow asynchronously via the graph-based engine.

    Args:
        execution_id: UUID of the Execution instance

    Returns:
        dict with status and execution summary
    """
    from .models import Execution

    try:
        execution = Execution.objects.select_related('workflow', 'version').get(id=execution_id)

        # Update status to running
        execution.status = Execution.Status.RUNNING
        execution.save(update_fields=['status'])

        logger.info(
            "Starting execution %s for workflow '%s'",
            execution_id, execution.workflow.name,
        )

        graph = execution.workflow.graph
        if not graph.get("nodes"):
            raise ValueError("Workflow has no nodes to execute")

        # Import engine (triggers handler auto-registration)
        from workflows.engine.context import ExecutionContext
        from workflows.engine.executor import WorkflowExecutor
        import workflows.engine.handlers  # noqa: F401 - registers all handlers

        context = ExecutionContext(
            execution_id=str(execution.id),
            workflow_id=str(execution.workflow.id),
            trigger_data=execution.trigger_data or {},
        )

        executor = WorkflowExecutor(graph, context)
        summary = _run_async(executor.execute())

        # Mark execution complete
        execution.status = (
            Execution.Status.COMPLETED
            if summary.get("error_count", 0) == 0
            else Execution.Status.FAILED
        )
        execution.result_data = {
            "summary": summary,
            "variables": context.variables,
            "node_outputs": {k: _safe_serialize(v) for k, v in context.node_outputs.items()},
        }
        execution.finished_at = timezone.now()
        execution.save(update_fields=['status', 'result_data', 'finished_at'])

        logger.info("Execution %s completed: %s", execution_id, summary)

        return {
            'status': execution.status,
            'execution_id': str(execution_id),
            'nodes_executed': summary.get('executed_count', 0),
        }

    except Execution.DoesNotExist:
        logger.error("Execution %s not found", execution_id)
        return {'status': 'error', 'message': 'Execution not found'}

    except Exception as e:
        logger.exception("Error executing workflow %s", execution_id)

        try:
            execution = Execution.objects.get(id=execution_id)
            execution.status = Execution.Status.FAILED
            execution.error_message = str(e)
            execution.finished_at = timezone.now()
            execution.save(update_fields=['status', 'error_message', 'finished_at'])
        except Exception as save_error:
            logger.error("Failed to save error state: %s", save_error)

        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task(bind=True, max_retries=1)
def execute_scheduled_workflow(self, workflow_id=None, **kwargs):
    """
    Execute a workflow triggered by celery-beat schedule.
    """
    if not workflow_id:
        workflow_id = kwargs.get("workflow_id")
    if not workflow_id:
        logger.error("execute_scheduled_workflow called without workflow_id")
        return {"status": "error", "message": "workflow_id required"}

    from .models import Workflow, Execution, WorkflowSchedule

    try:
        workflow = Workflow.objects.get(id=workflow_id, is_active=True)
    except Workflow.DoesNotExist:
        logger.error("Scheduled workflow %s not found or inactive", workflow_id)
        return {"status": "error", "message": "Workflow not found"}

    execution = Execution.objects.create(
        workflow=workflow,
        version=workflow.get_published_version(),
        status=Execution.Status.PENDING,
        trigger_data={"triggered_by": "schedule"},
        triggered_by="schedule",
    )

    # Update schedule tracking
    try:
        schedule = WorkflowSchedule.objects.get(workflow=workflow)
        schedule.last_run = timezone.now()
        schedule.run_count += 1
        schedule.save(update_fields=["last_run", "run_count"])
    except WorkflowSchedule.DoesNotExist:
        pass

    # Delegate to the main execution task
    return execute_workflow_task(str(execution.id))


def _safe_serialize(value):
    """Ensure value is JSON-serializable."""
    if isinstance(value, dict):
        return {k: _safe_serialize(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_safe_serialize(v) for v in value]
    if isinstance(value, (str, int, float, bool, type(None))):
        return value
    return str(value)
