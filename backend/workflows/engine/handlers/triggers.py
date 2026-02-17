"""
Trigger node handlers.

Triggers are the entry points of a workflow.
They don't perform actions themselves but pass through trigger_data
so downstream nodes can use it.
"""
from workflows.engine.base import BaseNodeHandler, NodeResult
from workflows.engine.context import ExecutionContext
from workflows.engine.registry import NodeRegistry


@NodeRegistry.register
class WebhookTriggerHandler(BaseNodeHandler):
    node_type = ["webhook_trigger", "premium_trigger"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        # Pass trigger_data as output so downstream can reference it
        return NodeResult(output=context.trigger_data)


@NodeRegistry.register
class ScheduleTriggerHandler(BaseNodeHandler):
    node_type = "schedule"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        return NodeResult(output={
            "triggered_by": "schedule",
            "trigger_data": context.trigger_data,
        })


@NodeRegistry.register
class ManualTriggerHandler(BaseNodeHandler):
    node_type = "manual_trigger"

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        return NodeResult(output={
            "triggered_by": "manual",
            "trigger_data": context.trigger_data,
        })


@NodeRegistry.register
class WhatsAppTriggerHandler(BaseNodeHandler):
    node_type = ["whatsapp_trigger", "evolution_trigger"]

    async def execute(self, node_data: dict, context: ExecutionContext) -> NodeResult:
        return NodeResult(output=context.trigger_data)
