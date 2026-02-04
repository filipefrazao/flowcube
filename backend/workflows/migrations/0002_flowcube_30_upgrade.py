# FlowCube 3.0 Upgrade Migration
# Adds graph JSONField, WorkflowVersion, Execution, NodeExecutionLog, NodeAnalytics
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('workflows', '0001_initial'),
    ]

    operations = [
        # Add new fields to Workflow
        migrations.AddField(
            model_name='workflow',
            name='graph',
            field=models.JSONField(blank=True, default=dict, help_text='React Flow graph: {nodes, edges, viewport}'),
        ),
        migrations.AddField(
            model_name='workflow',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='workflow',
            name='folder',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='workflow',
            name='tags',
            field=models.JSONField(blank=True, default=list),
        ),
        
        # Add new fields to Group
        migrations.AddField(
            model_name='group',
            name='width',
            field=models.FloatField(default=400),
        ),
        migrations.AddField(
            model_name='group',
            name='height',
            field=models.FloatField(default=300),
        ),
        migrations.AddField(
            model_name='group',
            name='color',
            field=models.CharField(default='#6B7280', max_length=20),
        ),
        
        # Create WorkflowVersion model
        migrations.CreateModel(
            name='WorkflowVersion',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('graph', models.JSONField(default=dict)),
                ('version_number', models.PositiveIntegerField(default=1)),
                ('tag', models.CharField(blank=True, default='', help_text="e.g., 'published', 'draft-v1'", max_length=50)),
                ('notes', models.TextField(blank=True, help_text='Release notes for this version')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='workflows.workflow')),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('workflow', 'version_number')},
            },
        ),
        
        # Create Execution model
        migrations.CreateModel(
            name='Execution',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('running', 'Running'), ('completed', 'Completed'), ('failed', 'Failed'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('trigger_data', models.JSONField(blank=True, null=True)),
                ('result_data', models.JSONField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('triggered_by', models.CharField(default='manual', help_text='manual, webhook, schedule, api', max_length=100)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='executions', to='workflows.workflow')),
                ('version', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='executions', to='workflows.workflowversion')),
            ],
            options={
                'ordering': ['-started_at'],
            },
        ),
        
        # Create NodeExecutionLog model
        migrations.CreateModel(
            name='NodeExecutionLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('node_id', models.CharField(max_length=100)),
                ('node_type', models.CharField(max_length=50)),
                ('node_label', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[('success', 'Success'), ('error', 'Error'), ('skipped', 'Skipped'), ('waiting', 'Waiting')], default='success', max_length=20)),
                ('input_data', models.JSONField(blank=True, null=True)),
                ('output_data', models.JSONField(blank=True, null=True)),
                ('error_details', models.TextField(blank=True)),
                ('duration_ms', models.PositiveIntegerField(default=0)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('execution', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='node_logs', to='workflows.execution')),
            ],
            options={
                'ordering': ['started_at'],
            },
        ),
        
        # Create NodeAnalytics model
        migrations.CreateModel(
            name='NodeAnalytics',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('node_id', models.CharField(max_length=100)),
                ('views', models.PositiveIntegerField(default=0, help_text='Total entries to this node')),
                ('conversions', models.PositiveIntegerField(default=0, help_text='Successful exits to next node')),
                ('drop_offs', models.PositiveIntegerField(default=0, help_text='Exits without conversion')),
                ('revenue', models.DecimalField(decimal_places=2, default=0, help_text='Revenue attributed', max_digits=12)),
                ('avg_time_on_node_ms', models.PositiveIntegerField(default=0)),
                ('period_start', models.DateField()),
                ('period_end', models.DateField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='node_analytics', to='workflows.workflow')),
            ],
            options={
                'ordering': ['-period_start'],
                'unique_together': {('workflow', 'node_id', 'period_start', 'period_end')},
            },
        ),
    ]
