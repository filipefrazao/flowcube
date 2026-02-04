"""
FlowCube LangChain Client

Multi-provider LLM client with LangChain and LangGraph integration.

Features:
- Multi-provider support (OpenAI, Anthropic, Google, DeepSeek)
- Agent creation with tool binding
- Memory management
- RAG retrieval chain
- Streaming response handler
- Token counting and cost tracking

Author: FRZ Group
"""

import asyncio
import logging
import time
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import (
    Any, AsyncIterator, Callable, Dict, List, 
    Optional, Tuple, Type, Union
)

from django.conf import settings
from django.utils import timezone

# LangChain Core
from langchain_core.callbacks import (
    AsyncCallbackHandler,
    BaseCallbackHandler,
    CallbackManager,
)
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
    AIMessageChunk,
)
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.tools import BaseTool, StructuredTool, tool

# LangChain Providers
try:
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
except ImportError:
    ChatOpenAI = None
    OpenAIEmbeddings = None

try:
    from langchain_anthropic import ChatAnthropic
except ImportError:
    ChatAnthropic = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
except ImportError:
    ChatGoogleGenerativeAI = None
    GoogleGenerativeAIEmbeddings = None

try:
    from langchain_community.chat_models import ChatOllama
except ImportError:
    ChatOllama = None

# LangGraph
try:
    from langgraph.graph import StateGraph, END
    from langgraph.prebuilt import ToolNode, tools_condition
    from langgraph.checkpoint.memory import MemorySaver
except ImportError:
    StateGraph = None
    END = None
    ToolNode = None
    tools_condition = None
    MemorySaver = None

# Vector Stores
try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as qdrant_models
    from langchain_qdrant import QdrantVectorStore
except ImportError:
    QdrantClient = None
    qdrant_models = None
    QdrantVectorStore = None

# Memory
# Memory imports disabled - use langgraph memory instead
# Memory classes disabled - using stubs
ConversationBufferMemory = type("ConversationBufferMemory", (), {})
ConversationSummaryMemory = type("ConversationSummaryMemory", (), {})

# Text Splitters
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
    TokenTextSplitter,
)

logger = logging.getLogger(__name__)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class TokenUsage:
    """Token usage tracking."""
    input_tokens: int = 0
    output_tokens: int = 0
    
    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class ExecutionResult:
    """Result of an agent execution."""
    content: str = ''
    tool_calls: List[Dict] = field(default_factory=list)
    token_usage: TokenUsage = field(default_factory=TokenUsage)
    cost: Decimal = Decimal('0.0')
    duration_ms: int = 0
    time_to_first_token_ms: int = 0
    model_used: str = ''
    provider_used: str = ''
    error: Optional[str] = None
    metadata: Dict = field(default_factory=dict)


@dataclass
class StreamingChunk:
    """Chunk of streaming response."""
    content: str = ''
    is_complete: bool = False
    tool_calls: List[Dict] = field(default_factory=list)
    token_usage: Optional[TokenUsage] = None


@dataclass
class RAGResult:
    """Result of RAG retrieval."""
    documents: List[Dict] = field(default_factory=list)
    scores: List[float] = field(default_factory=list)
    query: str = ''
    total_retrieved: int = 0


# =============================================================================
# CALLBACK HANDLERS
# =============================================================================

class TokenCountingHandler(BaseCallbackHandler):
    """Callback handler to count tokens."""
    
    def __init__(self):
        self.input_tokens = 0
        self.output_tokens = 0
        self.first_token_time: Optional[float] = None
        self.start_time: Optional[float] = None
    
    def on_llm_start(self, serialized, prompts, **kwargs):
        self.start_time = time.time()
    
    def on_llm_new_token(self, token: str, **kwargs):
        if self.first_token_time is None:
            self.first_token_time = time.time()
    
    def on_llm_end(self, response, **kwargs):
        if hasattr(response, 'llm_output') and response.llm_output:
            usage = response.llm_output.get('token_usage', {})
            self.input_tokens = usage.get('prompt_tokens', 0)
            self.output_tokens = usage.get('completion_tokens', 0)
    
    def get_usage(self) -> TokenUsage:
        return TokenUsage(
            input_tokens=self.input_tokens,
            output_tokens=self.output_tokens
        )
    
    def get_time_to_first_token(self) -> int:
        if self.first_token_time and self.start_time:
            return int((self.first_token_time - self.start_time) * 1000)
        return 0


