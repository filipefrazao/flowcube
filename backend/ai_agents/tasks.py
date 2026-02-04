"""
FlowCube AI Agents Celery Tasks

Async tasks for:
- Agent execution
- Document indexing
- Conversation summarization
- Cost tracking
- Workflow execution

Author: FRZ Group
"""

import asyncio
import hashlib
import logging
import time
from decimal import Decimal
from typing import Any, Dict, List, Optional

from celery import shared_task, chain, group
from django.conf import settings
from django.db import transaction
from django.db.models import Sum, Count, Avg
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# AGENT EXECUTION TASKS
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def execute_agent_async(
    self,
    agent_id: str,
    conversation_id: str,
    message_content: str,
    context_variables: Optional[Dict] = None,
    attachments: Optional[List] = None,
) -> Dict[str, Any]:
    """
    Execute an agent asynchronously.
    """
    from .models import (
        AgentDefinition, AgentConversation, AgentMessage,
        AgentExecution, LLMProvider
    )
    from .langchain_client import agent_manager, ExecutionResult
    from .tools import ToolFactory
    
    try:
        agent = AgentDefinition.objects.get(id=agent_id)
        conversation = AgentConversation.objects.get(id=conversation_id)
        provider = agent.llm_provider
        
        user_message = AgentMessage.objects.create(
            conversation=conversation,
            role='user',
            content=message_content,
            attachments=attachments or [],
        )
        
        provider_config = {
            'provider_type': provider.provider_type,
            'api_key': provider.api_key,
            'model': agent.llm_model or provider.default_model,
            'api_base_url': provider.api_base_url,
            'temperature': agent.temperature,
            'max_tokens': agent.max_tokens,
            'top_p': agent.top_p,
            'input_cost_per_million': float(provider.input_cost_per_million),
            'output_cost_per_million': float(provider.output_cost_per_million),
        }
        
        messages = [
            {'role': msg.role, 'content': msg.content}
            for msg in conversation.messages.filter(
                role__in=['user', 'assistant']
            ).order_by('sequence_number')
        ]
        
        tools = ToolFactory.load_tools_from_database(agent) if agent.tools.exists() else None
        
        rag_config = None
        if agent.rag_enabled and agent.knowledge_bases.exists():
            kb = agent.knowledge_bases.first()
            rag_config = {
                'enabled': True,
                'collection_name': kb.collection_name,
                'top_k': agent.rag_top_k,
                'score_threshold': agent.rag_score_threshold,
                'qdrant_url': kb.vector_store_config.get('url'),
                'qdrant_api_key': kb.vector_store_config.get('api_key'),
            }
        
        start_time = time.time()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                agent_manager.execute_agent(
                    agent_id=agent_id,
                    provider_config=provider_config,
                    messages=messages,
                    system_prompt=agent.get_full_system_prompt(context_variables),
                    tools=tools,
                    rag_config=rag_config,
                )
            )
        finally:
            loop.close()
        
        assistant_message = AgentMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=result.content,
            tool_calls=result.tool_calls,
            input_tokens=result.token_usage.input_tokens,
            output_tokens=result.token_usage.output_tokens,
            cost=result.cost,
            response_time_ms=result.duration_ms,
            first_token_time_ms=result.time_to_first_token_ms,
            model_used=result.model_used,
            provider_used=result.provider_used,
            rag_context=result.metadata.get('rag_documents', []),
            status='completed' if not result.error else 'error',
            error_message=result.error or '',
        )
        
        conversation.update_stats(
            result.token_usage.input_tokens,
            result.token_usage.output_tokens,
            result.cost
        )
        
        agent.increment_stats(
            result.token_usage.total_tokens,
            result.cost,
            result.duration_ms / 1000
        )
        
        AgentExecution.objects.create(
            conversation=conversation,
            message=assistant_message,
            agent=agent,
            execution_type='chat',
            status='completed' if not result.error else 'failed',
            provider=provider,
            model_used=result.model_used,
            input_tokens=result.token_usage.input_tokens,
            output_tokens=result.token_usage.output_tokens,
            cost=result.cost,
            started_at=timezone.now() - timezone.timedelta(milliseconds=result.duration_ms),
            completed_at=timezone.now(),
            duration_ms=result.duration_ms,
            time_to_first_token_ms=result.time_to_first_token_ms,
            error_message=result.error or '',
        )
        
        return {
            'success': True,
            'message_id': str(assistant_message.id),
            'content': result.content,
            'tool_calls': result.tool_calls,
            'tokens': result.token_usage.total_tokens,
            'cost': float(result.cost),
            'duration_ms': result.duration_ms,
        }
    
    except Exception as e:
        logger.exception(f'Agent execution failed: {e}')
        
        if 'rate limit' in str(e).lower() or 'timeout' in str(e).lower():
            raise self.retry(exc=e)
        
        return {
            'success': False,
            'error': str(e),
        }


