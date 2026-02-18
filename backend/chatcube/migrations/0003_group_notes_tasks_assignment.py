"""
0002 - Group enhancements: notes, tasks, assigned_to field.

Adds:
  - Group.assigned_to (FK to User, nullable)
  - GroupNote model
  - GroupTask model
"""
import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chatcube", "0002_whatsappinstance_evolution_instance_name"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add assigned_to to Group
        migrations.AddField(
            model_name="group",
            name="assigned_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_groups",
                to=settings.AUTH_USER_MODEL,
            ),
        ),

        # GroupNote
        migrations.CreateModel(
            name="GroupNote",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField()),
                ("note_type", models.CharField(
                    choices=[
                        ("note", "Nota"), ("call", "Ligação"), ("email", "E-mail"),
                        ("meeting", "Reunião"), ("task", "Tarefa"),
                    ],
                    default="note",
                    max_length=20,
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("group", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="notes",
                    to="chatcube.group",
                )),
                ("user", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="group_notes",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),

        # GroupTask
        migrations.CreateModel(
            name="GroupTask",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("is_completed", models.BooleanField(default=False)),
                ("priority", models.CharField(
                    choices=[("low", "Baixa"), ("medium", "Média"), ("high", "Alta")],
                    default="medium",
                    max_length=10,
                )),
                ("due_date", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("group", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="tasks",
                    to="chatcube.group",
                )),
                ("created_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="group_tasks",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["is_completed", "-created_at"]},
        ),
    ]
