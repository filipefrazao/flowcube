from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta
from .models import WhatsAppFlow, WhatsAppTemplate, WhatsAppInteraction, WhatsAppConversation, WhatsAppAnalytics
from .serializers import (
    WhatsAppFlowSerializer, WhatsAppTemplateSerializer,
    WhatsAppInteractionSerializer, WhatsAppConversationSerializer,
    WhatsAppAnalyticsSerializer
)
from .meta_api import MetaWhatsAppAPI
from .flow_executor import WhatsAppFlowExecutor


class WhatsAppFlowViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppFlow.objects.all()
    serializer_class = WhatsAppFlowSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WhatsAppFlow.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def test_flow(self, request, pk=None):
        """Test flow with simulated message"""
        flow = self.get_object()
        test_phone = request.data.get('test_phone', '+5511999999999')
        message_data = request.data.get('message_data', {
            'type': 'text',
            'text': {'body': 'test message'}
        })

        executor = WhatsAppFlowExecutor(flow)
        result = executor.process_message(test_phone, message_data)

        return Response(result)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get flow analytics"""
        flow = self.get_object()
        days = int(request.query_params.get('days', 7))

        start_date = timezone.now().date() - timedelta(days=days)

        analytics = WhatsAppAnalytics.objects.filter(
            flow=flow,
            date__gte=start_date
        ).order_by('date')

        serializer = WhatsAppAnalyticsSerializer(analytics, many=True)

        summary = {
            'total_messages_sent': sum(a.messages_sent for a in analytics),
            'total_conversations': sum(a.conversations_started for a in analytics),
            'avg_completion_rate': analytics.aggregate(avg=Avg('completion_rate'))['avg'] or 0.0,
        }

        return Response({
            'summary': summary,
            'daily_data': serializer.data
        })

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle flow active status"""
        flow = self.get_object()
        flow.is_active = not flow.is_active
        flow.save()

        return Response({
            'is_active': flow.is_active
        })


class WhatsAppTemplateViewSet(viewsets.ModelViewSet):
    queryset = WhatsAppTemplate.objects.all()
    serializer_class = WhatsAppTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WhatsAppTemplate.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def submit_for_approval(self, request, pk=None):
        """Submit template to Meta for approval"""
        template = self.get_object()
        business_account_id = request.data.get('business_account_id')

        if not business_account_id:
            return Response(
                {'error': 'business_account_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        api = MetaWhatsAppAPI()

        components = []

        if template.header:
            components.append({
                'type': 'HEADER',
                'format': template.header.get('type', 'TEXT').upper(),
                'text': template.header.get('content', '') if template.header.get('type') == 'text' else None
            })

        components.append({
            'type': 'BODY',
            'text': template.body
        })

        if template.footer:
            components.append({
                'type': 'FOOTER',
                'text': template.footer
            })

        if template.buttons:
            buttons_component = {
                'type': 'BUTTONS',
                'buttons': []
            }
            for btn in template.buttons:
                button = {
                    'type': btn['type'].upper(),
                    'text': btn['text']
                }
                if btn['type'] == 'url':
                    button['url'] = btn.get('url', '')
                elif btn['type'] == 'call':
                    button['phone_number'] = btn.get('phone_number', '')

                buttons_component['buttons'].append(button)

            components.append(buttons_component)

        try:
            result = api.create_template(
                business_account_id=business_account_id,
                name=template.name,
                category=template.category.upper(),
                language=template.language,
                components=components
            )

            template.status = 'pending'
            template.template_id = result.get('id', '')
            template.save()

            return Response({
                'status': 'submitted',
                'template_id': template.template_id
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WhatsAppInteractionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WhatsAppInteraction.objects.all()
    serializer_class = WhatsAppInteractionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = WhatsAppInteraction.objects.filter(
            flow__created_by=self.request.user
        )

        flow_id = self.request.query_params.get('flow_id')
        if flow_id:
            queryset = queryset.filter(flow_id=flow_id)

        user_phone = self.request.query_params.get('user_phone')
        if user_phone:
            queryset = queryset.filter(user_phone=user_phone)

        return queryset.order_by('-timestamp')


class WhatsAppConversationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WhatsAppConversation.objects.all()
    serializer_class = WhatsAppConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = WhatsAppConversation.objects.filter(
            flow__created_by=self.request.user
        )

        flow_id = self.request.query_params.get('flow_id')
        if flow_id:
            queryset = queryset.filter(flow_id=flow_id)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-last_interaction')

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get all messages for a conversation"""
        conversation = self.get_object()
        interactions = WhatsAppInteraction.objects.filter(
            flow=conversation.flow,
            user_phone=conversation.user_phone
        ).order_by('timestamp')

        serializer = WhatsAppInteractionSerializer(interactions, many=True)
        return Response(serializer.data)
