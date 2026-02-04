"""
FlowCube Generic HTTP Client
For webhook-based integrations with any external API
Multi-Agent Orchestration - 2026-01-30
"""
import logging
import re
import asyncio
from typing import Optional, Dict, Any, List, Union, Literal
from enum import Enum
import httpx
from django.conf import settings

logger = logging.getLogger('flowcube.http_client')


class HTTPMethod(str, Enum):
    GET = "GET"
    POST = "POST"
    PUT = "PUT"
    PATCH = "PATCH"
    DELETE = "DELETE"


class ContentType(str, Enum):
    JSON = "application/json"
    FORM = "application/x-www-form-urlencoded"
    MULTIPART = "multipart/form-data"
    TEXT = "text/plain"


class HTTPClientError(Exception):
    """Custom exception for HTTP client errors"""
    def __init__(self, message: str, status_code: int = None, response_body: Any = None):
        self.message = message
        self.status_code = status_code
        self.response_body = response_body
        super().__init__(self.message)


class GenericHTTPClient:
    """
    Generic async HTTP client for FlowCube integrations

    Features:
    - Async httpx with connection pooling
    - All HTTP methods (GET, POST, PUT, PATCH, DELETE)
    - Custom headers with auth support (Bearer, Token, API Key)
    - Retry with exponential backoff
    - Variable interpolation using {{variable}} syntax
    - JSON and form-data body support
    """

    def __init__(
        self,
        base_url: str = "",
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        default_headers: Dict[str, str] = None
    ):
        self.base_url = base_url.rstrip('/') if base_url else ""
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.default_headers = default_headers or {}
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Lazy initialization of httpx client with connection pooling"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout),
                headers=self.default_headers,
                follow_redirects=True,
                limits=httpx.Limits(
                    max_connections=100,
                    max_keepalive_connections=20
                )
            )
        return self._client

    async def close(self):
        """Close the HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None

    def interpolate_variables(self, text: str, variables: Dict[str, Any]) -> str:
        """
        Replace {{variable}} placeholders with actual values

        Args:
            text: String containing {{variable}} placeholders
            variables: Dictionary of variable names to values

        Returns:
            String with placeholders replaced
        """
        if not text or not variables:
            return text

        def replace_var(match):
            var_name = match.group(1).strip()
            value = variables.get(var_name)
            if value is None:
                return match.group(0)  # Keep original if not found
            return str(value)

        return re.sub(r'\{\{\s*(\w+)\s*\}\}', replace_var, str(text))

    def interpolate_dict(self, data: Dict, variables: Dict[str, Any]) -> Dict:
        """Recursively interpolate variables in a dictionary"""
        if not data or not variables:
            return data

        result = {}
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = self.interpolate_variables(value, variables)
            elif isinstance(value, dict):
                result[key] = self.interpolate_dict(value, variables)
            elif isinstance(value, list):
                result[key] = [
                    self.interpolate_variables(item, variables) if isinstance(item, str)
                    else self.interpolate_dict(item, variables) if isinstance(item, dict)
                    else item
                    for item in value
                ]
            else:
                result[key] = value
        return result

    def build_auth_headers(self, auth_config: Dict[str, Any]) -> Dict[str, str]:
        """
        Build authentication headers from config

        Supported auth types:
        - bearer: {"type": "bearer", "token": "xxx"}
        - token: {"type": "token", "token": "xxx"} -> "Token xxx"
        - api_key: {"type": "api_key", "header": "X-API-Key", "value": "xxx"}
        - basic: {"type": "basic", "username": "xxx", "password": "xxx"}
        """
        if not auth_config:
            return {}

        auth_type = auth_config.get('type', '').lower()
        headers = {}

        if auth_type == 'bearer':
            token = auth_config.get('token', '')
            headers['Authorization'] = f'Bearer {token}'

        elif auth_type == 'token':
            token = auth_config.get('token', '')
            headers['Authorization'] = f'Token {token}'

        elif auth_type == 'api_key':
            header_name = auth_config.get('header', 'X-API-Key')
            value = auth_config.get('value', '')
            headers[header_name] = value

        elif auth_type == 'basic':
            import base64
            username = auth_config.get('username', '')
            password = auth_config.get('password', '')
            credentials = base64.b64encode(f'{username}:{password}'.encode()).decode()
            headers['Authorization'] = f'Basic {credentials}'

        return headers

    async def request(
        self,
        method: Union[HTTPMethod, str],
        url: str,
        headers: Dict[str, str] = None,
        params: Dict[str, Any] = None,
        body: Any = None,
        content_type: Union[ContentType, str] = ContentType.JSON,
        auth: Dict[str, Any] = None,
        variables: Dict[str, Any] = None,
        timeout: int = None
    ) -> Dict[str, Any]:
        """
        Make an HTTP request with retry logic

        Args:
            method: HTTP method (GET, POST, PUT, PATCH, DELETE)
            url: URL path (will be appended to base_url if relative)
            headers: Additional headers
            params: Query parameters
            body: Request body (dict for JSON/form, string for raw)
            content_type: Content type for body
            auth: Authentication config
            variables: Variables for interpolation
            timeout: Override default timeout

        Returns:
            Dict with: status_code, headers, body, is_json
        """
        variables = variables or {}

        # Interpolate URL
        url = self.interpolate_variables(url, variables)
        if not url.startswith(('http://', 'https://')) and self.base_url:
            url = f"{self.base_url}/{url.lstrip('/')}"

        # Build headers
        request_headers = dict(self.default_headers)
        if headers:
            interpolated_headers = self.interpolate_dict(headers, variables)
            request_headers.update(interpolated_headers)

        # Add auth headers
        if auth:
            auth_headers = self.build_auth_headers(auth)
            request_headers.update(auth_headers)

        # Interpolate params
        if params:
            params = self.interpolate_dict(params, variables)

        # Prepare body
        json_body = None
        data_body = None
        content_body = None

        if body:
            if isinstance(body, dict):
                body = self.interpolate_dict(body, variables)
            elif isinstance(body, str):
                body = self.interpolate_variables(body, variables)

            content_type_str = str(content_type.value if isinstance(content_type, ContentType) else content_type)

            if 'json' in content_type_str.lower():
                json_body = body
                request_headers['Content-Type'] = 'application/json'
            elif 'form' in content_type_str.lower():
                data_body = body
                request_headers['Content-Type'] = 'application/x-www-form-urlencoded'
            else:
                content_body = body if isinstance(body, bytes) else str(body).encode()
                request_headers['Content-Type'] = content_type_str

        # Execute with retry
        method_str = method.value if isinstance(method, HTTPMethod) else method.upper()
        last_error = None

        for attempt in range(self.max_retries):
            try:
                logger.info(f"HTTP {method_str} {url} (attempt {attempt + 1}/{self.max_retries})")

                response = await self.client.request(
                    method=method_str,
                    url=url,
                    headers=request_headers,
                    params=params,
                    json=json_body,
                    data=data_body,
                    content=content_body,
                    timeout=timeout or self.timeout
                )

                # Parse response
                is_json = 'application/json' in response.headers.get('content-type', '')

                if is_json:
                    try:
                        response_body = response.json()
                    except:
                        response_body = response.text
                        is_json = False
                else:
                    response_body = response.text

                result = {
                    'status_code': response.status_code,
                    'headers': dict(response.headers),
                    'body': response_body,
                    'is_json': is_json,
                    'success': 200 <= response.status_code < 300
                }

                logger.info(f"HTTP {method_str} {url} -> {response.status_code}")

                # Check for success
                if result['success']:
                    return result

                # Check if should retry (5xx errors)
                if response.status_code >= 500:
                    last_error = HTTPClientError(
                        f"Server error: {response.status_code}",
                        response.status_code,
                        response_body
                    )
                    if attempt < self.max_retries - 1:
                        delay = self.retry_delay * (2 ** attempt)
                        logger.warning(f"Retrying in {delay}s due to {response.status_code}")
                        await asyncio.sleep(delay)
                        continue

                # Return non-5xx errors without retry
                return result

            except httpx.TimeoutException as e:
                last_error = HTTPClientError(f"Request timeout: {e}")
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2 ** attempt)
                    logger.warning(f"Timeout, retrying in {delay}s")
                    await asyncio.sleep(delay)

            except httpx.RequestError as e:
                last_error = HTTPClientError(f"Request error: {e}")
                if attempt < self.max_retries - 1:
                    delay = self.retry_delay * (2 ** attempt)
                    logger.warning(f"Request error, retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)

        # All retries failed
        logger.error(f"All {self.max_retries} attempts failed for {method_str} {url}")
        raise last_error or HTTPClientError("All retry attempts failed")

    # Convenience methods
    async def get(self, url: str, **kwargs) -> Dict[str, Any]:
        return await self.request(HTTPMethod.GET, url, **kwargs)

    async def post(self, url: str, **kwargs) -> Dict[str, Any]:
        return await self.request(HTTPMethod.POST, url, **kwargs)

    async def put(self, url: str, **kwargs) -> Dict[str, Any]:
        return await self.request(HTTPMethod.PUT, url, **kwargs)

    async def patch(self, url: str, **kwargs) -> Dict[str, Any]:
        return await self.request(HTTPMethod.PATCH, url, **kwargs)

    async def delete(self, url: str, **kwargs) -> Dict[str, Any]:
        return await self.request(HTTPMethod.DELETE, url, **kwargs)


class WebhookClient(GenericHTTPClient):
    """
    Specialized client for webhook integrations

    Usage:
        client = WebhookClient()
        result = await client.send_webhook(
            url="https://n8n.frzgroup.com.br/webhook/test",
            payload={"name": "John", "phone": "5511999999999"},
            auth={"type": "bearer", "token": "xxx"}
        )
    """

    async def send_webhook(
        self,
        url: str,
        payload: Dict[str, Any],
        method: str = "POST",
        headers: Dict[str, str] = None,
        auth: Dict[str, Any] = None,
        variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send a webhook with JSON payload"""
        return await self.request(
            method=method,
            url=url,
            body=payload,
            content_type=ContentType.JSON,
            headers=headers,
            auth=auth,
            variables=variables
        )

    async def receive_and_forward(
        self,
        source_payload: Dict[str, Any],
        target_url: str,
        transform: Dict[str, str] = None,
        auth: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Receive webhook payload, optionally transform, and forward

        Args:
            source_payload: Incoming webhook payload
            target_url: URL to forward to
            transform: Field mapping {"target_field": "{{source_field}}"}
            auth: Auth config for target

        Returns:
            Response from target
        """
        if transform:
            payload = self.interpolate_dict(transform, source_payload)
        else:
            payload = source_payload

        return await self.send_webhook(
            url=target_url,
            payload=payload,
            auth=auth
        )


# Pre-configured clients for common integrations
def get_salescube_client() -> GenericHTTPClient:
    """Get client configured for SalesCube API"""
    return GenericHTTPClient(
        base_url="https://api.frzglobal.com.br",
        default_headers={
            "Authorization": f"Token {getattr(settings, 'SALESCUBE_API_TOKEN', '6550a421c3efbb107bfd4d1ef68a3320e06345ae')}",
            "Content-Type": "application/json"
        }
    )


def get_n8n_client() -> GenericHTTPClient:
    """Get client configured for N8N webhooks"""
    return GenericHTTPClient(
        base_url="https://n8n.frzgroup.com.br",
        default_headers={
            "Content-Type": "application/json"
        }
    )


# Singleton instances
_webhook_client: Optional[WebhookClient] = None


def get_webhook_client() -> WebhookClient:
    """Get singleton webhook client"""
    global _webhook_client
    if _webhook_client is None:
        _webhook_client = WebhookClient()
    return _webhook_client
