# Generated manually for UserPreference fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flowcube', '0003_credential'),
    ]

    operations = [
        migrations.AddField(
            model_name='userpreference',
            name='show_minimap',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='show_node_stats',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='email_notifications',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='execution_failure_alerts',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='weekly_digest',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='auto_save',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='auto_save_interval_seconds',
            field=models.PositiveIntegerField(default=30),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='snap_to_grid',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='userpreference',
            name='grid_size',
            field=models.PositiveIntegerField(default=20),
        ),
        migrations.AlterField(
            model_name='userpreference',
            name='theme',
            field=models.CharField(
                choices=[('dark', 'Dark'), ('light', 'Light'), ('system', 'System')],
                default='dark',
                max_length=50,
            ),
        ),
    ]
