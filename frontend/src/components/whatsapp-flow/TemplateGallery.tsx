'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ShoppingCart, 
  Headphones, 
  CreditCard, 
  Megaphone,
  Search,
  Eye,
  MessageSquare,
} from 'lucide-react'

interface WhatsAppTemplate {
  id: string
  name: string
  category: 'E-commerce' | 'Atendimento' | 'Cobrança' | 'Marketing'
  description: string
  flowSteps: number
  estimatedTime: string
  tags: string[]
}

const categoryConfig = {
  'E-commerce': {
    label: 'E-commerce',
    icon: ShoppingCart,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20'
  },
  'Atendimento': {
    label: 'Atendimento',
    icon: Headphones,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20'
  },
  'Cobrança': {
    label: 'Cobrança',
    icon: CreditCard,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20'
  },
  'Marketing': {
    label: 'Marketing',
    icon: Megaphone,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20'
  }
}

const mockTemplates: WhatsAppTemplate[] = [
  {
    id: 'ecom-order-confirmation',
    name: 'Confirmação de Pedido',
    category: 'E-commerce',
    description: 'Fluxo automatizado para confirmar pedidos e fornecer informações de rastreamento',
    flowSteps: 4,
    estimatedTime: '2 min',
    tags: ['pedido', 'confirmação', 'rastreamento']
  },
  {
    id: 'ecom-abandoned-cart',
    name: 'Carrinho Abandonado',
    category: 'E-commerce',
    description: 'Recupere vendas perdidas com lembretes personalizados de carrinho abandonado',
    flowSteps: 3,
    estimatedTime: '1.5 min',
    tags: ['carrinho', 'recuperação', 'vendas']
  },
  {
    id: 'support-welcome',
    name: 'Mensagem de Boas-vindas',
    category: 'Atendimento',
    description: 'Receba novos clientes com uma mensagem calorosa e opções de atendimento',
    flowSteps: 3,
    estimatedTime: '1 min',
    tags: ['boas-vindas', 'primeiro contato', 'menu']
  },
  {
    id: 'support-faq-bot',
    name: 'Bot de FAQ',
    category: 'Atendimento',
    description: 'Responda automaticamente às perguntas mais frequentes dos clientes',
    flowSteps: 6,
    estimatedTime: '4 min',
    tags: ['faq', 'automação', 'respostas']
  },
  {
    id: 'billing-payment-reminder',
    name: 'Lembrete de Pagamento',
    category: 'Cobrança',
    description: 'Envie lembretes automáticos antes do vencimento das faturas',
    flowSteps: 3,
    estimatedTime: '1.5 min',
    tags: ['pagamento', 'lembrete', 'vencimento']
  },
  {
    id: 'marketing-lead-capture',
    name: 'Captura de Leads',
    category: 'Marketing',
    description: 'Colete informações de prospects interessados e qualifique leads automaticamente',
    flowSteps: 4,
    estimatedTime: '2.5 min',
    tags: ['leads', 'captura', 'qualificação']
  }
]

interface TemplateGalleryProps {
  className?: string
}

export function TemplateGallery({ className = '' }: TemplateGalleryProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredTemplates = useMemo(() => {
    return mockTemplates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
      
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  const handleUseTemplate = (templateId: string) => {
    router.push(`/whatsapp-studio?template=${templateId}`)
  }

  const categories = ['all', ...Array.from(new Set(mockTemplates.map(t => t.category)))]

  return (
    <div className={`w-full space-y-6 ${className}`}>
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Galeria de Templates WhatsApp
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Escolha entre nossos templates pré-construídos para criar fluxos de WhatsApp profissionais em minutos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </Button>
            {Object.entries(categoryConfig).map(([category, config]) => {
              const Icon = config.icon
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {config.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} encontrado{filteredTemplates.length !== 1 ? 's' : ''}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const categoryInfo = categoryConfig[template.category]
          const CategoryIcon = categoryInfo.icon

          return (
            <Card 
              key={template.id} 
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary" 
                    className={`${categoryInfo.bgColor} ${categoryInfo.color} border-0 flex items-center gap-1.5`}
                  >
                    <CategoryIcon className="h-3 w-3" />
                    {categoryInfo.label}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="h-3 w-3" />
                    {template.flowSteps} etapas
                  </div>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleUseTemplate(template.id)}
                >
                  Usar Template
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
