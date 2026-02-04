from django.urls import path
from . import views

app_name = 'ai'

urlpatterns = [
    path('generate-node/', views.generate_node, name='generate_node'),
    path('generate-node-stream/', views.generate_node_stream, name='generate_node_stream'),
    path('debug/', views.debug_workflow, name='debug_workflow'),
    path('apply-fix/', views.apply_quick_fix, name='apply_quick_fix'),
    path('health/', views.analyze_workflow_health, name='analyze_workflow_health'),
]
