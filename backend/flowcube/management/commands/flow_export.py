
# flowcube/management/commands/cleanup_sessions.py

import logging
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from flowcube.models import Session

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Clean up old sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to retain sessions'
        )

    def handle(self, *args, **options):
        retention_days = options['days']
        cutoff_date = timezone.now() - timedelta(days=retention_days)
        
        sessions = Session.objects.filter(created_at__lt=cutoff_date)
        count = sessions.count()
        
        if count > 0:
            sessions.delete()
            logger.info(f'Deleted {count} old sessions')
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} old sessions'))
        else:
            self.stdout.write('No old sessions found to delete')

# flowcube/management/commands/flow_export.py

import json
from django.core.management.base import BaseCommand
from django.core.serializers import serialize
from flowcube.models import Flow

class Command(BaseCommand):
    help = 'Export a flow as JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            'flow_id',
            type=str,
            help='UUID of the flow to export'
        )

    def handle(self, *args, **options):
        flow_id = options['flow_id']
        
        try:
            flow = Flow.objects.get(uuid=flow_id)
        except Flow.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Flow with UUID {flow_id} does not exist'))
            return

        data = {
            'flow': serialize([flow], format='json')[0],
            'steps': serialize(flow.steps.all(), format='json'),
            'actions': serialize(flow.actions.all(), format='json')
        }

        filename = f'flow_{flow.uuid}.json'
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)

        self.stdout.write(self.style.SUCCESS(f'Successfully exported flow to {filename}'))

# flowcube/management/commands/flow_import.py

import json
from django.core.management.base import BaseCommand
from django.core.serializers import deserialize
from flowcube.models import Flow, Step, Action

class Command(BaseCommand):
    help = 'Import a flow from JSON'

    def add_arguments(self, parser):
        parser.add_argument(
            'filename',
            type=str,
            help='Path to the JSON file to import'
        )

    def handle(self, *args, **options):
        filename = options['filename']
        
        try:
            with open(filename, 'r') as f:
                data = json.load(f)
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'File {filename} not found'))
            return

        try:
            flow_data = deserialize(data['flow'], ignorenonexistent=True)[0]
            flow_obj = Flow.objects.create(
                uuid=flow_data.object_uuid,
                name=flow_data.object_name,
                data=flow_data.object_data
            )
            
            for step_data in deserialize(data['steps']):
                Step.objects.create(flow=flow_obj, **step_data.fields)
                
            for action_data in deserialize(data['actions']):
                Action.objects.create(flow=flow_obj, **action_data.fields)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error importing flow: {str(e)}'))
            return

        self.stdout.write(self.style.SUCCESS('Successfully imported flow'))
