"""
FlowCube AI Agents App

This app provides a complete AI agent infrastructure using LangChain and LangGraph,
supporting multiple LLM providers, RAG capabilities, and custom tool execution.

Features:
- Multi-provider LLM support (OpenAI, Anthropic, Google, DeepSeek)
- LangGraph-based agent workflows
- Custom tool registry and execution
- RAG with Qdrant vector store
- Streaming responses
- Token counting and cost tracking
- Celery async execution

Author: FRZ Group
Version: 1.0.0
"""

default_app_config = 'ai_agents.apps.AiAgentsConfig'

__version__ = '1.0.0'
__author__ = 'FRZ Group'
