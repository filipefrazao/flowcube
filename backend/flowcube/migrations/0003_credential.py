# Generated manually for Credential model

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('flowcube', '0002_userpreference'),
    ]

    operations = [
        migrations.CreateModel(
            name='Credential',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('credential_type', models.CharField(choices=[
                    ('evolution_api', 'Evolution API'),
                    ('salescube', 'SalesCube'),
                    ('openai', 'OpenAI'),
                    ('anthropic', 'Anthropic (Claude)'),
                    ('meta_ads', 'Meta Ads'),
                    ('google_sheets', 'Google Sheets'),
                    ('google_drive', 'Google Drive'),
                    ('notion', 'Notion'),
                    ('slack', 'Slack'),
                    ('discord', 'Discord'),
                    ('webhook', 'Webhook'),
                    ('smtp', 'SMTP Email'),
                    ('postgresql', 'PostgreSQL'),
                    ('mysql', 'MySQL'),
                    ('mongodb', 'MongoDB'),
                    ('redis', 'Redis'),
                    ('custom', 'Custom'),
                ], max_length=50)),
                ('description', models.TextField(blank=True)),
                ('encrypted_data', models.BinaryField()),
                ('base_url', models.URLField(blank=True, max_length=500)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('last_used_at', models.DateTimeField(blank=True, null=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='credentials', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-updated_at'],
                'unique_together': {('owner', 'name')},
            },
        ),
    ]
