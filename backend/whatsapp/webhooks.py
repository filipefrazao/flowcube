from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
import json
import logging
from .models import WhatsAppFlow
from .flow_executor import WhatsAppFlowExecutor
from .meta_api import MetaWhatsAppAPI

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def whatsapp_webhook(request):
    """Webhook endpoint for Meta WhatsApp messages"""

    if request.method == "GET":
        # Webhook verification
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")

        verify_token = getattr(settings, 'WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'your_verify_token')

        verified_challenge = MetaWhatsAppAPI.verify_webhook(mode, token, challenge, verify_token)

        if verified_challenge:
            return HttpResponse(verified_challenge, content_type="text/plain")
        else:
            return HttpResponse("Verification failed", status=403)

    elif request.method == "POST":
        # Process incoming message
        try:
            data = json.loads(request.body)
            logger.info(f"Received webhook: {data}")

            # Extract message data
            entry = data.get('entry', [{}])[0]
            changes = entry.get('changes', [{}])[0]
            value = changes.get('value', {})

            # Check if it's a message
            messages = value.get('messages', [])
            if not messages:
                return JsonResponse({'status': 'ok'})

            message = messages[0]
            phone_number_id = value.get('metadata', {}).get('phone_number_id')
            from_number = message.get('from')
            message_type = message.get('type')

            # Find active flow for this phone number ID
            flows = WhatsAppFlow.objects.filter(
                phone_number_id=phone_number_id,
                is_active=True
            )

            if not flows.exists():
                logger.warning(f"No active flow found for phone_number_id: {phone_number_id}")
                return JsonResponse({'status': 'ok'})

            # Process message for each active flow
            for flow in flows:
                executor = WhatsAppFlowExecutor(flow)

                message_data = {
                    'type': message_type,
                    'from': from_number,
                    'timestamp': message.get('timestamp'),
                }

                # Extract message content based on type
                if message_type == 'text':
                    message_data['text'] = message.get('text', {})

                elif message_type == 'interactive':
                    message_data['interactive'] = message.get('interactive', {})

                elif message_type == 'button':
                    message_data['button'] = message.get('button', {})

                elif message_type == 'image':
                    message_data['image'] = message.get('image', {})

                elif message_type == 'video':
                    message_data['video'] = message.get('video', {})

                elif message_type == 'audio':
                    message_data['audio'] = message.get('audio', {})

                elif message_type == 'document':
                    message_data['document'] = message.get('document', {})

                # Extract user name if available
                user_name = value.get('contacts', [{}])[0].get('profile', {}).get('name', '')

                # Process message
                try:
                    result = executor.process_message(from_number, message_data)
                    logger.info(f"Message processed: {result}")
                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)

            return JsonResponse({'status': 'ok'})

        except Exception as e:
            logger.error(f"Webhook error: {e}", exc_info=True)
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