class AsyncStreamingHandler(AsyncCallbackHandler):
    """Async callback handler for streaming."""
    
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        self.first_token_time: Optional[float] = None
        self.start_time: Optional[float] = None
    
    async def on_llm_start(self, serialized, prompts, **kwargs):
        self.start_time = time.time()
    
    async def on_llm_new_token(self, token: str, **kwargs):
        if self.first_token_time is None:
            self.first_token_time = time.time()
        await self.queue.put(StreamingChunk(content=token))
    
    async def on_llm_end(self, response, **kwargs):
        token_usage = None
        if hasattr(response, 'llm_output') and response.llm_output:
            usage = response.llm_output.get('token_usage', {})
            token_usage = TokenUsage(
                input_tokens=usage.get('prompt_tokens', 0),
                output_tokens=usage.get('completion_tokens', 0)
            )
        await self.queue.put(StreamingChunk(
            is_complete=True,
            token_usage=token_usage
        ))


# =============================================================================
# LLM PROVIDER FACTORY
# =============================================================================

class LLMProviderFactory:
    """Factory for creating LLM instances from provider configurations."""
    
    @staticmethod
    def create_llm(
        provider_type: str,
        api_key: str,
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        top_p: float = 1.0,
        api_base_url: Optional[str] = None,
        streaming: bool = False,
        callbacks: Optional[List] = None,
        **kwargs
    ) -> BaseChatModel:
        """Create an LLM instance based on provider type."""
        
        common_params = {
            'temperature': temperature,
            'max_tokens': max_tokens,
            'streaming': streaming,
            'callbacks': callbacks or [],
        }
        
        if provider_type == 'openai':
            if ChatOpenAI is None:
                raise ImportError('langchain-openai is not installed')
            
            params = {
                'api_key': api_key,
                'model': model,
                'top_p': top_p,
                **common_params,
            }
            if api_base_url:
                params['base_url'] = api_base_url
            
            return ChatOpenAI(**params)
        
        elif provider_type == 'anthropic':
            if ChatAnthropic is None:
                raise ImportError('langchain-anthropic is not installed')
            
            return ChatAnthropic(
                api_key=api_key,
                model=model,
                top_p=top_p,
                **common_params,
            )
        
        elif provider_type == 'google':
            if ChatGoogleGenerativeAI is None:
                raise ImportError('langchain-google-genai is not installed')
            
            return ChatGoogleGenerativeAI(
                google_api_key=api_key,
                model=model,
                top_p=top_p,
                **common_params,
            )
        
        elif provider_type == 'deepseek':
            if ChatOpenAI is None:
                raise ImportError('langchain-openai is not installed')
            
            # DeepSeek uses OpenAI-compatible API
            return ChatOpenAI(
                api_key=api_key,
                model=model,
                base_url=api_base_url or 'https://api.deepseek.com/v1',
                top_p=top_p,
                **common_params,
            )
        
        elif provider_type == 'groq':
            if ChatOpenAI is None:
                raise ImportError('langchain-openai is not installed')
            
            return ChatOpenAI(
                api_key=api_key,
                model=model,
                base_url='https://api.groq.com/openai/v1',
                top_p=top_p,
                **common_params,
            )
        
        elif provider_type == 'together':
            if ChatOpenAI is None:
                raise ImportError('langchain-openai is not installed')
            
            return ChatOpenAI(
                api_key=api_key,
                model=model,
                base_url='https://api.together.xyz/v1',
                top_p=top_p,
                **common_params,
            )
        
        elif provider_type == 'ollama':
            if ChatOllama is None:
                raise ImportError('langchain-community is not installed')
            
            return ChatOllama(
                model=model,
                base_url=api_base_url or 'http://localhost:11434',
                temperature=temperature,
            )
        
        elif provider_type == 'azure_openai':
            if ChatOpenAI is None:
                raise ImportError('langchain-openai is not installed')
            
            from langchain_openai import AzureChatOpenAI
            
            return AzureChatOpenAI(
                api_key=api_key,
                azure_endpoint=api_base_url,
                api_version=kwargs.get('api_version', '2024-02-15-preview'),
                azure_deployment=model,
                **common_params,
            )
        
        else:
            raise ValueError(f'Unsupported provider type: {provider_type}')
    
    @staticmethod
    def create_embeddings(
        provider_type: str,
        api_key: str,
        model: str,
        api_base_url: Optional[str] = None,
        **kwargs
    ):
        """Create an embeddings instance based on provider type."""
        
        if provider_type in ['openai', 'deepseek', 'azure_openai']:
            if OpenAIEmbeddings is None:
                raise ImportError('langchain-openai is not installed')
            
            params = {
                'api_key': api_key,
                'model': model,
            }
            if api_base_url:
                params['base_url'] = api_base_url
            
            return OpenAIEmbeddings(**params)
        
        elif provider_type == 'google':
            if GoogleGenerativeAIEmbeddings is None:
                raise ImportError('langchain-google-genai is not installed')
            
            return GoogleGenerativeAIEmbeddings(
                google_api_key=api_key,
                model=model,
            )
        
        else:
            # Default to OpenAI embeddings
            if OpenAIEmbeddings is None:
                raise ImportError('langchain-openai is not installed')
            
            return OpenAIEmbeddings(
                api_key=api_key,
                model=model,
            )


