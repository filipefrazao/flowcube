'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

interface Agent {
  id: number
  name: string
  description?: string
  model: string
  is_active: boolean
}

export default function AIAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/v1/ai/agents/')
      .then(res => setAgents(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes IA</h1>
          <p className="text-muted-foreground">Gerenciar agentes de inteligencia artificial</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Atualizar
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : agents.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum agente configurado</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{agent.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{agent.description || 'Sem descricao'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " + (agent.is_active ? 'bg-green-100 text-green-800' : 'bg-surface-hover text-text-primary')}>
                    {agent.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="text-xs text-muted-foreground">{agent.model}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
