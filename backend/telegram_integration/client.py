"""
Telegram Bot API Client
telegram_integration/client.py

Async HTTP client for Telegram Bot API.
Supports all major Bot API methods for messaging.

Created: 2026-02-02
"""
import logging
import httpx
from typing import Optional, Dict, Any, List, Union
from enum import Enum

logger = logging.getLogger('flowcube.telegram')

# Telegram Bot API base URL
TELEGRAM_API_BASE = 'https://api.telegram.org'


class ParseMode(str, Enum):
    """Supported parse modes for message formatting"""
    HTML = 'HTML'
    MARKDOWN = 'Markdown'
    MARKDOWN_V2 = 'MarkdownV2'


class TelegramAPIError(Exception):
    """Exception for Telegram API errors"""
    def __init__(self, message: str, error_code: int = None, description: str = None):
        self.message = message
        self.error_code = error_code
        self.description = description
        super().__init__(message)


class TelegramClient:
    """
    Async client for Telegram Bot API.
    
    Usage:
        client = TelegramClient(token='your_bot_token')
        
        # Get bot info
        me = await client.get_me()
        
        # Send message
        await client.send_message(
            chat_id=123456789,
            text='Hello from FlowCube!'
        )
    """
    
    def __init__(
        self,
        token: str,
        timeout: int = 30,
        max_retries: int = 3
    ):
        """
        Initialize Telegram client.
        
        Args:
            token: Bot token from @BotFather
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts for failed requests
        """
        self.token = token
        self.timeout = timeout
        self.max_retries = max_retries
        self.base_url = f"{TELEGRAM_API_BASE}/bot{token}"
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=self.timeout,
                headers={'Content-Type': 'application/json'}
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    # ==================== CORE REQUEST METHOD ====================
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        files: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Make a request to Telegram Bot API.
        
        Args:
            method: HTTP method (GET, POST)
            endpoint: API endpoint (e.g., 'sendMessage')
            data: Request payload
            files: Files to upload
        
        Returns:
            API response result
        
        Raises:
            TelegramAPIError: If API returns an error
        """
        url = f"/{endpoint}"
        
        # Clean None values from data
        if data:
            data = {k: v for k, v in data.items() if v is not None}
        
        last_error = None
        
        for attempt in range(self.max_retries):
            try:
                if method.upper() == 'GET':
                    response = await self.client.get(url, params=data)
                else:
                    if files:
                        # Multipart form data for file uploads
                        response = await self.client.post(url, data=data, files=files)
                    else:
                        response = await self.client.post(url, json=data)
                
                result = response.json()
                
                if not result.get('ok'):
                    error_code = result.get('error_code', 0)
                    description = result.get('description', 'Unknown error')
                    
                    # Check for rate limiting
                    if error_code == 429:
                        retry_after = result.get('parameters', {}).get('retry_after', 5)
                        logger.warning(f"Rate limited, waiting {retry_after}s")
                        import asyncio
                        await asyncio.sleep(retry_after)
                        continue
                    
                    raise TelegramAPIError(
                        message=f"Telegram API error: {description}",
                        error_code=error_code,
                        description=description
                    )
                
                return result.get('result', {})
                
            except httpx.RequestError as e:
                last_error = e
                logger.warning(f"Request failed (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries - 1:
                    import asyncio
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
        
        raise TelegramAPIError(f"Request failed after {self.max_retries} attempts: {last_error}")
    
    # ==================== BOT INFO ====================
    
    async def get_me(self) -> Dict[str, Any]:
        """
        Get bot information.
        
        Returns:
            Bot user object with id, first_name, username, etc.
        """
        return await self._request('GET', 'getMe')
    
    async def get_webhook_info(self) -> Dict[str, Any]:
        """
        Get current webhook configuration.
        
        Returns:
            WebhookInfo object
        """
        return await self._request('GET', 'getWebhookInfo')
    
    # ==================== WEBHOOK MANAGEMENT ====================
    
    async def set_webhook(
        self,
        url: str,
        certificate: Optional[str] = None,
        ip_address: Optional[str] = None,
        max_connections: Optional[int] = None,
        allowed_updates: Optional[List[str]] = None,
        drop_pending_updates: bool = False,
        secret_token: Optional[str] = None
    ) -> bool:
        """
        Set webhook URL for receiving updates.
        
        Args:
            url: HTTPS URL for webhook
            certificate: Upload your public key certificate
            ip_address: Fixed IP address for webhook
            max_connections: Max simultaneous connections (1-100)
            allowed_updates: List of update types to receive
            drop_pending_updates: Drop pending updates
            secret_token: Secret token for X-Telegram-Bot-Api-Secret-Token header
        
        Returns:
            True on success
        """
        data = {
            'url': url,
            'certificate': certificate,
            'ip_address': ip_address,
            'max_connections': max_connections,
            'allowed_updates': allowed_updates,
            'drop_pending_updates': drop_pending_updates,
            'secret_token': secret_token
        }
        
        result = await self._request('POST', 'setWebhook', data)
        logger.info(f"Webhook set to {url}")
        return result
    
    async def delete_webhook(
        self,
        drop_pending_updates: bool = False
    ) -> bool:
        """
        Remove webhook integration.
        
        Args:
            drop_pending_updates: Drop pending updates
        
        Returns:
            True on success
        """
        data = {'drop_pending_updates': drop_pending_updates}
        result = await self._request('POST', 'deleteWebhook', data)
        logger.info("Webhook deleted")
        return result
    
    # ==================== SENDING MESSAGES ====================
    
    async def send_message(
        self,
        chat_id: Union[int, str],
        text: str,
        parse_mode: Optional[str] = None,
        entities: Optional[List[Dict]] = None,
        disable_web_page_preview: bool = False,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a text message.
        
        Args:
            chat_id: Target chat ID or @username
            text: Message text (1-4096 characters)
            parse_mode: HTML, Markdown, or MarkdownV2
            entities: Special entities in text (bold, links, etc)
            disable_web_page_preview: Disable link previews
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply message not found
            reply_markup: Inline keyboard or custom reply keyboard
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode,
            'entities': entities,
            'disable_web_page_preview': disable_web_page_preview,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'sendMessage', data)
        logger.debug(f"Sent message to {chat_id}: {text[:50]}...")
        return result
    
    async def send_photo(
        self,
        chat_id: Union[int, str],
        photo_url: str,
        caption: Optional[str] = None,
        parse_mode: Optional[str] = None,
        caption_entities: Optional[List[Dict]] = None,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a photo by URL or file_id.
        
        Args:
            chat_id: Target chat ID
            photo_url: Photo URL or file_id
            caption: Photo caption (0-1024 characters)
            parse_mode: Caption parse mode
            caption_entities: Special entities in caption
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply not found
            reply_markup: Keyboard markup
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'photo': photo_url,
            'caption': caption,
            'parse_mode': parse_mode,
            'caption_entities': caption_entities,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'sendPhoto', data)
        logger.debug(f"Sent photo to {chat_id}")
        return result
    
    async def send_document(
        self,
        chat_id: Union[int, str],
        document_url: str,
        filename: Optional[str] = None,
        caption: Optional[str] = None,
        parse_mode: Optional[str] = None,
        caption_entities: Optional[List[Dict]] = None,
        disable_content_type_detection: bool = False,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a document/file.
        
        Args:
            chat_id: Target chat ID
            document_url: Document URL or file_id
            filename: Custom filename
            caption: Document caption
            parse_mode: Caption parse mode
            caption_entities: Special entities in caption
            disable_content_type_detection: Disable MIME type auto-detection
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply not found
            reply_markup: Keyboard markup
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'document': document_url,
            'caption': caption,
            'parse_mode': parse_mode,
            'caption_entities': caption_entities,
            'disable_content_type_detection': disable_content_type_detection,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        if filename:
            # For custom filename, we need to include it in the URL
            # This only works if document is a URL
            pass  # Telegram uses the URL filename by default
        
        result = await self._request('POST', 'sendDocument', data)
        logger.debug(f"Sent document to {chat_id}")
        return result
    
    async def send_video(
        self,
        chat_id: Union[int, str],
        video_url: str,
        caption: Optional[str] = None,
        parse_mode: Optional[str] = None,
        caption_entities: Optional[List[Dict]] = None,
        duration: Optional[int] = None,
        width: Optional[int] = None,
        height: Optional[int] = None,
        supports_streaming: bool = True,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a video.
        
        Args:
            chat_id: Target chat ID
            video_url: Video URL or file_id
            caption: Video caption
            parse_mode: Caption parse mode
            caption_entities: Special entities in caption
            duration: Video duration in seconds
            width: Video width
            height: Video height
            supports_streaming: Allow streaming
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply not found
            reply_markup: Keyboard markup
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'video': video_url,
            'caption': caption,
            'parse_mode': parse_mode,
            'caption_entities': caption_entities,
            'duration': duration,
            'width': width,
            'height': height,
            'supports_streaming': supports_streaming,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'sendVideo', data)
        logger.debug(f"Sent video to {chat_id}")
        return result
    
    async def send_audio(
        self,
        chat_id: Union[int, str],
        audio_url: str,
        caption: Optional[str] = None,
        parse_mode: Optional[str] = None,
        caption_entities: Optional[List[Dict]] = None,
        duration: Optional[int] = None,
        performer: Optional[str] = None,
        title: Optional[str] = None,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send an audio file.
        
        Args:
            chat_id: Target chat ID
            audio_url: Audio URL or file_id
            caption: Audio caption
            parse_mode: Caption parse mode
            caption_entities: Special entities in caption
            duration: Audio duration in seconds
            performer: Performer name
            title: Track title
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply not found
            reply_markup: Keyboard markup
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'audio': audio_url,
            'caption': caption,
            'parse_mode': parse_mode,
            'caption_entities': caption_entities,
            'duration': duration,
            'performer': performer,
            'title': title,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'sendAudio', data)
        logger.debug(f"Sent audio to {chat_id}")
        return result
    
    async def send_location(
        self,
        chat_id: Union[int, str],
        latitude: float,
        longitude: float,
        horizontal_accuracy: Optional[float] = None,
        live_period: Optional[int] = None,
        heading: Optional[int] = None,
        proximity_alert_radius: Optional[int] = None,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a location.
        
        Args:
            chat_id: Target chat ID
            latitude: Latitude
            longitude: Longitude
            horizontal_accuracy: Location accuracy (0-1500 meters)
            live_period: Live location duration (60-86400 seconds)
            heading: Direction (1-360 degrees)
            proximity_alert_radius: Alert radius (1-100000 meters)
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply not found
            reply_markup: Keyboard markup
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'latitude': latitude,
            'longitude': longitude,
            'horizontal_accuracy': horizontal_accuracy,
            'live_period': live_period,
            'heading': heading,
            'proximity_alert_radius': proximity_alert_radius,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'sendLocation', data)
        logger.debug(f"Sent location to {chat_id}")
        return result
    
    async def send_contact(
        self,
        chat_id: Union[int, str],
        phone_number: str,
        first_name: str,
        last_name: Optional[str] = None,
        vcard: Optional[str] = None,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a contact.
        
        Args:
            chat_id: Target chat ID
            phone_number: Contact phone number
            first_name: Contact first name
            last_name: Contact last name
            vcard: vCard formatted data
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply not found
            reply_markup: Keyboard markup
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'phone_number': phone_number,
            'first_name': first_name,
            'last_name': last_name,
            'vcard': vcard,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'sendContact', data)
        logger.debug(f"Sent contact to {chat_id}")
        return result
    
    async def send_poll(
        self,
        chat_id: Union[int, str],
        question: str,
        options: List[str],
        is_anonymous: bool = True,
        poll_type: str = 'regular',
        allows_multiple_answers: bool = False,
        correct_option_id: Optional[int] = None,
        explanation: Optional[str] = None,
        explanation_parse_mode: Optional[str] = None,
        open_period: Optional[int] = None,
        close_date: Optional[int] = None,
        is_closed: bool = False,
        disable_notification: bool = False,
        protect_content: bool = False,
        reply_to_message_id: Optional[int] = None,
        allow_sending_without_reply: bool = True,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Send a poll.
        
        Args:
            chat_id: Target chat ID
            question: Poll question (1-300 characters)
            options: List of answer options (2-10 items)
            is_anonymous: Whether poll is anonymous
            poll_type: 'regular' or 'quiz'
            allows_multiple_answers: Allow multiple choices
            correct_option_id: Correct option index (for quiz)
            explanation: Explanation shown after answer (for quiz)
            explanation_parse_mode: Parse mode for explanation
            open_period: Auto-close after seconds (5-600)
            close_date: Unix timestamp to close poll
            is_closed: Create already closed poll
            disable_notification: Send silently
            protect_content: Protect from forwarding/saving
            reply_to_message_id: Reply to specific message
            allow_sending_without_reply: Send even if reply not found
            reply_markup: Keyboard markup
        
        Returns:
            Sent message object
        """
        data = {
            'chat_id': chat_id,
            'question': question,
            'options': options,
            'is_anonymous': is_anonymous,
            'type': poll_type,
            'allows_multiple_answers': allows_multiple_answers,
            'correct_option_id': correct_option_id,
            'explanation': explanation,
            'explanation_parse_mode': explanation_parse_mode,
            'open_period': open_period,
            'close_date': close_date,
            'is_closed': is_closed,
            'disable_notification': disable_notification,
            'protect_content': protect_content,
            'reply_to_message_id': reply_to_message_id,
            'allow_sending_without_reply': allow_sending_without_reply,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'sendPoll', data)
        logger.debug(f"Sent poll to {chat_id}")
        return result
    
    # ==================== MESSAGE MANAGEMENT ====================
    
    async def edit_message_text(
        self,
        chat_id: Union[int, str],
        message_id: int,
        text: str,
        parse_mode: Optional[str] = None,
        entities: Optional[List[Dict]] = None,
        disable_web_page_preview: bool = False,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Edit a text message.
        
        Args:
            chat_id: Target chat ID
            message_id: Message to edit
            text: New text
            parse_mode: Parse mode
            entities: Special entities
            disable_web_page_preview: Disable link previews
            reply_markup: New inline keyboard
        
        Returns:
            Edited message object
        """
        data = {
            'chat_id': chat_id,
            'message_id': message_id,
            'text': text,
            'parse_mode': parse_mode,
            'entities': entities,
            'disable_web_page_preview': disable_web_page_preview,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'editMessageText', data)
        logger.debug(f"Edited message {message_id} in {chat_id}")
        return result
    
    async def edit_message_caption(
        self,
        chat_id: Union[int, str],
        message_id: int,
        caption: Optional[str] = None,
        parse_mode: Optional[str] = None,
        caption_entities: Optional[List[Dict]] = None,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Edit a message caption.
        
        Args:
            chat_id: Target chat ID
            message_id: Message to edit
            caption: New caption
            parse_mode: Parse mode
            caption_entities: Special entities
            reply_markup: New inline keyboard
        
        Returns:
            Edited message object
        """
        data = {
            'chat_id': chat_id,
            'message_id': message_id,
            'caption': caption,
            'parse_mode': parse_mode,
            'caption_entities': caption_entities,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'editMessageCaption', data)
        logger.debug(f"Edited caption of message {message_id} in {chat_id}")
        return result
    
    async def edit_message_reply_markup(
        self,
        chat_id: Union[int, str],
        message_id: int,
        reply_markup: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Edit message inline keyboard.
        
        Args:
            chat_id: Target chat ID
            message_id: Message to edit
            reply_markup: New inline keyboard
        
        Returns:
            Edited message object
        """
        data = {
            'chat_id': chat_id,
            'message_id': message_id,
            'reply_markup': reply_markup
        }
        
        result = await self._request('POST', 'editMessageReplyMarkup', data)
        logger.debug(f"Edited markup of message {message_id} in {chat_id}")
        return result
    
    async def delete_message(
        self,
        chat_id: Union[int, str],
        message_id: int
    ) -> bool:
        """
        Delete a message.
        
        Args:
            chat_id: Target chat ID
            message_id: Message to delete
        
        Returns:
            True on success
        """
        data = {
            'chat_id': chat_id,
            'message_id': message_id
        }
        
        result = await self._request('POST', 'deleteMessage', data)
        logger.debug(f"Deleted message {message_id} from {chat_id}")
        return result
    
    # ==================== CALLBACK QUERIES ====================
    
    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False,
        url: Optional[str] = None,
        cache_time: int = 0
    ) -> bool:
        """
        Answer a callback query (inline button click).
        
        Args:
            callback_query_id: Callback query ID
            text: Notification text (0-200 characters)
            show_alert: Show alert instead of notification
            url: URL to open (for game bots)
            cache_time: Cache time in seconds
        
        Returns:
            True on success
        """
        data = {
            'callback_query_id': callback_query_id,
            'text': text,
            'show_alert': show_alert,
            'url': url,
            'cache_time': cache_time
        }
        
        result = await self._request('POST', 'answerCallbackQuery', data)
        logger.debug(f"Answered callback query {callback_query_id}")
        return result
    
    # ==================== CHAT ACTIONS ====================
    
    async def send_chat_action(
        self,
        chat_id: Union[int, str],
        action: str
    ) -> bool:
        """
        Send a chat action (typing indicator).
        
        Args:
            chat_id: Target chat ID
            action: Action type: typing, upload_photo, record_video,
                    upload_video, record_voice, upload_voice,
                    upload_document, choose_sticker, find_location,
                    record_video_note, upload_video_note
        
        Returns:
            True on success
        """
        data = {
            'chat_id': chat_id,
            'action': action
        }
        
        result = await self._request('POST', 'sendChatAction', data)
        return result
    
    # ==================== KEYBOARD HELPERS ====================
    
    @staticmethod
    def build_inline_keyboard(
        buttons: List[List[Dict[str, str]]]
    ) -> Dict:
        """
        Build an inline keyboard markup.
        
        Args:
            buttons: 2D list of button dicts with 'text' and 'callback_data' or 'url'
        
        Example:
            keyboard = TelegramClient.build_inline_keyboard([
                [{'text': 'Button 1', 'callback_data': 'action1'}],
                [{'text': 'Link', 'url': 'https://example.com'}]
            ])
        
        Returns:
            InlineKeyboardMarkup dict
        """
        inline_keyboard = []
        for row in buttons:
            keyboard_row = []
            for btn in row:
                button = {'text': btn['text']}
                if 'callback_data' in btn:
                    button['callback_data'] = btn['callback_data']
                elif 'url' in btn:
                    button['url'] = btn['url']
                elif 'switch_inline_query' in btn:
                    button['switch_inline_query'] = btn['switch_inline_query']
                keyboard_row.append(button)
            inline_keyboard.append(keyboard_row)
        
        return {'inline_keyboard': inline_keyboard}
    
    @staticmethod
    def build_reply_keyboard(
        buttons: List[List[str]],
        resize_keyboard: bool = True,
        one_time_keyboard: bool = False,
        input_field_placeholder: Optional[str] = None,
        selective: bool = False
    ) -> Dict:
        """
        Build a reply keyboard markup.
        
        Args:
            buttons: 2D list of button texts
            resize_keyboard: Resize keyboard to fit buttons
            one_time_keyboard: Hide after use
            input_field_placeholder: Placeholder text
            selective: Show only to mentioned users
        
        Example:
            keyboard = TelegramClient.build_reply_keyboard([
                ['Option 1', 'Option 2'],
                ['Cancel']
            ])
        
        Returns:
            ReplyKeyboardMarkup dict
        """
        keyboard = []
        for row in buttons:
            keyboard.append([{'text': btn} for btn in row])
        
        return {
            'keyboard': keyboard,
            'resize_keyboard': resize_keyboard,
            'one_time_keyboard': one_time_keyboard,
            'input_field_placeholder': input_field_placeholder,
            'selective': selective
        }
    
    @staticmethod
    def remove_keyboard(selective: bool = False) -> Dict:
        """
        Remove custom reply keyboard.
        
        Args:
            selective: Remove only for mentioned users
        
        Returns:
            ReplyKeyboardRemove dict
        """
        return {
            'remove_keyboard': True,
            'selective': selective
        }


# Convenience function to create client from bot model
def get_telegram_client(bot) -> TelegramClient:
    """
    Create a TelegramClient from a TelegramBot model instance.
    
    Args:
        bot: TelegramBot model instance
    
    Returns:
        Configured TelegramClient
    """
    return TelegramClient(token=bot.token)
