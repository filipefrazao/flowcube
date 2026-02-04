"""
Celery Tasks for FlowCube
flowcube/tasks.py
"""
import logging
import httpx
from typing import Dict, Any, List, Optional
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError
from django.conf import settings
from asgiref.sync import async_to_sync

logger = logging.getLogger('flowcube.tasks')


# ==================== WEBHOOK TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=3,
    queue='webhooks'
)
def process_webhook_async(self, workflow_id: str, payload: Dict[str, Any]):
    """
    Process incoming webhook asynchronously

    Args:
        workflow_id: ID of the workflow to execute
        payload: Webhook payload data
    """
    try:
        logger.info(f"Processing webhook for workflow {workflow_id}")

        from flowcube.engine.runtime import ChatbotRuntime, send_responses
        from workflows.models import Workflow

        # Extract message data from payload
        # Evolution API format
        event = payload.get('event', '')
        data = payload.get('data', {})
        instance = payload.get('instance', '')

        if event == 'MESSAGES_UPSERT':
            message_data = data.get('message', {})
            if message_data.get('fromMe'):
                logger.debug("Ignoring own message")
                return {'status': 'ignored', 'reason': 'own_message'}

            # Extract phone and text
            key = message_data.get('key', {})
            remote_jid = key.get('remoteJid', '')
            phone = remote_jid.split('@')[0] if '@' in remote_jid else remote_jid

            message_content = message_data.get('message', {})
            text = (
                message_content.get('conversation') or
                message_content.get('extendedTextMessage', {}).get('text') or
                ''
            )

            contact_name = data.get('pushName', '')
            message_id = key.get('id', '')

            if not text:
                logger.debug("No text content in message")
                return {'status': 'ignored', 'reason': 'no_text'}

            # Process message
            runtime = ChatbotRuntime(workflow_id)
            responses = async_to_sync(runtime.process_message)(
                phone=phone,
                message_text=text,
                instance=instance,
                contact_name=contact_name,
                message_id=message_id
            )

            # Send responses
            if responses:
                async_to_sync(send_responses)(instance, phone, responses)

            logger.info(f"Processed message from {phone}, {len(responses)} responses sent")
            return {'status': 'success', 'responses': len(responses)}

        return {'status': 'ignored', 'reason': 'unsupported_event'}

    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise self.retry(exc=e)


# ==================== HTTP REQUEST TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(httpx.RequestError, httpx.TimeoutException),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=3,
    queue='http'
)
def execute_http_request(self, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an HTTP request

    Args:
        config: {
            'method': 'POST',
            'url': 'https://example.com/webhook',
            'headers': {'Authorization': 'Bearer xxx'},
            'body': {'key': 'value'},
            'timeout': 30
        }

    Returns:
        Response data
    """
    try:
        method = config.get('method', 'GET').upper()
        url = config.get('url', '')
        headers = config.get('headers', {})
        body = config.get('body')
        timeout = config.get('timeout', 30)

        logger.info(f"Executing HTTP {method} {url}")

        with httpx.Client(timeout=timeout) as client:
            response = client.request(
                method=method,
                url=url,
                headers=headers,
                json=body if isinstance(body, dict) else None,
                content=body if isinstance(body, (str, bytes)) else None
            )

            # Parse response
            try:
                response_body = response.json()
                is_json = True
            except:
                response_body = response.text
                is_json = False

            result = {
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'body': response_body,
                'is_json': is_json,
                'success': 200 <= response.status_code < 300
            }

            logger.info(f"HTTP {method} {url} -> {response.status_code}")
            return result

    except Exception as e:
        logger.error(f"HTTP request failed: {e}")
        raise


# ==================== AI COMPLETION TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(httpx.RequestError, httpx.TimeoutException),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=2,
    queue='ai'
)
def execute_ai_completion(
    self,
    provider: str,
    model: str,
    messages: List[Dict[str, str]],
    config: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Execute AI completion request

    Args:
        provider: 'openai' or 'anthropic'
        model: Model name (e.g., 'gpt-4o', 'claude-3-5-sonnet')
        messages: List of {'role': 'user/assistant/system', 'content': '...'}
        config: Additional config (temperature, max_tokens, etc.)

    Returns:
        AI response
    """
    config = config or {}
    temperature = config.get('temperature', 0.7)
    max_tokens = config.get('max_tokens', 2000)

    try:
        if provider == 'openai':
            return _call_openai(model, messages, temperature, max_tokens)
        elif provider == 'anthropic':
            return _call_anthropic(model, messages, temperature, max_tokens)
        else:
            raise ValueError(f"Unsupported AI provider: {provider}")

    except Exception as e:
        logger.error(f"AI completion failed: {e}")
        raise


def _call_openai(
    model: str,
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: int
) -> Dict[str, Any]:
    """Call OpenAI API"""
    api_key = getattr(settings, 'OPENAI_API_KEY', '')
    if not api_key:
        raise ValueError("OPENAI_API_KEY not configured")

    with httpx.Client(timeout=120) as client:
        response = client.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model,
                'messages': messages,
                'temperature': temperature,
                'max_tokens': max_tokens
            }
        )
        response.raise_for_status()
        data = response.json()

        return {
            'provider': 'openai',
            'model': model,
            'content': data['choices'][0]['message']['content'],
            'usage': data.get('usage', {}),
            'finish_reason': data['choices'][0].get('finish_reason')
        }


