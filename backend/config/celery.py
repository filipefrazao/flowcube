"""
Celery Configuration for FRZ Platform
Unified from flowcube_project/celery.py — now uses config.settings
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('flowcube')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()
# Explicitly include plugin apps that may not be found by autodiscovery
app.autodiscover_tasks([
    'funnelcube', 'socialcube', 'pagecube', 'telephony',
    'chatcube', 'salescube', 'minicube',
])


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
