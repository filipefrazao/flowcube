"""
FlowCube Chatbot Runtime Engine
Executes workflow logic for chat conversations
Multi-Agent Orchestration - 2026-01-30
"""
import logging
import re
import json
import httpx
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timedelta
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from asgiref.sync import sync_to_async

from flowcube.models import ChatSession, ChatMessage, HandoffRequest
from flowcube.integrations.whatsapp import evolution_client
from flowcube.integrations.http_client import GenericHTTPClient, WebhookClient
from workflows.models import Workflow

logger = logging.getLogger("flowcube.runtime")


class ChatbotRuntime:
    """
    Executes chatbot workflows based on incoming messages
    """

    OUTPUT_NODE_TYPES = {
        "text_response", "image_response", "whatsapp_template",
        "choice", "text_input", "email_input", "phone_input",
    }
    INPUT_NODE_TYPES = {"text_input", "email_input", "phone_input", "choice"}
    HANDOFF_KEYWORDS = [
        "falar com humano", "falar com pessoa", "atendente",
        "falar com alguém", "talk to human", "agent", "operador",
    ]

    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        self._workflow = None
        self._graph = None
        self._nodes_by_id = {}
        self._http_client = GenericHTTPClient()

    @property
    async def workflow(self) -> Workflow:
        if self._workflow is None:
            self._workflow = await sync_to_async(Workflow.objects.get)(id=self.workflow_id)
        return self._workflow

    @property
    async def graph(self) -> Dict:
        if self._graph is None:
            wf = await self.workflow
            self._graph = wf.graph or {"nodes": [], "edges": []}
            self._nodes_by_id = {node["id"]: node for node in self._graph.get("nodes", [])}
        return self._graph

    def get_node(self, node_id: str) -> Optional[Dict]:
        return self._nodes_by_id.get(node_id)

    def find_start_node(self) -> Optional[Dict]:
        graph = self._graph
        if not graph:
            return None
        nodes = graph.get("nodes", [])
        edges = graph.get("edges", [])
        trigger_types = {"whatsapp_trigger", "webhook_trigger", "schedule"}
        for node in nodes:
            if node.get("type") in trigger_types:
                return node
        target_ids = {edge["target"] for edge in edges}
        for node in nodes:
            if node["id"] not in target_ids:
                return node
        return nodes[0] if nodes else None

    def get_next_nodes(self, current_node_id: str, output_handle: str = "default") -> List[Dict]:
        graph = self._graph
        next_nodes = []
        for edge in graph.get("edges", []):
            if edge["source"] == current_node_id:
                edge_handle = edge.get("sourceHandle", "default")
                if edge_handle == output_handle or output_handle == "default":
                    target_node = self.get_node(edge["target"])
                    if target_node:
                        next_nodes.append({"node": target_node, "edge": edge})
        return next_nodes

    async def get_or_create_session(self, phone: str, instance: str = "", contact_name: str = "") -> ChatSession:
        wf = await self.workflow
        session = await sync_to_async(
            ChatSession.objects.filter(
                workflow=wf, contact_phone=phone,
                status__in=["active", "waiting_input", "waiting_ai"],
            ).first
        )()
        if session:
            return session
        await self.graph
        start_node = self.find_start_node()
        session = await sync_to_async(ChatSession.objects.create)(
            workflow=wf, contact_phone=phone, contact_name=contact_name,
            whatsapp_instance=instance,
            current_node_id=start_node["id"] if start_node else "",
            status=ChatSession.Status.ACTIVE,
        )
        logger.info(f"Created new session {session.id} for {phone}")
        return session

    async def process_message(
        self, phone: str, message_text: str, instance: str = "",
        contact_name: str = "", message_id: str = ""
    ) -> List[Dict]:
        responses = []
        session = await self.get_or_create_session(phone, instance, contact_name)
        await self.graph
        await self._save_message(session=session, content=message_text, direction="inbound", whatsapp_message_id=message_id)

        if self._should_handoff(message_text):
            await self._trigger_handoff(session, HandoffRequest.Reason.EXPLICIT_REQUEST)
            responses.append({"type": "text", "content": "Entendi! Vou transferir você para um de nossos atendentes. Aguarde um momento."})
            return responses

        current_node = self.get_node(session.current_node_id)
        if not current_node:
            current_node = self.find_start_node()
            if current_node:
                session.current_node_id = current_node["id"]
                await sync_to_async(session.save)(update_fields=["current_node_id"])

        if not current_node:
            logger.warning(f"No nodes found for workflow {self.workflow_id}")
            return responses

        node_type = current_node.get("type", "")
        node_data = current_node.get("data", {})

        if node_type in self.INPUT_NODE_TYPES:
            valid, extracted_value = self._validate_input(message_text, node_type, node_data)
            if valid:
                var_name = node_data.get("variable_name", f'input_{current_node["id"]}')
                session.variables[var_name] = extracted_value
                next_items = self.get_next_nodes(current_node["id"])
                if next_items:
                    current_node = next_items[0]["node"]
                    session.current_node_id = current_node["id"]
                else:
                    session.status = ChatSession.Status.COMPLETED
                await sync_to_async(session.save)(update_fields=["current_node_id", "variables", "status"])
            else:
                error_msg = node_data.get("error_message", "Por favor, tente novamente.")
                responses.append({"type": "text", "content": error_msg})
                return responses

        while current_node:
            node_type = current_node.get("type", "")
            response = await self._execute_node(current_node, session)
            if response:
                responses.append(response)
            if node_type in self.INPUT_NODE_TYPES:
                session.status = ChatSession.Status.WAITING_INPUT
                session.current_node_id = current_node["id"]
                await sync_to_async(session.save)(update_fields=["current_node_id", "status"])
                break
            next_items = self.get_next_nodes(current_node["id"])
            if not next_items:
                session.status = ChatSession.Status.COMPLETED
                await sync_to_async(session.save)(update_fields=["status"])
                break
            if len(next_items) > 1:
                current_node = await self._evaluate_conditions(next_items, session)
            else:
                current_node = next_items[0]["node"]
            session.current_node_id = current_node["id"] if current_node else ""
            await sync_to_async(session.save)(update_fields=["current_node_id"])

        return responses

    async def _execute_node(self, node: Dict, session: ChatSession) -> Optional[Dict]:
        node_type = node.get("type", "")
        node_data = node.get("data", {})
        content = self._process_variables(node_data.get("content", ""), session.variables)

        if node_type == "text_response":
            return {"type": "text", "content": content}
        elif node_type == "image_response":
            return {"type": "image", "url": node_data.get("image_url", ""), "caption": content}
        elif node_type == "text_input":
            return {"type": "text", "content": node_data.get("prompt", content or "Digite sua resposta:")}
        elif node_type == "email_input":
            return {"type": "text", "content": node_data.get("prompt", "Por favor, digite seu email:")}
        elif node_type == "phone_input":
            return {"type": "text", "content": node_data.get("prompt", "Por favor, digite seu telefone:")}
        elif node_type == "choice":
            choices = node_data.get("choices", [])
            buttons = [{"id": f"choice_{i}", "text": choice} for i, choice in enumerate(choices)]
            return {"type": "buttons", "text": content or "Escolha uma opção:", "buttons": buttons}
        elif node_type == "set_variable":
            var_name = node_data.get("variable_name", "")
            var_value = self._process_variables(node_data.get("value", ""), session.variables)
            if var_name:
                session.variables[var_name] = var_value
            return None
        elif node_type == "http_request":
            return await self._execute_http_request(node_data, session)
        elif node_type == "webhook":
            return await self._execute_webhook(node_data, session)
        elif node_type in ["openai", "ai_openai"]:
            return await self._execute_openai(node_data, session)
        elif node_type in ["claude", "ai_claude", "anthropic"]:
            return await self._execute_claude(node_data, session)
        elif node_type in ["deepseek", "ai_deepseek"]:
            return await self._execute_deepseek(node_data, session)
        elif node_type == "salescube_create_lead":
            return await self._execute_salescube_create_lead(node_data, session)
        elif node_type == "n8n_webhook":
            return await self._execute_n8n_webhook(node_data, session)
        return None

    async def _execute_http_request(self, node_data: Dict, session: ChatSession) -> Optional[Dict]:
        try:
            method = node_data.get("method", "GET").upper()
            url = self._process_variables(node_data.get("url", ""), session.variables)
            headers = node_data.get("headers", {})
            body = node_data.get("body", {})
            auth_config = node_data.get("auth", {})
            timeout = node_data.get("timeout", 30)

            if isinstance(body, dict):
                body = self._http_client.interpolate_dict(body, session.variables)
            elif isinstance(body, str):
                body = self._process_variables(body, session.variables)
            headers = self._http_client.interpolate_dict(headers, session.variables)

            result = await self._http_client.request(method=method, url=url, headers=headers, body=body, auth=auth_config, timeout=timeout)
            output_var = node_data.get("output_variable", "http_response")
            session.variables[output_var] = result.get("body", "")
            session.variables[f"{output_var}_status"] = result.get("status_code", 0)
            session.variables[f"{output_var}_success"] = result.get("success", False)
            logger.info(f"HTTP {method} {url} -> {result.get('status_code')}")
            if node_data.get("show_response", False):
                return {"type": "text", "content": f"HTTP Response: {result.get('status_code')}"}
            return None
        except Exception as e:
            logger.error(f"HTTP Request failed: {e}")
            session.variables["http_error"] = str(e)
            return None

    async def _execute_webhook(self, node_data: Dict, session: ChatSession) -> Optional[Dict]:
        try:
            url = self._process_variables(node_data.get("url", ""), session.variables)
            payload = node_data.get("payload", {})
            headers = node_data.get("headers", {})
            auth_config = node_data.get("auth", {})
            payload = self._http_client.interpolate_dict(payload, session.variables)
            headers = self._http_client.interpolate_dict(headers, session.variables)
            client = WebhookClient()
            result = await client.send_webhook(url=url, payload=payload, headers=headers, auth=auth_config, variables=session.variables)
            await client.close()
            output_var = node_data.get("output_variable", "webhook_response")
            session.variables[output_var] = result.get("body", "")
            session.variables[f"{output_var}_success"] = result.get("success", False)
            logger.info(f"Webhook sent to {url} -> {result.get('status_code')}")
            return None
        except Exception as e:
            logger.error(f"Webhook failed: {e}")
            session.variables["webhook_error"] = str(e)
            return None

    async def _execute_openai(self, node_data: Dict, session: ChatSession) -> Optional[Dict]:
        api_key = getattr(settings, "OPENAI_API_KEY", "")
        if not api_key:
            return {"type": "text", "content": "[Erro: API OpenAI não configurada]"}
        try:
            model = node_data.get("model", "gpt-4o")
            system_prompt = self._process_variables(node_data.get("system_prompt", ""), session.variables)
            user_prompt = self._process_variables(node_data.get("prompt", ""), session.variables)
            temperature = node_data.get("temperature", 0.7)
            max_tokens = node_data.get("max_tokens", 2000)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_prompt})
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens},
                )
                response.raise_for_status()
                data = response.json()
            ai_response = data["choices"][0]["message"]["content"]
            output_var = node_data.get("output_variable", "ai_response")
            session.variables[output_var] = ai_response
            if node_data.get("send_response", True):
                return {"type": "text", "content": ai_response}
            return None
        except Exception as e:
            logger.error(f"OpenAI request failed: {e}")
            return {"type": "text", "content": f"[Erro AI: {str(e)[:100]}]"}

    async def _execute_claude(self, node_data: Dict, session: ChatSession) -> Optional[Dict]:
        api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            return {"type": "text", "content": "[Erro: API Anthropic não configurada]"}
        try:
            model = node_data.get("model", "claude-3-5-sonnet-20241022")
            system_prompt = self._process_variables(node_data.get("system_prompt", ""), session.variables)
            user_prompt = self._process_variables(node_data.get("prompt", ""), session.variables)
            temperature = node_data.get("temperature", 0.7)
            max_tokens = node_data.get("max_tokens", 2000)
            messages = [{"role": "user", "content": user_prompt}]
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": api_key, "Content-Type": "application/json", "anthropic-version": "2023-06-01"},
                    json={"model": model, "max_tokens": max_tokens, "temperature": temperature, "system": system_prompt, "messages": messages},
                )
                response.raise_for_status()
                data = response.json()
            ai_response = data["content"][0]["text"]
            output_var = node_data.get("output_variable", "ai_response")
            session.variables[output_var] = ai_response
            if node_data.get("send_response", True):
                return {"type": "text", "content": ai_response}
            return None
        except Exception as e:
            logger.error(f"Claude request failed: {e}")
            return {"type": "text", "content": f"[Erro AI: {str(e)[:100]}]"}

    async def _execute_deepseek(self, node_data: Dict, session: ChatSession) -> Optional[Dict]:
        ollama_url = getattr(settings, "OLLAMA_URL", "https://u3u8uqu4it2lhe-11434.proxy.runpod.net")
        try:
            model = node_data.get("model", "deepseek-r1:70b")
            system_prompt = self._process_variables(node_data.get("system_prompt", ""), session.variables)
            user_prompt = self._process_variables(node_data.get("prompt", ""), session.variables)
            temperature = node_data.get("temperature", 0.7)
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": user_prompt})
            async with httpx.AsyncClient(timeout=300) as client:
                response = await client.post(
                    f"{ollama_url}/api/chat",
                    json={"model": model, "messages": messages, "stream": False, "options": {"temperature": temperature}},
                )
                response.raise_for_status()
                data = response.json()
            ai_response = data.get("message", {}).get("content", "")
            output_var = node_data.get("output_variable", "ai_response")
            session.variables[output_var] = ai_response
            if node_data.get("send_response", True):
                return {"type": "text", "content": ai_response}
            return None
        except Exception as e:
            logger.error(f"DeepSeek request failed: {e}")
            return {"type": "text", "content": f"[Erro AI: {str(e)[:100]}]"}

    async def _execute_salescube_create_lead(self, node_data: Dict, session: ChatSession) -> Optional[Dict]:
        api_url = getattr(settings, "SALESCUBE_API_URL", "https://api.frzglobal.com.br")
        api_token = getattr(settings, "SALESCUBE_API_TOKEN", "6550a421c3efbb107bfd4d1ef68a3320e06345ae")
        try:
            lead_data = {
                "name": self._process_variables(node_data.get("name", "{{contact_name}}"), session.variables),
                "phone": self._process_variables(node_data.get("phone", "{{contact_phone}}"), session.variables),
                "email": self._process_variables(node_data.get("email", ""), session.variables),
                "channel": node_data.get("channel", 78),
                "column": node_data.get("column", 48),
                "origin": node_data.get("origin", 11),
                "responsibles": node_data.get("responsibles", [78]),
                "is_ai_enabled": node_data.get("is_ai_enabled", False),
            }
            if not lead_data["name"] or lead_data["name"] == "{{contact_name}}":
                lead_data["name"] = session.contact_name or "Lead FlowCube"
            if not lead_data["phone"] or lead_data["phone"] == "{{contact_phone}}":
                lead_data["phone"] = session.contact_phone
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{api_url}/api/leads/",
                    json=lead_data,
                    headers={"Authorization": f"Token {api_token}", "Content-Type": "application/json"},
                )
                if response.status_code == 201:
                    result = response.json()
                    session.salescube_lead_id = result.get("id")
                    session.variables["lead_id"] = result.get("id")
                    logger.info(f"Lead created in SalesCube: {result.get('id')}")
                else:
                    logger.error(f"Failed to create lead: {response.status_code}")
                    session.variables["lead_error"] = response.text
            return None
        except Exception as e:
            logger.error(f"SalesCube create lead failed: {e}")
            session.variables["lead_error"] = str(e)
            return None

    async def _execute_n8n_webhook(self, node_data: Dict, session: ChatSession) -> Optional[Dict]:
        n8n_base = getattr(settings, "N8N_WEBHOOK_URL", "https://n8n.frzgroup.com.br/webhook")
        try:
            webhook_path = self._process_variables(node_data.get("webhook_path", ""), session.variables)
            payload = node_data.get("payload", {})
            payload = self._http_client.interpolate_dict(payload, session.variables)
            payload["flowcube_session_id"] = str(session.id)
            payload["contact_phone"] = session.contact_phone
            payload["contact_name"] = session.contact_name
            url = f"{n8n_base}/{webhook_path}"
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, json=payload)
                session.variables["n8n_response"] = response.text
                session.variables["n8n_status"] = response.status_code
                logger.info(f"N8N webhook sent to {url} -> {response.status_code}")
            return None
        except Exception as e:
            logger.error(f"N8N webhook failed: {e}")
            session.variables["n8n_error"] = str(e)
            return None

    def _validate_input(self, input_text: str, node_type: str, node_data: Dict) -> Tuple[bool, Any]:
        input_text = input_text.strip()
        if node_type == "text_input":
            min_len = node_data.get("min_length", 1)
            max_len = node_data.get("max_length", 1000)
            if min_len <= len(input_text) <= max_len:
                return True, input_text
            return False, None
        elif node_type == "email_input":
            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
            if re.match(email_pattern, input_text):
                return True, input_text.lower()
            return False, None
        elif node_type == "phone_input":
            phone = re.sub(r"\D", "", input_text)
            if 10 <= len(phone) <= 13:
                if len(phone) == 10 or len(phone) == 11:
                    phone = "55" + phone
                return True, phone
            return False, None
        elif node_type == "choice":
            choices = node_data.get("choices", [])
            for i, choice in enumerate(choices):
                if input_text.lower() == choice.lower() or input_text == str(i + 1):
                    return True, choice
            return False, None
        return True, input_text

    async def _evaluate_conditions(self, next_items: List[Dict], session: ChatSession) -> Optional[Dict]:
        for item in next_items:
            edge = item["edge"]
            condition = edge.get("data", {}).get("condition", {})
            if not condition:
                return item["node"]
            variable = condition.get("variable", "")
            operator = condition.get("operator", "equals")
            value = condition.get("value", "")
            actual_value = session.variables.get(variable, "")
            if operator == "equals" and str(actual_value) == str(value):
                return item["node"]
            elif operator == "contains" and str(value) in str(actual_value):
                return item["node"]
            elif operator == "not_empty" and actual_value:
                return item["node"]
        return next_items[0]["node"] if next_items else None

    def _process_variables(self, text: str, variables: Dict) -> str:
        if not text:
            return text
        def replace_var(match):
            var_name = match.group(1).strip()
            return str(variables.get(var_name, match.group(0)))
        return re.sub(r"\{\{\s*(\w+)\s*\}\}", replace_var, text)

    def _should_handoff(self, message_text: str) -> bool:
        message_lower = message_text.lower()
        return any(keyword in message_lower for keyword in self.HANDOFF_KEYWORDS)

    async def _trigger_handoff(self, session: ChatSession, reason: str):
        session.status = ChatSession.Status.HANDOFF
        session.handoff_reason = reason
        await sync_to_async(session.save)(update_fields=["status", "handoff_reason"])
        await sync_to_async(HandoffRequest.objects.create)(session=session, reason=reason, collected_variables=session.variables)
        logger.info(f"Handoff triggered for session {session.id}: {reason}")

    async def _save_message(self, session: ChatSession, content: str, direction: str, message_type: str = "text", whatsapp_message_id: str = ""):
        await sync_to_async(ChatMessage.objects.create)(session=session, direction=direction, message_type=message_type, content=content, whatsapp_message_id=whatsapp_message_id)
        session.message_count += 1
        session.last_message_at = timezone.now()
        await sync_to_async(session.save)(update_fields=["message_count", "last_message_at"])


async def send_responses(instance: str, to: str, responses: List[Dict]) -> None:
    for response in responses:
        try:
            if response["type"] == "text":
                await evolution_client.send_text(instance, to, response["content"])
            elif response["type"] == "image":
                await evolution_client.send_image(instance, to, response["url"], response.get("caption", ""))
            elif response["type"] == "buttons":
                await evolution_client.send_buttons(instance, to, response["text"], response["buttons"])
        except Exception as e:
            logger.error(f"Failed to send response: {e}")
