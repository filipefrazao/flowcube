"""
Email Sequences Celery Tasks
email_sequences/tasks.py

Background tasks for email processing, sending, and maintenance.
Created: 2026-02-02
"""
import logging
from datetime import timedelta
from typing import Optional, List, Dict, Any

from celery import shared_task
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import (
    EmailProvider,
    EmailTemplate,
    EmailSequence,
    EmailStep,
    EmailRecipient,
    SequenceEnrollment,
    EmailSend,
    EmailEvent,
)
from .client import EmailClientFactory, EmailMessage, TemplateRenderer


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_async(self, send_id: str) -> Dict[str, Any]:
    """
    Send a single email asynchronously.

    Args:
        send_id: UUID of the EmailSend record

    Returns:
        Dict with success status and details
    """
    try:
        send = EmailSend.objects.select_related("provider", "recipient").get(id=send_id)
    except EmailSend.DoesNotExist:
        logger.error(f"EmailSend {send_id} not found")
        return {"success": False, "error": "Send record not found"}

    # Skip if already processed
    if send.status not in [EmailSend.Status.PENDING, EmailSend.Status.QUEUED, EmailSend.Status.FAILED]:
        logger.info(f"EmailSend {send_id} already processed with status {send.status}")
        return {"success": False, "error": f"Already processed: {send.status}"}

    # Check if can retry
    if send.status == EmailSend.Status.FAILED and not send.can_retry():
        logger.warning(f"EmailSend {send_id} max retries exceeded")
        return {"success": False, "error": "Max retries exceeded"}

    # Get provider
    provider = send.provider
    if not provider:
        send.mark_failed("No provider configured", "NO_PROVIDER")
        return {"success": False, "error": "No provider configured"}

    if not provider.can_send():
        send.mark_failed("Provider cannot send (inactive, unverified, or rate limited)", "PROVIDER_UNAVAILABLE")
        return {"success": False, "error": "Provider unavailable"}

    # Update status to sending
    send.status = EmailSend.Status.SENDING
    send.save(update_fields=["status"])

    try:
        import asyncio

        # Create email message
        message = EmailMessage(
            to_email=send.to_email,
            to_name=send.recipient.name if send.recipient else "",
            subject=send.subject,
            html_content=send.html_content,
            text_content=send.text_content,
            from_email=send.from_email,
            from_name=send.from_name,
            reply_to=send.reply_to,
            tracking_id=str(send.id)
        )

        # Create client and send
        client = EmailClientFactory.create(provider)

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(client.send(message))
        finally:
            loop.close()

        if result.success:
            send.mark_sent(result.message_id)
            provider.increment_sent_count()

            # Update recipient stats
            if send.recipient:
                send.recipient.emails_received += 1
                send.recipient.last_email_at = timezone.now()
                send.recipient.save(update_fields=["emails_received", "last_email_at"])

            # Update step stats
            if send.step:
                send.step.total_sent += 1
                send.step.save(update_fields=["total_sent"])

            # Create sent event
            EmailEvent.objects.create(
                send=send,
                event_type=EmailEvent.EventType.SENT,
                timestamp=timezone.now()
            )

            logger.info(f"Email sent successfully: {send_id} to {send.to_email}")
            return {"success": True, "message_id": result.message_id}

        else:
            send.mark_failed(result.error_message, result.error_code)
            logger.error(f"Failed to send email {send_id}: {result.error_message}")

            # Retry if possible
            if send.can_retry():
                raise self.retry(exc=Exception(result.error_message))

            return {"success": False, "error": result.error_message}

    except Exception as e:
        send.mark_failed(str(e), "EXCEPTION")
        logger.exception(f"Exception sending email {send_id}")

        if send.can_retry():
            raise self.retry(exc=e)

        return {"success": False, "error": str(e)}


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def process_sequence_step(self, enrollment_id: str) -> Dict[str, Any]:
    """
    Process a sequence step for an enrollment.

    Args:
        enrollment_id: UUID of the SequenceEnrollment

    Returns:
        Dict with processing status
    """
    try:
        enrollment = SequenceEnrollment.objects.select_related(
            "sequence", "recipient", "current_step"
        ).get(id=enrollment_id)
    except SequenceEnrollment.DoesNotExist:
        logger.error(f"Enrollment {enrollment_id} not found")
        return {"success": False, "error": "Enrollment not found"}

    # Check if enrollment is active
    if enrollment.status != SequenceEnrollment.Status.ACTIVE:
        logger.info(f"Enrollment {enrollment_id} is not active: {enrollment.status}")
        return {"success": False, "error": f"Enrollment not active: {enrollment.status}"}

    # Check if sequence is active
    sequence = enrollment.sequence
    if not sequence.is_active:
        logger.info(f"Sequence {sequence.id} is not active")
        return {"success": False, "error": "Sequence not active"}

    # Check if recipient can receive emails
    recipient = enrollment.recipient
    if not recipient.can_receive_email():
        enrollment.status = SequenceEnrollment.Status.UNSUBSCRIBED
        enrollment.save(update_fields=["status"])
        sequence.total_unsubscribed += 1
        sequence.save(update_fields=["total_unsubscribed"])
        return {"success": False, "error": "Recipient cannot receive emails"}

    # Get current step
    step = enrollment.current_step
    if not step:
        # Try to get first step
        step = sequence.steps.filter(is_active=True).first()
        if not step:
            enrollment.status = SequenceEnrollment.Status.COMPLETED
            enrollment.completed_at = timezone.now()
            enrollment.save(update_fields=["status", "completed_at"])
            return {"success": False, "error": "No steps in sequence"}

    # Check step conditions
    if not _check_step_condition(step, enrollment):
        logger.info(f"Step condition not met for enrollment {enrollment_id}")
        # Skip to next step
        if enrollment.advance_to_next_step():
            # Schedule next step
            process_sequence_step.apply_async(
                args=[str(enrollment.id)],
                eta=enrollment.next_send_at
            )
        return {"success": True, "skipped": True, "reason": "Condition not met"}

    # Get provider
    provider = sequence.provider
    if not provider or not provider.can_send():
        logger.warning(f"Provider unavailable for sequence {sequence.id}")
        # Retry later
        raise self.retry(countdown=300)

    # Get content
    content = step.get_effective_content()
    if not content["subject"] or not content["html_content"]:
        logger.error(f"Step {step.id} has no content")
        return {"success": False, "error": "Step has no content"}

    # Merge variables
    variables = {
        **(recipient.variables or {}),
        **(enrollment.variables or {}),
        "email": recipient.email,
        "name": recipient.name or recipient.first_name or "",
        "first_name": recipient.first_name or "",
        "last_name": recipient.last_name or "",
        "unsubscribe_url": f"{{{{unsubscribe_url}}}}",  # Will be replaced by tracking system
    }

    # Render content
    rendered_subject = TemplateRenderer.render(content["subject"], variables)
    rendered_html = TemplateRenderer.render(content["html_content"], variables)
    rendered_text = TemplateRenderer.render(content["text_content"], variables)

    # Create EmailSend record
    send = EmailSend.objects.create(
        step=step,
        enrollment=enrollment,
        recipient=recipient,
        provider=provider,
        from_email=provider.default_from_email,
        from_name=provider.default_from_name,
        to_email=recipient.email,
        reply_to=provider.default_reply_to,
        subject=rendered_subject,
        html_content=rendered_html,
        text_content=rendered_text,
        status=EmailSend.Status.QUEUED,
        metadata={"step_order": step.order, "sequence_id": str(sequence.id)}
    )

    # Increment template usage
    if step.template:
        step.template.increment_usage()

    # Send email async
    result = send_email_async.delay(str(send.id))

    # Advance to next step
    if enrollment.advance_to_next_step():
        # Schedule next step
        process_sequence_step.apply_async(
            args=[str(enrollment.id)],
            eta=enrollment.next_send_at
        )
    else:
        # Sequence completed
        sequence.total_completed += 1
        sequence.save(update_fields=["total_completed"])

    logger.info(f"Processed step {step.order} for enrollment {enrollment_id}")
    return {"success": True, "send_id": str(send.id)}


