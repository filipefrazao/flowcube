from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/flow_execution/(?P<flow_id>\w+)/$', consumers.FlowExecutionConsumer.as_asgi()),
]
