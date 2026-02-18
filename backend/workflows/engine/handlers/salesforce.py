"""
Salesforce node handlers: query, create record, update record.
"""
import asyncio
import logging
from typing import Optional

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


def _get_sf_client(credential_id: str):
    """Returns a simple-salesforce client from SalesforceCredential (sync)."""
    from simple_salesforce import Salesforce
    from salesforce.models import SalesforceCredential

    cred = SalesforceCredential.objects.get(id=credential_id, is_active=True)
    return Salesforce(
        username=cred.username,
        password=cred.password,
        security_token=cred.security_token,
        domain=cred.domain,
    )


@NodeRegistry.register
class SalesforceQueryHandler(BaseNodeHandler):
    """Executa uma query SOQL no Salesforce. Retorna lista de registros."""
    node_type = "salesforce_query"

    def validate(self, node_data: dict) -> Optional[str]:
        config = node_data.get("config", node_data)
        if not config.get("credential_id"):
            return "credential_id is required"
        if not config.get("soql"):
            return "soql query is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        from simple_salesforce import SalesforceError

        config = node_data.get("config", node_data)
        credential_id = config.get("credential_id")
        soql = context.resolve_template(config.get("soql", ""))
        output_var = config.get("output_variable", "sf_query_result")

        try:
            def _query():
                sf = _get_sf_client(credential_id)
                return sf.query_all(soql)

            result = await asyncio.to_thread(_query)
            records = result.get("records", [])

            context.set_variable(output_var, records)
            return NodeResult(
                output={"records": records, "total_size": result.get("totalSize", 0)}
            )

        except SalesforceError as e:
            logger.error("Salesforce query error: %s", e)
            return NodeResult(error=f"Salesforce query error: {e}")
        except Exception as e:
            logger.error("Unexpected Salesforce error: %s", e)
            return NodeResult(error=f"Unexpected error: {e}")


@NodeRegistry.register
class SalesforceCreateRecordHandler(BaseNodeHandler):
    """Cria um registro no Salesforce. Field mapping configurável via UI."""
    node_type = "salesforce_create_record"

    def validate(self, node_data: dict) -> Optional[str]:
        config = node_data.get("config", node_data)
        if not config.get("credential_id"):
            return "credential_id is required"
        if not config.get("sobject_type"):
            return "sobject_type (ex: Lancamento__c) is required"
        if not config.get("field_mapping"):
            return "field_mapping is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        from simple_salesforce import SalesforceError

        config = node_data.get("config", node_data)
        credential_id = config.get("credential_id")
        sobject_type = config.get("sobject_type")
        field_mapping = config.get("field_mapping", {})
        output_var = config.get("output_variable", "sf_create_result")

        resolved_fields = context.resolve_dict(field_mapping)

        try:
            def _create():
                sf = _get_sf_client(credential_id)
                return getattr(sf, sobject_type).create(resolved_fields)

            result = await asyncio.to_thread(_create)

            context.set_variable(output_var, result)
            return NodeResult(
                output={"id": result.get("id"), "success": result.get("success")}
            )

        except SalesforceError as e:
            logger.error("Salesforce create error: %s", e)
            return NodeResult(error=f"Salesforce create error: {e}")
        except Exception as e:
            logger.error("Unexpected Salesforce error: %s", e)
            return NodeResult(error=f"Unexpected error: {e}")


@NodeRegistry.register
class SalesforceUpdateRecordHandler(BaseNodeHandler):
    """Atualiza um registro existente no Salesforce."""
    node_type = "salesforce_update_record"

    def validate(self, node_data: dict) -> Optional[str]:
        config = node_data.get("config", node_data)
        if not config.get("credential_id"):
            return "credential_id is required"
        if not config.get("sobject_type"):
            return "sobject_type is required"
        if not config.get("record_id"):
            return "record_id (ou template) is required"
        if not config.get("field_mapping"):
            return "field_mapping is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        from simple_salesforce import SalesforceError

        config = node_data.get("config", node_data)
        credential_id = config.get("credential_id")
        sobject_type = config.get("sobject_type")
        record_id = context.resolve_template(config.get("record_id", ""))
        field_mapping = config.get("field_mapping", {})
        resolved_fields = context.resolve_dict(field_mapping)

        try:
            def _update():
                sf = _get_sf_client(credential_id)
                return getattr(sf, sobject_type).update(record_id, resolved_fields)

            result = await asyncio.to_thread(_update)
            return NodeResult(output={"record_id": record_id, "http_status": result})

        except SalesforceError as e:
            logger.error("Salesforce update error: %s", e)
            return NodeResult(error=f"Salesforce update error: {e}")
        except Exception as e:
            logger.error("Unexpected Salesforce error: %s", e)
            return NodeResult(error=f"Unexpected error: {e}")
