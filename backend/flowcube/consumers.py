"""
FlowCube WebSocket Consumers

ExecutionProgressConsumer:
  Clients connect to ws/executions/<execution_id>/ and receive
  real-time progress events broadcast by the WorkflowExecutor.
"""
import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger("flowcube.ws")


class ExecutionProgressConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time execution progress.

    The WorkflowExecutor broadcasts events to the channel group
    ``execution_{execution_id}``.  This consumer joins that group
    on connect and forwards events to the client.
    """

    async def connect(self):
        self.execution_id = self.scope["url_route"]["kwargs"]["execution_id"]
        self.group_name = f"execution_{self.execution_id}"

        # Join group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        logger.info("WS connected: %s", self.group_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info("WS disconnected: %s", self.group_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Client can send a ping; we reply pong
        if text_data:
            try:
                data = json.loads(text_data)
                if data.get("type") == "ping":
                    await self.send(text_data=json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass

    # ------------------------------------------------------------------
    # Channel layer event handlers
    # ------------------------------------------------------------------

    async def execution_progress(self, event):
        """Forward execution progress events to the WebSocket client."""
        # Remove the internal 'type' field used by channels routing
        payload = {k: v for k, v in event.items() if k != "type"}
        await self.send(text_data=json.dumps(payload, default=str))
