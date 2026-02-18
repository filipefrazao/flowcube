"""
Initial migration for chatcube app.

IMPORTANT: If the chatcube tables already exist (created via syncdb / --run-syncdb),
run the following before applying further migrations:

    python manage.py migrate chatcube 0001 --fake

This marks the initial state as applied without touching the existing tables.
Then run:

    python manage.py migrate chatcube

to apply migration 0002 onwards (GroupNote, GroupTask, Group.assigned_to).
"""
import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WhatsAppInstance",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("phone_number", models.CharField(blank=True, max_length=20)),
                ("engine", models.CharField(
                    choices=[("baileys", "Baileys (Unofficial)"), ("cloud_api", "Cloud API (Official)")],
                    default="baileys", max_length=20,
                )),
                ("status", models.CharField(
                    choices=[
                        ("connected", "Connected"), ("connecting", "Connecting"),
                        ("disconnected", "Disconnected"), ("banned", "Banned"), ("timeout", "Timeout"),
                    ],
                    default="disconnected", max_length=20,
                )),
                ("quality_rating", models.CharField(blank=True, max_length=10, null=True)),
                ("profile_picture", models.URLField(blank=True, null=True)),
                ("phone_number_id", models.CharField(blank=True, max_length=50, null=True)),
                ("waba_id", models.CharField(blank=True, max_length=50, null=True)),
                ("access_token", models.TextField(blank=True, null=True)),
                ("webhook_url", models.URLField(blank=True, null=True)),
                ("webhook_secret", models.CharField(blank=True, max_length=64, null=True)),
                ("webhook_events", models.JSONField(default=list)),
                ("is_warmed_up", models.BooleanField(default=False)),
                ("messages_sent_today", models.IntegerField(default=0)),
                ("daily_limit", models.IntegerField(default=200)),
                ("warmup_day", models.IntegerField(default=0)),
                ("engine_instance_id", models.CharField(blank=True, max_length=100, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("last_connected_at", models.DateTimeField(blank=True, null=True)),
                ("owner", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="whatsapp_instances",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "WhatsApp Instance", "verbose_name_plural": "WhatsApp Instances"},
        ),
        migrations.CreateModel(
            name="Message",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("remote_jid", models.CharField(max_length=255)),
                ("from_me", models.BooleanField(default=False)),
                ("message_type", models.CharField(
                    choices=[
                        ("text", "Text"), ("image", "Image"), ("video", "Video"), ("audio", "Audio"),
                        ("document", "Document"), ("sticker", "Sticker"), ("location", "Location"),
                        ("reaction", "Reaction"),
                    ],
                    default="text", max_length=20,
                )),
                ("content", models.TextField(blank=True, default="")),
                ("media_url", models.URLField(blank=True, null=True)),
                ("wa_message_id", models.CharField(blank=True, max_length=255, null=True)),
                ("status", models.CharField(
                    choices=[
                        ("pending", "Pending"), ("sent", "Sent"), ("delivered", "Delivered"),
                        ("read", "Read"), ("failed", "Failed"),
                    ],
                    default="pending", max_length=20,
                )),
                ("timestamp", models.DateTimeField(default=django.utils.timezone.now)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("instance", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="messages",
                    to="chatcube.whatsappinstance",
                )),
            ],
            options={"ordering": ["-timestamp"]},
        ),
        migrations.AddIndex(
            model_name="message",
            index=models.Index(fields=["instance", "-timestamp"], name="chatcube_me_instanc_idx"),
        ),
        migrations.AddIndex(
            model_name="message",
            index=models.Index(fields=["remote_jid", "-timestamp"], name="chatcube_me_remote__idx"),
        ),
        migrations.CreateModel(
            name="Contact",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("jid", models.CharField(max_length=255)),
                ("name", models.CharField(blank=True, default="", max_length=255)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                ("profile_picture", models.URLField(blank=True, null=True)),
                ("is_business", models.BooleanField(default=False)),
                ("last_message_at", models.DateTimeField(blank=True, null=True)),
                ("instance", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="contacts",
                    to="chatcube.whatsappinstance",
                )),
            ],
            options={"ordering": ["jid"]},
        ),
        migrations.AddConstraint(
            model_name="contact",
            constraint=models.UniqueConstraint(fields=["instance", "jid"], name="uniq_contact_instance_jid"),
        ),
        migrations.CreateModel(
            name="Group",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("jid", models.CharField(max_length=255)),
                ("name", models.CharField(blank=True, default="", max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("participants_count", models.IntegerField(default=0)),
                ("is_admin", models.BooleanField(default=False)),
                ("instance", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="groups",
                    to="chatcube.whatsappinstance",
                )),
            ],
            options={"ordering": ["jid"]},
        ),
        migrations.AddConstraint(
            model_name="group",
            constraint=models.UniqueConstraint(fields=["instance", "jid"], name="uniq_group_instance_jid"),
        ),
        migrations.CreateModel(
            name="MessageTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("content", models.TextField()),
                ("variables", models.JSONField(blank=True, default=list)),
                ("message_type", models.CharField(
                    choices=[
                        ("text", "Text"), ("image", "Image"), ("video", "Video"), ("audio", "Audio"),
                        ("document", "Document"), ("sticker", "Sticker"), ("location", "Location"),
                        ("reaction", "Reaction"),
                    ],
                    default="text", max_length=20,
                )),
                ("media_url", models.URLField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="message_templates",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Campaign",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=150)),
                ("recipients", models.JSONField(blank=True, default=list)),
                ("status", models.CharField(
                    choices=[
                        ("draft", "Draft"), ("scheduled", "Scheduled"), ("running", "Running"),
                        ("paused", "Paused"), ("completed", "Completed"), ("failed", "Failed"),
                    ],
                    default="draft", max_length=20,
                )),
                ("sent_count", models.IntegerField(default=0)),
                ("delivered_count", models.IntegerField(default=0)),
                ("read_count", models.IntegerField(default=0)),
                ("failed_count", models.IntegerField(default=0)),
                ("scheduled_at", models.DateTimeField(blank=True, null=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("delay_between_messages_ms", models.PositiveIntegerField(default=3000)),
                ("batch_size", models.PositiveIntegerField(default=50)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("instance", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="campaigns",
                    to="chatcube.whatsappinstance",
                )),
                ("owner", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="campaigns",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("template", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="campaigns",
                    to="chatcube.messagetemplate",
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