def _check_step_condition(step: EmailStep, enrollment: SequenceEnrollment) -> bool:
    """Check if step condition is met."""
    condition = step.condition_type

    if condition == EmailStep.ConditionType.NONE:
        return True

    # Get previous send
    previous_send = EmailSend.objects.filter(
        enrollment=enrollment,
        step__order__lt=step.order
    ).order_by("-created_at").first()

    if not previous_send:
        return True

    if condition == EmailStep.ConditionType.OPENED_PREVIOUS:
        return previous_send.unique_opens > 0

    if condition == EmailStep.ConditionType.NOT_OPENED_PREVIOUS:
        return previous_send.unique_opens == 0

    if condition == EmailStep.ConditionType.CLICKED_PREVIOUS:
        return previous_send.unique_clicks > 0

    if condition == EmailStep.ConditionType.NOT_CLICKED_PREVIOUS:
        return previous_send.unique_clicks == 0

    if condition == EmailStep.ConditionType.HAS_TAG:
        required_tag = step.condition_config.get("tag")
        if required_tag:
            return enrollment.recipient.has_tag(required_tag)

    return True


@shared_task
def send_bulk_emails(
    provider_id: str,
    recipients: List[Dict[str, Any]],
    subject: str,
    html_content: str,
    text_content: str = "",
    batch_size: int = 100
) -> Dict[str, Any]:
    """
    Send bulk emails to multiple recipients.

    Args:
        provider_id: UUID of the EmailProvider
        recipients: List of dicts with email, name, variables
        subject: Email subject template
        html_content: HTML content template
        text_content: Text content template
        batch_size: Number of emails to send in each batch

    Returns:
        Dict with send statistics
    """
    try:
        provider = EmailProvider.objects.get(id=provider_id)
    except EmailProvider.DoesNotExist:
        return {"success": False, "error": "Provider not found"}

    if not provider.can_send():
        return {"success": False, "error": "Provider cannot send"}

    total = len(recipients)
    sent = 0
    failed = 0
    errors = []

    # Process in batches
    for i in range(0, total, batch_size):
        batch = recipients[i:i + batch_size]

        for recipient_data in batch:
            email = recipient_data.get("email")
            if not email:
                failed += 1
                continue

            variables = {
                "email": email,
                "name": recipient_data.get("name", ""),
                **(recipient_data.get("variables", {}))
            }

            rendered_subject = TemplateRenderer.render(subject, variables)
            rendered_html = TemplateRenderer.render(html_content, variables)
            rendered_text = TemplateRenderer.render(text_content, variables) if text_content else ""

            # Get or create recipient
            recipient, _ = EmailRecipient.objects.get_or_create(
                owner_id=provider.owner_id,
                email=email.lower(),
                defaults={
                    "name": recipient_data.get("name", ""),
                    "source": "bulk_send"
                }
            )

            if not recipient.can_receive_email():
                failed += 1
                continue

            # Create send record
            send = EmailSend.objects.create(
                recipient=recipient,
                provider=provider,
                from_email=provider.default_from_email,
                from_name=provider.default_from_name,
                to_email=email,
                reply_to=provider.default_reply_to,
                subject=rendered_subject,
                html_content=rendered_html,
                text_content=rendered_text,
                status=EmailSend.Status.QUEUED,
                metadata={"bulk_send": True}
            )

            # Queue for sending
            send_email_async.delay(str(send.id))
            sent += 1

            # Check rate limits
            if not provider.can_send():
                errors.append(f"Rate limit reached after {sent} emails")
                break

    return {
        "success": True,
        "total": total,
        "queued": sent,
        "failed": failed,
        "errors": errors[:10]
    }


