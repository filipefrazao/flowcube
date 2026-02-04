from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TemplateCategory, Template, TemplatePurchase, TemplateReview, TemplateVersion, TemplateDownload

User = get_user_model()

class CreatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']

class TemplateCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateCategory
        fields = '__all__'

class TemplateListSerializer(serializers.ModelSerializer):
    creator = CreatorSerializer(read_only=True)
    class Meta:
        model = Template
        fields = ['id', 'name', 'slug', 'description', 'creator', 'category', 'preview_image', 'pricing_type', 'price', 'is_featured', 'downloads_count', 'rating_avg', 'rating_count', 'created_at']

class TemplateDetailSerializer(serializers.ModelSerializer):
    creator = CreatorSerializer(read_only=True)
    class Meta:
        model = Template
        fields = '__all__'

class TemplatePurchaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplatePurchase
        fields = '__all__'

class TemplateReviewSerializer(serializers.ModelSerializer):
    user = CreatorSerializer(read_only=True)
    class Meta:
        model = TemplateReview
        fields = '__all__'

class TemplateVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateVersion
        fields = '__all__'

class TemplateDownloadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateDownload
        fields = '__all__'
