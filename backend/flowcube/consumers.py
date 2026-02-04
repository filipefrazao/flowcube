
# flowcube/consumers.py
import json
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any

from channels.generic.websocket import AsyncWebsocketConsumer
from django.db.models import Q

from .models import Flow, Execution, Step


class FlowExecutionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
    
    async def disconnect(self, close_code):
        pass
    
    async def receive(self, text_data: str):
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'execute_flow':
                flow_id = UUID(data.get('flow_id'))
                flow = await Flow.objects.get(id=flow_id)
                
                if not flow.is_active:
                    await self.send(json.dumps({
                        'status': 'error',
                        'message': 'Flow is not active'
                    }))
                    return
                
                execution = Execution(
                    flow=flow,
                    started_by=self.scope['user'],
                    status='running'
                )
                execution.save()
                
                await self._execute_flow(flow, execution)
                
        except Exception as e:
            await self.send(json.dumps({
                'status': 'error',
                'message': str(e)
            }))
    
    async def _execute_step(self, step: Step, execution: Execution):
        try:
            # Send start message
            await self.send(json.dumps({
                'type': 'step_start',
                'step_id': str(step.id),
                'step_name': step.name
            }))
            
            # Simulate processing time
            await asyncio.sleep(2)
            
            # Send completion message
            await self.send(json.dumps({
                'type': 'step_complete',
                'step_id': str(step.id),
                'step_name': step.name,
                'status': 'success'
            }))
            
            return True
            
        except Exception as e:
            await self.send(json.dumps({
                'type': 'step_error',
                'step_id': str(step.id),
                'error': str(e)
            }))
            execution.status = 'failed'
            execution.save()
            return False
    
    async def _execute_flow(self, flow: Flow, execution: Execution):
        try:
            for step in await Step.objects.filter(flow=flow).order_by('position'):
                success = await self._execute_step(step, execution)
                
                if not success:
                    break
                    
            execution.status = 'completed'
            execution.completed_at = datetime.now()
            execution.save()
            
            await self.send(json.dumps({
                'type': 'execution_complete',
                'status': execution.status
            }))
            
        except Exception as e:
            await self.send(json.dumps({
                'type': 'execution_error',
                'error': str(e)
            }))


# flowcube/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/flow_execution/', consumers.FlowExecutionConsumer.as_asgi()),
]
