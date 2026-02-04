"""
Management command para popular contextos brasileiros
"""
from django.core.management.base import BaseCommand
from workflows.models import BrazilianContext


class Command(BaseCommand):
    help = 'Popula contextos brasileiros pré-configurados'

    def handle(self, *args, **options):
        contexts_data = [
            {
                'context_type': BrazilianContext.ContextType.PIX,
                'patterns': [
                    'pix', 'pagamento instantâneo', 'qr code',
                    'chave pix', 'payment', 'pagamento'
                ],
                'templates': [
                    {
                        'name': 'Confirmação de Pagamento Pix',
                        'description': 'Detecta pagamento via Pix e dispara ações automáticas',
                        'use_cases': [
                            'E-commerce: Liberar produto após Pix',
                            'Serviços: Confirmar agendamento após pagamento',
                            'Infoprodutos: Enviar acesso imediato'
                        ]
                    }
                ]
            },
            {
                'context_type': BrazilianContext.ContextType.WHATSAPP,
                'patterns': [
                    'whatsapp', 'wpp', 'zap', 'mensagem',
                    'chat', 'atendimento', 'whatsapp business'
                ],
                'templates': [
                    {
                        'name': 'Qualificação de Leads via WhatsApp',
                        'description': 'Resposta automática e qualificação inteligente',
                        'use_cases': [
                            'Primeira resposta automática',
                            'Qualificação de interesse',
                            'Agendamento de reunião',
                            'Envio de material'
                        ]
                    },
                    {
                        'name': 'Notificações via WhatsApp',
                        'description': 'Envio de notificações transacionais',
                        'use_cases': [
                            'Confirmação de pedido',
                            'Status de entrega',
                            'Lembretes de reunião',
                            'Cobrança amigável'
                        ]
                    }
                ]
            },
            {
                'context_type': BrazilianContext.ContextType.NFE,
                'patterns': [
                    'nfe', 'nota fiscal', 'invoice', 'fiscal',
                    'emissão', 'danfe', 'sefaz'
                ],
                'templates': [
                    {
                        'name': 'Emissão Automática de NFe',
                        'description': 'Emite nota fiscal após confirmação de pagamento',
                        'use_cases': [
                            'E-commerce: NFe automática',
                            'Serviços: NFSe ao concluir',
                            'Integração com ERP'
                        ]
                    }
                ]
            },
            {
                'context_type': BrazilianContext.ContextType.ECOMMERCE,
                'patterns': [
                    'ecommerce', 'loja', 'shop', 'mercado livre',
                    'shopee', 'marketplace', 'vendas online'
                ],
                'templates': [
                    {
                        'name': 'Funil de Vendas E-commerce',
                        'description': 'Automação completa de vendas online',
                        'use_cases': [
                            'Carrinho abandonado',
                            'Upsell/Cross-sell',
                            'Pós-venda automático',
                            'Pedido de avaliação'
                        ]
                    }
                ]
            },
            {
                'context_type': BrazilianContext.ContextType.CRM,
                'patterns': [
                    'crm', 'gestão', 'pipeline', 'vendas',
                    'salescube', 'rd station', 'hubspot'
                ],
                'templates': [
                    {
                        'name': 'Gestão de Pipeline',
                        'description': 'Movimentação automática de leads no CRM',
                        'use_cases': [
                            'Qualificação automática',
                            'Distribuição de leads',
                            'Follow-up automático',
                            'Alertas de inatividade'
                        ]
                    }
                ]
            },
            {
                'context_type': BrazilianContext.ContextType.LEADS,
                'patterns': [
                    'leads', 'prospecção', 'captação',
                    'formulário', 'landing page', 'conversão'
                ],
                'templates': [
                    {
                        'name': 'Captação e Nutrição de Leads',
                        'description': 'Captura leads e inicia nutrição automática',
                        'use_cases': [
                            'Lead magnet automático',
                            'Sequência de emails',
                            'Qualificação por score',
                            'Handoff para vendas'
                        ]
                    }
                ]
            }
        ]

        created_count = 0
        updated_count = 0

        for context_data in contexts_data:
            context, created = BrazilianContext.objects.update_or_create(
                context_type=context_data['context_type'],
                defaults={
                    'patterns': context_data['patterns'],
                    'templates': context_data['templates']
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Criado: {context.get_context_type_display()}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Atualizado: {context.get_context_type_display()}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Processo concluído: {created_count} criados, {updated_count} atualizados'
            )
        )
