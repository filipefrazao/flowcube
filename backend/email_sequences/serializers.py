"""
Email Sequences Serializers
email_sequences/serializers.py

DRF serializers for all email sequence models.
Created: 2026-02-02
"""
from rest_framework import serializers
from django.utils import timezone

from .models import (
    EmailProvider,
    EmailTemplate,
    EmailSequence,
    EmailStep,
    EmailRecipient,
    SequenceEnrollment,
    EmailSend,
    EmailEvent,
)


class EmailProviderSerializer(serializers.ModelSerializer):
    """Serializer for EmailProvider model."""
    
    provider_type_display = serializers.CharField(
        source="get_provider_type_display",
        read_only=True
    )
    can_send = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailProvider
        fields = [
            "id",
            "name",
            "provider_type",
            "provider_type_display",
            "smtp_host",
            "smtp_port",
            "smtp_username",
            "smtp_password",
            "smtp_use_tls",
            "smtp_use_ssl",
            "api_key",
            "api_secret",
            "api_region",
            "api_endpoint",
            "default_from_email",
            "default_from_name",
            "default_reply_to",
            "rate_limit_per_hour",
            "rate_limit_per_day",
            "webhook_url",
            "webhook_secret",
            "is_active",
            "is_verified",
            "last_verified_at",
            "last_error",
            "last_error_at",
            "emails_sent_today",
            "emails_sent_total",
            "last_sent_at",
            "can_send",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_verified",
            "last_verified_at",
            "last_error",
            "last_error_at",
            "emails_sent_today",
            "emails_sent_total",
            "last_sent_at",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "smtp_password": {"write_only": True},
            "api_key": {"write_only": True},
            "api_secret": {"write_only": True},
            "webhook_secret": {"write_only": True},
        }
    
    def get_can_send(self, obj) -> bool:
        return obj.can_send()
    
    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class EmailProviderListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing providers."""
    
    provider_type_display = serializers.CharField(
        source="get_provider_type_display",
        read_only=True
    )
    can_send = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailProvider
        fields = [
            "id",
            "name",
            "provider_type",
            "provider_type_display",
            "default_from_email",
            "is_active",
            "is_verified",
            "emails_sent_today",
            "emails_sent_total",
            "can_send",
            "created_at",
        ]
    
    def get_can_send(self, obj) -> bool:
        return obj.can_send()


class EmailTemplateSerializer(serializers.ModelSerializer):
    """Serializer for EmailTemplate model."""
    
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True
    )
    variable_names = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailTemplate
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_display",
            "subject",
            "preheader",
            "html_content",
            "text_content",
            "variables",
            "variable_names",
            "design_json",
            "thumbnail_url",
            "tags",
            "is_active",
            "is_public",
            "times_used",
            "last_used_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "times_used",
            "last_used_at",
            "created_at",
            "updated_at",
        ]
    
    def get_variable_names(self, obj) -> list:
        """Extract variable names from content."""
        from .client import TemplateRenderer
        all_vars = set()
        all_vars.update(TemplateRenderer.extract_variables(obj.subject))
        all_vars.update(TemplateRenderer.extract_variables(obj.html_content))
        all_vars.update(TemplateRenderer.extract_variables(obj.text_content))
        return sorted(list(all_vars))
    
    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class EmailTemplateListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing templates."""
    
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True
    )
    
    class Meta:
        model = EmailTemplate
        fields = [
            "id",
            "name",
            "category",
            "category_display",
            "subject",
            "thumbnail_url",
            "tags",
            "is_active",
            "times_used",
            "updated_at",
        ]


