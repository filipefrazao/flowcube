"""
FlowCube Agent Tools

Custom tools for AI agents including:
- HTTP request tool
- Database query tool
- SalesCube integration tool
- WhatsApp/Telegram message tool
- Custom tool factory

Author: FRZ Group
"""

import asyncio
import hashlib
import json
import logging
import re
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Type, Union

import httpx
from django.conf import settings
from django.core.cache import cache
from django.db import connections

from langchain_core.tools import BaseTool, StructuredTool, tool
from pydantic import BaseModel, Field, create_model

logger = logging.getLogger(__name__)


# =============================================================================
# TOOL REGISTRY
# =============================================================================

_TOOL_REGISTRY: Dict[str, BaseTool] = {}


def register_tool(tool_instance: BaseTool):
    """Register a tool in the global registry."""
    _TOOL_REGISTRY[tool_instance.name] = tool_instance


def get_tool(name: str) -> Optional[BaseTool]:
    """Get a tool from the registry."""
    return _TOOL_REGISTRY.get(name)


def get_all_tools() -> List[BaseTool]:
    """Get all registered tools."""
    return list(_TOOL_REGISTRY.values())


def clear_registry():
    """Clear the tool registry."""
    _TOOL_REGISTRY.clear()


# =============================================================================
# BASE TOOL CLASSES
# =============================================================================

class FlowCubeBaseTool(BaseTool, ABC):
    """
    Base class for FlowCube tools.
    
    Provides common functionality like caching, rate limiting, and error handling.
    """
    
    # Configuration
    cache_enabled: bool = False
    cache_ttl: int = 300  # seconds
    rate_limit_enabled: bool = False
    rate_limit_calls: int = 60  # per minute
    timeout: int = 30  # seconds
    retry_count: int = 0
    retry_delay: int = 1  # seconds
    
    def _get_cache_key(self, **kwargs) -> str:
        """Generate cache key from arguments."""
        key_data = f'{self.name}:{json.dumps(kwargs, sort_keys=True)}'
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _check_rate_limit(self) -> bool:
        """Check if rate limit is exceeded."""
        if not self.rate_limit_enabled:
            return True
        
        key = f'rate_limit:{self.name}'
        current = cache.get(key, 0)
        
        if current >= self.rate_limit_calls:
            return False
        
        cache.set(key, current + 1, timeout=60)
        return True
    
    def _run(self, **kwargs) -> str:
        """Synchronous run with caching and error handling."""
        # Check rate limit
        if not self._check_rate_limit():
            return json.dumps({'error': 'Rate limit exceeded'})
        
        # Check cache
        if self.cache_enabled:
            cache_key = self._get_cache_key(**kwargs)
            cached = cache.get(cache_key)
            if cached is not None:
                return cached
        
        # Execute with retry
        last_error = None
        for attempt in range(self.retry_count + 1):
            try:
                result = self._execute(**kwargs)
                
                # Cache result
                if self.cache_enabled:
                    cache.set(cache_key, result, timeout=self.cache_ttl)
                
                return result
            except Exception as e:
                last_error = e
                if attempt < self.retry_count:
                    time.sleep(self.retry_delay)
        
        return json.dumps({'error': str(last_error)})
    
    async def _arun(self, **kwargs) -> str:
        """Async run with caching and error handling."""
        # Check rate limit
        if not self._check_rate_limit():
            return json.dumps({'error': 'Rate limit exceeded'})
        
        # Check cache
        if self.cache_enabled:
            cache_key = self._get_cache_key(**kwargs)
            cached = cache.get(cache_key)
            if cached is not None:
                return cached
        
        # Execute with retry
        last_error = None
        for attempt in range(self.retry_count + 1):
            try:
                result = await self._aexecute(**kwargs)
                
                # Cache result
                if self.cache_enabled:
                    cache.set(cache_key, result, timeout=self.cache_ttl)
                
                return result
            except Exception as e:
                last_error = e
                if attempt < self.retry_count:
                    await asyncio.sleep(self.retry_delay)
        
        return json.dumps({'error': str(last_error)})
    
    @abstractmethod
    def _execute(self, **kwargs) -> str:
        """Execute the tool (sync)."""
        pass
    
    async def _aexecute(self, **kwargs) -> str:
        """Execute the tool (async). Override for true async execution."""
        return self._execute(**kwargs)