def _call_anthropic(
    model: str,
    messages: List[Dict[str, str]],
    temperature: float,
    max_tokens: int
) -> Dict[str, Any]:
    """Call Anthropic API"""
    api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    # Convert messages format for Anthropic
    system_prompt = ""
    anthropic_messages = []

    for msg in messages:
        if msg['role'] == 'system':
            system_prompt = msg['content']
        else:
            anthropic_messages.append({
                'role': msg['role'],
                'content': msg['content']
            })

    with httpx.Client(timeout=120) as client:
        response = client.post(
            'https://api.anthropic.com/v1/messages',
            headers={
                'x-api-key': api_key,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            json={
                'model': model,
                'max_tokens': max_tokens,
                'temperature': temperature,
                'system': system_prompt,
                'messages': anthropic_messages
            }
        )
        response.raise_for_status()
        data = response.json()

        return {
            'provider': 'anthropic',
            'model': model,
            'content': data['content'][0]['text'],
            'usage': data.get('usage', {}),
            'stop_reason': data.get('stop_reason')
        }


# ==================== WHATSAPP TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(httpx.RequestError, httpx.TimeoutException),
    retry_backoff=True,
    retry_backoff_max=60,
    max_retries=3,
    queue='whatsapp'
)
def send_whatsapp_message(
    self,
    instance: str,
    to: str,
    message_type: str,
    content: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Send WhatsApp message via Evolution API

    Args:
        instance: Evolution API instance name
        to: Phone number (e.g., '5511999999999')
        message_type: 'text', 'image', 'audio', 'document', 'buttons', 'list', 'template'
        content: Message content based on type

    Returns:
        API response
    """
    from flowcube.integrations.whatsapp import evolution_client
    from asgiref.sync import async_to_sync

    try:
        logger.info(f"Sending {message_type} to {to} via {instance}")

        if message_type == 'text':
            result = async_to_sync(evolution_client.send_text)(
                instance, to, content.get('text', '')
            )
        elif message_type == 'image':
            result = async_to_sync(evolution_client.send_image)(
                instance, to,
                content.get('url', ''),
                content.get('caption', '')
            )
        elif message_type == 'audio':
            result = async_to_sync(evolution_client.send_audio)(
                instance, to, content.get('url', '')
            )
        elif message_type == 'document':
            result = async_to_sync(evolution_client.send_document)(
                instance, to,
                content.get('url', ''),
                content.get('filename', 'document')
            )
        elif message_type == 'buttons':
            result = async_to_sync(evolution_client.send_buttons)(
                instance, to,
                content.get('text', ''),
                content.get('buttons', []),
                content.get('footer', '')
            )
        elif message_type == 'list':
            result = async_to_sync(evolution_client.send_list)(
                instance, to,
                content.get('title', ''),
                content.get('description', ''),
                content.get('button_text', 'Selecionar'),
                content.get('sections', [])
            )
        elif message_type == 'template':
            result = async_to_sync(evolution_client.send_template)(
                instance, to,
                content.get('template_name', ''),
                content.get('language', 'pt_BR'),
                content.get('components', [])
            )
        else:
            raise ValueError(f"Unsupported message type: {message_type}")

        logger.info(f"Message sent to {to}: {result}")
        return {'status': 'sent', 'result': result}

    except Exception as e:
        logger.error(f"Failed to send WhatsApp message: {e}")
        raise


# ==================== WORKFLOW EXECUTION TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=2,
    queue='workflows'
)
def execute_workflow_node(
    self,
    workflow_id: str,
    session_id: str,
    node_id: str
) -> Dict[str, Any]:
    """
    Execute a single workflow node

    Used for async/delayed node execution
    """
    from flowcube.engine.runtime import ChatbotRuntime
    from flowcube.models import ChatSession
    from asgiref.sync import async_to_sync

    try:
        session = ChatSession.objects.get(id=session_id)
        runtime = ChatbotRuntime(workflow_id)

        # Get node and execute
        node = runtime.get_node(node_id)
        if not node:
            return {'status': 'error', 'message': f'Node {node_id} not found'}

        response = async_to_sync(runtime._execute_node)(node, session)

        return {
            'status': 'success',
            'node_id': node_id,
            'response': response
        }

    except Exception as e:
        logger.error(f"Failed to execute node {node_id}: {e}")
        raise


# ==================== WEBHOOK FORWARDING TASKS ====================

@shared_task(
    bind=True,
    autoretry_for=(httpx.RequestError,),
    retry_backoff=True,
    max_retries=3,
    queue='webhooks'
)
def forward_to_n8n(
    self,
    webhook_path: str,
    payload: Dict[str, Any],
    headers: Dict[str, str] = None
) -> Dict[str, Any]:
    """
    Forward data to N8N webhook

    Args:
        webhook_path: Path after /webhook/ (e.g., 'flowcube-lead')
        payload: Data to send
        headers: Additional headers
    """
    n8n_base = getattr(settings, 'N8N_WEBHOOK_URL', 'https://n8n.frzgroup.com.br/webhook')
    url = f"{n8n_base}/{webhook_path}"

    logger.info(f"Forwarding to N8N: {url}")

    with httpx.Client(timeout=30) as client:
        response = client.post(
            url,
            json=payload,
            headers=headers or {}
        )

        return {
            'status_code': response.status_code,
            'body': response.text,
            'success': 200 <= response.status_code < 300
        }


@shared_task(
    bind=True,
    autoretry_for=(httpx.RequestError,),
    retry_backoff=True,
    max_retries=3,
    queue='webhooks'
)
def create_salescube_lead(
    self,
    lead_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create lead in SalesCube

    Args:
        lead_data: {
            'name': 'John Doe',
            'phone': '5511999999999',
            'email': 'john@example.com',
            'channel': 78,
            'column': 48,
            'origin': 11,
            'responsibles': [78],
            'is_ai_enabled': False
        }
    """
    api_url = getattr(settings, 'SALESCUBE_API_URL', 'https://api.frzglobal.com.br')
    api_token = getattr(settings, 'SALESCUBE_API_TOKEN', '6550a421c3efbb107bfd4d1ef68a3320e06345ae')

    logger.info(f"Creating lead in SalesCube: {lead_data.get('name')}")

    with httpx.Client(timeout=30) as client:
        response = client.post(
            f"{api_url}/api/leads/",
            json=lead_data,
            headers={
                'Authorization': f'Token {api_token}',
                'Content-Type': 'application/json'
            }
        )

        if response.status_code == 201:
            logger.info(f"Lead created successfully: {response.json().get('id')}")
            return {'status': 'created', 'lead': response.json()}
        else:
            logger.error(f"Failed to create lead: {response.status_code} - {response.text}")
            return {'status': 'error', 'code': response.status_code, 'message': response.text}
