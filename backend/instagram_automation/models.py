"""
Instagram DM Automation Models
instagram_automation/models.py

Models for managing Instagram Business accounts, conversations, messages,
and webhook events for the Instagram Graph API integration.

Created: 2026-02-02
Instagram Graph API v19.0+
"""
import uuid
from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone


class InstagramAccount(models.Model):
    """
    Instagram Business/Creator account connected via Facebook Graph API.
    Requires Facebook Page connection and Instagram Graph API permissions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='instagram_accounts'
    )
    
    # Instagram identifiers
    instagram_id = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text='Instagram-scoped user ID (IGSID)'
    )
    username = models.CharField(
        max_length=64,
        blank=True,
        help_text='Instagram username without @'
    )
    name = models.CharField(
        max_length=128,
        blank=True,
        help_text='Account display name'
    )
    profile_picture_url = models.URLField(
        max_length=500,
        blank=True,
        help_text='Profile picture URL'
    )
    biography = models.TextField(
        blank=True,
        help_text='Account bio'
    )
    
    # Facebook/Meta connection
    facebook_page_id = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        help_text='Connected Facebook Page ID'
    )
    facebook_page_name = models.CharField(
        max_length=128,
        blank=True,
        help_text='Facebook Page name'
    )
    
    # Access tokens
    access_token = models.TextField(
        help_text='Long-lived access token for Graph API'
    )
    token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Token expiration timestamp'
    )
    
    # Webhook configuration
    webhook_subscribed = models.BooleanField(
        default=False,
        help_text='Whether webhook is configured for messages'
    )
    webhook_subscribed_at = models.DateTimeField(
        null=True,
        blank=True
    )
    
    # Permissions granted
    permissions = models.JSONField(
        default=list,
        blank=True,
        help_text='List of granted Instagram permissions'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether account credentials are verified'
    )
    
    # Rate limiting tracking
    daily_message_count = models.PositiveIntegerField(
        default=0,
        help_text='Messages sent today (reset daily)'
    )
    daily_message_reset_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When daily message count was last reset'
    )
    
    # Error tracking
    last_error = models.TextField(blank=True)
    last_error_at = models.DateTimeField(null=True, blank=True)
    consecutive_errors = models.PositiveSmallIntegerField(default=0)
    
    # Workflow association
    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instagram_accounts',
        help_text='Workflow to execute when messages arrive'
    )
    
    # Account settings
    auto_reply_enabled = models.BooleanField(
        default=True,
        help_text='Enable automatic replies'
    )
    human_handover_enabled = models.BooleanField(
        default=True,
        help_text='Allow handover to human agent'
    )
    
    # Metadata
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Instagram Account'
        verbose_name_plural = 'Instagram Accounts'
        indexes = [
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['instagram_id']),
            models.Index(fields=['facebook_page_id']),
        ]
    
    def __str__(self):
        if self.username:
            return f"@{self.username}"
        return f"Instagram {self.instagram_id}"
    
    def mark_error(self, error_message: str):
        """Record an error for this account"""
        self.last_error = error_message
        self.last_error_at = timezone.now()
        self.consecutive_errors += 1
        self.save(update_fields=['last_error', 'last_error_at', 'consecutive_errors'])
    
    def clear_error(self):
        """Clear error state"""
        self.consecutive_errors = 0
        self.last_error = ''
        self.save(update_fields=['consecutive_errors', 'last_error'])
    
    def can_send_message(self) -> bool:
        """Check if account can send messages (rate limit check)"""
        # Reset daily count if needed
        now = timezone.now()
        if self.daily_message_reset_at:
            if now.date() > self.daily_message_reset_at.date():
                self.daily_message_count = 0
                self.daily_message_reset_at = now
                self.save(update_fields=['daily_message_count', 'daily_message_reset_at'])
        else:
            self.daily_message_reset_at = now
            self.save(update_fields=['daily_message_reset_at'])
        
        # Instagram limit: 200 messages per user per day
        return self.daily_message_count < 200
    
    def increment_message_count(self):
        """Increment daily message count"""
        self.daily_message_count += 1
        self.save(update_fields=['daily_message_count'])
    
    @property
    def is_token_expired(self) -> bool:
        """Check if access token is expired"""
        if not self.token_expires_at:
            return False
        return timezone.now() >= self.token_expires_at
    
    @property
    def token_expires_soon(self) -> bool:
        """Check if token expires within 7 days"""
        if not self.token_expires_at:
            return False
        return timezone.now() >= (self.token_expires_at - timedelta(days=7))


class InstagramConversation(models.Model):
    """
    Instagram DM conversation/thread tracking.
    Each conversation is between the business account and a user.
    """
    class ConversationStatus(models.TextChoices):
        ACTIVE = 'active', 'Active'
        HUMAN_AGENT = 'human_agent', 'Human Agent'
        RESOLVED = 'resolved', 'Resolved'
        ARCHIVED = 'archived', 'Archived'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        InstagramAccount,
        on_delete=models.CASCADE,
        related_name='conversations'
    )
    
    # Participant info (the user messaging the business)
    participant_id = models.CharField(
        max_length=50,
        db_index=True,
        help_text='Instagram-scoped user ID of the participant'
    )
    participant_username = models.CharField(
        max_length=64,
        blank=True,
        help_text='Participant username'
    )
    participant_name = models.CharField(
        max_length=128,
        blank=True,
        help_text='Participant display name'
    )
    participant_profile_pic = models.URLField(
        max_length=500,
        blank=True,
        help_text='Participant profile picture URL'
    )
    
    # Conversation status
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.ACTIVE
    )
    
    # 24-hour messaging window
    messaging_window_open = models.BooleanField(
        default=True,
        help_text='Whether 24-hour messaging window is open'
    )
    last_user_message_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last message from user (window starts here)'
    )
    
    # Human agent handover
    is_human_agent_active = models.BooleanField(
        default=False,
        help_text='Whether conversation is handled by human agent'
    )
    human_agent_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='instagram_handled_conversations',
        help_text='Human agent handling this conversation'
    )
    handover_at = models.DateTimeField(null=True, blank=True)
    
    # Workflow state
    current_node_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Current workflow node'
    )
    variables = models.JSONField(
        default=dict,
        blank=True,
        help_text='Collected variables during conversation'
    )
    context = models.JSONField(
        default=dict,
        blank=True,
        help_text='AI conversation context'
    )
    
    # Labels/Tags for organization
    labels = models.JSONField(
        default=list,
        blank=True,
        help_text='Conversation labels/tags'
    )
    
    # Stats
    message_count = models.PositiveIntegerField(default=0)
    unread_count = models.PositiveIntegerField(default=0)
    
    # Timestamps
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_message_at']
        verbose_name = 'Instagram Conversation'
        verbose_name_plural = 'Instagram Conversations'
        unique_together = ['account', 'participant_id']
        indexes = [
            models.Index(fields=['account', 'participant_id']),
            models.Index(fields=['status', 'last_message_at']),
            models.Index(fields=['is_human_agent_active']),
        ]
    
    def __str__(self):
        if self.participant_username:
            return f"@{self.participant_username}"
        return f"User {self.participant_id}"
    
    @property
    def display_name(self) -> str:
        """Get display name for this conversation"""
        if self.participant_name:
            return self.participant_name
        if self.participant_username:
            return f"@{self.participant_username}"
        return f"User {self.participant_id}"
    
    @property
    def is_window_open(self) -> bool:
        """Check if 24-hour messaging window is still open"""
        if not self.last_user_message_at:
            return False
        window_closes = self.last_user_message_at + timedelta(hours=24)
        return timezone.now() < window_closes
    
    @property
    def window_closes_at(self):
        """Get when the messaging window closes"""
        if not self.last_user_message_at:
            return None
        return self.last_user_message_at + timedelta(hours=24)
    
    @property
    def window_time_remaining(self):
        """Get remaining time in messaging window"""
        if not self.is_window_open:
            return timedelta(0)
        return self.window_closes_at - timezone.now()
    
    def update_window(self):
        """Update messaging window based on last user message"""
        self.messaging_window_open = self.is_window_open
        self.save(update_fields=['messaging_window_open'])
    
    def handover_to_human(self, agent_user=None):
        """Transfer conversation to human agent"""
        self.is_human_agent_active = True
        self.status = self.ConversationStatus.HUMAN_AGENT
        self.human_agent_user = agent_user
        self.handover_at = timezone.now()
        self.save(update_fields=[
            'is_human_agent_active', 'status', 
            'human_agent_user', 'handover_at'
        ])
    
    def handover_to_bot(self):
        """Transfer conversation back to bot"""
        self.is_human_agent_active = False
        self.status = self.ConversationStatus.ACTIVE
        self.human_agent_user = None
        self.save(update_fields=['is_human_agent_active', 'status', 'human_agent_user'])


class InstagramMessage(models.Model):
    """
    Instagram DM message record.
    Tracks both incoming and outgoing messages.
    """
    class Direction(models.TextChoices):
        INBOUND = 'in', 'Inbound (from user)'
        OUTBOUND = 'out', 'Outbound (from business)'
    
    class MessageType(models.TextChoices):
        TEXT = 'text', 'Text'
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'
        AUDIO = 'audio', 'Audio'
        FILE = 'file', 'File'
        SHARE = 'share', 'Share (Post/Reel/Story)'
        STORY_REPLY = 'story_reply', 'Story Reply'
        STORY_MENTION = 'story_mention', 'Story Mention'
        QUICK_REPLY = 'quick_reply', 'Quick Reply'
        GENERIC_TEMPLATE = 'generic', 'Generic Template'
        PRODUCT = 'product', 'Product'
        REACTION = 'reaction', 'Reaction'
        DELETED = 'deleted', 'Deleted'
        UNKNOWN = 'unknown', 'Unknown'
    
    class SendStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        DELIVERED = 'delivered', 'Delivered'
        READ = 'read', 'Read'
        FAILED = 'failed', 'Failed'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        InstagramConversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Instagram message identifiers
    mid = models.CharField(
        max_length=200,
        blank=True,
        db_index=True,
        help_text='Instagram message ID'
    )
    
    # Message direction and type
    direction = models.CharField(
        max_length=5,
        choices=Direction.choices
    )
    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT
    )
    
    # Content
    content = models.TextField(
        blank=True,
        help_text='Text content'
    )
    
    # Status for outbound messages
    send_status = models.CharField(
        max_length=20,
        choices=SendStatus.choices,
        default=SendStatus.PENDING
    )
    
    # Reply context
    reply_to_mid = models.CharField(
        max_length=200,
        blank=True,
        help_text='Message ID this is replying to'
    )
    
    # Additional message data
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional message data (attachments, quick_replies, etc)'
    )
    
    # Processing info
    from_node_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Workflow node that generated this message'
    )
    is_ai_generated = models.BooleanField(default=False)
    ai_model = models.CharField(
        max_length=50,
        blank=True,
        help_text='AI model used (gpt-4o, claude, etc)'
    )
    
    # Status flags
    is_read = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    is_unsent = models.BooleanField(
        default=False,
        help_text='User unsent the message'
    )
    
    # Error tracking for failed sends
    error_message = models.TextField(blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    instagram_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Message timestamp from Instagram'
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Instagram Message'
        verbose_name_plural = 'Instagram Messages'
        indexes = [
            models.Index(fields=['conversation', 'mid']),
            models.Index(fields=['direction', 'created_at']),
            models.Index(fields=['send_status']),
        ]
    
    def __str__(self):
        direction = "->" if self.direction == self.Direction.OUTBOUND else "<-"
        content_preview = self.content[:50] if self.content else f"[{self.message_type}]"
        return f"{direction} {content_preview}"
    
    def mark_sent(self, mid: str = None):
        """Mark message as sent"""
        self.send_status = self.SendStatus.SENT
        self.sent_at = timezone.now()
        if mid:
            self.mid = mid
        self.save(update_fields=['send_status', 'sent_at', 'mid'])
    
    def mark_delivered(self):
        """Mark message as delivered"""
        self.send_status = self.SendStatus.DELIVERED
        self.delivered_at = timezone.now()
        self.save(update_fields=['send_status', 'delivered_at'])
    
    def mark_read(self):
        """Mark message as read"""
        self.send_status = self.SendStatus.READ
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=['send_status', 'is_read', 'read_at'])
    
    def mark_failed(self, error: str):
        """Mark message as failed"""
        self.send_status = self.SendStatus.FAILED
        self.error_message = error
        self.retry_count += 1
        self.save(update_fields=['send_status', 'error_message', 'retry_count'])


class InstagramMediaAttachment(models.Model):
    """
    Media attachments for Instagram messages.
    Supports images, videos, audio, and files.
    """
    class MediaType(models.TextChoices):
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'
        AUDIO = 'audio', 'Audio'
        FILE = 'file', 'File'
        STICKER = 'sticker', 'Sticker'
        SHARE = 'share', 'Share'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        InstagramMessage,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    
    # Attachment info
    media_type = models.CharField(
        max_length=20,
        choices=MediaType.choices
    )
    url = models.URLField(
        max_length=1000,
        help_text='Media URL'
    )
    
    # Optional metadata
    mime_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Duration in seconds for video/audio'
    )
    
    # For share type (post/reel/story)
    share_type = models.CharField(
        max_length=50,
        blank=True,
        help_text='Type of shared content (post, reel, story)'
    )
    share_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='ID of shared post/reel/story'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Instagram Media Attachment'
        verbose_name_plural = 'Instagram Media Attachments'
    
    def __str__(self):
        return f"{self.media_type}: {self.url[:50]}..."


class InstagramQuickReply(models.Model):
    """
    Quick reply button configurations for Instagram messages.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        InstagramAccount,
        on_delete=models.CASCADE,
        related_name='quick_replies'
    )
    
    # Quick reply configuration
    title = models.CharField(
        max_length=80,
        help_text='Button text (max 80 chars)'
    )
    payload = models.CharField(
        max_length=1000,
        help_text='Data sent when button is clicked'
    )
    content_type = models.CharField(
        max_length=20,
        default='text',
        help_text='text, user_phone_number, user_email'
    )
    image_url = models.URLField(
        max_length=500,
        blank=True,
        help_text='Optional icon image URL'
    )
    
    # Organization
    category = models.CharField(
        max_length=50,
        blank=True,
        help_text='Category for grouping'
    )
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['category', 'order', 'title']
        verbose_name = 'Instagram Quick Reply'
        verbose_name_plural = 'Instagram Quick Replies'
    
    def __str__(self):
        return self.title
    
    def to_api_format(self) -> dict:
        """Convert to Instagram API format"""
        result = {
            'content_type': self.content_type,
            'title': self.title,
            'payload': self.payload
        }
        if self.image_url:
            result['image_url'] = self.image_url
        return result