# =============================================================================
# LANGCHAIN CLIENT
# =============================================================================

class LangChainClient:
    """
    Main LangChain client for FlowCube AI Agents.
    
    Provides a unified interface for:
    - LLM interactions
    - Agent creation with tools
    - Memory management
    - RAG retrieval
    - Streaming responses
    """
    
    def __init__(self, provider_config: Dict):
        """
        Initialize the LangChain client.
        
        Args:
            provider_config: Dictionary with provider configuration
        """
        self.provider_config = provider_config
        self.provider_type = provider_config.get('provider_type', 'openai')
        self.llm: Optional[BaseChatModel] = None
        self.embeddings = None
        self.memory = None
        self.tools: List[BaseTool] = []
        self._tool_registry: Dict[str, BaseTool] = {}
        
        # Initialize LLM
        self._init_llm()
    
    def _init_llm(self, streaming: bool = False, callbacks: List = None):
        """Initialize the LLM instance."""
        self.llm = LLMProviderFactory.create_llm(
            provider_type=self.provider_type,
            api_key=self.provider_config.get('api_key', ''),
            model=self.provider_config.get('model', ''),
            temperature=self.provider_config.get('temperature', 0.7),
            max_tokens=self.provider_config.get('max_tokens', 4096),
            top_p=self.provider_config.get('top_p', 1.0),
            api_base_url=self.provider_config.get('api_base_url'),
            streaming=streaming,
            callbacks=callbacks,
        )
    
    def _init_embeddings(self):
        """Initialize embeddings model."""
        if self.embeddings is None:
            self.embeddings = LLMProviderFactory.create_embeddings(
                provider_type=self.provider_type,
                api_key=self.provider_config.get('api_key', ''),
                model=self.provider_config.get('embedding_model', 'text-embedding-3-small'),
                api_base_url=self.provider_config.get('api_base_url'),
            )
        return self.embeddings
    
    # -------------------------------------------------------------------------
    # Tool Management
    # -------------------------------------------------------------------------
    
    def register_tool(self, tool: BaseTool):
        """Register a tool for agent use."""
        self.tools.append(tool)
        self._tool_registry[tool.name] = tool
    
    def register_tools(self, tools: List[BaseTool]):
        """Register multiple tools."""
        for t in tools:
            self.register_tool(t)
    
    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name."""
        return self._tool_registry.get(name)
    
    def clear_tools(self):
        """Clear all registered tools."""
        self.tools = []
        self._tool_registry = {}
    
    # -------------------------------------------------------------------------
    # Message Conversion
    # -------------------------------------------------------------------------
    
    @staticmethod
    def convert_messages(messages: List[Dict]) -> List[BaseMessage]:
        """Convert dict messages to LangChain message objects."""
        converted = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            if role == 'system':
                converted.append(SystemMessage(content=content))
            elif role == 'user':
                converted.append(HumanMessage(content=content))
            elif role == 'assistant':
                tool_calls = msg.get('tool_calls', [])
                if tool_calls:
                    converted.append(AIMessage(
                        content=content,
                        tool_calls=tool_calls
                    ))
                else:
                    converted.append(AIMessage(content=content))
            elif role == 'tool':
                converted.append(ToolMessage(
                    content=content,
                    tool_call_id=msg.get('tool_call_id', ''),
                    name=msg.get('name', '')
                ))
        
        return converted
    
    @staticmethod
    def message_to_dict(message: BaseMessage) -> Dict:
        """Convert a LangChain message to dict."""
        result = {
            'content': message.content,
        }
        
        if isinstance(message, SystemMessage):
            result['role'] = 'system'
        elif isinstance(message, HumanMessage):
            result['role'] = 'user'
        elif isinstance(message, AIMessage):
            result['role'] = 'assistant'
            if hasattr(message, 'tool_calls') and message.tool_calls:
                result['tool_calls'] = message.tool_calls
        elif isinstance(message, ToolMessage):
            result['role'] = 'tool'
            result['tool_call_id'] = message.tool_call_id
            result['name'] = message.name
        
        return result
    
    # -------------------------------------------------------------------------
    # Basic Chat
    # -------------------------------------------------------------------------
    
    async def chat(
        self,
        messages: List[Dict],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> ExecutionResult:
        """
        Send a chat message and get a response.
        
        Args:
            messages: List of message dicts
            system_prompt: Optional system prompt
            **kwargs: Additional parameters
        
        Returns:
            ExecutionResult with response and metadata
        """
        start_time = time.time()
        token_handler = TokenCountingHandler()
        
        # Reinitialize with callbacks
        self._init_llm(callbacks=[token_handler])
        
        try:
            # Build message list
            lc_messages = []
            if system_prompt:
                lc_messages.append(SystemMessage(content=system_prompt))
            lc_messages.extend(self.convert_messages(messages))
            
            # Bind tools if available
            llm = self.llm
            if self.tools:
                llm = llm.bind_tools(self.tools)
            
            # Invoke LLM
            response = await llm.ainvoke(lc_messages)
            
            # Calculate timing
            duration_ms = int((time.time() - start_time) * 1000)
            ttft = token_handler.get_time_to_first_token()
            
            # Get token usage
            usage = token_handler.get_usage()
            
            # Calculate cost
            cost = self._calculate_cost(usage)
            
            # Extract tool calls
            tool_calls = []
            if hasattr(response, 'tool_calls') and response.tool_calls:
                tool_calls = [
                    {
                        'id': tc.get('id', ''),
                        'name': tc.get('name', ''),
                        'args': tc.get('args', {}),
                    }
                    for tc in response.tool_calls
                ]
            
            return ExecutionResult(
                content=response.content if response.content else '',
                tool_calls=tool_calls,
                token_usage=usage,
                cost=cost,
                duration_ms=duration_ms,
                time_to_first_token_ms=ttft,
                model_used=self.provider_config.get('model', ''),
                provider_used=self.provider_type,
            )
        
        except Exception as e:
            logger.exception('Chat error')
            return ExecutionResult(
                error=str(e),
                duration_ms=int((time.time() - start_time) * 1000),
                model_used=self.provider_config.get('model', ''),
                provider_used=self.provider_type,
            )
    
    async def chat_stream(
        self,
        messages: List[Dict],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AsyncIterator[StreamingChunk]:
        """
        Send a chat message and stream the response.
        
        Args:
            messages: List of message dicts
            system_prompt: Optional system prompt
            **kwargs: Additional parameters
        
        Yields:
            StreamingChunk with content
        """
        # Reinitialize with streaming
        self._init_llm(streaming=True)
        
        # Build message list
        lc_messages = []
        if system_prompt:
            lc_messages.append(SystemMessage(content=system_prompt))
        lc_messages.extend(self.convert_messages(messages))
        
        # Bind tools if available
        llm = self.llm
        if self.tools:
            llm = llm.bind_tools(self.tools)
        
        try:
            full_content = ''
            tool_calls = []
            
            async for chunk in llm.astream(lc_messages):
                if isinstance(chunk, AIMessageChunk):
                    content = chunk.content if chunk.content else ''
                    full_content += content
                    
                    # Check for tool calls
                    if hasattr(chunk, 'tool_call_chunks') and chunk.tool_call_chunks:
                        for tc in chunk.tool_call_chunks:
                            tool_calls.append(tc)
                    
                    yield StreamingChunk(content=content)
            
            # Final chunk with completion
            yield StreamingChunk(
                is_complete=True,
                tool_calls=tool_calls,
            )
        
        except Exception as e:
            logger.exception('Streaming error')
            yield StreamingChunk(
                content=f'Error: {str(e)}',
                is_complete=True,
            )
    
    # -------------------------------------------------------------------------
    # Agent with Tools
    # -------------------------------------------------------------------------
    
    async def run_agent(
        self,
        messages: List[Dict],
        system_prompt: str,
        tools: Optional[List[BaseTool]] = None,
        max_iterations: int = 10,
        **kwargs
    ) -> ExecutionResult:
        """
        Run an agent with tool calling capability.
        
        Args:
            messages: List of message dicts
            system_prompt: System prompt for the agent
            tools: Optional list of tools (uses registered tools if not provided)
            max_iterations: Maximum tool call iterations
        
        Returns:
            ExecutionResult with final response
        """
        start_time = time.time()
        agent_tools = tools or self.tools
        
        if not agent_tools:
            # No tools, just do regular chat
            return await self.chat(messages, system_prompt, **kwargs)
        
        # Initialize LLM with tools
        self._init_llm()
        llm_with_tools = self.llm.bind_tools(agent_tools)
        
        # Build initial messages
        lc_messages = [SystemMessage(content=system_prompt)]
        lc_messages.extend(self.convert_messages(messages))
        
        total_input_tokens = 0
        total_output_tokens = 0
        iterations = 0
        all_tool_calls = []
        
        try:
            while iterations < max_iterations:
                iterations += 1
                
                # Get LLM response
                response = await llm_with_tools.ainvoke(lc_messages)
                
                # Count tokens (approximate)
                total_output_tokens += len(response.content.split()) * 2
                
                # Check for tool calls
                if not hasattr(response, 'tool_calls') or not response.tool_calls:
                    # No more tool calls, return final response
                    break
                
                # Add assistant message
                lc_messages.append(response)
                
                # Execute tools
                for tool_call in response.tool_calls:
                    tool_name = tool_call.get('name', '')
                    tool_args = tool_call.get('args', {})
                    tool_id = tool_call.get('id', '')
                    
                    all_tool_calls.append({
                        'id': tool_id,
                        'name': tool_name,
                        'args': tool_args,
                    })
                    
                    # Find and execute tool
                    tool = self._tool_registry.get(tool_name)
                    if tool:
                        try:
                            result = await tool.ainvoke(tool_args)
                            tool_result = str(result)
                        except Exception as e:
                            tool_result = f'Error executing tool: {str(e)}'
                    else:
                        tool_result = f'Tool not found: {tool_name}'
                    
                    # Add tool result
                    lc_messages.append(ToolMessage(
                        content=tool_result,
                        tool_call_id=tool_id,
                        name=tool_name,
                    ))
            
            # Get final response content
            final_content = response.content if response.content else ''
            
            # Calculate timing
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Calculate cost
            usage = TokenUsage(
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens
            )
            cost = self._calculate_cost(usage)
            
            return ExecutionResult(
                content=final_content,
                tool_calls=all_tool_calls,
                token_usage=usage,
                cost=cost,
                duration_ms=duration_ms,
                model_used=self.provider_config.get('model', ''),
                provider_used=self.provider_type,
                metadata={'iterations': iterations},
            )
        
        except Exception as e:
            logger.exception('Agent error')
            return ExecutionResult(
                error=str(e),
                duration_ms=int((time.time() - start_time) * 1000),
                model_used=self.provider_config.get('model', ''),
                provider_used=self.provider_type,
            )
    
    # -------------------------------------------------------------------------
    # LangGraph Agent
    # -------------------------------------------------------------------------
    
    def create_langgraph_agent(
        self,
        system_prompt: str,
        tools: Optional[List[BaseTool]] = None,
        checkpointer: bool = True,
    ):
        """
        Create a LangGraph agent with state management.
        
        Args:
            system_prompt: System prompt for the agent
            tools: List of tools
            checkpointer: Whether to use memory checkpointing
        
        Returns:
            Compiled LangGraph
        """
        if StateGraph is None:
            raise ImportError('langgraph is not installed')
        
        from typing import TypedDict, Annotated
        from langgraph.graph.message import add_messages
        
        # Define state
        class AgentState(TypedDict):
            messages: Annotated[list, add_messages]
            context: dict
        
        agent_tools = tools or self.tools
        
        # Initialize LLM with tools
        self._init_llm()
        llm_with_tools = self.llm.bind_tools(agent_tools) if agent_tools else self.llm
        
        # Define agent node
        async def agent_node(state: AgentState):
            messages = state['messages']
            
            # Add system message if not present
            if not messages or not isinstance(messages[0], SystemMessage):
                messages = [SystemMessage(content=system_prompt)] + messages
            
            response = await llm_with_tools.ainvoke(messages)
            return {'messages': [response]}
        
        # Create graph
        graph = StateGraph(AgentState)
        
        # Add nodes
        graph.add_node('agent', agent_node)
        
        if agent_tools:
            tool_node = ToolNode(agent_tools)
            graph.add_node('tools', tool_node)
            
            # Add edges
            graph.add_conditional_edges(
                'agent',
                tools_condition,
            )
            graph.add_edge('tools', 'agent')
        
        # Set entry point
        graph.set_entry_point('agent')
        
        # Add checkpointer if requested
        memory = MemorySaver() if checkpointer and MemorySaver else None
        
        return graph.compile(checkpointer=memory)
    
    async def run_langgraph_agent(
        self,
        graph,
        messages: List[Dict],
        thread_id: str = 'default',
        context: Optional[Dict] = None,
    ) -> ExecutionResult:
        """
        Run a LangGraph agent.
        
        Args:
            graph: Compiled LangGraph
            messages: Input messages
            thread_id: Thread ID for checkpointing
            context: Optional context variables
        
        Returns:
            ExecutionResult with response
        """
        start_time = time.time()
        
        try:
            # Convert messages
            lc_messages = self.convert_messages(messages)
            
            # Create initial state
            state = {
                'messages': lc_messages,
                'context': context or {},
            }
            
            # Run graph
            config = {'configurable': {'thread_id': thread_id}}
            result = await graph.ainvoke(state, config)
            
            # Get final message
            final_messages = result.get('messages', [])
            final_content = ''
            tool_calls = []
            
            if final_messages:
                last_msg = final_messages[-1]
                if isinstance(last_msg, AIMessage):
                    final_content = last_msg.content or ''
                    if hasattr(last_msg, 'tool_calls'):
                        tool_calls = last_msg.tool_calls or []
            
            duration_ms = int((time.time() - start_time) * 1000)
            
            return ExecutionResult(
                content=final_content,
                tool_calls=tool_calls,
                duration_ms=duration_ms,
                model_used=self.provider_config.get('model', ''),
                provider_used=self.provider_type,
            )
        
        except Exception as e:
            logger.exception('LangGraph agent error')
            return ExecutionResult(
                error=str(e),
                duration_ms=int((time.time() - start_time) * 1000),
                model_used=self.provider_config.get('model', ''),
                provider_used=self.provider_type,
            )
    
    # -------------------------------------------------------------------------
    # RAG (Retrieval Augmented Generation)
    # -------------------------------------------------------------------------
    
    def create_qdrant_vectorstore(
        self,
        collection_name: str,
        qdrant_url: Optional[str] = None,
        qdrant_api_key: Optional[str] = None,
    ):
        """
        Create a Qdrant vector store.
        
        Args:
            collection_name: Name of the collection
            qdrant_url: Qdrant server URL
            qdrant_api_key: Qdrant API key
        
        Returns:
            QdrantVectorStore instance
        """
        if QdrantVectorStore is None:
            raise ImportError('qdrant-client is not installed')
        
        self._init_embeddings()
        
        client = QdrantClient(
            url=qdrant_url or settings.get('QDRANT_URL', 'http://localhost:6333'),
            api_key=qdrant_api_key,
        )
        
        return QdrantVectorStore(
            client=client,
            collection_name=collection_name,
            embedding=self.embeddings,
        )
    
    async def index_documents(
        self,
        documents: List[Dict],
        collection_name: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        qdrant_url: Optional[str] = None,
        qdrant_api_key: Optional[str] = None,
    ) -> int:
        """
        Index documents into a vector store.
        
        Args:
            documents: List of documents with 'content' and 'metadata'
            collection_name: Collection name
            chunk_size: Chunk size for splitting
            chunk_overlap: Overlap between chunks
            qdrant_url: Qdrant URL
            qdrant_api_key: Qdrant API key
        
        Returns:
            Number of chunks indexed
        """
        from langchain_core.documents import Document
        
        # Create text splitter
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=['\n\n', '\n', '. ', ' ', ''],
        )
        
        # Convert and split documents
        lc_docs = []
        for doc in documents:
            content = doc.get('content', '')
            metadata = doc.get('metadata', {})
            
            # Split into chunks
            chunks = splitter.split_text(content)
            for i, chunk in enumerate(chunks):
                chunk_metadata = {
                    **metadata,
                    'chunk_index': i,
                    'total_chunks': len(chunks),
                }
                lc_docs.append(Document(
                    page_content=chunk,
                    metadata=chunk_metadata,
                ))
        
        # Create vector store and add documents
        vectorstore = self.create_qdrant_vectorstore(
            collection_name=collection_name,
            qdrant_url=qdrant_url,
            qdrant_api_key=qdrant_api_key,
        )
        
        await vectorstore.aadd_documents(lc_docs)
        
        return len(lc_docs)
    
    async def retrieve_documents(
        self,
        query: str,
        collection_name: str,
        top_k: int = 5,
        score_threshold: float = 0.7,
        filter_dict: Optional[Dict] = None,
        qdrant_url: Optional[str] = None,
        qdrant_api_key: Optional[str] = None,
    ) -> RAGResult:
        """
        Retrieve relevant documents from vector store.
        
        Args:
            query: Search query
            collection_name: Collection name
            top_k: Number of documents to retrieve
            score_threshold: Minimum similarity score
            filter_dict: Metadata filters
            qdrant_url: Qdrant URL
            qdrant_api_key: Qdrant API key
        
        Returns:
            RAGResult with documents and scores
        """
        vectorstore = self.create_qdrant_vectorstore(
            collection_name=collection_name,
            qdrant_url=qdrant_url,
            qdrant_api_key=qdrant_api_key,
        )
        
        # Search with scores
        results = await vectorstore.asimilarity_search_with_score(
            query,
            k=top_k,
        )
        
        documents = []
        scores = []
        
        for doc, score in results:
            if score >= score_threshold:
                documents.append({
                    'content': doc.page_content,
                    'metadata': doc.metadata,
                })
                scores.append(score)
        
        return RAGResult(
            documents=documents,
            scores=scores,
            query=query,
            total_retrieved=len(documents),
        )
    
    async def chat_with_rag(
        self,
        messages: List[Dict],
        system_prompt: str,
        collection_name: str,
        top_k: int = 5,
        score_threshold: float = 0.7,
        qdrant_url: Optional[str] = None,
        qdrant_api_key: Optional[str] = None,
        **kwargs
    ) -> Tuple[ExecutionResult, RAGResult]:
        """
        Chat with RAG context.
        
        Args:
            messages: Input messages
            system_prompt: System prompt
            collection_name: Collection for RAG
            top_k: Number of documents
            score_threshold: Similarity threshold
            qdrant_url: Qdrant URL
            qdrant_api_key: Qdrant API key
        
        Returns:
            Tuple of (ExecutionResult, RAGResult)
        """
        # Get the last user message for retrieval
        user_query = ''
        for msg in reversed(messages):
            if msg.get('role') == 'user':
                user_query = msg.get('content', '')
                break
        
        # Retrieve documents
        rag_result = await self.retrieve_documents(
            query=user_query,
            collection_name=collection_name,
            top_k=top_k,
            score_threshold=score_threshold,
            qdrant_url=qdrant_url,
            qdrant_api_key=qdrant_api_key,
        )
        
        # Build context from documents
        context_parts = []
        for doc in rag_result.documents:
            context_parts.append(doc['content'])
        
        context = '\n\n---\n\n'.join(context_parts)
        
        # Enhance system prompt with context
        enhanced_prompt = f"""{system_prompt}

