"""
Email Sequences URL Configuration
email_sequences/urls.py

API routes for email sequence management.
Created: 2026-02-02
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    EmailProviderViewSet,
    EmailTemplateViewSet,
    EmailSequenceViewSet,
    EmailStepViewSet,
    EmailRecipientViewSet,
    EmailSendViewSet,
    EmailEventViewSet,
    SequenceEnrollmentViewSet,
)
from .webhooks import (
    sendgrid_webhook,
    mailgun_webhook,
    ses_webhook,
)


# Create router
router = DefaultRouter()
router.register(r"providers", EmailProviderViewSet, basename="email-provider")
router.register(r"templates", EmailTemplateViewSet, basename="email-template")
router.register(r"sequences", EmailSequenceViewSet, basename="email-sequence")
router.register(r"steps", EmailStepViewSet, basename="email-step")
router.register(r"recipients", EmailRecipientViewSet, basename="email-recipient")
router.register(r"sends", EmailSendViewSet, basename="email-send")
router.register(r"events", EmailEventViewSet, basename="email-event")
router.register(r"enrollments", SequenceEnrollmentViewSet, basename="sequence-enrollment")


app_name = "email_sequences"

urlpatterns = [
    # API routes
    path("", include(router.urls)),
    
    # Webhook endpoints
    path("webhooks/email/sendgrid/", sendgrid_webhook, name="sendgrid-webhook"),
    path("webhooks/email/mailgun/", mailgun_webhook, name="mailgun-webhook"),
    path("webhooks/email/ses/", ses_webhook, name="ses-webhook"),
]
