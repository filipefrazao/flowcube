"""
Action node handlers: HTTP requests, webhooks, generic actions.
"""
import logging

import httpx

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class HTTPRequestHandler(BaseNodeHandler):
    """
    General-purpose HTTP request node.

    node_data config:
        method: GET|POST|PUT|PATCH|DELETE
        url: string (supports {{template}})
        headers: dict
        body: dict or string
        timeout: int (seconds, default 30)
        output_variable: string (variable name to store response)
    """
    node_type = "http_request"

    def validate(self, node_data: dict) -> str | None:
        config = node_data.get("config", node_data)
        url = config.get("url", "")
        if not url:
            return "url is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        method = (config.get("method", "GET")).upper()
        url = context.resolve_template(config.get("url", ""))
        headers = context.resolve_dict(config.get("headers", {}))
        timeout = int(config.get("timeout", 30))
        body = config.get("body")

        if isinstance(body, dict):
            body = context.resolve_dict(body)
        elif isinstance(body, str):
            body = context.resolve_template(body)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                if method in ("POST", "PUT", "PATCH") and body:
                    response = await client.request(method, url, headers=headers, json=body)
                else:
                    response = await client.request(method, url, headers=headers)

            # Try to parse JSON, fallback to text
            try:
                response_body = response.json()
            except Exception:
                response_body = response.text

            output = {
                "status_code": response.status_code,
                "body": response_body,
                "headers": dict(response.headers),
                "success": 200 <= response.status_code < 400,
            }

            # Store in variable if configured
            output_var = config.get("output_variable")
            if output_var:
                context.set_variable(output_var, response_body)
                context.set_variable(f"{output_var}_status", response.status_code)

            return NodeResult(output=output)

        except httpx.TimeoutException:
            return NodeResult(error=f"HTTP request timed out after {timeout}s")
        except Exception as exc:
            return NodeResult(error=f"HTTP request failed: {exc}")


@NodeRegistry.register
class WebhookSendHandler(BaseNodeHandler):
    """Send a webhook (POST) to an external URL."""
    node_type = ["webhook", "n8n_webhook"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        url = context.resolve_template(config.get("url", ""))
        if not url:
            return NodeResult(error="url is required")

        headers = context.resolve_dict(config.get("headers", {}))
        payload = config.get("payload", {})
        if isinstance(payload, dict):
            payload = context.resolve_dict(payload)

        # For n8n_webhook, prepend base URL
        if node_data.get("type") == "n8n_webhook":
            from django.conf import settings
            n8n_base = getattr(settings, "N8N_WEBHOOK_URL", "https://n8n.frzgroup.com.br/webhook")
            webhook_path = context.resolve_template(config.get("webhook_path", url))
            if not webhook_path.startswith("http"):
                url = f"{n8n_base}/{webhook_path.lstrip('/')}"
            else:
                url = webhook_path

        timeout = int(config.get("timeout", 30))

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload, headers=headers)

            try:
                response_body = response.json()
            except Exception:
                response_body = response.text

            output_var = config.get("output_variable", "webhook_response")
            context.set_variable(output_var, response_body)

            return NodeResult(output={
                "status_code": response.status_code,
                "body": response_body,
                "success": 200 <= response.status_code < 400,
            })
        except Exception as exc:
            return NodeResult(error=f"Webhook failed: {exc}")


@NodeRegistry.register
class TextResponseHandler(BaseNodeHandler):
    """Output node that produces a text response."""
    node_type = ["text_response", "image_response", "whatsapp_template"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        content = context.resolve_template(config.get("content", config.get("text", "")))
        node_type = node_data.get("type", "text_response")

        output = {"type": node_type, "content": content}

        if node_type == "image_response":
            output["url"] = context.resolve_template(config.get("image_url", ""))
            output["caption"] = content

        return NodeResult(output=output)
