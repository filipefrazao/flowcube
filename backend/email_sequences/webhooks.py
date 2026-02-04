"""
Email Sequences Webhook Handlers
email_sequences/webhooks.py

Webhook endpoints for receiving events from email providers.
Created: 2026-02-02
"""
import json
import logging
from typing import Optional

from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .client import WebhookSignatureVerifier
from .models import EmailProvider
from .tasks import process_webhook_event


logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def sendgrid_webhook(request) -> HttpResponse:
    """
    Handle SendGrid Event Webhook.

    SendGrid sends events as a JSON array in the request body.
    Events include: delivered, open, click, bounce, dropped, spam_report, unsubscribe

    Headers:
        X-Twilio-Email-Event-Webhook-Signature: Signature for verification
        X-Twilio-Email-Event-Webhook-Timestamp: Timestamp for verification
    """
    try:
        # Parse events
        try:
            events = json.loads(request.body)
        except json.JSONDecodeError:
            logger.error("SendGrid webhook: Invalid JSON")
            return HttpResponse("Invalid JSON", status=400)

        if not isinstance(events, list):
            events = [events]

        # Optional: Verify signature if verification key is configured
        signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature")
        timestamp = request.headers.get("X-Twilio-Email-Event-Webhook-Timestamp")

        if signature and timestamp:
            # Get provider by checking custom args or first event
            verification_key = _get_sendgrid_verification_key(events)
            if verification_key:
                is_valid = WebhookSignatureVerifier.verify_sendgrid(
                    request.body,
                    signature,
                    timestamp,
                    verification_key
                )
                if not is_valid:
                    logger.warning("SendGrid webhook: Invalid signature")
                    return HttpResponse("Invalid signature", status=401)

        # Process events asynchronously
        process_webhook_event.delay("sendgrid", events)

        logger.info(f"SendGrid webhook received: {len(events)} events")
        return HttpResponse("OK", status=200)

    except Exception as e:
        logger.exception(f"SendGrid webhook error: {e}")
        return HttpResponse("Internal error", status=500)


def _get_sendgrid_verification_key(events) -> Optional[str]:
    """
    Get SendGrid verification key from provider.

    Tries to identify the provider from the events and return its webhook secret.
    """
    try:
        # Try to find provider from tracking ID in custom args
        for event in events:
            tracking_id = event.get("tracking_id") or (
                event.get("custom_args", {}).get("tracking_id")
            )
            if tracking_id:
                # Look up send and get provider
                from .models import EmailSend
                send = EmailSend.objects.filter(id=tracking_id).select_related("provider").first()
                if send and send.provider and send.provider.webhook_secret:
                    return send.provider.webhook_secret
        return None
    except Exception:
        return None


@csrf_exempt
@require_POST
def mailgun_webhook(request) -> HttpResponse:
    """
    Handle Mailgun Webhook.

    Mailgun sends events as form data or JSON depending on configuration.
    The signature is in the request body.

    Form fields:
        signature[timestamp]: Timestamp
        signature[token]: Token
        signature[signature]: HMAC signature
        event-data: Event details (JSON)
    """
    try:
        content_type = request.content_type

        if "application/json" in content_type:
            try:
                payload = json.loads(request.body)
            except json.JSONDecodeError:
                logger.error("Mailgun webhook: Invalid JSON")
                return HttpResponse("Invalid JSON", status=400)
        else:
            # Form data
            payload = {
                "signature": {
                    "timestamp": request.POST.get("signature[timestamp]", ""),
                    "token": request.POST.get("signature[token]", ""),
                    "signature": request.POST.get("signature[signature]", ""),
                },
                "event-data": json.loads(request.POST.get("event-data", "{}"))
            }

        # Extract signature
        signature_data = payload.get("signature", {})
        timestamp = signature_data.get("timestamp", "")
        token = signature_data.get("token", "")
        signature = signature_data.get("signature", "")

        # Verify signature if present
        if timestamp and token and signature:
            api_key = _get_mailgun_api_key(payload)
            if api_key:
                is_valid = WebhookSignatureVerifier.verify_mailgun(
                    timestamp, token, signature, api_key
                )
                if not is_valid:
                    logger.warning("Mailgun webhook: Invalid signature")
                    return HttpResponse("Invalid signature", status=401)

        # Process event asynchronously
        process_webhook_event.delay("mailgun", payload)

        logger.info("Mailgun webhook received")
        return HttpResponse("OK", status=200)

    except Exception as e:
        logger.exception(f"Mailgun webhook error: {e}")
        return HttpResponse("Internal error", status=500)


