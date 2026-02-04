from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WhatsAppFlowViewSet, WhatsAppTemplateViewSet,
    WhatsAppInteractionViewSet, WhatsAppConversationViewSet
)
from .webhooks import whatsapp_webhook

router = DefaultRouter()
router.register(r'flows', WhatsAppFlowViewSet, basename='whatsapp-flow')
router.register(r'templates', WhatsAppTemplateViewSet, basename='whatsapp-template')
router.register(r'interactions', WhatsAppInteractionViewSet, basename='whatsapp-interaction')
router.register(r'conversations', WhatsAppConversationViewSet, basename='whatsapp-conversation')

urlpatterns = [
    path('', include(router.urls)),
    path('webhook/', whatsapp_webhook, name='whatsapp-webhook'),
]
