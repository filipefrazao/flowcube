"""
Email Sequences Views
email_sequences/views.py

DRF ViewSets for managing email providers, templates, sequences, and more.
Created: 2026-02-02
"""
import csv
import io
import logging
from typing import Any

from django.db import transaction
from django.db.models import Count, Avg, Sum, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

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
from .serializers import (
    EmailProviderSerializer,
    EmailProviderListSerializer,
    EmailTemplateSerializer,
    EmailTemplateListSerializer,
    EmailSequenceSerializer,
    EmailSequenceListSerializer,
    EmailStepSerializer,
    EmailStepListSerializer,
    EmailRecipientSerializer,
    EmailRecipientListSerializer,
    EmailRecipientImportSerializer,
    EmailRecipientBulkTagSerializer,
    SequenceEnrollmentSerializer,
    EmailSendSerializer,
    EmailSendListSerializer,
    EmailEventSerializer,
    EmailEventListSerializer,
    SequenceStatsSerializer,
    ProviderStatsSerializer,
    TemplatePreviewSerializer,
    SendTestEmailSerializer,
    EnrollRecipientsSerializer,
    ReorderStepsSerializer,
)
from .client import EmailClientFactory, EmailMessage, TemplateRenderer
from .tasks import send_email_async, process_sequence_step


logger = logging.getLogger(__name__)


class EmailProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email providers."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EmailProvider.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.action == "list":
            return EmailProviderListSerializer
        return EmailProviderSerializer

    @action(detail=True, methods=["post"])
    def test_connection(self, request, pk=None):
        """Test connection to the email provider."""
        provider = self.get_object()

        try:
            import asyncio
            client = EmailClientFactory.create(provider)

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                success, message = loop.run_until_complete(client.test_connection())
            finally:
                loop.close()

            if success:
                provider.mark_verified()
                return Response({"success": True, "message": message})
            else:
                provider.mark_error(message)
                return Response({"success": False, "message": message}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error testing provider {provider.id}: {e}")
            provider.mark_error(str(e))
            return Response({"success": False, "message": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["post"])
    def send_test(self, request, pk=None):
        """Send a test email through this provider."""
        provider = self.get_object()
        serializer = SendTestEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            import asyncio
            client = EmailClientFactory.create(provider)

            message = EmailMessage(
                to_email=serializer.validated_data["to_email"],
                to_name=serializer.validated_data.get("to_name", ""),
                subject=serializer.validated_data["subject"],
                html_content=serializer.validated_data["html_content"],
                text_content=serializer.validated_data.get("text_content", ""),
                tracking_id=f"test-{timezone.now().timestamp()}"
            )

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(client.send(message))
            finally:
                loop.close()

            if result.success:
                provider.increment_sent_count()
                return Response({"success": True, "message_id": result.message_id, "message": "Test email sent successfully"})
            else:
                return Response({"success": False, "error": result.error_message}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error sending test email: {e}")
            return Response({"success": False, "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get provider statistics."""
        provider = self.get_object()

        sends = EmailSend.objects.filter(provider=provider)
        total_sent = sends.filter(status__in=["sent", "delivered", "opened", "clicked"]).count()
        total_bounced = sends.filter(status="bounced").count()

        delivery_rate = 0.0
        bounce_rate = 0.0
        if total_sent > 0:
            delivered = sends.filter(status__in=["delivered", "opened", "clicked"]).count()
            delivery_rate = (delivered / total_sent) * 100
            bounce_rate = (total_bounced / total_sent) * 100

        stats = {
            "emails_sent_today": provider.emails_sent_today,
            "emails_sent_total": provider.emails_sent_total,
            "daily_limit": provider.rate_limit_per_day,
            "hourly_limit": provider.rate_limit_per_hour,
            "remaining_today": max(0, provider.rate_limit_per_day - provider.emails_sent_today),
            "last_sent_at": provider.last_sent_at,
            "delivery_rate": round(delivery_rate, 2),
            "bounce_rate": round(bounce_rate, 2),
        }

        serializer = ProviderStatsSerializer(stats)
        return Response(serializer.data)


class EmailTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email templates."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = EmailTemplate.objects.filter(Q(owner=self.request.user) | Q(is_public=True))

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        tags = self.request.query_params.getlist("tag")
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(subject__icontains=search) | Q(description__icontains=search))

        return queryset.distinct()

    def get_serializer_class(self):
        if self.action == "list":
            return EmailTemplateListSerializer
        return EmailTemplateSerializer

    @action(detail=True, methods=["post"])
    def preview(self, request, pk=None):
        """Preview template with variable substitution."""
        template = self.get_object()
        serializer = TemplatePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variables = serializer.validated_data.get("variables", {})

        rendered_subject = TemplateRenderer.render(template.subject, variables)
        rendered_html = TemplateRenderer.render(template.html_content, variables)
        rendered_text = TemplateRenderer.render(template.text_content, variables)

        return Response({
            "subject": rendered_subject,
            "html_content": rendered_html,
            "text_content": rendered_text,
            "variables_used": TemplateRenderer.extract_variables(template.subject + template.html_content + template.text_content)
        })

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Create a duplicate of this template."""
        template = self.get_object()
        new_name = request.data.get("name", f"{template.name} (Copy)")

        new_template = template.duplicate(new_name)
        new_template.owner = request.user
        new_template.save()

        serializer = EmailTemplateSerializer(new_template, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmailSequenceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email sequences."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = EmailSequence.objects.filter(owner=self.request.user)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        return queryset.prefetch_related("steps")

    def get_serializer_class(self):
        if self.action == "list":
            return EmailSequenceListSerializer
        return EmailSequenceSerializer

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """Activate the sequence."""
        sequence = self.get_object()

        if sequence.steps.filter(is_active=True).count() == 0:
            return Response({"error": "Sequence must have at least one active step"}, status=status.HTTP_400_BAD_REQUEST)

        if not sequence.provider:
            return Response({"error": "Sequence must have a provider configured"}, status=status.HTTP_400_BAD_REQUEST)

        if not sequence.provider.is_verified:
            return Response({"error": "Provider must be verified before activating sequence"}, status=status.HTTP_400_BAD_REQUEST)

        sequence.activate()
        serializer = self.get_serializer(sequence)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Deactivate the sequence."""
        sequence = self.get_object()
        sequence.deactivate()
        serializer = self.get_serializer(sequence)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get detailed sequence statistics."""
        sequence = self.get_object()

        enrollments = sequence.enrollments.all()
        active_count = enrollments.filter(status="active").count()
        paused_count = enrollments.filter(status="paused").count()

        steps = sequence.steps.filter(is_active=True)
        total_sent = sum(s.total_sent for s in steps)
        total_opens = sum(s.total_opened for s in steps)
        total_clicks = sum(s.total_clicked for s in steps)

        avg_open_rate = 0.0
        avg_click_rate = 0.0
        if total_sent > 0:
            avg_open_rate = (total_opens / total_sent) * 100
            avg_click_rate = (total_clicks / total_sent) * 100

        step_stats = []
        for step in steps:
            step_stats.append({
                "id": str(step.id),
                "name": step.name or f"Step {step.order + 1}",
                "order": step.order,
                "total_sent": step.total_sent,
                "total_opened": step.total_opened,
                "total_clicked": step.total_clicked,
                "open_rate": step.open_rate,
                "click_rate": step.click_rate,
            })

        stats = {
            "total_enrolled": sequence.total_enrolled,
            "total_completed": sequence.total_completed,
            "total_active": active_count,
            "total_paused": paused_count,
            "total_unsubscribed": sequence.total_unsubscribed,
            "completion_rate": (sequence.total_completed / sequence.total_enrolled * 100) if sequence.total_enrolled > 0 else 0,
            "total_emails_sent": total_sent,
            "total_opens": total_opens,
            "total_clicks": total_clicks,
            "average_open_rate": round(avg_open_rate, 2),
            "average_click_rate": round(avg_click_rate, 2),
            "step_stats": step_stats,
        }

        serializer = SequenceStatsSerializer(stats)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        """Enroll recipients in the sequence."""
        sequence = self.get_object()
        serializer = EnrollRecipientsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        skip_already = data.get("skip_already_enrolled", True)
        variables = data.get("variables", {})

        recipients = EmailRecipient.objects.filter(owner=request.user)

        if data.get("recipient_ids"):
            recipients = recipients.filter(id__in=data["recipient_ids"])
        elif data.get("recipient_emails"):
            recipients = recipients.filter(email__in=data["recipient_emails"])
        elif data.get("filter_tags"):
            for tag in data["filter_tags"]:
                recipients = recipients.filter(tags__contains=[tag])

        recipients = [r for r in recipients if r.can_receive_email()]

        if skip_already:
            enrolled_ids = set(sequence.enrollments.values_list("recipient_id", flat=True))
            recipients = [r for r in recipients if r.id not in enrolled_ids]

        enrolled = []
        first_step = sequence.steps.filter(is_active=True).first()

        with transaction.atomic():
            for recipient in recipients:
                enrollment = SequenceEnrollment.objects.create(
                    sequence=sequence,
                    recipient=recipient,
                    current_step=first_step,
                    variables=variables,
                    next_send_at=timezone.now() + timezone.timedelta(minutes=first_step.delay_total_minutes if first_step else 0)
                )
                enrolled.append(enrollment)

            sequence.total_enrolled += len(enrolled)
            sequence.save(update_fields=["total_enrolled"])

        return Response({"enrolled_count": len(enrolled), "recipient_count": len(recipients), "message": f"Enrolled {len(enrolled)} recipients in sequence"})


class EmailStepViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email sequence steps."""
    permission_classes = [IsAuthenticated]
    serializer_class = EmailStepSerializer

    def get_queryset(self):
        queryset = EmailStep.objects.filter(sequence__owner=self.request.user)

        sequence_id = self.request.query_params.get("sequence")
        if sequence_id:
            queryset = queryset.filter(sequence_id=sequence_id)

        return queryset.select_related("template", "sequence")

    def get_serializer_class(self):
        if self.action == "list":
            return EmailStepListSerializer
        return EmailStepSerializer

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Reorder steps in a sequence."""
        serializer = ReorderStepsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        step_orders = serializer.validated_data["step_orders"]

        with transaction.atomic():
            for item in step_orders:
                EmailStep.objects.filter(id=item["id"], sequence__owner=request.user).update(order=item["order"])

        return Response({"message": "Steps reordered successfully"})


class EmailRecipientViewSet(viewsets.ModelViewSet):
    """ViewSet for managing email recipients."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = EmailRecipient.objects.filter(owner=self.request.user)

        is_subscribed = self.request.query_params.get("is_subscribed")
        if is_subscribed is not None:
            queryset = queryset.filter(is_subscribed=is_subscribed.lower() == "true")

        tags = self.request.query_params.getlist("tag")
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__contains=[tag])

        is_bounced = self.request.query_params.get("is_bounced")
        if is_bounced is not None:
            queryset = queryset.filter(is_bounced=is_bounced.lower() == "true")

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(name__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))

        return queryset

    def get_serializer_class(self):
        if self.action == "list":
            return EmailRecipientListSerializer
        if self.action == "import_csv":
            return EmailRecipientImportSerializer
        if self.action == "bulk_tag":
            return EmailRecipientBulkTagSerializer
        return EmailRecipientSerializer

    @action(detail=False, methods=["post"])
    def import_csv(self, request):
        """Import recipients from CSV file or data."""
        serializer = EmailRecipientImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        if data.get("csv_file"):
            csv_content = data["csv_file"].read().decode("utf-8")
        else:
            csv_content = data["csv_data"]

        reader = csv.DictReader(io.StringIO(csv_content))

        email_col = data["email_column"]
        name_col = data.get("name_column", "")
        first_name_col = data.get("first_name_column", "")
        last_name_col = data.get("last_name_column", "")
        tags = data.get("tags", [])
        source = data.get("source", "csv_import")
        skip_duplicates = data.get("skip_duplicates", True)
        update_existing = data.get("update_existing", False)

        created = 0
        updated = 0
        skipped = 0
        errors = []

        with transaction.atomic():
            for row_num, row in enumerate(reader, start=2):
                try:
                    email = row.get(email_col, "").strip().lower()
                    if not email:
                        skipped += 1
                        continue

                    existing = EmailRecipient.objects.filter(owner=request.user, email=email).first()

                    if existing:
                        if skip_duplicates and not update_existing:
                            skipped += 1
                            continue
                        if update_existing:
                            if name_col and row.get(name_col):
                                existing.name = row[name_col]
                            if first_name_col and row.get(first_name_col):
                                existing.first_name = row[first_name_col]
                            if last_name_col and row.get(last_name_col):
                                existing.last_name = row[last_name_col]
                            for tag in tags:
                                if tag not in existing.tags:
                                    existing.tags.append(tag)
                            existing.save()
                            updated += 1
                            continue

                    recipient = EmailRecipient(owner=request.user, email=email, source=source, tags=tags, subscribed_at=timezone.now())

                    if name_col and row.get(name_col):
                        recipient.name = row[name_col]
                    if first_name_col and row.get(first_name_col):
                        recipient.first_name = row[first_name_col]
                    if last_name_col and row.get(last_name_col):
                        recipient.last_name = row[last_name_col]

                    extra_vars = {}
                    for col, value in row.items():
                        if col not in [email_col, name_col, first_name_col, last_name_col]:
                            extra_vars[col] = value
                    if extra_vars:
                        recipient.variables = extra_vars

                    recipient.save()
                    created += 1

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")

        return Response({"created": created, "updated": updated, "skipped": skipped, "errors": errors[:10], "total_errors": len(errors)})

    @action(detail=False, methods=["get"])
    def export(self, request):
        """Export recipients to CSV."""
        queryset = self.get_queryset()

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="recipients_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow(["email", "name", "first_name", "last_name", "tags", "is_subscribed", "is_bounced", "emails_received", "emails_opened", "created_at"])

        for recipient in queryset:
            writer.writerow([
                recipient.email, recipient.name, recipient.first_name, recipient.last_name,
                ",".join(recipient.tags), recipient.is_subscribed, recipient.is_bounced,
                recipient.emails_received, recipient.emails_opened, recipient.created_at.isoformat()
            ])

        return response

    @action(detail=False, methods=["post"])
    def bulk_tag(self, request):
        """Bulk add/remove tags from recipients."""
        serializer = EmailRecipientBulkTagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        recipient_ids = data["recipient_ids"]
        add_tags = data.get("add_tags", [])
        remove_tags = data.get("remove_tags", [])

        recipients = EmailRecipient.objects.filter(owner=request.user, id__in=recipient_ids)

        updated = 0
        with transaction.atomic():
            for recipient in recipients:
                changed = False

                for tag in add_tags:
                    if tag not in recipient.tags:
                        recipient.tags.append(tag)
                        changed = True

                for tag in remove_tags:
                    if tag in recipient.tags:
                        recipient.tags.remove(tag)
                        changed = True

                if changed:
                    recipient.save(update_fields=["tags"])
                    updated += 1

        return Response({"updated": updated, "message": f"Updated tags for {updated} recipients"})

    @action(detail=True, methods=["post"])
    def unsubscribe(self, request, pk=None):
        """Unsubscribe a recipient."""
        recipient = self.get_object()
        reason = request.data.get("reason", "")
        recipient.unsubscribe(reason)
        serializer = self.get_serializer(recipient)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def resubscribe(self, request, pk=None):
        """Resubscribe a recipient."""
        recipient = self.get_object()
        recipient.resubscribe()
        serializer = self.get_serializer(recipient)
        return Response(serializer.data)


class EmailSendViewSet(viewsets.ModelViewSet):
    """ViewSet for email sends."""
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        queryset = EmailSend.objects.filter(recipient__owner=self.request.user)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        recipient_id = self.request.query_params.get("recipient")
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)

        step_id = self.request.query_params.get("step")
        if step_id:
            queryset = queryset.filter(step_id=step_id)

        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")
        if from_date:
            queryset = queryset.filter(created_at__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__lte=to_date)

        return queryset.select_related("recipient", "step", "provider")

    def get_serializer_class(self):
        if self.action == "list":
            return EmailSendListSerializer
        return EmailSendSerializer

    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None):
        """Resend a failed email."""
        send = self.get_object()

        if not send.can_retry():
            return Response({"error": "This email cannot be resent", "reason": f"Status: {send.status}, Retries: {send.retry_count}/{send.max_retries}"}, status=status.HTTP_400_BAD_REQUEST)

        send_email_async.delay(str(send.id))

        return Response({"message": "Email queued for resend", "send_id": str(send.id)})

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a scheduled/pending send."""
        send = self.get_object()

        if send.status not in ["pending", "queued"]:
            return Response({"error": "Only pending or queued sends can be cancelled"}, status=status.HTTP_400_BAD_REQUEST)

        send.status = EmailSend.Status.DROPPED
        send.error_message = "Cancelled by user"
        send.save(update_fields=["status", "error_message"])

        return Response({"message": "Send cancelled", "send_id": str(send.id)})


class EmailEventViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for email events (read-only)."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = EmailEvent.objects.filter(send__recipient__owner=self.request.user)

        event_type = self.request.query_params.get("event_type")
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        send_id = self.request.query_params.get("send")
        if send_id:
            queryset = queryset.filter(send_id=send_id)

        from_date = self.request.query_params.get("from_date")
        to_date = self.request.query_params.get("to_date")
        if from_date:
            queryset = queryset.filter(timestamp__gte=from_date)
        if to_date:
            queryset = queryset.filter(timestamp__lte=to_date)

        return queryset.select_related("send")

    def get_serializer_class(self):
        if self.action == "list":
            return EmailEventListSerializer
        return EmailEventSerializer


class SequenceEnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for sequence enrollments."""
    permission_classes = [IsAuthenticated]
    serializer_class = SequenceEnrollmentSerializer

    def get_queryset(self):
        queryset = SequenceEnrollment.objects.filter(sequence__owner=self.request.user)

        sequence_id = self.request.query_params.get("sequence")
        if sequence_id:
            queryset = queryset.filter(sequence_id=sequence_id)

        recipient_id = self.request.query_params.get("recipient")
        if recipient_id:
            queryset = queryset.filter(recipient_id=recipient_id)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.select_related("sequence", "recipient", "current_step")

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause an enrollment."""
        enrollment = self.get_object()

        if enrollment.status != "active":
            return Response({"error": "Only active enrollments can be paused"}, status=status.HTTP_400_BAD_REQUEST)

        enrollment.pause()
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """Resume a paused enrollment."""
        enrollment = self.get_object()

        if enrollment.status != "paused":
            return Response({"error": "Only paused enrollments can be resumed"}, status=status.HTTP_400_BAD_REQUEST)

        enrollment.resume()

        if enrollment.current_step:
            enrollment.next_send_at = timezone.now() + timezone.timedelta(minutes=enrollment.current_step.delay_total_minutes)
            enrollment.save(update_fields=["next_send_at"])

        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)
