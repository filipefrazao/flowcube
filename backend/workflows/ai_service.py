"""
AI Service - Integração com OpenAI para análise contextual
"""
import json
from typing import Dict, List, Any


class AIAutomationService:
    """
    Serviço de IA para análise de contexto e geração de sugestões de automação
    """
    
    def __init__(self):
        self._client = None
        self.model = "gpt-4o"
    
    @property
    def client(self):
        """Lazy load OpenAI client"""
        if self._client is None:
            from django.conf import settings
            if settings.OPENAI_API_KEY:
                from openai import OpenAI
                self._client = OpenAI(api_key=settings.OPENAI_API_KEY)
        return self._client
    
    def analyze_context(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analisa o contexto do usuário e retorna sugestões de automação
        
        Args:
            user_context: Dicionário com informações do contexto do usuário
                - context: Descrição geral
                - business_description: Descrição do negócio
                - automation_goal: Objetivo da automação
                - preferred_channels: Lista de canais preferidos
        
        Returns:
            Dict com sugestões, contextos identificados e recomendações
        """
        if not self.client:
            return self._generate_mock_suggestions(user_context)
        
        try:
            # Monta o prompt para o GPT-4o
            prompt = self._build_analysis_prompt(user_context)
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return self._format_ai_response(result, user_context)
            
        except Exception as e:
            print(f"Erro na análise de IA: {e}")
            return self._generate_mock_suggestions(user_context)
    
    def _get_system_prompt(self) -> str:
        """Prompt do sistema para o assistente IA"""
        return """Você é um especialista em automação de marketing e vendas no Brasil.
Sua especialidade é identificar oportunidades de automação considerando as particularidades brasileiras:

1. **Pix**: Sistema de pagamento instantâneo brasileiro
2. **WhatsApp Business**: Principal canal de comunicação com clientes
3. **NFe**: Nota Fiscal Eletrônica (obrigatoriedade fiscal)
4. **E-commerce**: Integração com marketplaces brasileiros (Mercado Livre, Shopee, etc)
5. **CRM**: Gestão de leads e vendedores

Ao analisar um contexto, você deve:
- Identificar quais contextos brasileiros se aplicam
- Sugerir automações práticas e aplicáveis
- Considerar integrações com ferramentas locais
- Fornecer explicações claras e objetivas
- Atribuir score de confiança (0-100) para cada sugestão

Responda sempre em JSON com a estrutura:
{
  "brazilian_contexts": ["pix", "whatsapp", "nfe", "ecommerce", "crm", "leads"],
  "suggestions": [
    {
      "context_type": "whatsapp",
      "confidence_score": 85,
      "explanation": "Explicação da sugestão",
      "workflow_template": {
        "name": "Nome do workflow",
        "description": "Descrição",
        "nodes": [...],
        "edges": [...]
      }
    }
  ],
  "recommendations": ["Recomendação 1", "Recomendação 2"]
}
"""
    
    def _build_analysis_prompt(self, user_context: Dict[str, Any]) -> str:
        """Constrói o prompt de análise"""
        context_parts = []
        
        if user_context.get('business_description'):
            context_parts.append(f"Negócio: {user_context['business_description']}")
        
        if user_context.get('automation_goal'):
            context_parts.append(f"Objetivo: {user_context['automation_goal']}")
        
        if user_context.get('preferred_channels'):
            channels = ', '.join(user_context['preferred_channels'])
            context_parts.append(f"Canais preferidos: {channels}")
        
        if user_context.get('context'):
            context_parts.append(f"Contexto adicional: {user_context['context']}")
        
        prompt = "Analise o seguinte contexto e sugira automações:\n\n"
        prompt += "\n".join(context_parts)
        prompt += "\n\nGere sugestões de automação considerando os contextos brasileiros aplicáveis."
        
        return prompt
    
    def _format_ai_response(self, ai_result: Dict[str, Any], user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Formata a resposta da IA para o formato esperado"""
        return {
            'brazilian_contexts': ai_result.get('brazilian_contexts', []),
            'suggestions': [
                {
                    'context_type': sug.get('context_type', ''),
                    'confidence_score': sug.get('confidence_score', 0),
                    'explanation': sug.get('explanation', ''),
                    'workflow_template': sug.get('workflow_template', {}),
                    'user_context': user_context
                }
                for sug in ai_result.get('suggestions', [])
            ],
            'recommendations': ai_result.get('recommendations', [])
        }
    
    def _generate_mock_suggestions(self, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Gera sugestões mock quando OpenAI não está disponível"""
        return {
            'brazilian_contexts': ['whatsapp', 'pix', 'leads'],
            'suggestions': [
                {
                    'context_type': 'whatsapp',
                    'confidence_score': 85,
                    'explanation': 'Automação de resposta via WhatsApp Business com qualificação de leads',
                    'workflow_template': {
                        'name': 'Qualificação via WhatsApp',
                        'description': 'Resposta automática e qualificação de leads via WhatsApp',
                        'nodes': [
                            {
                                'id': 'trigger-1',
                                'type': 'whatsapp_trigger',
                                'data': {'label': 'Nova mensagem WhatsApp'},
                                'position': {'x': 100, 'y': 100}
                            },
                            {
                                'id': 'ai-1',
                                'type': 'openai',
                                'data': {'label': 'Analisar mensagem', 'model': 'gpt-4o'},
                                'position': {'x': 300, 'y': 100}
                            },
                            {
                                'id': 'response-1',
                                'type': 'whatsapp_template',
                                'data': {'label': 'Enviar resposta'},
                                'position': {'x': 500, 'y': 100}
                            }
                        ],
                        'edges': [
                            {'id': 'e1', 'source': 'trigger-1', 'target': 'ai-1'},
                            {'id': 'e2', 'source': 'ai-1', 'target': 'response-1'}
                        ]
                    },
                    'user_context': user_context
                },
                {
                    'context_type': 'pix',
                    'confidence_score': 75,
                    'explanation': 'Confirmação automática de pagamento Pix e disparo de produto',
                    'workflow_template': {
                        'name': 'Confirmação Pix',
                        'description': 'Detecta pagamento Pix e envia produto automaticamente',
                        'nodes': [
                            {
                                'id': 'webhook-1',
                                'type': 'webhook',
                                'data': {'label': 'Webhook Pix'},
                                'position': {'x': 100, 'y': 100}
                            },
                            {
                                'id': 'condition-1',
                                'type': 'condition',
                                'data': {'label': 'Pagamento confirmado?'},
                                'position': {'x': 300, 'y': 100}
                            },
                            {
                                'id': 'whatsapp-1',
                                'type': 'whatsapp_template',
                                'data': {'label': 'Enviar produto'},
                                'position': {'x': 500, 'y': 100}
                            }
                        ],
                        'edges': [
                            {'id': 'e1', 'source': 'webhook-1', 'target': 'condition-1'},
                            {'id': 'e2', 'source': 'condition-1', 'target': 'whatsapp-1'}
                        ]
                    },
                    'user_context': user_context
                }
            ],
            'recommendations': [
                'Considere integrar com Evolution API para WhatsApp',
                'Configure webhooks do seu gateway de pagamento Pix',
                'Implemente CRM para gestão de leads (SalesCube)'
            ]
        }
    
    def generate_workflow_from_template(self, template: Dict[str, Any]) -> Dict[str, Any]:
        """
        Gera um workflow completo a partir de um template
        
        Args:
            template: Template de workflow
        
        Returns:
            Workflow graph completo pronto para ser salvo
        """
        return {
            'nodes': template.get('nodes', []),
            'edges': template.get('edges', []),
            'viewport': {'x': 0, 'y': 0, 'zoom': 1}
        }


# Instância singleton do serviço
ai_service = AIAutomationService()
