"""
AI/LLM node handlers - multi-provider (OpenAI, Claude, DeepSeek).
"""
import logging

import httpx
from django.conf import settings as django_settings

from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry

logger = logging.getLogger("flowcube.engine")


@NodeRegistry.register
class OpenAIHandler(BaseNodeHandler):
    node_type = ["openai", "ai_openai"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        api_key = getattr(django_settings, "OPENAI_API_KEY", "")
        if not api_key:
            return NodeResult(error="OPENAI_API_KEY not configured")

        model = config.get("model", "gpt-4o")
        system_prompt = context.resolve_template(config.get("system_prompt", ""))
        user_prompt = context.resolve_template(config.get("prompt", ""))
        temperature = float(config.get("temperature", 0.7))
        max_tokens = int(config.get("max_tokens", 2000))

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                )
                response.raise_for_status()
                data = response.json()

            ai_text = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})

            output_var = config.get("output_variable", "ai_response")
            context.set_variable(output_var, ai_text)

            return NodeResult(
                output={"text": ai_text, "model": model, "usage": usage},
                metadata={"provider": "openai", "model": model},
            )
        except Exception as exc:
            return NodeResult(error=f"OpenAI error: {exc}")


@NodeRegistry.register
class ClaudeHandler(BaseNodeHandler):
    node_type = ["claude", "ai_claude", "anthropic"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        api_key = getattr(django_settings, "ANTHROPIC_API_KEY", "")
        if not api_key:
            return NodeResult(error="ANTHROPIC_API_KEY not configured")

        model = config.get("model", "claude-sonnet-4-5-20250929")
        system_prompt = context.resolve_template(config.get("system_prompt", ""))
        user_prompt = context.resolve_template(config.get("prompt", ""))
        temperature = float(config.get("temperature", 0.7))
        max_tokens = int(config.get("max_tokens", 2000))

        messages = [{"role": "user", "content": user_prompt}]

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01",
                    },
                    json={
                        "model": model,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                        "system": system_prompt,
                        "messages": messages,
                    },
                )
                response.raise_for_status()
                data = response.json()

            ai_text = data["content"][0]["text"]
            usage = data.get("usage", {})

            output_var = config.get("output_variable", "ai_response")
            context.set_variable(output_var, ai_text)

            return NodeResult(
                output={"text": ai_text, "model": model, "usage": usage},
                metadata={"provider": "anthropic", "model": model},
            )
        except Exception as exc:
            return NodeResult(error=f"Claude error: {exc}")


@NodeRegistry.register
class DeepSeekHandler(BaseNodeHandler):
    node_type = ["deepseek", "ai_deepseek"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        config = node_data.get("config", node_data)
        ollama_url = getattr(django_settings, "OLLAMA_URL", "https://u3u8uqu4it2lhe-11434.proxy.runpod.net")
        model = config.get("model", "deepseek-r1:70b")
        system_prompt = context.resolve_template(config.get("system_prompt", ""))
        user_prompt = context.resolve_template(config.get("prompt", ""))
        temperature = float(config.get("temperature", 0.7))

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_prompt})

        try:
            async with httpx.AsyncClient(timeout=300) as client:
                response = await client.post(
                    f"{ollama_url}/api/chat",
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": False,
                        "options": {"temperature": temperature},
                    },
                )
                response.raise_for_status()
                data = response.json()

            ai_text = data.get("message", {}).get("content", "")

            output_var = config.get("output_variable", "ai_response")
            context.set_variable(output_var, ai_text)

            return NodeResult(
                output={"text": ai_text, "model": model},
                metadata={"provider": "ollama/deepseek", "model": model},
            )
        except Exception as exc:
            return NodeResult(error=f"DeepSeek error: {exc}")
