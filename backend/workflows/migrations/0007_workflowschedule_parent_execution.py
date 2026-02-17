"""
Migration: Add WorkflowSchedule model and Execution.parent_execution FK
"""
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workflows", "0006_alter_block_block_type"),
    ]

    operations = [
        # Add parent_execution FK to Execution
        migrations.AddField(
            model_name="execution",
            name="parent_execution",
            field=models.ForeignKey(
                blank=True,
                help_text="Parent execution for sub-workflows",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="child_executions",
                to="workflows.execution",
            ),
        ),
        # Create WorkflowSchedule model
        migrations.CreateModel(
            name="WorkflowSchedule",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "schedule_type",
                    models.CharField(
                        choices=[
                            ("immediately", "Immediately"),
                            ("interval", "Every X minutes"),
                            ("cron", "Cron Expression"),
                            ("daily", "Daily at time"),
                            ("weekly", "Weekly on day"),
                            ("monthly", "Monthly on date"),
                            ("once", "Once at datetime"),
                            ("on_demand", "On Demand"),
                            ("event", "On Event"),
                        ],
                        default="on_demand",
                        max_length=20,
                    ),
                ),
                ("is_active", models.BooleanField(default=False)),
                ("interval_minutes", models.PositiveIntegerField(default=60)),
                (
                    "cron_expression",
                    models.CharField(blank=True, default="", max_length=100),
                ),
                ("time_of_day", models.TimeField(blank=True, null=True)),
                (
                    "day_of_week",
                    models.PositiveSmallIntegerField(
                        blank=True, help_text="0=Mon, 6=Sun", null=True
                    ),
                ),
                (
                    "day_of_month",
                    models.PositiveSmallIntegerField(blank=True, null=True),
                ),
                ("run_at", models.DateTimeField(blank=True, null=True)),
                (
                    "celery_task_name",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                ("last_run", models.DateTimeField(blank=True, null=True)),
                ("next_run", models.DateTimeField(blank=True, null=True)),
                ("run_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "workflow",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="schedule",
                        to="workflows.workflow",
                    ),
                ),
            ],
            options={
                "verbose_name": "Workflow Schedule",
                "verbose_name_plural": "Workflow Schedules",
            },
        ),
    ]