Use the following context to answer the user's question:

<context>
{context}
</context>

If the context doesn't contain relevant information, say so and answer based on your knowledge."""
        
        # Chat with enhanced prompt
        result = await self.chat(messages, enhanced_prompt, **kwargs)
        
        return result, rag_result
    
    # -------------------------------------------------------------------------
    # Memory Management
    # -------------------------------------------------------------------------
    
    def create_buffer_memory(
        self,
        memory_key: str = 'history',
        max_messages: int = 20,
    ) -> ConversationBufferMemory:
        """Create a buffer memory for conversation."""
        return ConversationBufferMemory(
            memory_key=memory_key,
            return_messages=True,
            max_token_limit=max_messages * 500,  # Approximate
        )
    
    def create_summary_memory(
        self,
        memory_key: str = 'history',
    ) -> ConversationSummaryMemory:
        """Create a summary memory for conversation."""
        self._init_llm()
        return ConversationSummaryMemory(
            llm=self.llm,
            memory_key=memory_key,
            return_messages=True,
        )
    
    async def summarize_conversation(
        self,
        messages: List[Dict],
        max_length: int = 500,
    ) -> str:
        """
        Generate a summary of a conversation.
        
        Args:
            messages: Conversation messages
            max_length: Maximum summary length
        
        Returns:
            Summary text
        """
        self._init_llm()
        
        # Format messages for summarization
        formatted = []
        for msg in messages:
            role = msg.get('role', 'user').title()
            content = msg.get('content', '')
            formatted.append(f'{role}: {content}')
        
        conversation_text = '\n'.join(formatted)
        
        prompt = f"""Summarize the following conversation in {max_length} characters or less.
Focus on the key topics, decisions, and outcomes.

Conversation:
{conversation_text}

Summary:"""
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return response.content[:max_length]
    
    # -------------------------------------------------------------------------
    # Cost Calculation
    # -------------------------------------------------------------------------
    
    def _calculate_cost(self, usage: TokenUsage) -> Decimal:
        """Calculate cost based on token usage."""
        input_cost_per_million = Decimal(str(
            self.provider_config.get('input_cost_per_million', 0)
        ))
        output_cost_per_million = Decimal(str(
            self.provider_config.get('output_cost_per_million', 0)
        ))
        
        input_cost = (Decimal(usage.input_tokens) / Decimal('1000000')) * input_cost_per_million
        output_cost = (Decimal(usage.output_tokens) / Decimal('1000000')) * output_cost_per_million
        
        return input_cost + output_cost