# =============================================================================
# HTTP REQUEST TOOL
# =============================================================================

class HTTPRequestInput(BaseModel):
    """Input schema for HTTP request tool."""
    url: str = Field(description='The URL to send the request to')
    method: str = Field(default='GET', description='HTTP method (GET, POST, PUT, DELETE)')
    headers: Optional[Dict[str, str]] = Field(default=None, description='Request headers')
    body: Optional[Dict[str, Any]] = Field(default=None, description='Request body (for POST/PUT)')
    params: Optional[Dict[str, str]] = Field(default=None, description='Query parameters')


class HTTPRequestTool(FlowCubeBaseTool):
    """Tool for making HTTP requests."""
    
    name: str = 'http_request'
    description: str = 'Make HTTP requests to external APIs. Supports GET, POST, PUT, DELETE methods.'
    args_schema: Type[BaseModel] = HTTPRequestInput
    
    # Allowed domains (security)
    allowed_domains: List[str] = []
    
    def _validate_url(self, url: str) -> bool:
        """Validate URL against allowed domains."""
        if not self.allowed_domains:
            return True
        
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        for allowed in self.allowed_domains:
            if domain == allowed or domain.endswith(f'.{allowed}'):
                return True
        
        return False
    
    def _execute(
        self,
        url: str,
        method: str = 'GET',
        headers: Optional[Dict[str, str]] = None,
        body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
    ) -> str:
        if not self._validate_url(url):
            return json.dumps({'error': 'URL domain not allowed'})
        
        with httpx.Client(timeout=self.timeout) as client:
            response = client.request(
                method=method.upper(),
                url=url,
                headers=headers,
                json=body if body else None,
                params=params,
            )
            
            try:
                data = response.json()
            except:
                data = response.text
            
            return json.dumps({
                'status_code': response.status_code,
                'data': data,
                'headers': dict(response.headers),
            })
    
    async def _aexecute(
        self,
        url: str,
        method: str = 'GET',
        headers: Optional[Dict[str, str]] = None,
        body: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
    ) -> str:
        if not self._validate_url(url):
            return json.dumps({'error': 'URL domain not allowed'})
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method=method.upper(),
                url=url,
                headers=headers,
                json=body if body else None,
                params=params,
            )
            
            try:
                data = response.json()
            except:
                data = response.text
            
            return json.dumps({
                'status_code': response.status_code,
                'data': data,
                'headers': dict(response.headers),
            })


# =============================================================================
# DATABASE QUERY TOOL
# =============================================================================

class DatabaseQueryInput(BaseModel):
    """Input schema for database query tool."""
    query: str = Field(description='SQL query to execute (SELECT only)')
    database: str = Field(default='default', description='Database alias to use')
    params: Optional[List[Any]] = Field(default=None, description='Query parameters')


class DatabaseQueryTool(FlowCubeBaseTool):
    """Tool for executing read-only database queries."""
    
    name: str = 'database_query'
    description: str = 'Execute read-only SQL queries against the database. Only SELECT queries are allowed.'
    args_schema: Type[BaseModel] = DatabaseQueryInput
    
    # Allowed databases
    allowed_databases: List[str] = ['default']
    max_rows: int = 100
    
    def _validate_query(self, query: str) -> bool:
        """Validate query is read-only."""
        # Remove comments and normalize
        clean_query = re.sub(r'--.*$', '', query, flags=re.MULTILINE)
        clean_query = re.sub(r'/\*.*?\*/', '', clean_query, flags=re.DOTALL)
        clean_query = clean_query.strip().upper()
        
        # Only allow SELECT
        if not clean_query.startswith('SELECT'):
            return False
        
        # Disallow dangerous keywords
        dangerous = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'EXEC', 'EXECUTE']
        for word in dangerous:
            if word in clean_query:
                return False
        
        return True
    
    def _execute(
        self,
        query: str,
        database: str = 'default',
        params: Optional[List[Any]] = None,
    ) -> str:
        if database not in self.allowed_databases:
            return json.dumps({'error': f'Database {database} not allowed'})
        
        if not self._validate_query(query):
            return json.dumps({'error': 'Only SELECT queries are allowed'})
        
        # Add LIMIT if not present
        if 'LIMIT' not in query.upper():
            query = f'{query} LIMIT {self.max_rows}'
        
        try:
            with connections[database].cursor() as cursor:
                cursor.execute(query, params or [])
                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                
                # Convert to list of dicts
                results = [dict(zip(columns, row)) for row in rows]
                
                return json.dumps({
                    'columns': columns,
                    'rows': results,
                    'row_count': len(results),
                })
        except Exception as e:
            return json.dumps({'error': str(e)})