def _get_mailgun_api_key(payload) -> Optional[str]:
    """
    Get Mailgun API key from provider.

    Tries to identify the provider from the event data.
    """
    try:
        event_data = payload.get("event-data", {})
        message = event_data.get("message", {})
        headers = message.get("headers", {})
        message_id = headers.get("message-id", "")

        if message_id:
            from .models import EmailSend
            send = EmailSend.objects.filter(
                provider_message_id=message_id
            ).select_related("provider").first()
            if send and send.provider:
                return send.provider.api_key
        return None
    except Exception:
        return None


@csrf_exempt
@require_POST
def ses_webhook(request) -> HttpResponse:
    """
    Handle Amazon SES/SNS Webhook.

    SES notifications come through SNS and can be:
    - SubscriptionConfirmation: Needs to confirm the subscription
    - Notification: Actual email events

    The message body is JSON with the notification type and content.
    """
    try:
        # Parse SNS message
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            logger.error("SES webhook: Invalid JSON")
            return HttpResponse("Invalid JSON", status=400)

        message_type = payload.get("Type")

        # Handle subscription confirmation
        if message_type == "SubscriptionConfirmation":
            subscribe_url = payload.get("SubscribeURL")
            if subscribe_url:
                # Verify it's from AWS
                is_valid = WebhookSignatureVerifier.verify_ses(
                    payload,
                    payload.get("SigningCertURL", "")
                )
                if not is_valid:
                    logger.warning("SES webhook: Invalid certificate URL")
                    return HttpResponse("Invalid certificate", status=401)

                # Confirm subscription by visiting the URL
                import urllib.request
                try:
                    urllib.request.urlopen(subscribe_url)
                    logger.info("SES SNS subscription confirmed")
                    return HttpResponse("Subscription confirmed", status=200)
                except Exception as e:
                    logger.error(f"Failed to confirm SNS subscription: {e}")
                    return HttpResponse("Subscription confirmation failed", status=500)

            return HttpResponse("Missing SubscribeURL", status=400)

        # Handle notifications
        if message_type == "Notification":
            # Verify signature
            is_valid = WebhookSignatureVerifier.verify_ses(
                payload,
                payload.get("SigningCertURL", "")
            )
            if not is_valid:
                logger.warning("SES webhook: Invalid certificate URL")
                return HttpResponse("Invalid certificate", status=401)

            # Process event asynchronously
            process_webhook_event.delay("ses", payload)

            logger.info("SES webhook received")
            return HttpResponse("OK", status=200)

        # Handle unsubscribe confirmation
        if message_type == "UnsubscribeConfirmation":
            logger.info("SES SNS unsubscribe confirmation received")
            return HttpResponse("OK", status=200)

        logger.warning(f"SES webhook: Unknown message type: {message_type}")
        return HttpResponse("Unknown message type", status=400)

    except Exception as e:
        logger.exception(f"SES webhook error: {e}")
        return HttpResponse("Internal error", status=500)


