"""
WhatsApp Integration via Evolution API
FlowCube Multi-Agent Orchestration - 2026-01-30
"""
import logging
import httpx
from typing import Optional, Dict, Any, List
from django.conf import settings

logger = logging.getLogger('flowcube.whatsapp')


class EvolutionAPIClient:
    """
    Client for Evolution API v2.3.7
    Handles sending and receiving WhatsApp messages
    """
    
    def __init__(
        self,
        base_url: str = None,
        api_key: str = None,
        timeout: int = 30
    ):
        self.base_url = base_url or getattr(settings, 'EVOLUTION_API_URL', 'https://evolution.frzgroup.com.br')
        self.api_key = api_key or getattr(settings, 'EVOLUTION_API_KEY', '')
        self.timeout = timeout
        self._client = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    'apikey': self.api_key,
                    'Content-Type': 'application/json'
                },
                timeout=self.timeout
            )
        return self._client
    
    async def close(self):
        if self._client:
            await self._client.aclose()
            self._client = None
    
    # ==================== INSTANCE MANAGEMENT ====================
    
    async def list_instances(self) -> List[Dict]:
        """List all WhatsApp instances"""
        try:
            response = await self.client.get('/instance/fetchInstances')
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to list instances: {e}")
            return []
    
    async def get_instance_status(self, instance: str) -> Dict:
        """Get instance connection status"""
        try:
            response = await self.client.get(f'/instance/connectionState/{instance}')
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get instance status: {e}")
            return {'state': 'error', 'error': str(e)}
    
    # ==================== SENDING MESSAGES ====================
    
    async def send_text(
        self,
        instance: str,
        to: str,
        text: str,
        delay: int = 0
    ) -> Dict:
        """
        Send a text message
        
        Args:
            instance: Evolution API instance name
            to: Phone number with country code (e.g., 5511999999999)
            text: Message text
            delay: Delay in milliseconds before sending
        
        Returns:
            API response with message ID
        """
        payload = {
            'number': to,
            'text': text,
            'delay': delay
        }
        
        try:
            response = await self.client.post(
                f'/message/sendText/{instance}',
                json=payload
            )
            response.raise_for_status()
            result = response.json()
            logger.info(f"Sent text to {to}: {text[:50]}...")
            return result
        except Exception as e:
            logger.error(f"Failed to send text to {to}: {e}")
            raise
    
    async def send_image(
        self,
        instance: str,
        to: str,
        image_url: str,
        caption: str = ''
    ) -> Dict:
        """Send an image message"""
        payload = {
            'number': to,
            'mediatype': 'image',
            'media': image_url,
            'caption': caption
        }
        
        try:
            response = await self.client.post(
                f'/message/sendMedia/{instance}',
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to send image to {to}: {e}")
            raise
    
    async def send_audio(
        self,
        instance: str,
        to: str,
        audio_url: str
    ) -> Dict:
        """Send an audio message"""
        payload = {
            'number': to,
            'mediatype': 'audio',
            'media': audio_url
        }
        
        try:
            response = await self.client.post(
                f'/message/sendMedia/{instance}',
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to send audio to {to}: {e}")
            raise
    
    async def send_document(
        self,
        instance: str,
        to: str,
        document_url: str,
        filename: str
    ) -> Dict:
        """Send a document"""
        payload = {
            'number': to,
            'mediatype': 'document',
            'media': document_url,
            'fileName': filename
        }
        
        try:
            response = await self.client.post(
                f'/message/sendMedia/{instance}',
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to send document to {to}: {e}")
            raise
    
    async def send_buttons(
        self,
        instance: str,
        to: str,
        text: str,
        buttons: List[Dict],
        footer: str = ''
    ) -> Dict:
        """
        Send a message with buttons
        
        Args:
            buttons: List of {'id': 'btn_id', 'text': 'Button Text'}
        """
        payload = {
            'number': to,
            'title': text,
            'description': footer,
            'buttons': [
                {'type': 'reply', 'reply': {'id': btn['id'], 'title': btn['text']}}
                for btn in buttons
            ]
        }
        
        try:
            response = await self.client.post(
                f'/message/sendButtons/{instance}',
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to send buttons to {to}: {e}")
            raise
    
    async def send_list(
        self,
        instance: str,
        to: str,
        title: str,
        description: str,
        button_text: str,
        sections: List[Dict]
    ) -> Dict:
        """
        Send a list message
        
        Args:
            sections: List of {'title': 'Section', 'rows': [{'id': 'id', 'title': 'Title', 'description': 'Desc'}]}
        """
        payload = {
            'number': to,
            'title': title,
            'description': description,
            'buttonText': button_text,
            'sections': sections
        }
        
        try:
            response = await self.client.post(
                f'/message/sendList/{instance}',
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to send list to {to}: {e}")
            raise
    
    async def send_template(
        self,
        instance: str,
        to: str,
        template_name: str,
        language: str = 'pt_BR',
        components: List[Dict] = None
    ) -> Dict:
        """
        Send a WhatsApp template message
        
        For WhatsApp Business API (Cloud API via Evolution)
        """
        payload = {
            'number': to,
            'name': template_name,
            'language': language,
            'components': components or []
        }
        
        try:
            response = await self.client.post(
                f'/message/sendTemplate/{instance}',
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to send template to {to}: {e}")
            raise
    
    # ==================== WEBHOOK MANAGEMENT ====================
    
    async def set_webhook(
        self,
        instance: str,
        webhook_url: str,
        events: List[str] = None
    ) -> Dict:
        """
        Configure webhook for an instance
        
        Events: MESSAGES_UPSERT, MESSAGES_UPDATE, MESSAGES_DELETE,
                SEND_MESSAGE, CONNECTION_UPDATE, CALL, PRESENCE_UPDATE
        """
        if events is None:
            events = ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE']
        
        payload = {
            'webhook': {
                'enabled': True,
                'url': webhook_url,
                'events': events,
                'webhookByEvents': True
            }
        }
        
        try:
            response = await self.client.post(
                f'/webhook/set/{instance}',
                json=payload
            )
            response.raise_for_status()
            logger.info(f"Webhook set for {instance}: {webhook_url}")
            return response.json()
        except Exception as e:
            logger.error(f"Failed to set webhook for {instance}: {e}")
            raise
    
    async def get_webhook(self, instance: str) -> Dict:
        """Get webhook configuration for an instance"""
        try:
            response = await self.client.get(f'/webhook/find/{instance}')
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get webhook for {instance}: {e}")
            return {}


# Singleton instance for convenience
evolution_client = EvolutionAPIClient()