# =============================================================================
# SALESCUBE INTEGRATION TOOL
# =============================================================================

class SalesCubeLeadInput(BaseModel):
    """Input for SalesCube lead operations."""
    action: str = Field(description='Action: search, get, create, update')
    lead_id: Optional[int] = Field(default=None, description='Lead ID for get/update')
    phone: Optional[str] = Field(default=None, description='Phone number for search')
    email: Optional[str] = Field(default=None, description='Email for search')
    data: Optional[Dict[str, Any]] = Field(default=None, description='Lead data for create/update')


class SalesCubeIntegrationTool(FlowCubeBaseTool):
    """Tool for interacting with SalesCube CRM."""
    
    name: str = 'salescube_lead'
    description: str = 'Interact with SalesCube CRM to search, get, create, or update leads.'
    args_schema: Type[BaseModel] = SalesCubeLeadInput
    
    api_url: str = 'https://api.frzglobal.com.br'
    api_token: str = ''
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            'Authorization': f'Token {self.api_token}',
            'Content-Type': 'application/json',
        }
    
    async def _aexecute(
        self,
        action: str,
        lead_id: Optional[int] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            headers = self._get_headers()
            
            try:
                if action == 'search':
                    params = {}
                    if phone:
                        params['phone'] = phone
                    if email:
                        params['email'] = email
                    
                    response = await client.get(
                        f'{self.api_url}/api/leads/',
                        headers=headers,
                        params=params,
                    )
                
                elif action == 'get':
                    if not lead_id:
                        return json.dumps({'error': 'lead_id is required for get action'})
                    
                    response = await client.get(
                        f'{self.api_url}/api/leads/{lead_id}/',
                        headers=headers,
                    )
                
                elif action == 'create':
                    if not data:
                        return json.dumps({'error': 'data is required for create action'})
                    
                    response = await client.post(
                        f'{self.api_url}/api/leads/',
                        headers=headers,
                        json=data,
                    )
                
                elif action == 'update':
                    if not lead_id or not data:
                        return json.dumps({'error': 'lead_id and data are required for update action'})
                    
                    response = await client.patch(
                        f'{self.api_url}/api/leads/{lead_id}/',
                        headers=headers,
                        json=data,
                    )
                
                else:
                    return json.dumps({'error': f'Unknown action: {action}'})
                
                return json.dumps({
                    'status_code': response.status_code,
                    'data': response.json() if response.status_code < 400 else response.text,
                })
            
            except Exception as e:
                return json.dumps({'error': str(e)})
    
    def _execute(self, **kwargs) -> str:
        return asyncio.run(self._aexecute(**kwargs))


# =============================================================================
# WHATSAPP MESSAGE TOOL
# =============================================================================

class WhatsAppMessageInput(BaseModel):
    """Input for WhatsApp message tool."""
    phone: str = Field(description='Phone number with country code (e.g., 5591912345678)')
    message: str = Field(description='Message to send')
    instance: str = Field(default='default', description='Evolution API instance name')
    media_url: Optional[str] = Field(default=None, description='Optional media URL to send')


class WhatsAppMessageTool(FlowCubeBaseTool):
    """Tool for sending WhatsApp messages via Evolution API."""
    
    name: str = 'whatsapp_send'
    description: str = 'Send WhatsApp messages using Evolution API.'
    args_schema: Type[BaseModel] = WhatsAppMessageInput
    
    # WhatsApp sending is handled via ChatCube EngineClient
    api_key: str = ''
    default_instance: str = 'default'
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            'apikey': self.api_key,
            'Content-Type': 'application/json',
        }
    
    async def _aexecute(
        self,
        phone: str,
        message: str,
        instance: str = 'default',
        media_url: Optional[str] = None,
    ) -> str:
        # Clean phone number
        phone = re.sub(r'[^0-9]', '', phone)
        if not phone.startswith('55'):
            phone = f'55{phone}'
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            headers = self._get_headers()
            inst = instance or self.default_instance
            
            try:
                if media_url:
                    # Send media message
                    payload = {
                        'number': phone,
                        'mediatype': 'image',
                        'mimetype': 'image/jpeg',
                        'caption': message,
                        'media': media_url,
                    }
                    # Media sending via ChatCube EngineClient
                else:
                    # Send text message
                    payload = {
                        'number': phone,
                        'text': message,
                    }
                    # Text sending via ChatCube EngineClient
                
                response = await client.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                )
                
                return json.dumps({
                    'status_code': response.status_code,
                    'data': response.json() if response.status_code < 400 else response.text,
                    'phone': phone,
                })
            
            except Exception as e:
                return json.dumps({'error': str(e)})
    
    def _execute(self, **kwargs) -> str:
        return asyncio.run(self._aexecute(**kwargs))


