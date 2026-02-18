import logging
import os

import requests
from celery import shared_task
from django.utils.timezone import now

logger = logging.getLogger("flowcube.salesforce")

SALESCUBE_API_URL = "https://api.frzglobal.com.br"
SALESCUBE_TOKEN = os.environ.get("SALESCUBE_PROD_TOKEN", "")


@shared_task(name="salesforce.poll_salescube_approved_sales")
def poll_salescube_approved_sales():
    """Roda via Celery Beat (a cada 5min). Busca vendas aprovadas no SalesCube PROD
    e executa o workflow configurado para cada nova venda."""
    from salesforce.models import SalesCubeSyncState

    state = SalesCubeSyncState.objects.filter(is_active=True).first()
    if not state:
        return {"skipped": "no active sync state"}

    params = {"status": "approved", "limit": 100}
    if state.last_synced_at:
        params["updated_after"] = state.last_synced_at.isoformat()

    try:
        resp = requests.get(
            f"{SALESCUBE_API_URL}/api/v1/sales/",
            headers={"Authorization": f"Token {SALESCUBE_TOKEN}"},
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        sales = resp.json().get("results", [])
    except Exception as exc:
        logger.error("Failed to fetch SalesCube sales: %s", exc)
        return {"error": str(exc)}

    triggered = 0
    for sale in sales:
        trigger_data = {
            "sale_number": str(sale.get("id", "")),
            "sale_id": str(sale.get("id", "")),
            "total_value": sale.get("total_value"),
            "customer_email": (sale.get("lead") or {}).get("email"),
        }
        execute_workflow_for_sale.delay(state.workflow_id, trigger_data)
        triggered += 1

    if sales:
        state.last_synced_at = now()
        state.save(update_fields=["last_synced_at"])

    logger.info("poll_salescube_approved_sales: triggered=%d", triggered)
    return {"triggered": triggered}


@shared_task(name="salesforce.execute_workflow_for_sale")
def execute_workflow_for_sale(workflow_id: str, trigger_data: dict):
    """Executa o workflow FlowCube com os dados da venda como trigger_data."""
    import asyncio

    from workflows.models import Workflow, Execution
    from workflows.engine.executor import WorkflowExecutor

    try:
        workflow = Workflow.objects.get(id=workflow_id)
    except Workflow.DoesNotExist:
        logger.error("Workflow %s not found", workflow_id)
        return {"error": f"workflow {workflow_id} not found"}

    execution = Execution.objects.create(
        workflow=workflow,
        trigger_data=trigger_data,
        status="pending",
    )

    executor = WorkflowExecutor(workflow, execution)
    asyncio.run(executor.execute())
    return {"execution_id": str(execution.id)}
