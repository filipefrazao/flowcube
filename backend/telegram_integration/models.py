"""
Telegram Bot Integration Models
telegram_integration/models.py

Models for managing Telegram bots, chats, messages and webhooks.
Created: 2026-02-02
"""
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class TelegramBot(models.Model):
    """
    Telegram Bot configuration and credentials.
    Each user can have multiple bots.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='telegram_bots'
    )
    
    # Bot credentials
    token = models.CharField(
        max_length=100,
        help_text='Bot token from @BotFather'
    )
    bot_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='Telegram bot ID (extracted from token)'
    )
    username = models.CharField(
        max_length=64,
        blank=True,
        help_text='Bot username without @'
    )
    first_name = models.CharField(
        max_length=64,
        blank=True,
        help_text='Bot display name'
    )
    
    # Webhook configuration
    webhook_url = models.URLField(
        max_length=500,
        blank=True,
        help_text='Webhook URL for receiving updates'
    )
    webhook_secret = models.CharField(
        max_length=256,
        blank=True,
        help_text='Secret token for webhook verification'
    )
    webhook_set_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When webhook was last configured'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(
        default=False,
        help_text='Whether bot token was verified with Telegram'
    )
    last_error = models.TextField(blank=True)
    last_error_at = models.DateTimeField(null=True, blank=True)
    
    # Workflow association
    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='telegram_bots',
        help_text='Workflow to execute when messages arrive'
    )
    
    # Metadata
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Telegram Bot'
        verbose_name_plural = 'Telegram Bots'
        indexes = [
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['bot_id']),
        ]
    
    def __str__(self):
        if self.username:
            return f"@{self.username}"
        return f"Bot {self.id}"
    
    def save(self, *args, **kwargs):
        # Extract bot_id from token if not set
        if self.token and not self.bot_id:
            try:
                self.bot_id = int(self.token.split(':')[0])
            except (ValueError, IndexError):
                pass
        super().save(*args, **kwargs)
    
    def mark_error(self, error_message: str):
        """Record an error for this bot"""
        self.last_error = error_message
        self.last_error_at = timezone.now()
        self.save(update_fields=['last_error', 'last_error_at'])


class TelegramChat(models.Model):
    """
    Telegram chat/conversation tracking.
    Can be private, group, supergroup or channel.
    """
    class ChatType(models.TextChoices):
        PRIVATE = 'private', 'Private'
        GROUP = 'group', 'Group'
        SUPERGROUP = 'supergroup', 'Supergroup'
        CHANNEL = 'channel', 'Channel'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bot = models.ForeignKey(
        TelegramBot,
        on_delete=models.CASCADE,
        related_name='chats'
    )
    
    # Telegram chat identifiers
    chat_id = models.BigIntegerField(
        db_index=True,
        help_text='Telegram chat ID'
    )
    chat_type = models.CharField(
        max_length=20,
        choices=ChatType.choices,
        default=ChatType.PRIVATE
    )
    
    # Chat/User info
    title = models.CharField(
        max_length=256,
        blank=True,
        help_text='Group/channel title'
    )
    username = models.CharField(
        max_length=64,
        blank=True,
        help_text='Chat username if available'
    )
    first_name = models.CharField(
        max_length=64,
        blank=True,
        help_text='User first name (for private chats)'
    )
    last_name = models.CharField(
        max_length=64,
        blank=True,
        help_text='User last name (for private chats)'
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text='Whether bot can send messages to this chat'
    )
    is_blocked = models.BooleanField(
        default=False,
        help_text='User blocked the bot'
    )
    
    # Conversation state
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
    
    # Stats
    message_count = models.PositiveIntegerField(default=0)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_message_at']
        verbose_name = 'Telegram Chat'
        verbose_name_plural = 'Telegram Chats'
        unique_together = ['bot', 'chat_id']
        indexes = [
            models.Index(fields=['bot', 'chat_id']),
            models.Index(fields=['chat_type', 'is_active']),
        ]
    
    def __str__(self):
        if self.title:
            return self.title
        if self.first_name:
            name = self.first_name
            if self.last_name:
                name += f" {self.last_name}"
            return name
        return f"Chat {self.chat_id}"
    
    @property
    def display_name(self) -> str:
        """Get display name for this chat"""
        if self.chat_type == self.ChatType.PRIVATE:
            if self.first_name:
                name = self.first_name
                if self.last_name:
                    name += f" {self.last_name}"
                return name
        return self.title or f"Chat {self.chat_id}"


class TelegramMessage(models.Model):
    """
    Telegram message record.
    Tracks both incoming and outgoing messages.
    """
    class Direction(models.TextChoices):
        INBOUND = 'in', 'Inbound (from user)'
        OUTBOUND = 'out', 'Outbound (from bot)'
    
    class MessageType(models.TextChoices):
        TEXT = 'text', 'Text'
        PHOTO = 'photo', 'Photo'
        VIDEO = 'video', 'Video'
        AUDIO = 'audio', 'Audio'
        VOICE = 'voice', 'Voice'
        DOCUMENT = 'document', 'Document'
        STICKER = 'sticker', 'Sticker'
        ANIMATION = 'animation', 'Animation/GIF'
        LOCATION = 'location', 'Location'
        CONTACT = 'contact', 'Contact'
        POLL = 'poll', 'Poll'
        VENUE = 'venue', 'Venue'
        DICE = 'dice', 'Dice'
        GAME = 'game', 'Game'
        INVOICE = 'invoice', 'Invoice'
        UNKNOWN = 'unknown', 'Unknown'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(
        TelegramChat,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Telegram message identifiers
    message_id = models.BigIntegerField(
        db_index=True,
        help_text='Telegram message ID within the chat'
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
        help_text='Text content or caption'
    )
    media_url = models.URLField(
        max_length=1000,
        blank=True,
        help_text='URL to media file'
    )
    media_file_id = models.CharField(
        max_length=200,
        blank=True,
        help_text='Telegram file_id for media'
    )
    
    # Reply and threading
    reply_to_message_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='ID of message this is replying to'
    )
    
    # Message metadata
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional message data (buttons, entities, etc)'
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
    
    # Status
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    telegram_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Message timestamp from Telegram'
    )
    edited_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Telegram Message'
        verbose_name_plural = 'Telegram Messages'
        indexes = [
            models.Index(fields=['chat', 'message_id']),
            models.Index(fields=['direction', 'created_at']),
        ]
    
    def __str__(self):
        direction = "->" if self.direction == self.Direction.OUTBOUND else "<-"
        content_preview = self.content[:50] if self.content else f"[{self.message_type}]"
        return f"{direction} {content_preview}"


class TelegramCallback(models.Model):
    """
    Callback query tracking for inline keyboard interactions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(
        TelegramChat,
        on_delete=models.CASCADE,
        related_name='callbacks'
    )
    
    # Telegram callback identifiers
    callback_query_id = models.CharField(
        max_length=64,
        db_index=True,
        help_text='Telegram callback query ID'
    )
    
    # Callback data
    data = models.CharField(
        max_length=64,
        help_text='Callback data sent with the button'
    )
    message_id = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='Message ID the callback is from'
    )
    inline_message_id = models.CharField(
        max_length=64,
        blank=True,
        help_text='Inline message ID (for inline mode)'
    )
    
    # User info
    from_user_id = models.BigIntegerField(
        help_text='Telegram user ID who clicked'
    )
    
    # Processing status
    answered = models.BooleanField(
        default=False,
        help_text='Whether callback was answered'
    )
    answer_text = models.CharField(
        max_length=200,
        blank=True,
        help_text='Text shown in answer'
    )
    answer_show_alert = models.BooleanField(
        default=False,
        help_text='Whether answer was shown as alert'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Telegram Callback'
        verbose_name_plural = 'Telegram Callbacks'
        indexes = [
            models.Index(fields=['callback_query_id']),
            models.Index(fields=['chat', 'message_id']),
        ]
    
    def __str__(self):
        return f"Callback: {self.data}"


class TelegramWebhookLog(models.Model):
    """
    Log of all incoming webhook updates from Telegram.
    Useful for debugging, replay, and audit.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bot = models.ForeignKey(
        TelegramBot,
        on_delete=models.CASCADE,
        related_name='webhook_logs'
    )
    
    # Update identifiers
    update_id = models.BigIntegerField(
        db_index=True,
        help_text='Telegram update ID'
    )
    event_type = models.CharField(
        max_length=50,
        help_text='Type of update (message, callback_query, etc)'
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
    chat = models.ForeignKey(
        TelegramChat,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhook_logs'
    )
    message = models.ForeignKey(
        TelegramMessage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhook_logs'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Telegram Webhook Log'
        verbose_name_plural = 'Telegram Webhook Logs'
        indexes = [
            models.Index(fields=['bot', 'update_id']),
            models.Index(fields=['processed', 'created_at']),
            models.Index(fields=['event_type']),
        ]
    
    def __str__(self):
        return f"Update {self.update_id} - {self.event_type}"
    
    def mark_processed(self, chat=None, message=None):
        """Mark this webhook as successfully processed"""
        self.processed = True
        self.processed_at = timezone.now()
        if chat:
            self.chat = chat
        if message:
            self.message = message
        self.save(update_fields=['processed', 'processed_at', 'chat', 'message'])
    
    def mark_error(self, error_message: str):
        """Mark this webhook as failed"""
        self.error = error_message
        self.retry_count += 1
        self.save(update_fields=['error', 'retry_count'])