# =============================================================================
# TELEGRAM MESSAGE TOOL
# =============================================================================

class TelegramMessageInput(BaseModel):
    """Input for Telegram message tool."""
    chat_id: str = Field(description='Telegram chat ID')
    message: str = Field(description='Message to send')
    parse_mode: str = Field(default='HTML', description='Parse mode: HTML, Markdown, MarkdownV2')


class TelegramMessageTool(FlowCubeBaseTool):
    """Tool for sending Telegram messages."""
    
    name: str = 'telegram_send'
    description: str = 'Send Telegram messages using Bot API.'
    args_schema: Type[BaseModel] = TelegramMessageInput
    
    bot_token: str = ''
    
    async def _aexecute(
        self,
        chat_id: str,
        message: str,
        parse_mode: str = 'HTML',
    ) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f'https://api.telegram.org/bot{self.bot_token}/sendMessage',
                    json={
                        'chat_id': chat_id,
                        'text': message,
                        'parse_mode': parse_mode,
                    },
                )
                
                return json.dumps({
                    'status_code': response.status_code,
                    'data': response.json(),
                })
            
            except Exception as e:
                return json.dumps({'error': str(e)})
    
    def _execute(self, **kwargs) -> str:
        return asyncio.run(self._aexecute(**kwargs))


# =============================================================================
# CUSTOM TOOL FACTORY
# =============================================================================

