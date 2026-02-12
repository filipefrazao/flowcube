"""Facebook Lead Ads webhook endpoint (public, no auth)."""

import json
from django.http import HttpResponse
import logging

from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from socialcube.services.leadads import verify_webhook_signature

logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def leadads_webhook(request):
    """
    GET: Facebook webhook verification (hub.mode, hub.verify_token, hub.challenge)
    POST: Receive leadgen events, dispatch to Celery
    """
    if request.method == "GET":
        return _handle_verification(request)
    return _handle_event(request)


def _handle_verification(request):
    from socialcube.models import LeadAdsAppConfig

    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode != "subscribe":
        return Response({"error": "Invalid mode"}, status=400)

    config = LeadAdsAppConfig.get_config()
    if not config:
        logger.error("LeadAds webhook verification failed: no app config")
        return Response({"error": "Not configured"}, status=500)

    if token != config.verify_token:
        logger.warning(f"LeadAds webhook verification failed: bad token")
        return Response({"error": "Invalid verify token"}, status=403)

    logger.info("LeadAds webhook verified successfully")
    return HttpResponse(challenge, content_type="text/plain")


def _handle_event(request):
    from socialcube.models import LeadAdsAppConfig
    from socialcube.tasks import process_leadgen_event

    # Verify HMAC signature
    config = LeadAdsAppConfig.get_config()
    if config and config.app_secret:
        signature = request.META.get("HTTP_X_HUB_SIGNATURE_256", "")
        if not verify_webhook_signature(request.body, signature, config.app_secret):
            logger.warning("LeadAds webhook: invalid signature")
            return Response({"error": "Invalid signature"}, status=403)

    try:
        body = json.loads(request.body) if isinstance(request.body, bytes) else request.data
    except (json.JSONDecodeError, Exception):
        body = request.data

    obj = body.get("object", "")
    if obj != "page":
        return Response({"status": "ignored"})

    entries = body.get("entry", [])
    dispatched = 0

    for entry in entries:
        changes = entry.get("changes", [])
        for change in changes:
            if change.get("field") != "leadgen":
                continue

            value = change.get("value", {})
            page_id = str(value.get("page_id", ""))
            form_id = str(value.get("form_id", ""))
            leadgen_id = str(value.get("leadgen_id", ""))

            if page_id and form_id and leadgen_id:
                process_leadgen_event.delay(page_id, form_id, leadgen_id)
                dispatched += 1
                logger.info(f"Dispatched leadgen event: page={page_id} form={form_id} lead={leadgen_id}")

    return Response({"status": "ok", "dispatched": dispatched})
