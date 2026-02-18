import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pagecube', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='formschema',
            name='webhook_token',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
        migrations.AddField(
            model_name='formschema',
            name='google_sheets_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='formschema',
            name='google_sheets_synced_count',
            field=models.IntegerField(default=0),
        ),
    ]