class ToolFactory:
    """
    Factory for creating tools from database definitions.
    
    Creates LangChain tools from AgentTool model instances.
    """
    
    @staticmethod
    def create_tool_from_definition(tool_def) -> Optional[BaseTool]:
        """
        Create a LangChain tool from an AgentTool model instance.
        
        Args:
            tool_def: AgentTool model instance
        
        Returns:
            BaseTool instance or None
        """
        tool_type = tool_def.tool_type
        
        if tool_type == 'http_request':
            return ToolFactory._create_http_tool(tool_def)
        elif tool_type == 'database_query':
            return ToolFactory._create_db_tool(tool_def)
        elif tool_type == 'salescube_api':
            return ToolFactory._create_salescube_tool(tool_def)
        elif tool_type == 'whatsapp':
            return ToolFactory._create_whatsapp_tool(tool_def)
        elif tool_type == 'telegram':
            return ToolFactory._create_telegram_tool(tool_def)
        elif tool_type == 'python_function':
            return ToolFactory._create_python_tool(tool_def)
        elif tool_type == 'webhook':
            return ToolFactory._create_webhook_tool(tool_def)
        else:
            logger.warning(f'Unknown tool type: {tool_type}')
            return None
    
    @staticmethod
    def _create_input_schema(parameters_schema: Dict) -> Type[BaseModel]:
        """Create a Pydantic model from JSON schema."""
        if not parameters_schema:
            return BaseModel
        
        properties = parameters_schema.get('properties', {})
        required = set(parameters_schema.get('required', []))
        
        fields = {}
        for name, prop in properties.items():
            field_type = str  # Default
            
            prop_type = prop.get('type', 'string')
            if prop_type == 'integer':
                field_type = int
            elif prop_type == 'number':
                field_type = float
            elif prop_type == 'boolean':
                field_type = bool
            elif prop_type == 'array':
                field_type = List
            elif prop_type == 'object':
                field_type = Dict
            
            default = ... if name in required else prop.get('default', None)
            description = prop.get('description', '')
            
            fields[name] = (field_type, Field(default=default, description=description))
        
        return create_model('DynamicInput', **fields)
    
    @staticmethod
    def _create_http_tool(tool_def) -> BaseTool:
        """Create HTTP request tool from definition."""
        input_schema = ToolFactory._create_input_schema(tool_def.parameters_schema)
        
        url_template = tool_def.http_url
        method = tool_def.http_method
        headers_template = tool_def.http_headers
        body_template = tool_def.http_body_template
        
        async def execute(**kwargs) -> str:
            # Render URL template
            url = url_template.format(**kwargs)
            
            # Render headers
            headers = {}
            for k, v in headers_template.items():
                headers[k] = v.format(**kwargs) if isinstance(v, str) else v
            
            # Render body
            body = None
            if body_template:
                try:
                    body = json.loads(body_template.format(**kwargs))
                except:
                    body = body_template.format(**kwargs)
            
            async with httpx.AsyncClient(timeout=tool_def.timeout_seconds) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=body if isinstance(body, dict) else None,
                    content=body if isinstance(body, str) else None,
                )
                
                try:
                    data = response.json()
                except:
                    data = response.text
                
                return json.dumps({
                    'status_code': response.status_code,
                    'data': data,
                })
        
        return StructuredTool(
            name=tool_def.name,
            description=tool_def.description,
            args_schema=input_schema,
            coroutine=execute,
            return_direct=False,
        )
    
    @staticmethod
    def _create_db_tool(tool_def) -> BaseTool:
        """Create database query tool from definition."""
        input_schema = ToolFactory._create_input_schema(tool_def.parameters_schema)
        
        query_template = tool_def.query_template
        database = tool_def.database_connection or 'default'
        
        def execute(**kwargs) -> str:
            query = query_template.format(**kwargs)
            
            # Validate read-only
            if not query.strip().upper().startswith('SELECT'):
                return json.dumps({'error': 'Only SELECT queries allowed'})
            
            try:
                with connections[database].cursor() as cursor:
                    cursor.execute(query)
                    columns = [col[0] for col in cursor.description]
                    rows = cursor.fetchall()
                    results = [dict(zip(columns, row)) for row in rows]
                    
                    return json.dumps({
                        'columns': columns,
                        'rows': results,
                        'row_count': len(results),
                    })
            except Exception as e:
                return json.dumps({'error': str(e)})
        
        return StructuredTool(
            name=tool_def.name,
            description=tool_def.description,
            args_schema=input_schema,
            func=execute,
            return_direct=False,
        )
    
    @staticmethod
    def _create_salescube_tool(tool_def) -> BaseTool:
        """Create SalesCube API tool from definition."""
        config = tool_def.extra_config or {}
        
        tool = SalesCubeIntegrationTool()
        tool.name = tool_def.name
        tool.description = tool_def.description
        tool.api_url = config.get('api_url', 'https://api.frzglobal.com.br')
        tool.api_token = config.get('api_token', '')
        tool.timeout = tool_def.timeout_seconds
        
        return tool
    
    @staticmethod
    def _create_whatsapp_tool(tool_def) -> BaseTool:
        """Create WhatsApp tool from definition."""
        config = tool_def.extra_config or {}
        
        tool = WhatsAppMessageTool()
        tool.name = tool_def.name
        tool.description = tool_def.description
        tool.api_key = config.get('api_key', '')
        tool.default_instance = config.get('default_instance', 'default')
        tool.timeout = tool_def.timeout_seconds
        
        return tool
    
    @staticmethod
    def _create_telegram_tool(tool_def) -> BaseTool:
        """Create Telegram tool from definition."""
        config = tool_def.extra_config or {}
        
        tool = TelegramMessageTool()
        tool.name = tool_def.name
        tool.description = tool_def.description
        tool.bot_token = config.get('bot_token', '')
        tool.timeout = tool_def.timeout_seconds
        
        return tool
    
    @staticmethod
    def _create_python_tool(tool_def) -> Optional[BaseTool]:
        """Create Python function tool from definition."""
        input_schema = ToolFactory._create_input_schema(tool_def.parameters_schema)
        
        code = tool_def.python_code
        if not code:
            # Try to import from module
            if tool_def.python_module and tool_def.python_function:
                try:
                    import importlib
                    module = importlib.import_module(tool_def.python_module)
                    func = getattr(module, tool_def.python_function)
                    
                    return StructuredTool(
                        name=tool_def.name,
                        description=tool_def.description,
                        args_schema=input_schema,
                        func=func,
                        return_direct=False,
                    )
                except Exception as e:
                    logger.error(f'Failed to import {tool_def.python_module}.{tool_def.python_function}: {e}')
                    return None
            return None
        
        # Execute inline code (use with caution!)
        def execute(**kwargs) -> str:
            try:
                local_vars = {'kwargs': kwargs, 'result': None}
                exec(code, {'__builtins__': __builtins__, 'json': json}, local_vars)
                return json.dumps(local_vars.get('result', 'No result'))
            except Exception as e:
                return json.dumps({'error': str(e)})
        
        return StructuredTool(
            name=tool_def.name,
            description=tool_def.description,
            args_schema=input_schema,
            func=execute,
            return_direct=False,
        )
    
    @staticmethod
    def _create_webhook_tool(tool_def) -> BaseTool:
        """Create webhook tool from definition."""
        input_schema = ToolFactory._create_input_schema(tool_def.parameters_schema)
        
        url = tool_def.http_url
        method = tool_def.http_method or 'POST'
        headers = tool_def.http_headers or {}
        
        async def execute(**kwargs) -> str:
            async with httpx.AsyncClient(timeout=tool_def.timeout_seconds) as client:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=headers,
                    json=kwargs,
                )
                
                try:
                    data = response.json()
                except:
                    data = response.text
                
                return json.dumps({
                    'status_code': response.status_code,
                    'data': data,
                })
        
        return StructuredTool(
            name=tool_def.name,
            description=tool_def.description,
            args_schema=input_schema,
            coroutine=execute,
            return_direct=False,
        )
    
    @staticmethod
    def load_tools_from_database(agent=None) -> List[BaseTool]:
        """
        Load tools from database.
        
        Args:
            agent: Optional AgentDefinition to filter tools
        
        Returns:
            List of BaseTool instances
        """
        from .models import AgentTool
        
        queryset = AgentTool.objects.filter(is_active=True)
        if agent:
            queryset = agent.tools.filter(is_active=True)
        
        tools = []
        for tool_def in queryset:
            tool = ToolFactory.create_tool_from_definition(tool_def)
            if tool:
                tools.append(tool)
        
        return tools