@csrf_exempt
@require_POST
def tracking_pixel(request) -> HttpResponse:
    """
    Handle email open tracking via tracking pixel.

    URL format: /email/track/open/{send_id}/pixel.gif
    """
    send_id = request.GET.get("id")
    if not send_id:
        # Return transparent 1x1 GIF anyway
        return _transparent_gif()

    try:
        from .models import EmailSend, EmailEvent

        send = EmailSend.objects.filter(id=send_id).first()
        if send:
            # Record open
            send.mark_opened()

            # Create event
            EmailEvent.objects.create(
                send=send,
                event_type=EmailEvent.EventType.OPEN,
                ip_address=_get_client_ip(request),
                user_agent=request.headers.get("User-Agent", ""),
            )

            # Update recipient stats
            if send.recipient:
                send.recipient.emails_opened += 1
                send.recipient.last_opened_at = send.opened_at
                send.recipient.save(update_fields=["emails_opened", "last_opened_at"])

            # Update step stats
            if send.step:
                send.step.total_opened += 1
                send.step.save(update_fields=["total_opened"])

    except Exception as e:
        logger.error(f"Tracking pixel error: {e}")

    return _transparent_gif()


@csrf_exempt
def tracking_click(request) -> HttpResponse:
    """
    Handle email click tracking via redirect.

    URL format: /email/track/click/{send_id}/?url={original_url}
    """
    send_id = request.GET.get("id")
    url = request.GET.get("url")

    if not url:
        return HttpResponse("Missing URL", status=400)

    try:
        from django.shortcuts import redirect
        from .models import EmailSend, EmailEvent

        if send_id:
            send = EmailSend.objects.filter(id=send_id).first()
            if send:
                # Record click
                send.mark_clicked(url)

                # Create event
                EmailEvent.objects.create(
                    send=send,
                    event_type=EmailEvent.EventType.CLICK,
                    url=url,
                    ip_address=_get_client_ip(request),
                    user_agent=request.headers.get("User-Agent", ""),
                )

                # Update recipient stats
                if send.recipient:
                    send.recipient.emails_clicked += 1
                    send.recipient.last_clicked_at = send.clicked_at
                    send.recipient.save(update_fields=["emails_clicked", "last_clicked_at"])

                # Update step stats
                if send.step:
                    send.step.total_clicked += 1
                    send.step.save(update_fields=["total_clicked"])

        return redirect(url)

    except Exception as e:
        logger.error(f"Click tracking error: {e}")
        from django.shortcuts import redirect
        return redirect(url)


@csrf_exempt
def unsubscribe(request) -> HttpResponse:
    """
    Handle email unsubscribe.

    URL format: /email/unsubscribe/{recipient_id}/
    """
    recipient_id = request.GET.get("id")

    if not recipient_id:
        return HttpResponse("Invalid request", status=400)

    try:
        from .models import EmailRecipient

        recipient = EmailRecipient.objects.filter(id=recipient_id).first()
        if recipient:
            if request.method == "POST":
                reason = request.POST.get("reason", "Unsubscribed via link")
                recipient.unsubscribe(reason)
                return HttpResponse("""
                    <html>
                    <head><title>Unsubscribed</title></head>
                    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h1>You have been unsubscribed</h1>
                        <p>You will no longer receive emails from us.</p>
                    </body>
                    </html>
                """)
            else:
                # Show unsubscribe form
                return HttpResponse(f"""
                    <html>
                    <head><title>Unsubscribe</title></head>
                    <body style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px;">
                        <h1>Unsubscribe</h1>
                        <p>Are you sure you want to unsubscribe from our emails?</p>
                        <form method="POST">
                            <p>
                                <label>Reason (optional):</label><br>
                                <textarea name="reason" rows="3" style="width: 100%;"></textarea>
                            </p>
                            <button type="submit" style="padding: 10px 20px; background: #dc3545; color: white; border: none; cursor: pointer;">
                                Unsubscribe
                            </button>
                        </form>
                    </body>
                    </html>
                """)
        else:
            return HttpResponse("Recipient not found", status=404)

    except Exception as e:
        logger.error(f"Unsubscribe error: {e}")
        return HttpResponse("Error processing request", status=500)


def _transparent_gif() -> HttpResponse:
    """Return a transparent 1x1 GIF."""
    gif = b'\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b'
    return HttpResponse(gif, content_type="image/gif")


def _get_client_ip(request) -> str:
    """Get client IP address from request."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")
