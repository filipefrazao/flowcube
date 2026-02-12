import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Page
        migrations.CreateModel(
            name='Page',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('slug', models.SlugField(max_length=255, unique=True)),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('published', 'Published'), ('archived', 'Archived')],
                    default='draft',
                    max_length=20,
                )),
                ('puck_data', models.JSONField(blank=True, default=dict)),
                ('html_cache', models.TextField(blank=True, default='')),
                ('css_cache', models.TextField(blank=True, default='')),
                ('meta_title', models.CharField(blank=True, max_length=255)),
                ('meta_description', models.TextField(blank=True)),
                ('og_image', models.URLField(blank=True)),
                ('favicon_url', models.URLField(blank=True)),
                ('custom_scripts', models.TextField(blank=True)),
                ('published_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pages',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'pagecube_page',
                'ordering': ['-updated_at'],
            },
        ),
        # 2. FormSchema
        migrations.CreateModel(
            name='FormSchema',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('schema', models.JSONField(default=dict)),
                ('ui_schema', models.JSONField(blank=True, default=dict)),
                ('conditional_logic', models.JSONField(blank=True, default=list)),
                ('success_message', models.TextField(default='Obrigado! Recebemos seu envio.')),
                ('redirect_url', models.URLField(blank=True)),
                ('distribution_mode', models.CharField(
                    choices=[
                        ('none', 'No Distribution'),
                        ('salescube', 'SalesCube CRM'),
                        ('webhook', 'External Webhook'),
                        ('whatsapp', 'WhatsApp Message'),
                    ],
                    default='none',
                    max_length=20,
                )),
                ('distribution_config', models.JSONField(blank=True, default=dict)),
                ('submissions_count', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('page', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='forms',
                    to='pagecube.page',
                )),
            ],
            options={
                'db_table': 'pagecube_form_schema',
                'ordering': ['-created_at'],
            },
        ),
        # 3. FormSubmission
        migrations.CreateModel(
            name='FormSubmission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('data', models.JSONField(default=dict)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('referrer', models.URLField(blank=True, max_length=500)),
                ('utm_source', models.CharField(blank=True, max_length=255)),
                ('utm_medium', models.CharField(blank=True, max_length=255)),
                ('utm_campaign', models.CharField(blank=True, max_length=255)),
                ('utm_content', models.CharField(blank=True, max_length=255)),
                ('fbclid', models.CharField(blank=True, max_length=255)),
                ('gclid', models.CharField(blank=True, max_length=255)),
                ('distributed', models.BooleanField(default=False)),
                ('distributed_at', models.DateTimeField(blank=True, null=True)),
                ('distribution_result', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('form', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='submissions',
                    to='pagecube.formschema',
                )),
            ],
            options={
                'db_table': 'pagecube_form_submission',
                'ordering': ['-created_at'],
            },
        ),
        # 4. CustomDomain
        migrations.CreateModel(
            name='CustomDomain',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('domain', models.CharField(max_length=255, unique=True)),
                ('ssl_status', models.CharField(
                    choices=[('pending', 'Pending'), ('active', 'Active'), ('failed', 'Failed')],
                    default='pending',
                    max_length=20,
                )),
                ('verified', models.BooleanField(default=False)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('dns_target', models.CharField(default='flowcube.frzgroup.com.br', max_length=255)),
                ('traefik_config_path', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('page', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='domain',
                    to='pagecube.page',
                )),
            ],
            options={
                'db_table': 'pagecube_custom_domain',
            },
        ),
        # 5. PageTemplate
        migrations.CreateModel(
            name='PageTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('thumbnail', models.URLField(blank=True)),
                ('puck_data', models.JSONField(default=dict)),
                ('category', models.CharField(
                    choices=[
                        ('landing_page', 'Landing Page'),
                        ('form', 'Form Page'),
                        ('webinar', 'Webinar'),
                        ('launch', 'Product Launch'),
                        ('lead_capture', 'Lead Capture'),
                        ('thank_you', 'Thank You'),
                    ],
                    default='landing_page',
                    max_length=50,
                )),
                ('is_public', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'pagecube_template',
                'ordering': ['name'],
            },
        ),
        # 6. PageAnalytics
        migrations.CreateModel(
            name='PageAnalytics',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('views', models.IntegerField(default=0)),
                ('unique_visitors', models.IntegerField(default=0)),
                ('form_submissions', models.IntegerField(default=0)),
                ('conversion_rate', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('avg_time_on_page', models.IntegerField(default=0)),
                ('bounce_rate', models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ('page', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='analytics',
                    to='pagecube.page',
                )),
            ],
            options={
                'db_table': 'pagecube_analytics',
                'ordering': ['-date'],
                'unique_together': {('page', 'date')},
            },
        ),
    ]
