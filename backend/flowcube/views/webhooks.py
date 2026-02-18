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

from django.conf import settings

from flowcube.models import WhatsAppWebhookLog, ChatSession
from flowcube.tasks import process_webhook_async

logger = logging.getLogger("flowcube.webhooks")


class FacebookLeadAdsWebhookView(APIView):
    """
    Receive Facebook Lead Ads webhooks.
    URL: /api/webhooks/facebook-leads/<workflow_id>/

    GET  - Facebook subscription verification (hub.verify_token challenge)
    POST - Lead data from Facebook (leadgen event)

    Facebook sends a lightweight notification with leadgen_id.
    This view fetches the full lead data via Graph API, then triggers
    the workflow execution.
    """

    permission_classes = [AllowAny]

    def get(self, request, workflow_id: str):
        """Facebook webhook subscription verification."""
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        verify_token = getattr(
            settings, "FACEBOOK_VERIFY_TOKEN", ""
        )

        if mode == "subscribe" and token == verify_token:
            logger.info(
                "Facebook webhook verified for workflow %s", workflow_id
            )
            return HttpResponse(challenge, content_type="text/plain")

        logger.warning(
            "Facebook webhook verification failed: mode=%s token=%s",
            mode,
            token,
        )
        return Response({"error": "Verification failed"}, status=403)

    def post(self, request, workflow_id: str):
        """Receive Facebook Lead Ads webhook notification and fetch lead data."""
        try:
            payload = request.data
            obj = payload.get("object")

            if obj != "page":
                return Response({"status": "ignored", "reason": "not a page event"})

            entries = payload.get("entry", [])
            leads_processed = 0

            for entry in entries:
                changes = entry.get("changes", [])
                for change in changes:
                    if change.get("field") != "leadgen":
                        continue

                    value = change.get("value", {})
                    leadgen_id = value.get("leadgen_id")
                    form_id = value.get("form_id")
                    page_id = value.get("page_id")
                    ad_id = value.get("ad_id", "")
                    adgroup_id = value.get("adgroup_id", "")
                    created_time = value.get("created_time", "")

                    if not leadgen_id:
                        logger.warning("Leadgen event without leadgen_id, skipping")
                        continue

                    # Fetch full lead data from Graph API
                    lead_fields = self._fetch_lead_data(leadgen_id)

                    # Build trigger data
                    trigger_data = {
                        "source": "facebook_lead_ads",
                        "leadgen_id": leadgen_id,
                        "form_id": form_id or "",
                        "page_id": page_id or "",
                        "ad_id": ad_id,
                        "adgroup_id": adgroup_id,
                        "created_time": str(created_time),
                        "received_at": timezone.now().isoformat(),
                        # Parsed fields from Graph API
                        **lead_fields,
                    }

                    logger.info(
                        "Facebook lead received: %s (form=%s) for workflow %s",
                        leadgen_id,
                        form_id,
                        workflow_id,
                    )

                    # Dispatch workflow execution
                    process_webhook_async.delay(workflow_id, trigger_data)
                    leads_processed += 1

            return Response(
                {"status": "accepted", "leads_processed": leads_processed},
                status=status.HTTP_202_ACCEPTED,
            )

        except Exception as e:
            logger.exception("Error processing Facebook Lead Ads webhook: %s", e)
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @staticmethod
    def _fetch_lead_data(leadgen_id: str) -> dict:
        """
        Fetch full lead field_data from Facebook Graph API.

        Returns a flat dict with normalized field names:
        {name, email, phone, profession, ...}
        """
        access_token = getattr(settings, "FACEBOOK_PAGE_ACCESS_TOKEN", "")
        if not access_token:
            logger.warning(
                "FACEBOOK_PAGE_ACCESS_TOKEN not configured, "
                "returning empty lead data"
            )
            return {}

        url = f"https://graph.facebook.com/v21.0/{leadgen_id}"
        params = {"access_token": access_token}

        try:
            import httpx

            with httpx.Client(timeout=15) as client:
                resp = client.get(url, params=params)
                if resp.status_code != 200:
                    logger.error(
                        "Graph API error %s: %s", resp.status_code, resp.text
                    )
                    return {}

                data = resp.json()
                field_data = data.get("field_data", [])

                # Facebook returns field_data as list of {name, values}
                # Normalize to flat dict
                fields = {}
                field_map = {
                    "full_name": "name",
                    "nome_completo": "name",
                    "email": "email",
                    "e-mail": "email",
                    "phone_number": "phone",
                    "telefone": "phone",
                    "whatsapp": "phone",
                    "profession": "profession",
                    "profissao": "profession",
                    "profissão": "profession",
                    "city": "city",
                    "cidade": "city",
                }

                for fd in field_data:
                    raw_name = fd.get("name", "").lower().strip()
                    values = fd.get("values", [])
                    value = values[0] if values else ""

                    mapped = field_map.get(raw_name, raw_name)
                    fields[mapped] = value

                return fields

        except Exception as exc:
            logger.exception("Failed to fetch lead data from Graph API: %s", exc)
            return {}


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
