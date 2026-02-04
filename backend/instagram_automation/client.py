"""
Instagram Graph API Client
instagram_automation/client.py

Async HTTP client for Instagram Graph API (Messaging).
Supports Instagram DM messaging via Meta's Graph API v19.0+.

Created: 2026-02-02
"""
import logging
import asyncio
import hashlib
import hmac
import time
from typing import Optional, Dict, Any, List, Union
from enum import Enum
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger('flowcube.instagram')

# Instagram Graph API base URL
GRAPH_API_BASE = 'https://graph.facebook.com'
GRAPH_API_VERSION = 'v19.0'


class MessageTag(str, Enum):
    """Message tags for sending outside 24-hour window"""
    CONFIRMED_EVENT_UPDATE = 'CONFIRMED_EVENT_UPDATE'
    POST_PURCHASE_UPDATE = 'POST_PURCHASE_UPDATE'
    ACCOUNT_UPDATE = 'ACCOUNT_UPDATE'
    HUMAN_AGENT = 'HUMAN_AGENT'


class InstagramAPIError(Exception):
    """Exception for Instagram API errors"""
    def __init__(
        self, 
        message: str, 
        error_code: int = None, 
        error_subcode: int = None,
        error_type: str = None,
        fbtrace_id: str = None
    ):
        self.message = message
        self.error_code = error_code
        self.error_subcode = error_subcode
        self.error_type = error_type
        self.fbtrace_id = fbtrace_id
        super().__init__(message)
    
    @classmethod
    def from_response(cls, error_data: dict) -> 'InstagramAPIError':
        """Create exception from API error response"""
        return cls(
            message=error_data.get('message', 'Unknown error'),
            error_code=error_data.get('code'),
            error_subcode=error_data.get('error_subcode'),
            error_type=error_data.get('type'),
            fbtrace_id=error_data.get('fbtrace_id')
        )
    
    def is_rate_limited(self) -> bool:
        """Check if this is a rate limit error"""
        return self.error_code in (4, 17, 32, 613)
    
    def is_expired_token(self) -> bool:
        """Check if token is expired"""
        return self.error_code == 190
    
    def is_permission_error(self) -> bool:
        """Check if this is a permission error"""
        return self.error_code in (10, 200, 230)
    
    def is_window_closed(self) -> bool:
        """Check if 24-hour window is closed"""
        return self.error_code == 10 and self.error_subcode == 2018278


class RateLimiter:
    """
    Rate limiter for Instagram API calls.
    Instagram limit: 200 messages per user per day.
    Also handles general API rate limits.
    """
    
    def __init__(self, max_requests_per_minute: int = 60):
        self.max_rpm = max_requests_per_minute
        self.requests: List[float] = []
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        """Wait if necessary to stay within rate limits"""
        async with self._lock:
            now = time.time()
            # Remove requests older than 1 minute
            self.requests = [r for r in self.requests if now - r < 60]
            
            if len(self.requests) >= self.max_rpm:
                # Wait until oldest request is more than 1 minute old
                wait_time = 60 - (now - self.requests[0])
                if wait_time > 0:
                    logger.warning(f"Rate limit reached, waiting {wait_time:.1f}s")
                    await asyncio.sleep(wait_time)
            
            self.requests.append(now)
    
    def reset(self):
        """Reset the rate limiter"""
        self.requests = []


