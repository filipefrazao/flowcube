import requests
import logging
from django.conf import settings
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


class MetaWhatsAppAPI:
    """Client for Meta WhatsApp Business Cloud API"""

    BASE_URL = 'https://graph.facebook.com/v18.0'

    def __init__(self, access_token: str = None):
        self.access_token = access_token or getattr(settings, 'META_WHATSAPP_ACCESS_TOKEN', '')
        self.headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
        }

    def send_message(self, phone_number_id: str, to: str, message_type: str, data: Dict) -> Dict:
        """Send WhatsApp message"""
        url = f'{self.BASE_URL}/{phone_number_id}/messages'

        payload = {
            'messaging_product': 'whatsapp',
            'to': to,
            'type': message_type,
            message_type: data
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f'Error sending WhatsApp message: {e}')
            raise

    def send_text(self, phone_number_id: str, to: str, text: str, preview_url: bool = False) -> Dict:
        """Send text message"""
        data = {
            'body': text,
            'preview_url': preview_url
        }
        return self.send_message(phone_number_id, to, 'text', data)

    def send_template(self, phone_number_id: str, to: str, template_name: str,
                     language_code: str = 'pt_BR', components: List = None) -> Dict:
        """Send template message"""
        data = {
            'name': template_name,
            'language': {'code': language_code}
        }

        if components:
            data['components'] = components

        return self.send_message(phone_number_id, to, 'template', data)

    def send_interactive(self, phone_number_id: str, to: str, interactive_type: str,
                        body_text: str, action: Dict, header: Dict = None,
                        footer_text: str = None) -> Dict:
        """Send interactive message (buttons, list)"""
        data = {
            'type': interactive_type,
            'body': {'text': body_text},
            'action': action
        }

        if header:
            data['header'] = header
        if footer_text:
            data['footer'] = {'text': footer_text}

        return self.send_message(phone_number_id, to, 'interactive', data)

    def send_media(self, phone_number_id: str, to: str, media_type: str,
                   media_id: str = None, media_link: str = None,
                   caption: str = None) -> Dict:
        """Send media message (image, video, audio, document)"""
        data = {}

        if media_id:
            data['id'] = media_id
        elif media_link:
            data['link'] = media_link
        else:
            raise ValueError('Either media_id or media_link must be provided')

        if caption and media_type in ['image', 'video', 'document']:
            data['caption'] = caption

        return self.send_message(phone_number_id, to, media_type, data)

    def create_template(self, business_account_id: str, name: str, category: str,
                       language: str, components: List) -> Dict:
        """Create message template"""
        url = f'{self.BASE_URL}/{business_account_id}/message_templates'

        payload = {
            'name': name,
            'category': category,
            'language': language,
            'components': components
        }

        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f'Error creating template: {e}')
            raise

    def get_template(self, business_account_id: str, template_id: str = None,
                    name: str = None) -> Dict:
        """Get template by ID or name"""
        url = f'{self.BASE_URL}/{business_account_id}/message_templates'

        params = {}
        if template_id:
            params['ids'] = template_id
        if name:
            params['name'] = name

        try:
            response = requests.get(url, params=params, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f'Error getting template: {e}')
            raise

    @staticmethod
    def verify_webhook(mode: str, token: str, challenge: str, verify_token: str) -> Optional[str]:
        """Verify webhook subscription"""
        if mode == 'subscribe' and token == verify_token:
            return challenge
        return None
