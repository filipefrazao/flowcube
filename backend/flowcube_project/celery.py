"""
Celery Configuration for FlowCube
flowcube_project/celery.py
"""
import os
from celery import Celery

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'flowcube_project.settings')

app = Celery('flowcube')

# Load config from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()
# Explicitly include plugin apps that may not be found by autodiscovery
app.autodiscover_tasks(['funnelcube', 'socialcube', 'pagecube'])

# Celery configuration
app.conf.update(
    # Broker (Redis)
    broker_url=os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1'),

    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    # Time
    timezone='America/Sao_Paulo',
    enable_utc=True,

    # Task execution
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Retry
    task_default_retry_delay=60,
    task_max_retries=3,

    # Rate limiting
    task_default_rate_limit='100/m',

    # Task routing
    task_routes={
        # FlowCube core tasks
        'flowcube.tasks.process_webhook_async': {'queue': 'webhooks'},
        'flowcube.tasks.execute_http_request': {'queue': 'http'},
        'flowcube.tasks.execute_ai_completion': {'queue': 'ai'},
        'flowcube.tasks.send_whatsapp_message': {'queue': 'whatsapp'},
        'flowcube.tasks.execute_workflow_node': {'queue': 'workflows'},
        'workflows.tasks.execute_workflow_task': {'queue': 'workflows'},
        # Telegram integration tasks
        'telegram_integration.tasks.verify_telegram_bot': {'queue': 'telegram'},
        'telegram_integration.tasks.setup_telegram_webhook': {'queue': 'telegram'},
        'telegram_integration.tasks.send_telegram_message_async': {'queue': 'telegram'},
        'telegram_integration.tasks.send_telegram_photo_async': {'queue': 'telegram'},
        'telegram_integration.tasks.send_telegram_document_async': {'queue': 'telegram'},
        'telegram_integration.tasks.process_telegram_update': {'queue': 'telegram'},
        'telegram_integration.tasks.send_bulk_telegram_messages': {'queue': 'telegram'},
        'telegram_integration.tasks.cleanup_old_webhook_logs': {'queue': 'telegram'},
        # FunnelCube analytics tasks
        'funnelcube.tasks.flush_event_buffer': {'queue': 'analytics'},
        'funnelcube.tasks.rotate_daily_salt': {'queue': 'analytics'},
        'funnelcube.tasks.generate_insights': {'queue': 'analytics'},
        # SocialCube tasks
        'socialcube.publish_post': {'queue': 'social'},
        'socialcube.publish_scheduled': {'queue': 'social'},
        'socialcube.pull_account_analytics': {'queue': 'social'},
        'socialcube.pull_all_analytics': {'queue': 'social'},
        'socialcube.process_leadgen_event': {'queue': 'social'},
        'socialcube.distribute_lead': {'queue': 'social'},
        'socialcube.poll_leads_fallback': {'queue': 'social'},
        'socialcube.refresh_tokens': {'queue': 'social'},
        'socialcube.track_single_competitor': {'queue': 'social'},
        # PageCube tasks
        'pagecube.tasks.render_page': {'queue': 'pages'},
        'pagecube.tasks.distribute_submission': {'queue': 'pages'},
        'pagecube.tasks.verify_domain': {'queue': 'pages'},
    },

    # Queues
    task_queues={
        'default': {'routing_key': 'default'},
        'webhooks': {'routing_key': 'webhooks'},
        'http': {'routing_key': 'http'},
        'ai': {'routing_key': 'ai'},
        'whatsapp': {'routing_key': 'whatsapp'},
        'workflows': {'routing_key': 'workflows'},
        'telegram': {'routing_key': 'telegram'},
        'analytics': {'routing_key': 'analytics'},
        'social': {'routing_key': 'social'},
        'pages': {'routing_key': 'pages'},
    },

    # Beat scheduler (for periodic tasks)
    beat_scheduler='django_celery_beat.schedulers:DatabaseScheduler',
)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
