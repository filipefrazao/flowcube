from django.urls import path
from . import views

app_name = 'ai'

urlpatterns = [
    path('generate-node/', views.generate_node, name='generate_node'),
    path('generate-node-stream/', views.generate_node_stream, name='generate_node_stream'),
]
