from rest_framework import serializers
from .models import Page, FormSchema, FormSubmission, CustomDomain, PageTemplate, PageAnalytics


class PageListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for page listings"""
    forms_count = serializers.IntegerField(read_only=True, default=0)
    total_submissions = serializers.IntegerField(read_only=True, default=0)
    domain_name = serializers.CharField(source='domain.domain', read_only=True, default=None)

    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'status', 'meta_title', 'og_image',
                  'published_at', 'created_at', 'updated_at', 'forms_count',
                  'total_submissions', 'domain_name']


class PageDetailSerializer(serializers.ModelSerializer):
    """Full serializer including puck_data for the editor"""
    forms = serializers.SerializerMethodField()
    domain = serializers.SerializerMethodField()

    class Meta:
        model = Page
        fields = ['id', 'title', 'slug', 'status', 'puck_data', 'html_cache', 'css_cache',
                  'meta_title', 'meta_description', 'og_image', 'favicon_url', 'custom_scripts',
                  'published_at', 'created_at', 'updated_at', 'forms', 'domain']
        read_only_fields = ['html_cache', 'css_cache', 'published_at']

    def get_forms(self, obj):
        return FormSchemaSerializer(obj.forms.all(), many=True).data

    def get_domain(self, obj):
        try:
            return CustomDomainSerializer(obj.domain).data
        except CustomDomain.DoesNotExist:
            return None


class FormSchemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormSchema
        fields = '__all__'
        read_only_fields = ['submissions_count', 'webhook_token', 'google_sheets_synced_count', 'created_at', 'updated_at']


class FormSubmissionSerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(source='form.name', read_only=True)
    page_title = serializers.CharField(source='form.page.title', read_only=True)

    class Meta:
        model = FormSubmission
        fields = '__all__'
        read_only_fields = ['created_at']


class PublicSubmissionSerializer(serializers.Serializer):
    """For public form submissions - validates only the form_id and data"""
    form_id = serializers.IntegerField()
    data = serializers.JSONField()

    def validate_data(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Data must be a JSON object")
        if len(str(value)) > 50000:  # 50KB limit
            raise serializers.ValidationError("Submission data too large")
        return value


class CustomDomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomDomain
        fields = '__all__'
        read_only_fields = ['ssl_status', 'verified', 'verified_at', 'traefik_config_path', 'created_at', 'updated_at']


class PageTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageTemplate
        fields = '__all__'


class PageAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageAnalytics
        fields = '__all__'
