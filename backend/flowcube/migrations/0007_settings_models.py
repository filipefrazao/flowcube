import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("flowcube", "0006_flowexecutionlog"),
    ]

    operations = [
        # Remove Flow/FlowSession from Django state (tables already gone from DB)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(name="FlowSession"),
                migrations.DeleteModel(name="Flow"),
            ],
            database_operations=[],
        ),
        # Add new credential_type choices to existing Credential model
        migrations.AlterField(
            model_name="credential",
            name="credential_type",
            field=models.CharField(
                choices=[
                    ("evolution_api", "Evolution API"), ("salescube", "SalesCube"),
                    ("openai", "OpenAI"), ("anthropic", "Anthropic (Claude)"),
                    ("meta_ads", "Meta Ads"), ("google_sheets", "Google Sheets"),
                    ("google_drive", "Google Drive"), ("notion", "Notion"),
                    ("slack", "Slack"), ("discord", "Discord"),
                    ("webhook", "Webhook"), ("smtp", "SMTP Email"),
                    ("postgresql", "PostgreSQL"), ("mysql", "MySQL"),
                    ("mongodb", "MongoDB"), ("redis", "Redis"),
                    ("custom", "Custom"), ("groq", "Groq"),
                    ("deepseek", "DeepSeek"), ("grok", "Grok (X.AI)"),
                    ("google_ai", "Google AI (Gemini)"), ("n8n", "N8N"),
                    ("whatsapp_cloud", "WhatsApp Cloud API"),
                    ("meta_lead_ads", "Meta Lead Ads"),
                    ("supabase", "Supabase"), ("make", "Make (Integromat)"),
                    ("google_ads", "Google Ads"), ("openrouter", "OpenRouter"),
                    ("elevenlabs", "ElevenLabs"), ("mistral", "Mistral"),
                ],
                max_length=50,
            ),
        ),
        # New settings models
        migrations.CreateModel(
            name="Tag",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50)),
                ("slug", models.SlugField(unique=True)),
                ("color", models.CharField(default="#6366f1", max_length=7)),
                ("entity_type", models.CharField(choices=[("lead", "Lead"), ("contact", "Contact"), ("product", "Product"), ("general", "General")], default="general", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="BusinessUnit",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=150)),
                ("address", models.CharField(blank=True, default="", max_length=300)),
                ("city", models.CharField(blank=True, default="", max_length=100)),
                ("state", models.CharField(blank=True, default="", max_length=2)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("manager", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="managed_units", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Squad",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("leader", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="led_squads", to=settings.AUTH_USER_MODEL)),
                ("members", models.ManyToManyField(blank=True, related_name="squads", to=settings.AUTH_USER_MODEL)),
                ("unit", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="squads", to="flowcube.businessunit")),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="UserGroup",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("users", models.ManyToManyField(blank=True, related_name="custom_groups", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["name"]},
        ),
    ]
