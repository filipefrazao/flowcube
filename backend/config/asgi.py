"""
ASGI config for FRZ Platform.
Supports both HTTP and WebSocket protocols via Django Channels.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

# Import WebSocket routing from apps
from flowcube.routing import websocket_urlpatterns as flowcube_ws

# Combine all WebSocket URL patterns
all_websocket_urlpatterns = flowcube_ws

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AuthMiddlewareStack(
        URLRouter(all_websocket_urlpatterns)
    ),
})
