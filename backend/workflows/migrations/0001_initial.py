# Generated migration - FlowCube 3.0 initial
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Workflow',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('is_published', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workflows', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-updated_at'],
            },
        ),
        migrations.CreateModel(
            name='Group',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(default='New Group', max_length=255)),
                ('position_x', models.FloatField(default=0)),
                ('position_y', models.FloatField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='groups', to='workflows.workflow')),
            ],
        ),
        migrations.CreateModel(
            name='Block',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('block_type', models.CharField(max_length=50)),
                ('content', models.JSONField(default=dict)),
                ('position_x', models.FloatField(default=0)),
                ('position_y', models.FloatField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('group', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='blocks', to='workflows.group')),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='blocks', to='workflows.workflow')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='Variable',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('value', models.JSONField(default=dict)),
                ('is_system', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variables', to='workflows.workflow')),
            ],
            options={
                'unique_together': {('workflow', 'name')},
            },
        ),
        migrations.CreateModel(
            name='Edge',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('source_handle', models.CharField(default='default', max_length=50)),
                ('target_handle', models.CharField(default='default', max_length=50)),
                ('condition', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('source_block', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='outgoing_edges', to='workflows.block')),
                ('target_block', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='incoming_edges', to='workflows.block')),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='edges', to='workflows.workflow')),
            ],
            options={
                'unique_together': {('source_block', 'target_block', 'source_handle', 'target_handle')},
            },
        ),
    ]
