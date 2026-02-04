# Generated manually for whatsapp app

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('workflows', '0002_flowcube_30_upgrade'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='WhatsAppFlow',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('phone_number_id', models.CharField(max_length=255)),
                ('flow_data', models.JSONField(default=dict)),
                ('is_active', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='whatsapp_flows', to='workflows.workflow')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='WhatsAppTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, unique=True)),
                ('category', models.CharField(choices=[('marketing', 'Marketing'), ('utility', 'Utility'), ('authentication', 'Authentication')], max_length=50)),
                ('language', models.CharField(default='pt_BR', max_length=10)),
                ('header', models.JSONField(blank=True, null=True)),
                ('body', models.TextField()),
                ('footer', models.TextField(blank=True)),
                ('buttons', models.JSONField(default=list)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='draft', max_length=20)),
                ('template_id', models.CharField(blank=True, max_length=255)),
                ('rejection_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='WhatsAppInteraction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_phone', models.CharField(max_length=20)),
                ('user_name', models.CharField(blank=True, max_length=255)),
                ('message_type', models.CharField(choices=[('text', 'Text'), ('image', 'Image'), ('video', 'Video'), ('audio', 'Audio'), ('document', 'Document'), ('interactive', 'Interactive'), ('template', 'Template')], max_length=20)),
                ('message_data', models.JSONField()),
                ('response', models.JSONField(blank=True, null=True)),
                ('current_node', models.CharField(blank=True, max_length=255)),
                ('flow_state', models.JSONField(default=dict)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('flow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interactions', to='whatsapp.whatsappflow')),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.CreateModel(
            name='WhatsAppConversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_phone', models.CharField(max_length=20)),
                ('user_name', models.CharField(blank=True, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('current_node', models.CharField(blank=True, max_length=255)),
                ('session_data', models.JSONField(default=dict)),
                ('messages_sent', models.IntegerField(default=0)),
                ('messages_received', models.IntegerField(default=0)),
                ('completed', models.BooleanField(default=False)),
                ('started_at', models.DateTimeField(auto_now_add=True)),
                ('last_interaction', models.DateTimeField(auto_now=True)),
                ('flow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversations', to='whatsapp.whatsappflow')),
            ],
            options={
                'ordering': ['-last_interaction'],
            },
        ),
        migrations.CreateModel(
            name='WhatsAppAnalytics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('messages_sent', models.IntegerField(default=0)),
                ('messages_received', models.IntegerField(default=0)),
                ('template_messages', models.IntegerField(default=0)),
                ('conversations_started', models.IntegerField(default=0)),
                ('conversations_completed', models.IntegerField(default=0)),
                ('unique_users', models.IntegerField(default=0)),
                ('avg_messages_per_conversation', models.FloatField(default=0.0)),
                ('completion_rate', models.FloatField(default=0.0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('flow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='analytics', to='whatsapp.whatsappflow')),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
        migrations.AddConstraint(
            model_name='whatsappconversation',
            constraint=models.UniqueConstraint(fields=('flow', 'user_phone'), name='whatsapp_whatsappconversation_flow_id_user_phone_uniq'),
        ),
        migrations.AddConstraint(
            model_name='whatsappanalytics',
            constraint=models.UniqueConstraint(fields=('flow', 'date'), name='whatsapp_whatsappanalytics_flow_id_date_uniq'),
        ),
    ]