# =============================================================================
# DEFAULT TOOLS REGISTRATION
# =============================================================================

def register_default_tools():
    """Register default tools on app startup."""
    # Register built-in tools
    register_tool(HTTPRequestTool())
    register_tool(DatabaseQueryTool())
    
    # Create SalesCube tool with environment config
    salescube_tool = SalesCubeIntegrationTool()
    salescube_tool.api_token = getattr(settings, 'SALESCUBE_API_TOKEN', '')
    register_tool(salescube_tool)
    
    # Create WhatsApp tool with environment config
    whatsapp_tool = WhatsAppMessageTool()
    whatsapp_tool.api_key = getattr(settings, 'EVOLUTION_API_KEY', '')
    register_tool(whatsapp_tool)
    
    logger.info(f'Registered {len(_TOOL_REGISTRY)} default tools')


# =============================================================================
# CONVENIENCE DECORATORS
# =============================================================================

def create_tool(
    name: str,
    description: str,
    return_direct: bool = False,
):
    """
    Decorator to create a tool from a function.
    
    Usage:
        @create_tool('my_tool', 'Description of my tool')
        def my_tool(arg1: str, arg2: int) -> str:
            return f'{arg1} {arg2}'
    """
    def decorator(func: Callable) -> BaseTool:
        return StructuredTool.from_function(
            func=func,
            name=name,
            description=description,
            return_direct=return_direct,
        )
    return decorator
