"""
FlowCube Chat API Views
API endpoints for managing chat sessions and messages
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q

from ..models import ChatSession, ChatMessage, HandoffRequest
from ..serializers import (
    ChatSessionSerializer,
    ChatSessionListSerializer,
    ChatMessageSerializer,
    HandoffRequestSerializer,
)


class ChatSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for chat sessions
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = ChatSession.objects.select_related(
            'workflow', 'assigned_to'
        ).prefetch_related('messages')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by workflow
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            queryset = queryset.filter(workflow_id=workflow_id)
        
        # Filter assigned to me
        assigned_to_me = self.request.query_params.get('assigned_to_me')
        if assigned_to_me and assigned_to_me.lower() == 'true':
            queryset = queryset.filter(assigned_to=self.request.user)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(contact_name__icontains=search) |
                Q(contact_phone__icontains=search)
            )
        
        return queryset.order_by('-last_message_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ChatSessionListSerializer
        return ChatSessionSerializer
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in this session"""
        session = self.get_object()
        
        content = request.data.get('content', '')
        if not content:
            return Response({'error': 'Content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        message = ChatMessage.objects.create(
            session=session,
            direction=ChatMessage.Direction.OUTBOUND,
            message_type=request.data.get('message_type', ChatMessage.MessageType.TEXT),
            content=content,
            is_ai_generated=False,
        )
        
        # Update session
        session.message_count += 1
        session.last_message_at = message.created_at
        session.save(update_fields=['message_count', 'last_message_at'])
        
        return Response(ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign this session to an agent"""
        session = self.get_object()
        session.assigned_to = request.user
        session.status = ChatSession.Status.HANDOFF
        session.save(update_fields=['assigned_to', 'status', 'updated_at'])
        return Response(ChatSessionSerializer(session).data)
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close this session"""
        session = self.get_object()
        session.status = ChatSession.Status.COMPLETED
        session.save(update_fields=['status', 'updated_at'])
        return Response(ChatSessionSerializer(session).data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get chat statistics"""
        queryset = self.get_queryset()
        
        return Response({
            'total': queryset.count(),
            'by_status': {
                'active': queryset.filter(status=ChatSession.Status.ACTIVE).count(),
                'waiting': queryset.filter(status=ChatSession.Status.WAITING_INPUT).count(),
                'handoff': queryset.filter(status=ChatSession.Status.HANDOFF).count(),
                'completed': queryset.filter(status=ChatSession.Status.COMPLETED).count(),
            },
            'unread_messages': ChatMessage.objects.filter(
                session__in=queryset,
                direction='inbound',
                read_at__isnull=True
            ).count(),
        })


class HandoffQueueViewSet(viewsets.ModelViewSet):
    """ViewSet for handoff queue management"""
    serializer_class = HandoffRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return HandoffRequest.objects.select_related(
            'session', 'session__workflow', 'assigned_to'
        ).order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept a handoff request"""
        handoff = self.get_object()
        
        if handoff.status != HandoffRequest.Status.PENDING:
            return Response(
                {'error': 'This handoff is no longer pending'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        handoff.assigned_to = request.user
        handoff.status = HandoffRequest.Status.ACCEPTED
        handoff.accepted_at = timezone.now()
        handoff.save()
        
        session = handoff.session
        session.assigned_to = request.user
        session.save(update_fields=['assigned_to', 'updated_at'])
        
        return Response(HandoffRequestSerializer(handoff).data)