class EmailStepSerializer(serializers.ModelSerializer):
    """Serializer for EmailStep model."""
    
    template_name = serializers.CharField(
        source="template.name",
        read_only=True,
        allow_null=True
    )
    condition_type_display = serializers.CharField(
        source="get_condition_type_display",
        read_only=True
    )
    delay_total_minutes = serializers.IntegerField(read_only=True)
    open_rate = serializers.FloatField(read_only=True)
    click_rate = serializers.FloatField(read_only=True)
    effective_content = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailStep
        fields = [
            "id",
            "sequence",
            "order",
            "name",
            "template",
            "template_name",
            "subject",
            "html_content",
            "text_content",
            "effective_content",
            "delay_days",
            "delay_hours",
            "delay_minutes",
            "delay_total_minutes",
            "send_after_time",
            "send_before_time",
            "send_on_days",
            "condition_type",
            "condition_type_display",
            "condition_config",
            "ab_test_enabled",
            "ab_variants",
            "is_active",
            "total_sent",
            "total_opened",
            "total_clicked",
            "total_bounced",
            "open_rate",
            "click_rate",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_sent",
            "total_opened",
            "total_clicked",
            "total_bounced",
            "created_at",
            "updated_at",
        ]
    
    def get_effective_content(self, obj):
        return obj.get_effective_content()


class EmailStepListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing steps."""
    
    template_name = serializers.CharField(
        source="template.name",
        read_only=True,
        allow_null=True
    )
    delay_total_minutes = serializers.IntegerField(read_only=True)
    open_rate = serializers.FloatField(read_only=True)
    click_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = EmailStep
        fields = [
            "id",
            "order",
            "name",
            "template",
            "template_name",
            "subject",
            "delay_days",
            "delay_hours",
            "delay_minutes",
            "delay_total_minutes",
            "is_active",
            "total_sent",
            "open_rate",
            "click_rate",
        ]


class EmailSequenceSerializer(serializers.ModelSerializer):
    """Serializer for EmailSequence model."""
    
    trigger_type_display = serializers.CharField(
        source="get_trigger_type_display",
        read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )
    provider_name = serializers.CharField(
        source="provider.name",
        read_only=True,
        allow_null=True
    )
    workflow_name = serializers.CharField(
        source="workflow.name",
        read_only=True,
        allow_null=True
    )
    step_count = serializers.IntegerField(read_only=True)
    steps = EmailStepListSerializer(many=True, read_only=True)
    completion_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailSequence
        fields = [
            "id",
            "name",
            "description",
            "trigger_type",
            "trigger_type_display",
            "trigger_config",
            "provider",
            "provider_name",
            "workflow",
            "workflow_name",
            "status",
            "status_display",
            "is_active",
            "settings",
            "tags",
            "total_enrolled",
            "total_completed",
            "total_unsubscribed",
            "step_count",
            "steps",
            "completion_rate",
            "created_at",
            "updated_at",
            "activated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "is_active",
            "total_enrolled",
            "total_completed",
            "total_unsubscribed",
            "created_at",
            "updated_at",
            "activated_at",
        ]
    
    def get_completion_rate(self, obj) -> float:
        if obj.total_enrolled == 0:
            return 0.0
        return (obj.total_completed / obj.total_enrolled) * 100
    
    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class EmailSequenceListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing sequences."""
    
    trigger_type_display = serializers.CharField(
        source="get_trigger_type_display",
        read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )
    step_count = serializers.IntegerField(read_only=True)
    completion_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailSequence
        fields = [
            "id",
            "name",
            "trigger_type",
            "trigger_type_display",
            "status",
            "status_display",
            "is_active",
            "total_enrolled",
            "total_completed",
            "step_count",
            "completion_rate",
            "updated_at",
        ]
    
    def get_completion_rate(self, obj) -> float:
        if obj.total_enrolled == 0:
            return 0.0
        return (obj.total_completed / obj.total_enrolled) * 100


class EmailRecipientSerializer(serializers.ModelSerializer):
    """Serializer for EmailRecipient model."""
    
    can_receive = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailRecipient
        fields = [
            "id",
            "email",
            "name",
            "first_name",
            "last_name",
            "variables",
            "tags",
            "lists",
            "source",
            "source_details",
            "is_subscribed",
            "subscribed_at",
            "unsubscribed_at",
            "unsubscribe_reason",
            "is_bounced",
            "bounced_at",
            "bounce_type",
            "is_complained",
            "complained_at",
            "emails_received",
            "emails_opened",
            "emails_clicked",
            "last_email_at",
            "last_opened_at",
            "last_clicked_at",
            "external_id",
            "can_receive",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "subscribed_at",
            "unsubscribed_at",
            "bounced_at",
            "complained_at",
            "emails_received",
            "emails_opened",
            "emails_clicked",
            "last_email_at",
            "last_opened_at",
            "last_clicked_at",
            "created_at",
            "updated_at",
        ]
    
    def get_can_receive(self, obj) -> bool:
        return obj.can_receive_email()
    
    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        validated_data["subscribed_at"] = timezone.now()
        return super().create(validated_data)


class EmailRecipientListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing recipients."""
    
    can_receive = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailRecipient
        fields = [
            "id",
            "email",
            "name",
            "tags",
            "is_subscribed",
            "is_bounced",
            "emails_received",
            "emails_opened",
            "last_email_at",
            "can_receive",
        ]
    
    def get_can_receive(self, obj) -> bool:
        return obj.can_receive_email()


class EmailRecipientImportSerializer(serializers.Serializer):
    """Serializer for bulk import of recipients."""
    
    csv_file = serializers.FileField(required=False)
    csv_data = serializers.CharField(required=False)
    email_column = serializers.CharField(default="email")
    name_column = serializers.CharField(required=False, allow_blank=True)
    first_name_column = serializers.CharField(required=False, allow_blank=True)
    last_name_column = serializers.CharField(required=False, allow_blank=True)
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    source = serializers.CharField(default="csv_import")
    skip_duplicates = serializers.BooleanField(default=True)
    update_existing = serializers.BooleanField(default=False)
    
    def validate(self, data):
        if not data.get("csv_file") and not data.get("csv_data"):
            raise serializers.ValidationError(
                "Either csv_file or csv_data must be provided"
            )
        return data


class EmailRecipientBulkTagSerializer(serializers.Serializer):
    """Serializer for bulk tagging recipients."""
    
    recipient_ids = serializers.ListField(
        child=serializers.UUIDField()
    )
    add_tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    remove_tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class SequenceEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for SequenceEnrollment model."""
    
    sequence_name = serializers.CharField(
        source="sequence.name",
        read_only=True
    )
    recipient_email = serializers.CharField(
        source="recipient.email",
        read_only=True
    )
    current_step_name = serializers.CharField(
        source="current_step.name",
        read_only=True,
        allow_null=True
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )
    
    class Meta:
        model = SequenceEnrollment
        fields = [
            "id",
            "sequence",
            "sequence_name",
            "recipient",
            "recipient_email",
            "status",
            "status_display",
            "current_step",
            "current_step_name",
            "completed_steps",
            "next_send_at",
            "variables",
            "enrolled_at",
            "completed_at",
            "paused_at",
        ]
        read_only_fields = [
            "id",
            "completed_steps",
            "enrolled_at",
            "completed_at",
            "paused_at",
        ]


class EmailSendSerializer(serializers.ModelSerializer):
    """Serializer for EmailSend model."""
    
    step_name = serializers.CharField(
        source="step.name",
        read_only=True,
        allow_null=True
    )
    recipient_email_display = serializers.CharField(
        source="recipient.email",
        read_only=True
    )
    provider_name = serializers.CharField(
        source="provider.name",
        read_only=True,
        allow_null=True
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )
    can_retry = serializers.SerializerMethodField()
    
    class Meta:
        model = EmailSend
        fields = [
            "id",
            "step",
            "step_name",
            "enrollment",
            "recipient",
            "recipient_email_display",
            "provider",
            "provider_name",
            "from_email",
            "from_name",
            "to_email",
            "reply_to",
            "subject",
            "html_content",
            "text_content",
            "provider_message_id",
            "status",
            "status_display",
            "error_message",
            "error_code",
            "retry_count",
            "max_retries",
            "can_retry",
            "open_count",
            "click_count",
            "unique_opens",
            "unique_clicks",
            "created_at",
            "scheduled_at",
            "sent_at",
            "delivered_at",
            "opened_at",
            "clicked_at",
            "bounced_at",
            "failed_at",
            "metadata",
        ]
        read_only_fields = [
            "id",
            "provider_message_id",
            "status",
            "error_message",
            "error_code",
            "retry_count",
            "open_count",
            "click_count",
            "unique_opens",
            "unique_clicks",
            "created_at",
            "sent_at",
            "delivered_at",
            "opened_at",
            "clicked_at",
            "bounced_at",
            "failed_at",
        ]
    
    def get_can_retry(self, obj) -> bool:
        return obj.can_retry()


class EmailSendListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing sends."""
    
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True
    )
    
    class Meta:
        model = EmailSend
        fields = [
            "id",
            "to_email",
            "subject",
            "status",
            "status_display",
            "open_count",
            "click_count",
            "sent_at",
            "opened_at",
            "clicked_at",
        ]


class EmailEventSerializer(serializers.ModelSerializer):
    """Serializer for EmailEvent model."""
    
    event_type_display = serializers.CharField(
        source="get_event_type_display",
        read_only=True
    )
    send_to_email = serializers.CharField(
        source="send.to_email",
        read_only=True
    )
    
    class Meta:
        model = EmailEvent
        fields = [
            "id",
            "send",
            "send_to_email",
            "event_type",
            "event_type_display",
            "timestamp",
            "url",
            "ip_address",
            "user_agent",
            "device_type",
            "client_name",
            "client_os",
            "country",
            "region",
            "city",
            "provider_event_id",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EmailEventListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing events."""
    
    event_type_display = serializers.CharField(
        source="get_event_type_display",
        read_only=True
    )
    
    class Meta:
        model = EmailEvent
        fields = [
            "id",
            "event_type",
            "event_type_display",
            "timestamp",
            "url",
            "country",
        ]


# Stats and Analytics Serializers

class SequenceStatsSerializer(serializers.Serializer):
    """Serializer for sequence statistics."""
    
    total_enrolled = serializers.IntegerField()
    total_completed = serializers.IntegerField()
    total_active = serializers.IntegerField()
    total_paused = serializers.IntegerField()
    total_unsubscribed = serializers.IntegerField()
    completion_rate = serializers.FloatField()
    total_emails_sent = serializers.IntegerField()
    total_opens = serializers.IntegerField()
    total_clicks = serializers.IntegerField()
    average_open_rate = serializers.FloatField()
    average_click_rate = serializers.FloatField()
    step_stats = serializers.ListField()


class ProviderStatsSerializer(serializers.Serializer):
    """Serializer for provider statistics."""
    
    emails_sent_today = serializers.IntegerField()
    emails_sent_total = serializers.IntegerField()
    daily_limit = serializers.IntegerField()
    hourly_limit = serializers.IntegerField()
    remaining_today = serializers.IntegerField()
    last_sent_at = serializers.DateTimeField(allow_null=True)
    delivery_rate = serializers.FloatField()
    bounce_rate = serializers.FloatField()


class TemplatePreviewSerializer(serializers.Serializer):
    """Serializer for template preview."""
    
    template_id = serializers.UUIDField(required=False)
    subject = serializers.CharField(required=False)
    html_content = serializers.CharField(required=False)
    text_content = serializers.CharField(required=False, allow_blank=True)
    variables = serializers.DictField(required=False, default=dict)


class SendTestEmailSerializer(serializers.Serializer):
    """Serializer for sending test emails."""
    
    provider_id = serializers.UUIDField()
    to_email = serializers.EmailField()
    to_name = serializers.CharField(required=False, allow_blank=True)
    subject = serializers.CharField()
    html_content = serializers.CharField()
    text_content = serializers.CharField(required=False, allow_blank=True)


class EnrollRecipientsSerializer(serializers.Serializer):
    """Serializer for enrolling recipients in a sequence."""
    
    sequence_id = serializers.UUIDField()
    recipient_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )
    recipient_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False
    )
    filter_tags = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    variables = serializers.DictField(required=False, default=dict)
    skip_already_enrolled = serializers.BooleanField(default=True)
    
    def validate(self, data):
        if not any([
            data.get("recipient_ids"),
            data.get("recipient_emails"),
            data.get("filter_tags")
        ]):
            raise serializers.ValidationError(
                "At least one of recipient_ids, recipient_emails, or filter_tags must be provided"
            )
        return data


class ReorderStepsSerializer(serializers.Serializer):
    """Serializer for reordering sequence steps."""
    
    step_orders = serializers.ListField(
        child=serializers.DictField()
    )
    
    def validate_step_orders(self, value):
        for item in value:
            if "id" not in item or "order" not in item:
                raise serializers.ValidationError(
                    "Each item must have id and order fields"
                )
        return value
