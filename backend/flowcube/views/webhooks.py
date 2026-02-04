"""
FlowCube Webhook Views
Handle incoming webhooks from Evolution API, N8N, and other sources
"""
import json
import logging
from django.http import JsonResponse, HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from flowcube.models import WhatsAppWebhookLog, ChatSession
from flowcube.tasks import process_webhook_async

logger = logging.getLogger("flowcube.webhooks")


@method_decorator(csrf_exempt, name="dispatch")
class EvolutionWebhookView(View):
    """
    Receive webhooks from Evolution API
    URL: /api/webhooks/evolution/<workflow_id>/
    """

    def post(self, request, workflow_id: str):
        try:
            payload = json.loads(request.body)
            
            # Log the webhook
            log = WhatsAppWebhookLog.objects.create(
                instance=payload.get("instance", ""),
                event_type=payload.get("event", ""),
                payload=payload,
                processed=False
            )
            
            logger.info(f"Received Evolution webhook: {payload.get('event')} for workflow {workflow_id}")
            
            # Process asynchronously via Celery
            process_webhook_async.delay(workflow_id, payload)
            
            return JsonResponse({
                "status": "accepted",
                "log_id": str(log.id)
            }, status=202)
            
        except json.JSONDecodeError:
            logger.error("Invalid JSON in webhook payload")
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            logger.exception(f"Error processing webhook: {e}")
            return JsonResponse({"error": str(e)}, status=500)

    def get(self, request, workflow_id: str):
        """Health check / verification endpoint"""
        return JsonResponse({
            "status": "ok",
            "workflow_id": workflow_id,
            "timestamp": timezone.now().isoformat()
        })


@method_decorator(csrf_exempt, name="dispatch")
class GenericWebhookView(View):
    """
    Generic webhook receiver for any external source
    URL: /api/webhooks/generic/<workflow_id>/<trigger_node_id>/
    """

    def post(self, request, workflow_id: str, trigger_node_id: str = None):
        try:
            # Parse payload
            content_type = request.content_type
            if "json" in content_type:
                payload = json.loads(request.body)
            else:
                payload = dict(request.POST)
            
            # Extract headers
            headers = {
                key: value
                for key, value in request.headers.items()
                if key.lower() not in ["host", "content-length", "connection"]
            }
            
            # Build webhook data
            webhook_data = {
                "source": "generic",
                "trigger_node_id": trigger_node_id,
                "payload": payload,
                "headers": headers,
                "query_params": dict(request.GET),
                "content_type": content_type,
                "method": request.method,
                "received_at": timezone.now().isoformat()
            }
            
            logger.info(f"Received generic webhook for workflow {workflow_id}")
            
            # Process asynchronously
            process_webhook_async.delay(workflow_id, webhook_data)
            
            return JsonResponse({
                "status": "accepted",
                "workflow_id": workflow_id
            }, status=202)
            
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        except Exception as e:
            logger.exception(f"Error processing generic webhook: {e}")
            return JsonResponse({"error": str(e)}, status=500)

    def get(self, request, workflow_id: str, trigger_node_id: str = None):
        return JsonResponse({
            "status": "ok",
            "workflow_id": workflow_id,
            "trigger_node_id": trigger_node_id
        })


class WebhookTestView(APIView):
    """
    Test webhook endpoint - useful for workflow testing
    URL: /api/webhooks/test/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Echo back the received data for testing"""
        return Response({
            "status": "received",
            "method": request.method,
            "headers": dict(request.headers),
            "query_params": dict(request.query_params),
            "body": request.data,
            "content_type": request.content_type,
            "received_at": timezone.now().isoformat()
        })

    def get(self, request):
        return Response({
            "status": "ok",
            "message": "Webhook test endpoint. Send POST to test.",
            "query_params": dict(request.query_params)
        })


class N8NWebhookView(APIView):
    """
    Specialized webhook for N8N integration
    URL: /api/webhooks/n8n/<workflow_id>/
    """
    permission_classes = [AllowAny]

    def post(self, request, workflow_id: str):
        try:
            payload = request.data
            
            # N8N specific handling
            webhook_data = {
                "source": "n8n",
                "payload": payload,
                "headers": dict(request.headers),
                "workflow_name": payload.get("workflow_name"),
                "execution_id": payload.get("execution_id"),
                "received_at": timezone.now().isoformat()
            }
            
            logger.info(f"Received N8N webhook for workflow {workflow_id}")
            
            # Process asynchronously
            process_webhook_async.delay(workflow_id, webhook_data)
            
            return Response({
                "status": "accepted",
                "workflow_id": workflow_id
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.exception(f"Error processing N8N webhook: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SalesCubeWebhookView(APIView):
    """
    Webhook for SalesCube events (lead updates, sales, etc)
    URL: /api/webhooks/salescube/<workflow_id>/
    """
    permission_classes = [AllowAny]

    def post(self, request, workflow_id: str):
        try:
            payload = request.data
            
            # SalesCube specific handling
            webhook_data = {
                "source": "salescube",
                "event_type": payload.get("event"),
                "lead_id": payload.get("lead_id"),
                "payload": payload,
                "received_at": timezone.now().isoformat()
            }
            
            logger.info(f"Received SalesCube webhook: {payload.get('event')} for workflow {workflow_id}")
            
            # Process asynchronously
            process_webhook_async.delay(workflow_id, webhook_data)
            
            return Response({
                "status": "accepted"
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.exception(f"Error processing SalesCube webhook: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