@shared_task(bind=True)
def execute_tool_async(
    self,
    tool_id: str,
    parameters: Dict[str, Any],
    execution_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute a tool asynchronously.
    """
    from .models import AgentTool, AgentExecution
    from .tools import ToolFactory
    
    try:
        tool = AgentTool.objects.get(id=tool_id)
        
        lc_tool = ToolFactory.create_tool_from_definition(tool)
        if not lc_tool:
            return {
                'success': False,
                'error': 'Failed to create tool',
            }
        
        start_time = time.time()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            if hasattr(lc_tool, 'ainvoke'):
                result = loop.run_until_complete(lc_tool.ainvoke(parameters))
            else:
                result = lc_tool.invoke(parameters)
        finally:
            loop.close()
        
        execution_time = time.time() - start_time
        
        tool.record_execution(True, execution_time)
        
        if execution_id:
            try:
                execution = AgentExecution.objects.get(id=execution_id)
                execution.tool_output = result
                execution.completed_at = timezone.now()
                execution.status = 'completed'
                execution.save()
            except AgentExecution.DoesNotExist:
                pass
        
        return {
            'success': True,
            'result': result,
            'execution_time_ms': int(execution_time * 1000),
        }
    
    except Exception as e:
        logger.exception(f'Tool execution failed: {e}')
        
        if 'tool' in locals():
            tool.record_execution(False, 0)
        
        return {
            'success': False,
            'error': str(e),
        }


# =============================================================================
# DOCUMENT INDEXING TASKS
# =============================================================================

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def index_knowledge_base(self, knowledge_base_id: str) -> Dict[str, Any]:
    """
    Index all documents in a knowledge base.
    """
    from .models import KnowledgeBase, KnowledgeDocument
    
    try:
        kb = KnowledgeBase.objects.get(id=knowledge_base_id)
        kb.is_indexing = True
        kb.save(update_fields=['is_indexing'])
        
        documents = kb.documents.filter(
            indexing_status__in=['pending', 'outdated'],
            is_active=True
        )
        
        total_docs = documents.count()
        indexed_count = 0
        failed_count = 0
        total_chunks = 0
        
        for doc in documents:
            try:
                result = index_document.apply(args=[str(doc.id)])
                if result.get('success'):
                    indexed_count += 1
                    total_chunks += result.get('chunks', 0)
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f'Failed to index document {doc.id}: {e}')
                failed_count += 1
        
        kb.document_count = kb.documents.filter(
            indexing_status='indexed', is_active=True
        ).count()
        kb.chunk_count = total_chunks
        kb.total_characters = kb.documents.filter(
            is_active=True
        ).aggregate(total=Sum('character_count'))['total'] or 0
        kb.is_indexing = False
        kb.last_indexed_at = timezone.now()
        kb.save()
        
        return {
            'success': True,
            'total_documents': total_docs,
            'indexed': indexed_count,
            'failed': failed_count,
            'total_chunks': total_chunks,
        }
    
    except Exception as e:
        logger.exception(f'Knowledge base indexing failed: {e}')
        
        if 'kb' in locals():
            kb.is_indexing = False
            kb.save(update_fields=['is_indexing'])
        
        raise self.retry(exc=e)


@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def index_document(self, document_id: str) -> Dict[str, Any]:
    """
    Index a single document.
    """
    from .models import KnowledgeDocument, LLMProvider
    from .langchain_client import LangChainClient
    
    try:
        doc = KnowledgeDocument.objects.get(id=document_id)
        kb = doc.knowledge_base
        
        doc.indexing_status = 'processing'
        doc.save(update_fields=['indexing_status'])
        
        provider = kb.embedding_provider or LLMProvider.objects.filter(
            is_default=True, is_active=True
        ).first()
        
        if not provider:
            raise ValueError('No embedding provider available')
        
        client = LangChainClient({
            'provider_type': provider.provider_type,
            'api_key': provider.api_key,
            'embedding_model': kb.embedding_model,
        })
        
        documents = [{
            'content': doc.content,
            'metadata': {
                'document_id': str(doc.id),
                'title': doc.title,
                'document_type': doc.document_type,
                **doc.metadata,
            },
        }]
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            chunk_count = loop.run_until_complete(client.index_documents(
                documents=documents,
                collection_name=kb.collection_name,
                chunk_size=kb.chunk_size,
                chunk_overlap=kb.chunk_overlap,
                qdrant_url=kb.vector_store_config.get('url'),
                qdrant_api_key=kb.vector_store_config.get('api_key'),
            ))
        finally:
            loop.close()
        
        doc.indexing_status = 'indexed'
        doc.indexed_at = timezone.now()
        doc.chunk_count = chunk_count
        doc.indexing_error = ''
        doc.save()
        
        return {
            'success': True,
            'chunks': chunk_count,
        }
    
    except Exception as e:
        logger.exception(f'Document indexing failed: {e}')
        
        if 'doc' in locals():
            doc.indexing_status = 'failed'
            doc.indexing_error = str(e)
            doc.save(update_fields=['indexing_status', 'indexing_error'])
        
        raise self.retry(exc=e)


@shared_task
def check_document_changes(knowledge_base_id: str) -> Dict[str, Any]:
    """
    Check for document changes that need reindexing.
    """
    from .models import KnowledgeBase
    
    kb = KnowledgeBase.objects.get(id=knowledge_base_id)
    
    documents_to_reindex = []
    for doc in kb.documents.filter(is_active=True, indexing_status='indexed'):
        if doc.needs_reindexing():
            doc.indexing_status = 'outdated'
            doc.save(update_fields=['indexing_status'])
            documents_to_reindex.append(str(doc.id))
    
    return {
        'documents_to_reindex': documents_to_reindex,
        'count': len(documents_to_reindex),
    }


# =============================================================================
# CONVERSATION TASKS
# =============================================================================

@shared_task
def summarize_conversation(conversation_id: str) -> Dict[str, Any]:
    """
    Generate a summary for a conversation.
    """
    from .models import AgentConversation, LLMProvider
    from .langchain_client import LangChainClient
    
    try:
        conversation = AgentConversation.objects.get(id=conversation_id)
        provider = conversation.agent.llm_provider
        
        messages = [
            {'role': msg.role, 'content': msg.content}
            for msg in conversation.messages.filter(
                role__in=['user', 'assistant']
            ).order_by('sequence_number')
        ]
        
        if not messages:
            return {
                'success': False,
                'error': 'No messages to summarize',
            }
        
        client = LangChainClient({
            'provider_type': provider.provider_type,
            'api_key': provider.api_key,
            'model': provider.default_model,
            'temperature': 0.3,
            'max_tokens': 500,
        })
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            summary = loop.run_until_complete(
                client.summarize_conversation(messages, max_length=500)
            )
        finally:
            loop.close()
        
        conversation.summary = summary
        conversation.save(update_fields=['summary'])
        
        return {
            'success': True,
            'summary': summary,
        }
    
    except Exception as e:
        logger.exception(f'Summarization failed: {e}')
        return {
            'success': False,
            'error': str(e),
        }


@shared_task
def compress_conversation_memory(conversation_id: str) -> Dict[str, Any]:
    """
    Compress conversation memory by summarizing old messages.
    """
    from .models import AgentConversation
    
    try:
        conversation = AgentConversation.objects.get(id=conversation_id)
        agent = conversation.agent
        
        message_count = conversation.messages.count()
        if message_count <= agent.memory_window:
            return {
                'success': True,
                'compressed': False,
                'reason': 'Not enough messages to compress',
            }
        
        old_messages = conversation.messages.order_by('sequence_number')[
            :message_count - agent.memory_window
        ]
        
        result = summarize_conversation.apply(args=[conversation_id])
        
        if result.get('success'):
            conversation.memory_summary = result.get('summary', '')
            conversation.save(update_fields=['memory_summary'])
            
            return {
                'success': True,
                'compressed': True,
                'messages_summarized': old_messages.count(),
            }
        
        return result
    
    except Exception as e:
        logger.exception(f'Memory compression failed: {e}')
        return {
            'success': False,
            'error': str(e),
        }


@shared_task
def generate_conversation_title(conversation_id: str) -> Dict[str, Any]:
    """
    Generate a title for a conversation based on its content.
    """
    from .models import AgentConversation, LLMProvider
    from .langchain_client import LangChainClient
    
    try:
        conversation = AgentConversation.objects.get(id=conversation_id)
        
        messages = conversation.messages.filter(
            role__in=['user', 'assistant']
        ).order_by('sequence_number')[:4]
        
        if not messages:
            return {
                'success': False,
                'error': 'No messages to generate title from',
            }
        
        content = '\n'.join([
            f'{msg.role}: {msg.content[:200]}'
            for msg in messages
        ])
        
        provider = conversation.agent.llm_provider
        client = LangChainClient({
            'provider_type': provider.provider_type,
            'api_key': provider.api_key,
            'model': provider.default_model,
            'temperature': 0.7,
            'max_tokens': 50,
        })
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(client.chat(
                messages=[{
                    'role': 'user',
                    'content': f'Generate a short title (max 50 chars) for this conversation:\n{content}'
                }]
            ))
        finally:
            loop.close()
        
        title = result.content.strip().strip('"').strip("'")[:100]
        
        conversation.title = title
        conversation.save(update_fields=['title'])
        
        return {
            'success': True,
            'title': title,
        }
    
    except Exception as e:
        logger.exception(f'Title generation failed: {e}')
        return {
            'success': False,
            'error': str(e),
        }


# =============================================================================
# WORKFLOW TASKS
# =============================================================================

@shared_task(bind=True, max_retries=2)
def execute_workflow(
    self,
    workflow_id: str,
    input_data: Dict[str, Any],
    user_id: int,
) -> Dict[str, Any]:
    """
    Execute a LangGraph workflow.
    """
    from .models import AgentWorkflow
    from .langchain_client import LangChainClient, agent_manager
    
    try:
        workflow = AgentWorkflow.objects.get(id=workflow_id)
        
        workflow.total_executions += 1
        workflow.save(update_fields=['total_executions'])
        
        primary_agent = workflow.agents.first()
        if not primary_agent:
            return {
                'success': False,
                'error': 'Workflow has no agents configured',
            }
        
        provider = primary_agent.llm_provider
        provider_config = {
            'provider_type': provider.provider_type,
            'api_key': provider.api_key,
            'model': primary_agent.llm_model or provider.default_model,
            'temperature': primary_agent.temperature,
            'max_tokens': primary_agent.max_tokens,
        }
        
        client = LangChainClient(provider_config)
        
        from .tools import ToolFactory
        tools = ToolFactory.load_tools_from_database(primary_agent)
        
        graph = client.create_langgraph_agent(
            system_prompt=primary_agent.get_full_system_prompt(),
            tools=tools,
            checkpointer=True,
        )
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(client.run_langgraph_agent(
                graph=graph,
                messages=[{'role': 'user', 'content': str(input_data)}],
                thread_id=f'{workflow_id}_{user_id}',
            ))
        finally:
            loop.close()
        
        if not result.error:
            workflow.successful_executions += 1
        else:
            workflow.failed_executions += 1
        workflow.save(update_fields=['successful_executions', 'failed_executions'])
        
        return {
            'success': not result.error,
            'content': result.content,
            'tool_calls': result.tool_calls,
            'error': result.error,
            'duration_ms': result.duration_ms,
        }
    
    except Exception as e:
        logger.exception(f'Workflow execution failed: {e}')
        
        if 'workflow' in locals():
            workflow.failed_executions += 1
            workflow.save(update_fields=['failed_executions'])
        
        raise self.retry(exc=e)


# =============================================================================
# COST TRACKING TASKS
# =============================================================================

@shared_task
def calculate_daily_costs(date_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Calculate daily costs for all agents and providers.
    """
    from .models import AgentExecution
    
    if date_str:
        from datetime import datetime
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    else:
        target_date = timezone.now().date() - timezone.timedelta(days=1)
    
    executions = AgentExecution.objects.filter(
        created_at__date=target_date
    )
    
    overall = executions.aggregate(
        total_cost=Sum('cost'),
        total_tokens=Sum('total_tokens'),
        total_requests=Count('id'),
    )
    
    by_agent = list(executions.values(
        'agent__id', 'agent__display_name'
    ).annotate(
        cost=Sum('cost'),
        tokens=Sum('total_tokens'),
        requests=Count('id'),
    ).order_by('-cost')[:20])
    
    by_provider = list(executions.values(
        'provider__id', 'provider__name'
    ).annotate(
        cost=Sum('cost'),
        tokens=Sum('total_tokens'),
        requests=Count('id'),
    ).order_by('-cost')[:10])
    
    return {
        'date': str(target_date),
        'total_cost': float(overall['total_cost'] or 0),
        'total_tokens': overall['total_tokens'] or 0,
        'total_requests': overall['total_requests'] or 0,
        'by_agent': by_agent,
        'by_provider': by_provider,
    }


@shared_task
def send_cost_alert(threshold: float = 100.0) -> Dict[str, Any]:
    """
    Send alert if daily costs exceed threshold.
    """
    costs = calculate_daily_costs()
    
    if costs['total_cost'] > threshold:
        logger.warning(
            f"Cost alert: Daily costs ({costs['total_cost']:.2f} USD) "
            f"exceeded threshold ({threshold:.2f} USD)"
        )
        
        return {
            'alert_sent': True,
            'total_cost': costs['total_cost'],
            'threshold': threshold,
        }
    
    return {
        'alert_sent': False,
        'total_cost': costs['total_cost'],
        'threshold': threshold,
    }


# =============================================================================
# MAINTENANCE TASKS
# =============================================================================

@shared_task
def cleanup_old_executions(days: int = 90) -> Dict[str, Any]:
    """
    Clean up old execution logs.
    """
    from .models import AgentExecution
    
    cutoff = timezone.now() - timezone.timedelta(days=days)
    
    deleted_count, _ = AgentExecution.objects.filter(
        created_at__lt=cutoff
    ).delete()
    
    return {
        'deleted_count': deleted_count,
        'cutoff_date': str(cutoff.date()),
    }


@shared_task
def cleanup_orphan_messages(days: int = 30) -> Dict[str, Any]:
    """
    Clean up orphan messages from deleted conversations.
    """
    from .models import AgentMessage
    
    cutoff = timezone.now() - timezone.timedelta(days=days)
    
    deleted_count, _ = AgentMessage.objects.filter(
        conversation__isnull=True,
        created_at__lt=cutoff
    ).delete()
    
    return {
        'deleted_count': deleted_count,
    }


@shared_task
def update_agent_statistics() -> Dict[str, Any]:
    """
    Update cached statistics for all agents.
    """
    from .models import AgentDefinition, AgentExecution
    
    updated_count = 0
    
    for agent in AgentDefinition.objects.filter(is_active=True):
        executions = AgentExecution.objects.filter(agent=agent)
        
        stats = executions.aggregate(
            total_messages=Count('id'),
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('cost'),
            avg_duration=Avg('duration_ms'),
        )
        
        agent.total_messages = stats['total_messages'] or 0
        agent.total_tokens_used = stats['total_tokens'] or 0
        agent.total_cost = stats['total_cost'] or Decimal('0')
        agent.average_response_time = (stats['avg_duration'] or 0) / 1000
        agent.save(update_fields=[
            'total_messages', 'total_tokens_used',
            'total_cost', 'average_response_time'
        ])
        
        updated_count += 1
    
    return {
        'agents_updated': updated_count,
    }
