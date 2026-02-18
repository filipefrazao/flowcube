"""
0004 - Remove warm-up limits: set daily_limit=999999, is_warmed_up=True,
       warmup_day=30 for all existing instances and update model defaults.
"""
from django.db import migrations, models


def set_unlimited(apps, schema_editor):
    WhatsAppInstance = apps.get_model("chatcube", "WhatsAppInstance")
    WhatsAppInstance.objects.all().update(
        daily_limit=999999,
        is_warmed_up=True,
        warmup_day=30,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("chatcube", "0003_group_notes_tasks_assignment"),
    ]

    operations = [
        # Update defaults on the model fields
        migrations.AlterField(
            model_name="whatsappinstance",
            name="daily_limit",
            field=models.IntegerField(default=999999),
        ),
        migrations.AlterField(
            model_name="whatsappinstance",
            name="is_warmed_up",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="whatsappinstance",
            name="warmup_day",
            field=models.IntegerField(default=30),
        ),
        # Update all existing rows
        migrations.RunPython(set_unlimited, migrations.RunPython.noop),
    ]