# =============================================================================
# AGENT MANAGER
# =============================================================================

class AgentManager:
    """
    High-level manager for AI agents.
    
    Handles agent lifecycle, execution, and state management.
    """
    
    def __init__(self):
        self._clients: Dict[str, LangChainClient] = {}
        self._graphs: Dict[str, Any] = {}
    
    def get_client(self, agent_id: str, provider_config: Dict) -> LangChainClient:
        """Get or create a LangChain client for an agent."""
        cache_key = f'{agent_id}_{hashlib.md5(str(provider_config).encode()).hexdigest()}'
        
        if cache_key not in self._clients:
            self._clients[cache_key] = LangChainClient(provider_config)
        
        return self._clients[cache_key]
    
    def clear_cache(self, agent_id: Optional[str] = None):
        """Clear cached clients."""
        if agent_id:
            keys_to_remove = [k for k in self._clients if k.startswith(agent_id)]
            for key in keys_to_remove:
                del self._clients[key]
        else:
            self._clients.clear()
    
    async def execute_agent(
        self,
        agent_id: str,
        provider_config: Dict,
        messages: List[Dict],
        system_prompt: str,
        tools: Optional[List[BaseTool]] = None,
        rag_config: Optional[Dict] = None,
        **kwargs
    ) -> ExecutionResult:
        """
        Execute an agent with full configuration.
        
        Args:
            agent_id: Agent identifier
            provider_config: LLM provider configuration
            messages: Input messages
            system_prompt: System prompt
            tools: Optional tools
            rag_config: Optional RAG configuration
        
        Returns:
            ExecutionResult
        """
        client = self.get_client(agent_id, provider_config)
        
        # Register tools
        if tools:
            client.clear_tools()
            client.register_tools(tools)
        
        # Check if RAG is enabled
        if rag_config and rag_config.get('enabled'):
            result, rag_result = await client.chat_with_rag(
                messages=messages,
                system_prompt=system_prompt,
                collection_name=rag_config.get('collection_name', ''),
                top_k=rag_config.get('top_k', 5),
                score_threshold=rag_config.get('score_threshold', 0.7),
                qdrant_url=rag_config.get('qdrant_url'),
                qdrant_api_key=rag_config.get('qdrant_api_key'),
            )
            result.metadata['rag_documents'] = rag_result.documents
            result.metadata['rag_scores'] = rag_result.scores
            return result
        
        # Run agent with tools
        if tools:
            return await client.run_agent(
                messages=messages,
                system_prompt=system_prompt,
                tools=tools,
                max_iterations=kwargs.get('max_iterations', 10),
            )
        
        # Simple chat
        return await client.chat(messages, system_prompt)
    
    async def stream_agent(
        self,
        agent_id: str,
        provider_config: Dict,
        messages: List[Dict],
        system_prompt: str,
        **kwargs
    ) -> AsyncIterator[StreamingChunk]:
        """Stream agent response."""
        client = self.get_client(agent_id, provider_config)
        
        async for chunk in client.chat_stream(messages, system_prompt):
            yield chunk


# Global agent manager instance
agent_manager = AgentManager()
