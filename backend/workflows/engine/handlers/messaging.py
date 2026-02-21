"""
Messaging node handlers: Email (SMTP) and WhatsApp (via ChatCube EngineClient).
— Evolution API references removed.
"""
import logging

import httpx
from asgiref.sync import sync_to_async
from django.conf import settings as django_settings

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class SendEmailHandler(BaseNodeHandler):
    """Send email via SMTP using aiosmtplib."""

    node_type = "send_email"

    def validate(self, node_data: dict) -> str | None:
        config = node_data.get("config", node_data)
        if not config.get("to"):
            return "'to' email address is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        to = context.resolve_template(config.get("to", ""))
        subject = context.resolve_template(config.get("subject", ""))
        body = context.resolve_template(config.get("body", ""))
        from_email = config.get("from", getattr(django_settings, "DEFAULT_FROM_EMAIL", "noreply@frzgroup.com.br"))

        try:
            import aiosmtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            smtp_host = getattr(django_settings, "EMAIL_HOST", "smtp.gmail.com")
            smtp_port = int(getattr(django_settings, "EMAIL_PORT", 587))
            smtp_user = getattr(django_settings, "EMAIL_HOST_USER", "")
            smtp_pass = getattr(django_settings, "EMAIL_HOST_PASSWORD", "")

            msg = MIMEMultipart("alternative")
            msg["From"] = from_email
            msg["To"] = to
            msg["Subject"] = subject

            is_html = "<" in body and ">" in body
            if is_html:
                msg.attach(MIMEText(body, "html"))
            else:
                msg.attach(MIMEText(body, "plain"))

            await aiosmtplib.send(
                msg,
                hostname=smtp_host,
                port=smtp_port,
                username=smtp_user,
                password=smtp_pass,
                start_tls=True,
            )
            return NodeResult(output={"sent": True, "to": to, "subject": subject})
        except Exception as exc:
            return NodeResult(error=f"Email send failed: {exc}")


@NodeRegistry.register
class WhatsAppSendHandler(BaseNodeHandler):
    """Send WhatsApp message via ChatCube EngineClient."""

    node_type = "whatsapp_send"

    def validate(self, node_data: dict) -> str | None:
        config = node_data.get("config", node_data)
        if not config.get("to") and not config.get("phone"):
            return "'to' or 'phone' number is required"
        return None

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        instance_name = context.resolve_template(config.get("instance", ""))
        to = context.resolve_template(config.get("to", config.get("phone", "")))
        message = context.resolve_template(config.get("message", config.get("content", "")))

        if not instance_name:
            return NodeResult(error="WhatsApp instance is required")

        try:
            from chatcube.engine_client import EngineClient
            from chatcube.models import WhatsAppInstance

            # Resolve engine_instance_id from instance name
            try:
                wa_instance = await sync_to_async(WhatsAppInstance.objects.get)(name=instance_name)
                engine_id = wa_instance.engine_instance_id
            except WhatsAppInstance.DoesNotExist:
                engine_id = instance_name  # fallback: treat as engine_instance_id

            if not engine_id:
                return NodeResult(error=f"No engine_instance_id for instance {instance_name}")

            client = EngineClient()
            result = await sync_to_async(client.send_message)(
                engine_id,
                to=to,
                message_type="text",
                content=message,
            )
            return NodeResult(output={"sent": True, "to": to, "response": result})
        except Exception as exc:
            return NodeResult(error=f"WhatsApp send failed: {exc}")


@NodeRegistry.register
class SalesCubeCreateLeadHandler(BaseNodeHandler):
    """Create a lead in SalesCube CRM."""

    node_type = "salescube_create_lead"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        api_url = getattr(django_settings, "SALESCUBE_API_URL", "https://api.frzglobal.com.br")
        api_token = getattr(django_settings, "SALESCUBE_API_TOKEN", "")

        lead_data = {
            "name": context.resolve_template(config.get("name", "")),
            "phone": context.resolve_template(config.get("phone", "")),
            "email": context.resolve_template(config.get("email", "")),
            "channel": config.get("channel", 78),
            "column": config.get("column", 48),
            "origin": config.get("origin", 11),
            "responsibles": config.get("responsibles", [78]),
            "is_ai_enabled": config.get("is_ai_enabled", False),
        }

        if not lead_data["name"]:
            lead_data["name"] = "Lead FRZ Platform"

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{api_url}/api/leads/",
                    json=lead_data,
                    headers={
                        "Authorization": f"Token {api_token}",
                        "Content-Type": "application/json",
                    },
                )

            if response.status_code == 201:
                result = response.json()
                context.set_variable("lead_id", result.get("id"))
                return NodeResult(output={"lead_id": result.get("id"), "created": True})
            else:
                return NodeResult(error=f"SalesCube API {response.status_code}: {response.text[:200]}")
        except Exception as exc:
            return NodeResult(error=f"SalesCube create lead failed: {exc}")
