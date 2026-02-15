import asyncio
import json
from uuid import UUID
from datetime import datetime

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class FlowExecutionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.flow_id = self.scope['url_route']['kwargs'].get('flow_id')
        if self.flow_id:
            await self.channel_layer.group_add(
                f"flow_{self.flow_id}",
                self.channel_name
            )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'flow_id') and self.flow_id:
            await self.channel_layer.group_discard(
                f"flow_{self.flow_id}",
                self.channel_name
            )

    async def receive(self, text_data: str):
        try:
            data = json.loads(text_data)
            action = data.get('action')

            if action == 'execute_flow':
                flow_id = data.get('flow_id')
                flow = await self._get_flow(flow_id)

                if not flow:
                    await self.send(json.dumps({
                        'status': 'error',
                        'message': 'Flow not found'
                    }))
                    return

                if not flow.is_active:
                    await self.send(json.dumps({
                        'status': 'error',
                        'message': 'Flow is not active'
                    }))
                    return

                execution = await self._create_execution(flow)
                await self._execute_flow(flow, execution)

        except json.JSONDecodeError:
            await self.send(json.dumps({
                'status': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            await self.send(json.dumps({
                'status': 'error',
                'message': str(e)
            }))

    async def flow_update(self, event):
        """Handle flow update messages from channel layer."""
        await self.send(text_data=json.dumps(event.get('data', {})))

    @database_sync_to_async
    def _get_flow(self, flow_id):
        from .models import Flow
        try:
            return Flow.objects.get(id=flow_id)
        except Flow.DoesNotExist:
            return None

    @database_sync_to_async
    def _create_execution(self, flow):
        from .models import Execution
        return Execution.objects.create(
            flow=flow,
            started_by=self.scope.get('user'),
            status='running'
        )

    @database_sync_to_async
    def _get_steps(self, flow):
        from .models import Step
        return list(Step.objects.filter(flow=flow).order_by('position'))

    @database_sync_to_async
    def _update_execution(self, execution, status):
        execution.status = status
        if status == 'completed':
            execution.completed_at = datetime.now()
        execution.save()

    async def _execute_flow(self, flow, execution):
        try:
            steps = await self._get_steps(flow)
            for step in steps:
                await self.send(json.dumps({
                    'type': 'step_start',
                    'step_id': str(step.id),
                    'step_name': step.name
                }))

                await asyncio.sleep(0.1)

                await self.send(json.dumps({
                    'type': 'step_complete',
                    'step_id': str(step.id),
                    'step_name': step.name,
                    'status': 'success'
                }))

            await self._update_execution(execution, 'completed')
            await self.send(json.dumps({
                'type': 'execution_complete',
                'status': 'completed'
            }))

        except Exception as e:
            await self._update_execution(execution, 'failed')
            await self.send(json.dumps({
                'type': 'execution_error',
                'error': str(e)
            }))