@shared_task
def process_pending_enrollments() -> Dict[str, Any]:
    """
    Process all enrollments that are due to send.
    Should be run periodically (e.g., every minute).
    """
    now = timezone.now()

    # Find enrollments due to send
    enrollments = SequenceEnrollment.objects.filter(
        status=SequenceEnrollment.Status.ACTIVE,
        next_send_at__lte=now,
        sequence__is_active=True
    ).select_related("sequence", "recipient", "current_step")[:100]

    processed = 0
    for enrollment in enrollments:
        process_sequence_step.delay(str(enrollment.id))
        processed += 1

    logger.info(f"Queued {processed} enrollments for processing")
    return {"processed": processed}


@shared_task
def process_webhook_event(
    provider_type: str,
    payload: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Process a webhook event from an email provider.

    Args:
        provider_type: Type of provider (sendgrid, mailgun, ses)
        payload: Webhook payload

    Returns:
        Dict with processing status
    """
    try:
        if provider_type == "sendgrid":
            return _process_sendgrid_webhook(payload)
        elif provider_type == "mailgun":
            return _process_mailgun_webhook(payload)
        elif provider_type == "ses":
            return _process_ses_webhook(payload)
        else:
            return {"success": False, "error": f"Unknown provider type: {provider_type}"}
    except Exception as e:
        logger.exception(f"Error processing webhook: {e}")
        return {"success": False, "error": str(e)}


def _process_sendgrid_webhook(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Process SendGrid webhook events."""
    processed = 0

    for event in events:
        event_type = event.get("event")
        sg_message_id = event.get("sg_message_id", "").split(".")[0]

        if not sg_message_id:
            continue

        # Find the send record
        send = EmailSend.objects.filter(provider_message_id__startswith=sg_message_id).first()
        if not send:
            continue

        # Map SendGrid events to our event types
        event_map = {
            "delivered": (EmailEvent.EventType.DELIVERED, "mark_delivered"),
            "open": (EmailEvent.EventType.OPEN, "mark_opened"),
            "click": (EmailEvent.EventType.CLICK, "mark_clicked"),
            "bounce": (EmailEvent.EventType.BOUNCE, None),
            "dropped": (EmailEvent.EventType.DROPPED, None),
            "spamreport": (EmailEvent.EventType.SPAM_REPORT, None),
            "unsubscribe": (EmailEvent.EventType.UNSUBSCRIBE, None),
        }

        if event_type not in event_map:
            continue

        our_event_type, method = event_map[event_type]

        # Create event record
        EmailEvent.objects.create(
            send=send,
            event_type=our_event_type,
            timestamp=timezone.datetime.fromtimestamp(event.get("timestamp", 0), tz=timezone.utc),
            url=event.get("url", ""),
            ip_address=event.get("ip", ""),
            user_agent=event.get("useragent", ""),
            provider_event_id=event.get("sg_event_id", ""),
            metadata=event
        )

        # Update send record
        if method:
            getattr(send, method)()
        elif event_type == "bounce":
            send.mark_bounced(event.get("type", "hard"), event.get("reason", ""))
            if send.recipient:
                send.recipient.mark_bounced(event.get("type", "hard"))
        elif event_type == "spamreport":
            send.status = EmailSend.Status.SPAM
            send.save(update_fields=["status"])
            if send.recipient:
                send.recipient.mark_complained()

        processed += 1

    return {"success": True, "processed": processed}


def _process_mailgun_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process Mailgun webhook events."""
    event_data = payload.get("event-data", {})
    event_type = event_data.get("event")
    message_id = event_data.get("message", {}).get("headers", {}).get("message-id", "")

    if not message_id:
        return {"success": False, "error": "No message ID"}

    send = EmailSend.objects.filter(provider_message_id=message_id).first()
    if not send:
        return {"success": False, "error": "Send not found"}

    event_map = {
        "delivered": EmailEvent.EventType.DELIVERED,
        "opened": EmailEvent.EventType.OPEN,
        "clicked": EmailEvent.EventType.CLICK,
        "failed": EmailEvent.EventType.BOUNCE,
        "complained": EmailEvent.EventType.SPAM_REPORT,
        "unsubscribed": EmailEvent.EventType.UNSUBSCRIBE,
    }

    if event_type not in event_map:
        return {"success": False, "error": f"Unknown event type: {event_type}"}

    # Create event
    EmailEvent.objects.create(
        send=send,
        event_type=event_map[event_type],
        timestamp=timezone.datetime.fromtimestamp(event_data.get("timestamp", 0), tz=timezone.utc),
        url=event_data.get("url", ""),
        ip_address=event_data.get("ip", ""),
        user_agent=event_data.get("client-info", {}).get("user-agent", ""),
        country=event_data.get("geolocation", {}).get("country", ""),
        city=event_data.get("geolocation", {}).get("city", ""),
        device_type=event_data.get("client-info", {}).get("device-type", ""),
        client_name=event_data.get("client-info", {}).get("client-name", ""),
        client_os=event_data.get("client-info", {}).get("client-os", ""),
        metadata=event_data
    )

    # Update send
    if event_type == "delivered":
        send.mark_delivered()
    elif event_type == "opened":
        send.mark_opened()
    elif event_type == "clicked":
        send.mark_clicked(event_data.get("url", ""))
    elif event_type == "failed":
        severity = event_data.get("severity", "permanent")
        bounce_type = "hard" if severity == "permanent" else "soft"
        send.mark_bounced(bounce_type, event_data.get("reason", ""))
        if send.recipient:
            send.recipient.mark_bounced(bounce_type)

    return {"success": True, "event_type": event_type}


def _process_ses_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process Amazon SES/SNS webhook events."""
    message_type = payload.get("Type")

    if message_type == "SubscriptionConfirmation":
        # Handle subscription confirmation
        return {"success": True, "type": "subscription_confirmation"}

    if message_type != "Notification":
        return {"success": False, "error": f"Unknown message type: {message_type}"}

    import json
    message = json.loads(payload.get("Message", "{}"))
    notification_type = message.get("notificationType")
    mail = message.get("mail", {})
    message_id = mail.get("messageId", "")

    if not message_id:
        return {"success": False, "error": "No message ID"}

    send = EmailSend.objects.filter(provider_message_id=message_id).first()
    if not send:
        return {"success": False, "error": "Send not found"}

    if notification_type == "Delivery":
        send.mark_delivered()
        EmailEvent.objects.create(
            send=send,
            event_type=EmailEvent.EventType.DELIVERED,
            timestamp=timezone.now(),
            metadata=message
        )

    elif notification_type == "Bounce":
        bounce = message.get("bounce", {})
        bounce_type = "hard" if bounce.get("bounceType") == "Permanent" else "soft"
        send.mark_bounced(bounce_type, bounce.get("bouncedRecipients", [{}])[0].get("diagnosticCode", ""))
        if send.recipient:
            send.recipient.mark_bounced(bounce_type)
        EmailEvent.objects.create(
            send=send,
            event_type=EmailEvent.EventType.BOUNCE,
            timestamp=timezone.now(),
            metadata=message
        )

    elif notification_type == "Complaint":
        send.status = EmailSend.Status.SPAM
        send.save(update_fields=["status"])
        if send.recipient:
            send.recipient.mark_complained()
        EmailEvent.objects.create(
            send=send,
            event_type=EmailEvent.EventType.SPAM_REPORT,
            timestamp=timezone.now(),
            metadata=message
        )

    return {"success": True, "notification_type": notification_type}


@shared_task
def cleanup_old_events(days: int = 90) -> Dict[str, Any]:
    """
    Clean up old email events to manage database size.

    Args:
        days: Delete events older than this many days

    Returns:
        Dict with cleanup statistics
    """
    cutoff = timezone.now() - timedelta(days=days)

    # Delete old events
    deleted_events, _ = EmailEvent.objects.filter(timestamp__lt=cutoff).delete()

    # Optionally delete old sends that are completed
    deleted_sends, _ = EmailSend.objects.filter(
        created_at__lt=cutoff,
        status__in=["delivered", "opened", "clicked"]
    ).delete()

    logger.info(f"Cleaned up {deleted_events} events and {deleted_sends} sends older than {days} days")

    return {
        "deleted_events": deleted_events,
        "deleted_sends": deleted_sends,
        "cutoff_date": cutoff.isoformat()
    }


@shared_task
def calculate_sequence_stats(sequence_id: str) -> Dict[str, Any]:
    """
    Calculate and update statistics for a sequence.

    Args:
        sequence_id: UUID of the EmailSequence

    Returns:
        Dict with calculated stats
    """
    try:
        sequence = EmailSequence.objects.get(id=sequence_id)
    except EmailSequence.DoesNotExist:
        return {"success": False, "error": "Sequence not found"}

    # Count enrollments by status
    enrollments = sequence.enrollments.all()
    total_enrolled = enrollments.count()
    total_completed = enrollments.filter(status="completed").count()
    total_unsubscribed = enrollments.filter(status="unsubscribed").count()

    # Update sequence stats
    sequence.total_enrolled = total_enrolled
    sequence.total_completed = total_completed
    sequence.total_unsubscribed = total_unsubscribed
    sequence.save(update_fields=["total_enrolled", "total_completed", "total_unsubscribed"])

    # Calculate step stats
    for step in sequence.steps.all():
        sends = step.sends.all()
        step.total_sent = sends.filter(status__in=["sent", "delivered", "opened", "clicked"]).count()
        step.total_opened = sends.filter(unique_opens__gt=0).count()
        step.total_clicked = sends.filter(unique_clicks__gt=0).count()
        step.total_bounced = sends.filter(status="bounced").count()
        step.save(update_fields=["total_sent", "total_opened", "total_clicked", "total_bounced"])

    return {
        "success": True,
        "total_enrolled": total_enrolled,
        "total_completed": total_completed,
        "total_unsubscribed": total_unsubscribed
    }


@shared_task
def reset_daily_provider_counts() -> Dict[str, Any]:
    """
    Reset daily email counts for all providers.
    Should be run at midnight.
    """
    updated = EmailProvider.objects.filter(emails_sent_today__gt=0).update(emails_sent_today=0)
    logger.info(f"Reset daily counts for {updated} providers")
    return {"updated": updated}


@shared_task
def retry_failed_sends(max_age_hours: int = 24) -> Dict[str, Any]:
    """
    Retry failed sends that can be retried.

    Args:
        max_age_hours: Only retry sends created within this timeframe

    Returns:
        Dict with retry statistics
    """
    cutoff = timezone.now() - timedelta(hours=max_age_hours)

    # Find failed sends that can be retried
    failed_sends = EmailSend.objects.filter(
        status=EmailSend.Status.FAILED,
        created_at__gte=cutoff,
        retry_count__lt=models.F("max_retries")
    )[:100]

    queued = 0
    for send in failed_sends:
        if send.can_retry() and send.provider and send.provider.can_send():
            send_email_async.delay(str(send.id))
            queued += 1

    logger.info(f"Queued {queued} failed sends for retry")
    return {"queued": queued}
