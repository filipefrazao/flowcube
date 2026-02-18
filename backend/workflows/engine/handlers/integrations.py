"""
Integration handlers for external services.

Handlers:
  - FacebookLeadAdsHandler: Trigger that parses Facebook Lead Ads payload
  - DeduplicateHandler: Logic node that deduplicates by field (phone, email, leadgenId)
  - SalesCubePushHandler: Action that creates a lead in SalesCube PROD
"""
import logging
import random

import httpx

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class FacebookLeadAdsHandler(BaseNodeHandler):
    """
    Trigger handler for Facebook Lead Ads.

    Receives trigger_data already parsed by the webhook view and passes it
    through as the node output so downstream nodes can reference fields via
    {{$trigger.name}}, {{$trigger.phone}}, etc.
    """

    node_type = "facebook_lead_ads"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        td = context.trigger_data
        if not td:
            return NodeResult(error="No trigger data received")

        # Normalize field names from Facebook payload
        output = {
            "leadgen_id": td.get("leadgen_id") or td.get("leadgenId", ""),
            "name": td.get("name") or td.get("full_name", ""),
            "phone": td.get("phone") or td.get("phone_number", ""),
            "email": td.get("email", ""),
            "profession": td.get("profession", ""),
            "form_id": td.get("form_id") or td.get("formId", ""),
            "ad_id": td.get("ad_id") or td.get("adId", ""),
            "adgroup_id": td.get("adgroup_id") or td.get("adgroupId", ""),
            "campaign_id": td.get("campaign_id") or td.get("campaignId", ""),
            "page_id": td.get("page_id") or td.get("pageId", ""),
            "created_time": td.get("created_time", ""),
            # Pass through the raw data for custom mapping
            "raw": td,
        }

        # Also extract from Facebook field_data array (SocialCube format)
        for field in td.get("field_data", []):
            fname = field.get("name", "").lower().strip()
            values = field.get("values", [])
            val = values[0] if values else ""
            if fname in ("full_name", "nome_completo", "nome", "qual_o_seu_nome"):
                output["name"] = output["name"] or val
            elif fname in ("phone_number", "telefone", "phone", "whatsapp",
                           "celular_(ddd+numero)", "qual_o_seu_whatsapp"):
                output["phone"] = output["phone"] or val
            elif fname in ("email", "e-mail", "qual_seu_melhor_email"):
                output["email"] = output["email"] or val
            elif fname in ("cargo", "profissao", "profession",
                           "qual_sua_profissao"):
                output["profession"] = output["profession"] or val

        # SocialCube context: page and form info
        output["page_name"] = td.get("page_name", "")
        output["form_name"] = td.get("form_name", "")

        # Always set key variables (even empty) so templates resolve properly
        for key in ("name", "phone", "email", "leadgen_id"):
            context.set_variable(key, output.get(key, ""))
        # Also set profession if available
        if output.get("profession"):
            context.set_variable("profession", output["profession"])

        return NodeResult(output=output)


@NodeRegistry.register
class DeduplicateHandler(BaseNodeHandler):
    """
    Deduplication logic node.

    Checks if a given field value has been seen before using an external
    dedup service (HTTP) at the configured URL.

    Config:
        field: str         - which field to deduplicate on (e.g. "phone", "leadgen_id")
        ttl_hours: int     - TTL for the dedup window (default 24)
        dedup_service_url: str - base URL of the dedup microservice

    Output:
        is_duplicate: bool
        field: str
        value: str

    source_handle: "new" or "duplicate" for edge routing.
    """

    node_type = "deduplicate"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        dedup_field = config.get("field", "phone")
        ttl_hours = int(config.get("ttl_hours", 24))
        service_url = config.get(
            "dedup_service_url", "https://sc.frzgroup.com.br/dedup"
        )

        # Resolve the value to check from context
        raw_value = config.get("value", "")
        if raw_value:
            value = context.resolve_template(str(raw_value))
        else:
            # Try trigger_data first, then variables
            value = (
                context.trigger_data.get(dedup_field, "")
                or context.get_variable(dedup_field, "")
            )

        if not value:
            return NodeResult(
                error=f"Dedup field '{dedup_field}' is empty",
                source_handle="duplicate",
            )

        # In-memory dedup within same execution (cheap guard)
        seen_key = "_dedup_seen"
        seen = context.variables.setdefault(seen_key, {})
        if value in seen:
            return NodeResult(
                output={"is_duplicate": True, "field": dedup_field, "value": value},
                source_handle="duplicate",
            )

        # External dedup service call
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{service_url.rstrip('/')}/register",
                    json={"id": value, "field": dedup_field, "ttl_hours": ttl_hours},
                )
                data = resp.json()
                is_new = data.get("created", True)
        except Exception as exc:
            logger.warning("Dedup service unavailable (%s), treating as new", exc)
            is_new = True

        # Track in-memory
        seen[value] = True

        is_duplicate = not is_new
        handle = "duplicate" if is_duplicate else "new"

        return NodeResult(
            output={"is_duplicate": is_duplicate, "field": dedup_field, "value": value},
            source_handle=handle,
        )


@NodeRegistry.register
class SalesCubePushHandler(BaseNodeHandler):
    """
    Push a lead to SalesCube PROD via the existing Celery task.

    Config:
        name / name_field: str (template)
        phone / phone_field: str (template)
        email / email_field: str (template)
        channel: int
        column: int
        origin: int
        responsibles: list[int]
        random_distribution: bool
        tags: list[int]
        is_ai_enabled: bool
    """

    node_type = ["salescube_push", "send_to_salescube"]

    def validate(self, node_data: dict) -> str | None:
        config = node_data.get("config", node_data)
        if not config.get("responsibles"):
            return "At least one responsible is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)

        # Resolve lead fields from templates or trigger data
        name = context.resolve_template(
            config.get("name") or config.get("name_field", "{{name}}")
        )
        phone = context.resolve_template(
            config.get("phone") or config.get("phone_field", "{{phone}}")
        )
        email = context.resolve_template(
            config.get("email") or config.get("email_field", "{{email}}")
        )

        if not name and not phone:
            return NodeResult(error="Lead must have at least name or phone")

        # Responsible selection
        responsibles = config.get("responsibles", [])
        if config.get("random_distribution") and len(responsibles) > 1:
            selected = [random.choice(responsibles)]
        else:
            selected = responsibles

        lead_data = {
            "name": name,
            "phone": phone,
            "email": email,
            "channel": config.get("channel", 78),
            "column": config.get("column", 48),
            "origin": config.get("origin", 11),
            "responsibles": selected,
            "is_ai_enabled": config.get("is_ai_enabled", False),
        }

        # Fire Celery task
        from flowcube.tasks import create_salescube_lead

        task_result = create_salescube_lead.delay(lead_data)

        output = {
            "status": "enqueued",
            "task_id": task_result.id,
            "lead_data": lead_data,
            "responsible_selected": selected,
        }

        # Handle tags if configured
        tags = config.get("tags", [])
        if tags:
            output["tags"] = tags
            # Tags will be created after lead is confirmed via a follow-up task
            # Store for potential downstream use
            context.set_variable("_pending_tags", tags)

        return NodeResult(output=output)
