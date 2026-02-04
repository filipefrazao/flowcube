
# flowcube/urls.py
from django.urls import path
from rest_framework import views as rest_views
from .views import WorkflowView, TriggerView

urlpatterns = [
    path('workflows/', WorkflowView.as_view(), name='workflows'),
    path('triggers/', TriggerView.as_view(), name='triggers'),
]

# flowcube/routing.py
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from .consumers import WorkflowConsumer, TriggerConsumer

websocket_urlpatterns = [
    path('ws/workflows/', WorkflowConsumer.as_asgi()),
    path('ws/triggers/', TriggerConsumer.as_asgi()),
]

routing = ProtocolTypeRouter({
    'websocket': URLRouter(websocket_urlpatterns),
})
