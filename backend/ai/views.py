from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .node_builder import AINodeBuilder
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_node_stream(request):
    """Stream node generation with Server-Sent Events"""
    description = request.data.get('description')
    context = request.data.get('context', {})
    
    if not description:
        return Response(
            {'error': 'Description is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    builder = AINodeBuilder()
    
    def event_stream():
        try:
            for chunk in builder.stream_generate_node(description, context):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    response = StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_node(request):
    """Generate a node configuration from natural language description"""
    description = request.data.get('description')
    context = request.data.get('context', {})
    
    if not description:
        return Response(
            {'error': 'Description is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        builder = AINodeBuilder()
        result = builder.generate_node(description, context)
        
        # Try to parse as JSON to validate
        node_config = json.loads(result)
        
        return Response({
            'success': True,
            'node': node_config
        })
    except json.JSONDecodeError as e:
        return Response(
            {'error': 'Failed to parse AI response', 'details': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
