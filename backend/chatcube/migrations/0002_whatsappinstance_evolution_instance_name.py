from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chatcube", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="whatsappinstance",
            name="evolution_instance_name",
            field=models.CharField(
                blank=True,
                help_text="Nome da instância na Evolution API para sync de histórico",
                max_length=100,
                null=True,
            ),
        ),
    ]
