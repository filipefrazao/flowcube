import logging
import re
from typing import Dict, Optional
from .models import WhatsAppFlow, WhatsAppConversation, WhatsAppInteraction
from .meta_api import MetaWhatsAppAPI

logger = logging.getLogger(__name__)


class WhatsAppFlowExecutor:
    """Execute WhatsApp flows with state machine"""

    def __init__(self, flow: WhatsAppFlow):
        self.flow = flow
        self.api = MetaWhatsAppAPI()
        self.flow_data = flow.flow_data
        self.nodes = {node['id']: node for node in self.flow_data.get('nodes', [])}
        self.edges = self.flow_data.get('edges', [])

    def process_message(self, user_phone: str, message_data: Dict) -> Dict:
        """Process incoming message and execute flow"""
        conversation, created = WhatsAppConversation.objects.get_or_create(
            flow=self.flow,
            user_phone=user_phone,
            defaults={'is_active': True}
        )

        interaction = WhatsAppInteraction.objects.create(
            flow=self.flow,
            user_phone=user_phone,
            message_type=message_data.get('type', 'text'),
            message_data=message_data,
            current_node=conversation.current_node
        )

        if created or not conversation.current_node:
            next_node = self._find_trigger_node()
        else:
            next_node = self._get_next_node(conversation.current_node, message_data, conversation.session_data)

        if not next_node:
            logger.warning(f'No next node found for conversation {conversation.id}')
            return {'status': 'no_action'}

        response = self._execute_node(next_node, conversation, message_data)

        conversation.current_node = next_node['id']
        conversation.messages_received += 1
        conversation.save()

        interaction.response = response
        interaction.current_node = next_node['id']
        interaction.flow_state = conversation.session_data
        interaction.save()

        return response

    def _find_trigger_node(self) -> Optional[Dict]:
        """Find the trigger/start node"""
        for node in self.nodes.values():
            if node.get('type') == 'trigger' or node.get('data', {}).get('is_start'):
                return node

        if self.nodes:
            return list(self.nodes.values())[0]

        return None

    def _get_next_node(self, current_node_id: str, message_data: Dict, session_data: Dict) -> Optional[Dict]:
        """Get next node based on current node and message"""
        outgoing_edges = [e for e in self.edges if e['source'] == current_node_id]

        if not outgoing_edges:
            return None

        current_node = self.nodes.get(current_node_id)

        if current_node and current_node.get('type') == 'condition':
            return self._evaluate_condition(current_node, outgoing_edges, message_data, session_data)

        if outgoing_edges:
            next_node_id = outgoing_edges[0]['target']
            return self.nodes.get(next_node_id)

        return None

    def _evaluate_condition(self, condition_node: Dict, edges: list, message_data: Dict, session_data: Dict) -> Optional[Dict]:
        """Evaluate condition node and choose branch"""
        condition_config = condition_node.get('data', {}).get('config', {})
        condition_type = condition_config.get('type', 'text_contains')

        message_text = message_data.get('text', {}).get('body', '').lower()

        for edge in edges:
            edge_label = edge.get('label', '').lower()

            if condition_type == 'text_contains':
                if edge_label and edge_label in message_text:
                    return self.nodes.get(edge['target'])

            elif condition_type == 'text_equals':
                if edge_label and edge_label == message_text:
                    return self.nodes.get(edge['target'])

            elif condition_type == 'button_response':
                button_id = message_data.get('interactive', {}).get('button_reply', {}).get('id', '')
                if edge_label and edge_label == button_id:
                    return self.nodes.get(edge['target'])

        if edges:
            return self.nodes.get(edges[0]['target'])

        return None

    def _execute_node(self, node: Dict, conversation: WhatsAppConversation, message_data: Dict) -> Dict:
        """Execute node action"""
        node_type = node.get('type')
        node_data = node.get('data', {})

        if node_type == 'message':
            return self._execute_message_node(node_data, conversation)

        elif node_type == 'template':
            return self._execute_template_node(node_data, conversation)

        elif node_type == 'interactive':
            return self._execute_interactive_node(node_data, conversation)

        elif node_type == 'wait':
            return self._execute_wait_node(node_data, conversation)

        elif node_type == 'condition':
            return {'status': 'routing'}

        else:
            logger.warning(f'Unknown node type: {node_type}')
            return {'status': 'unknown_node_type'}

    def _execute_message_node(self, node_data: Dict, conversation: WhatsAppConversation) -> Dict:
        """Send text message"""
        text = node_data.get('text', '')
        text = self._replace_variables(text, conversation.session_data)

        try:
            result = self.api.send_text(
                phone_number_id=self.flow.phone_number_id,
                to=conversation.user_phone,
                text=text
            )
            conversation.messages_sent += 1
            conversation.save()
            return {'status': 'sent', 'message_id': result.get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f'Error sending message: {e}')
            return {'status': 'error', 'error': str(e)}

    def _execute_template_node(self, node_data: Dict, conversation: WhatsAppConversation) -> Dict:
        """Send template message"""
        template_name = node_data.get('template_name', '')
        language = node_data.get('language', 'pt_BR')
        components = node_data.get('components', [])

        try:
            result = self.api.send_template(
                phone_number_id=self.flow.phone_number_id,
                to=conversation.user_phone,
                template_name=template_name,
                language_code=language,
                components=components
            )
            conversation.messages_sent += 1
            conversation.save()
            return {'status': 'sent', 'message_id': result.get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f'Error sending template: {e}')
            return {'status': 'error', 'error': str(e)}

    def _execute_interactive_node(self, node_data: Dict, conversation: WhatsAppConversation) -> Dict:
        """Send interactive message (buttons, list)"""
        interactive_type = node_data.get('interactive_type', 'button')
        body_text = node_data.get('body_text', '')
        action = node_data.get('action', {})

        body_text = self._replace_variables(body_text, conversation.session_data)

        try:
            result = self.api.send_interactive(
                phone_number_id=self.flow.phone_number_id,
                to=conversation.user_phone,
                interactive_type=interactive_type,
                body_text=body_text,
                action=action,
                header=node_data.get('header'),
                footer_text=node_data.get('footer_text')
            )
            conversation.messages_sent += 1
            conversation.save()
            return {'status': 'sent', 'message_id': result.get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f'Error sending interactive message: {e}')
            return {'status': 'error', 'error': str(e)}

    def _execute_wait_node(self, node_data: Dict, conversation: WhatsAppConversation) -> Dict:
        """Wait for user response"""
        wait_for = node_data.get('wait_for', 'any')
        conversation.session_data['waiting_for'] = wait_for
        conversation.save()
        return {'status': 'waiting', 'wait_for': wait_for}

    def _replace_variables(self, text: str, session_data: Dict) -> str:
        """Replace {{variable}} placeholders with session data"""
        def replace_match(match):
            var_name = match.group(1)
            return str(session_data.get(var_name, match.group(0)))

        return re.sub(r'\{\{(\w+)\}\}', replace_match, text)