class InstagramGraphClient:
    """
    Async client for Instagram Graph API (Messaging).
    
    Usage:
        client = InstagramGraphClient(
            access_token='your_access_token',
            instagram_id='your_instagram_id'
        )
        
        # Send text message
        result = await client.send_text_message(
            recipient_id='user_igsid',
            text='Hello from FlowCube!'
        )
        
        # Send with quick replies
        await client.send_message_with_quick_replies(
            recipient_id='user_igsid',
            text='Choose an option:',
            quick_replies=[
                {'title': 'Option 1', 'payload': 'opt1'},
                {'title': 'Option 2', 'payload': 'opt2'}
            ]
        )
    """
    
    def __init__(
        self,
        access_token: str,
        instagram_id: str,
        page_id: str = None,
        timeout: int = 30,
        max_retries: int = 3,
        api_version: str = GRAPH_API_VERSION
    ):
        """
        Initialize Instagram Graph API client.
        
        Args:
            access_token: Page access token with instagram_manage_messages permission
            instagram_id: Instagram-scoped user ID (business account)
            page_id: Facebook Page ID (optional, for some operations)
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts for failed requests
            api_version: Graph API version (e.g., 'v19.0')
        """
        self.access_token = access_token
        self.instagram_id = instagram_id
        self.page_id = page_id
        self.timeout = timeout
        self.max_retries = max_retries
        self.api_version = api_version
        self.base_url = f"{GRAPH_API_BASE}/{api_version}"
        self._client: Optional[httpx.AsyncClient] = None
        self._rate_limiter = RateLimiter(max_requests_per_minute=60)
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        params: Dict = None,
        json_data: Dict = None,
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        Make an API request with error handling and retries.
        
        Args:
            method: HTTP method (GET, POST, DELETE)
            endpoint: API endpoint path
            params: Query parameters
            json_data: JSON body data
            retry_count: Current retry attempt
            
        Returns:
            API response as dictionary
        """
        await self._rate_limiter.acquire()
        
        url = f"{self.base_url}/{endpoint}"
        
        # Add access token to params
        if params is None:
            params = {}
        params['access_token'] = self.access_token
        
        try:
            if method.upper() == 'GET':
                response = await self.client.get(url, params=params)
            elif method.upper() == 'POST':
                response = await self.client.post(url, params=params, json=json_data)
            elif method.upper() == 'DELETE':
                response = await self.client.delete(url, params=params)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Log request
            logger.debug(f"Instagram API {method} {endpoint}: {response.status_code}")
            
            # Parse response
            data = response.json()
            
            # Check for error
            if 'error' in data:
                error = InstagramAPIError.from_response(data['error'])
                
                # Handle rate limiting with retry
                if error.is_rate_limited() and retry_count < self.max_retries:
                    wait_time = min(2 ** retry_count * 10, 60)
                    logger.warning(f"Rate limited, retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                    return await self._request(
                        method, endpoint, params, json_data, retry_count + 1
                    )
                
                raise error
            
            return data
            
        except httpx.TimeoutException:
            if retry_count < self.max_retries:
                logger.warning(f"Request timeout, retrying ({retry_count + 1}/{self.max_retries})")
                await asyncio.sleep(2 ** retry_count)
                return await self._request(
                    method, endpoint, params, json_data, retry_count + 1
                )
            raise InstagramAPIError("Request timeout after retries")
            
        except httpx.HTTPError as e:
            if retry_count < self.max_retries:
                logger.warning(f"HTTP error, retrying: {e}")
                await asyncio.sleep(2 ** retry_count)
                return await self._request(
                    method, endpoint, params, json_data, retry_count + 1
                )
            raise InstagramAPIError(f"HTTP error: {str(e)}")
    
    # ==================== ACCOUNT OPERATIONS ====================
    
    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get Instagram account information.
        
        Returns:
            Account info including username, name, profile_picture_url
        """
        return await self._request(
            'GET',
            self.instagram_id,
            params={
                'fields': 'username,name,profile_picture_url,biography,ig_id,followers_count,follows_count,media_count'
            }
        )
    
    async def get_conversations(
        self,
        limit: int = 25,
        after: str = None
    ) -> Dict[str, Any]:
        """
        Get list of conversations (threads).
        
        Args:
            limit: Number of conversations to return
            after: Cursor for pagination
            
        Returns:
            List of conversations with pagination
        """
        params = {
            'fields': 'participants,updated_time,messages{message,from,to,created_time}',
            'limit': limit
        }
        if after:
            params['after'] = after
        
        return await self._request(
            'GET',
            f"{self.instagram_id}/conversations",
            params=params
        )
    
    async def get_conversation_messages(
        self,
        conversation_id: str,
        limit: int = 50,
        after: str = None
    ) -> Dict[str, Any]:
        """
        Get messages from a specific conversation.
        
        Args:
            conversation_id: Conversation/thread ID
            limit: Number of messages to return
            after: Cursor for pagination
        """
        params = {
            'fields': 'message,from,to,created_time,attachments,shares,story',
            'limit': limit
        }
        if after:
            params['after'] = after
        
        return await self._request(
            'GET',
            f"{conversation_id}/messages",
            params=params
        )
    
    # ==================== MESSAGING OPERATIONS ====================
    
    async def send_text_message(
        self,
        recipient_id: str,
        text: str,
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send a text message to a user.
        
        Args:
            recipient_id: Instagram-scoped user ID (IGSID)
            text: Message text (max 2000 chars)
            message_tag: Message tag for sending outside 24-hour window
            
        Returns:
            Response with recipient_id and message_id
        """
        if len(text) > 2000:
            raise ValueError("Text message cannot exceed 2000 characters")
        
        payload = {
            'recipient': {'id': recipient_id},
            'message': {'text': text}
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_message_with_quick_replies(
        self,
        recipient_id: str,
        text: str,
        quick_replies: List[Dict[str, str]],
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send a message with quick reply buttons.
        
        Args:
            recipient_id: Instagram-scoped user ID
            text: Message text
            quick_replies: List of quick reply options
                [{'title': 'Button text', 'payload': 'callback_data'}]
            message_tag: Optional message tag
            
        Returns:
            Response with message_id
        """
        if len(quick_replies) > 13:
            raise ValueError("Maximum 13 quick replies allowed")
        
        formatted_replies = []
        for qr in quick_replies:
            formatted_replies.append({
                'content_type': qr.get('content_type', 'text'),
                'title': qr['title'][:80],  # Max 80 chars
                'payload': qr['payload'][:1000]  # Max 1000 chars
            })
        
        payload = {
            'recipient': {'id': recipient_id},
            'message': {
                'text': text,
                'quick_replies': formatted_replies
            }
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_image(
        self,
        recipient_id: str,
        image_url: str,
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send an image message.
        
        Args:
            recipient_id: Instagram-scoped user ID
            image_url: URL of the image to send
            message_tag: Optional message tag
            
        Returns:
            Response with message_id
        """
        payload = {
            'recipient': {'id': recipient_id},
            'message': {
                'attachment': {
                    'type': 'image',
                    'payload': {'url': image_url}
                }
            }
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_video(
        self,
        recipient_id: str,
        video_url: str,
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send a video message.
        
        Args:
            recipient_id: Instagram-scoped user ID
            video_url: URL of the video to send
            message_tag: Optional message tag
        """
        payload = {
            'recipient': {'id': recipient_id},
            'message': {
                'attachment': {
                    'type': 'video',
                    'payload': {'url': video_url}
                }
            }
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_audio(
        self,
        recipient_id: str,
        audio_url: str,
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send an audio message.
        
        Args:
            recipient_id: Instagram-scoped user ID
            audio_url: URL of the audio file
            message_tag: Optional message tag
        """
        payload = {
            'recipient': {'id': recipient_id},
            'message': {
                'attachment': {
                    'type': 'audio',
                    'payload': {'url': audio_url}
                }
            }
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_file(
        self,
        recipient_id: str,
        file_url: str,
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send a file attachment.
        
        Args:
            recipient_id: Instagram-scoped user ID
            file_url: URL of the file
            message_tag: Optional message tag
        """
        payload = {
            'recipient': {'id': recipient_id},
            'message': {
                'attachment': {
                    'type': 'file',
                    'payload': {'url': file_url}
                }
            }
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_generic_template(
        self,
        recipient_id: str,
        elements: List[Dict[str, Any]],
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send a generic template message with cards.
        
        Args:
            recipient_id: Instagram-scoped user ID
            elements: List of template elements (max 10)
                [{
                    'title': 'Card title',
                    'subtitle': 'Card subtitle',
                    'image_url': 'https://...',
                    'default_action': {'type': 'web_url', 'url': 'https://...'},
                    'buttons': [{'type': 'web_url', 'url': '...', 'title': 'Button'}]
                }]
            message_tag: Optional message tag
        """
        if len(elements) > 10:
            raise ValueError("Maximum 10 elements allowed in generic template")
        
        payload = {
            'recipient': {'id': recipient_id},
            'message': {
                'attachment': {
                    'type': 'template',
                    'payload': {
                        'template_type': 'generic',
                        'elements': elements
                    }
                }
            }
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_product_template(
        self,
        recipient_id: str,
        product_id: str,
        message_tag: MessageTag = None
    ) -> Dict[str, Any]:
        """
        Send a product template message.
        
        Args:
            recipient_id: Instagram-scoped user ID
            product_id: Facebook Catalog product ID
            message_tag: Optional message tag
        """
        payload = {
            'recipient': {'id': recipient_id},
            'message': {
                'attachment': {
                    'type': 'template',
                    'payload': {
                        'template_type': 'product',
                        'elements': [
                            {'id': product_id}
                        ]
                    }
                }
            }
        }
        
        if message_tag:
            payload['messaging_type'] = 'MESSAGE_TAG'
            payload['tag'] = message_tag.value
        else:
            payload['messaging_type'] = 'RESPONSE'
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def send_reaction(
        self,
        recipient_id: str,
        message_id: str,
        reaction: str = 'love'
    ) -> Dict[str, Any]:
        """
        Send a reaction to a message.
        
        Args:
            recipient_id: Instagram-scoped user ID
            message_id: ID of the message to react to
            reaction: Reaction type (love, laugh, wow, sad, angry, like)
        """
        payload = {
            'recipient': {'id': recipient_id},
            'sender_action': 'react',
            'payload': {
                'message_id': message_id,
                'reaction': reaction
            }
        }
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def mark_seen(self, recipient_id: str) -> Dict[str, Any]:
        """
        Mark messages as seen (typing indicator).
        
        Args:
            recipient_id: Instagram-scoped user ID
        """
        payload = {
            'recipient': {'id': recipient_id},
            'sender_action': 'mark_seen'
        }
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def typing_on(self, recipient_id: str) -> Dict[str, Any]:
        """
        Show typing indicator.
        
        Args:
            recipient_id: Instagram-scoped user ID
        """
        payload = {
            'recipient': {'id': recipient_id},
            'sender_action': 'typing_on'
        }
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    async def typing_off(self, recipient_id: str) -> Dict[str, Any]:
        """
        Hide typing indicator.
        
        Args:
            recipient_id: Instagram-scoped user ID
        """
        payload = {
            'recipient': {'id': recipient_id},
            'sender_action': 'typing_off'
        }
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messages",
            json_data=payload
        )
    
    # ==================== ICE BREAKERS ====================
    
    async def get_ice_breakers(self) -> Dict[str, Any]:
        """
        Get current ice breaker configuration.
        
        Returns:
            List of configured ice breakers
        """
        return await self._request(
            'GET',
            f"{self.instagram_id}/messenger_profile",
            params={'fields': 'ice_breakers'}
        )
    
    async def set_ice_breakers(
        self,
        ice_breakers: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Set ice breaker questions.
        
        Args:
            ice_breakers: List of ice breaker questions (max 4)
                [{'question': 'How can I help?', 'payload': 'help'}]
                
        Returns:
            Success response
        """
        if len(ice_breakers) > 4:
            raise ValueError("Maximum 4 ice breakers allowed")
        
        formatted = []
        for ib in ice_breakers:
            formatted.append({
                'question': ib['question'][:80],  # Max 80 chars
                'payload': ib['payload'][:1000]  # Max 1000 chars
            })
        
        return await self._request(
            'POST',
            f"{self.instagram_id}/messenger_profile",
            json_data={'ice_breakers': formatted}
        )
    
    async def delete_ice_breakers(self) -> Dict[str, Any]:
        """Delete all ice breakers."""
        return await self._request(
            'DELETE',
            f"{self.instagram_id}/messenger_profile",
            params={'fields': 'ice_breakers'}
        )
    
    # ==================== PERSISTENT MENU ====================
    
    async def get_persistent_menu(self) -> Dict[str, Any]:
        """Get persistent menu configuration."""
        return await self._request(
            'GET',
            f"{self.instagram_id}/messenger_profile",
            params={'fields': 'persistent_menu'}
        )
    
    async def set_persistent_menu(
        self,
        menu_items: List[Dict[str, Any]],
        composer_input_disabled: bool = False
    ) -> Dict[str, Any]:
        """
        Set persistent menu.
        
        Args:
            menu_items: List of menu items
            composer_input_disabled: Whether to disable text input
        """
        return await self._request(
            'POST',
            f"{self.instagram_id}/messenger_profile",
            json_data={
                'persistent_menu': [{
                    'locale': 'default',
                    'composer_input_disabled': composer_input_disabled,
                    'call_to_actions': menu_items
                }]
            }
        )
    
    async def delete_persistent_menu(self) -> Dict[str, Any]:
        """Delete persistent menu."""
        return await self._request(
            'DELETE',
            f"{self.instagram_id}/messenger_profile",
            params={'fields': 'persistent_menu'}
        )
    
    # ==================== HUMAN AGENT HANDOVER ====================
    
    async def pass_thread_control(
        self,
        recipient_id: str,
        target_app_id: str,
        metadata: str = None
    ) -> Dict[str, Any]:
        """
        Pass thread control to another app (handover protocol).
        
        Args:
            recipient_id: Instagram-scoped user ID
            target_app_id: App ID to pass control to
            metadata: Optional metadata string
        """
        payload = {
            'recipient': {'id': recipient_id},
            'target_app_id': target_app_id
        }
        if metadata:
            payload['metadata'] = metadata
        
        return await self._request(
            'POST',
            f"{self.page_id}/pass_thread_control",
            json_data=payload
        )
    
    async def take_thread_control(
        self,
        recipient_id: str,
        metadata: str = None
    ) -> Dict[str, Any]:
        """
        Take thread control back (primary receiver only).
        
        Args:
            recipient_id: Instagram-scoped user ID
            metadata: Optional metadata string
        """
        payload = {'recipient': {'id': recipient_id}}
        if metadata:
            payload['metadata'] = metadata
        
        return await self._request(
            'POST',
            f"{self.page_id}/take_thread_control",
            json_data=payload
        )
    
    async def request_thread_control(
        self,
        recipient_id: str,
        metadata: str = None
    ) -> Dict[str, Any]:
        """
        Request thread control from current owner.
        
        Args:
            recipient_id: Instagram-scoped user ID
            metadata: Optional metadata string
        """
        payload = {'recipient': {'id': recipient_id}}
        if metadata:
            payload['metadata'] = metadata
        
        return await self._request(
            'POST',
            f"{self.page_id}/request_thread_control",
            json_data=payload
        )
    
    # ==================== USER PROFILE ====================
    
    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Get user profile information.
        
        Args:
            user_id: Instagram-scoped user ID
            
        Returns:
            User profile with name, username, profile_picture
        """
        return await self._request(
            'GET',
            user_id,
            params={
                'fields': 'name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user'
            }
        )
    
    # ==================== WEBHOOK VERIFICATION ====================
    
    @staticmethod
    def verify_webhook_signature(
        payload: bytes,
        signature: str,
        app_secret: str
    ) -> bool:
        """
        Verify webhook request signature.
        
        Args:
            payload: Raw request body
            signature: X-Hub-Signature-256 header value
            app_secret: Facebook App secret
            
        Returns:
            True if signature is valid
        """
        if not signature or not signature.startswith('sha256='):
            return False
        
        expected_signature = hmac.new(
            app_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(
            signature[7:],  # Remove 'sha256=' prefix
            expected_signature
        )
    
    @staticmethod
    def generate_webhook_challenge_response(
        mode: str,
        token: str,
        challenge: str,
        verify_token: str
    ) -> Optional[str]:
        """
        Generate response for webhook verification challenge.
        
        Args:
            mode: hub.mode from query params
            token: hub.verify_token from query params
            challenge: hub.challenge from query params
            verify_token: Your verify token
            
        Returns:
            Challenge value if valid, None otherwise
        """
        if mode == 'subscribe' and token == verify_token:
            return challenge
        return None


def get_instagram_client(account) -> InstagramGraphClient:
    """
    Create an Instagram client from an InstagramAccount model instance.
    
    Args:
        account: InstagramAccount model instance
        
    Returns:
        Configured InstagramGraphClient
    """
    return InstagramGraphClient(
        access_token=account.access_token,
        instagram_id=account.instagram_id,
        page_id=account.facebook_page_id
    )


# ==================== HELPER FUNCTIONS ====================

def parse_messaging_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse an Instagram messaging webhook event.
    
    Args:
        event: Raw messaging event from webhook
        
    Returns:
        Parsed event with normalized fields
    """
    result = {
        'sender_id': event.get('sender', {}).get('id'),
        'recipient_id': event.get('recipient', {}).get('id'),
        'timestamp': event.get('timestamp'),
        'event_type': None,
        'data': {}
    }
    
    if 'message' in event:
        msg = event['message']
        result['event_type'] = 'message'
        result['data'] = {
            'mid': msg.get('mid'),
            'text': msg.get('text'),
            'is_echo': msg.get('is_echo', False),
            'attachments': msg.get('attachments', []),
            'quick_reply': msg.get('quick_reply'),
            'reply_to': msg.get('reply_to'),
            'referral': msg.get('referral')
        }
    elif 'postback' in event:
        result['event_type'] = 'postback'
        result['data'] = {
            'payload': event['postback'].get('payload'),
            'title': event['postback'].get('title'),
            'mid': event['postback'].get('mid')
        }
    elif 'referral' in event:
        result['event_type'] = 'referral'
        result['data'] = event['referral']
    elif 'read' in event:
        result['event_type'] = 'read'
        result['data'] = {
            'watermark': event['read'].get('watermark')
        }
    elif 'delivery' in event:
        result['event_type'] = 'delivery'
        result['data'] = {
            'mids': event['delivery'].get('mids', []),
            'watermark': event['delivery'].get('watermark')
        }
    elif 'reaction' in event:
        result['event_type'] = 'reaction'
        result['data'] = {
            'mid': event['reaction'].get('mid'),
            'action': event['reaction'].get('action'),
            'reaction': event['reaction'].get('reaction'),
            'emoji': event['reaction'].get('emoji')
        }
    
    return result


def format_quick_replies(replies: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Format quick replies for API.
    
    Args:
        replies: List of {'title': '...', 'payload': '...'}
        
    Returns:
        Formatted quick replies
    """
    formatted = []
    for reply in replies[:13]:  # Max 13
        formatted.append({
            'content_type': reply.get('content_type', 'text'),
            'title': reply['title'][:80],
            'payload': reply['payload'][:1000]
        })
    return formatted