class InstagramIceBreaker(models.Model):
    """
    Ice breaker questions for Instagram DMs.
    Shown to users when they first open a conversation.
    Maximum of 4 ice breakers per account.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        InstagramAccount,
        on_delete=models.CASCADE,
        related_name='ice_breakers'
    )
    
    # Ice breaker configuration
    question = models.CharField(
        max_length=80,
        help_text='Question text (max 80 chars)'
    )
    payload = models.CharField(
        max_length=1000,
        help_text='Data sent when question is selected'
    )
    
    # Order (max 4 ice breakers)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order']
        verbose_name = 'Instagram Ice Breaker'
        verbose_name_plural = 'Instagram Ice Breakers'
        constraints = [
            models.CheckConstraint(
                check=models.Q(order__lte=3),
                name='ice_breaker_max_order'
            )
        ]
    
    def __str__(self):
        return self.question
    
    def to_api_format(self) -> dict:
        """Convert to Instagram API format"""
        return {
            'question': self.question,
            'payload': self.payload
        }


class InstagramMessageTemplate(models.Model):
    """
    Message templates for sponsored messages outside 24-hour window.
    Requires Meta approval before use.
    """
    class TemplateCategory(models.TextChoices):
        ACCOUNT_UPDATE = 'ACCOUNT_UPDATE', 'Account Update'
        CONFIRMED_EVENT_UPDATE = 'CONFIRMED_EVENT_UPDATE', 'Confirmed Event Update'
        POST_PURCHASE_UPDATE = 'POST_PURCHASE_UPDATE', 'Post Purchase Update'
        HUMAN_AGENT = 'HUMAN_AGENT', 'Human Agent'
    
    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        InstagramAccount,
        on_delete=models.CASCADE,
        related_name='message_templates'
    )
    
    # Template identification
    name = models.CharField(
        max_length=100,
        help_text='Template name for internal use'
    )
    category = models.CharField(
        max_length=50,
        choices=TemplateCategory.choices,
        help_text='Message tag category'
    )
    
    # Template content
    template_text = models.TextField(
        help_text='Template text with {{variables}}'
    )
    
    # Approval status
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING
    )
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Instagram Message Template'
        verbose_name_plural = 'Instagram Message Templates'
        unique_together = ['account', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class InstagramWebhookLog(models.Model):
    """
    Log of all incoming webhook events from Instagram/Meta.
    Useful for debugging, replay, and audit.
    """
    class EventType(models.TextChoices):
        MESSAGE = 'message', 'Message'
        MESSAGE_READS = 'message_reads', 'Message Reads'
        MESSAGE_DELIVERIES = 'message_deliveries', 'Message Deliveries'
        MESSAGE_REACTIONS = 'message_reactions', 'Message Reactions'
        MESSAGE_ECHOES = 'message_echoes', 'Message Echoes'
        MESSAGING_SEEN = 'messaging_seen', 'Messaging Seen'
        MESSAGING_POSTBACKS = 'messaging_postbacks', 'Postbacks'
        MESSAGING_REFERRALS = 'messaging_referrals', 'Referrals'
        MESSAGING_HANDOVERS = 'messaging_handovers', 'Handovers'
        UNKNOWN = 'unknown', 'Unknown'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        InstagramAccount,
        on_delete=models.CASCADE,
        related_name='webhook_logs',
        null=True,
        blank=True
    )
    
    # Event identifiers
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        default=EventType.UNKNOWN
    )
    sender_id = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        help_text='Sender IGSID'
    )
    recipient_id = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        help_text='Recipient IGSID'
    )
    timestamp = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='Event timestamp from Meta'
    )
    
    # Raw payload
    payload = models.JSONField(
        help_text='Full webhook payload'
    )
    
    # Processing status
    processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    error = models.TextField(blank=True)
    retry_count = models.PositiveSmallIntegerField(default=0)
    
    # Related records (set after processing)
    conversation = models.ForeignKey(
        InstagramConversation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhook_logs'
    )
    message = models.ForeignKey(
        InstagramMessage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhook_logs'
    )
    
    # Request metadata
    request_headers = models.JSONField(
        default=dict,
        blank=True,
        help_text='HTTP headers from webhook request'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Instagram Webhook Log'
        verbose_name_plural = 'Instagram Webhook Logs'
        indexes = [
            models.Index(fields=['account', 'event_type']),
            models.Index(fields=['processed', 'created_at']),
            models.Index(fields=['sender_id']),
        ]
    
    def __str__(self):
        return f"{self.event_type} - {self.sender_id or 'unknown'}"
    
    def mark_processed(self, conversation=None, message=None):
        """Mark this webhook as successfully processed"""
        self.processed = True
        self.processed_at = timezone.now()
        if conversation:
            self.conversation = conversation
        if message:
            self.message = message
        self.save(update_fields=['processed', 'processed_at', 'conversation', 'message'])
    
    def mark_error(self, error_message: str):
        """Mark this webhook as failed"""
        self.error = error_message
        self.retry_count += 1
        self.save(update_fields=['error', 'retry_count'])
