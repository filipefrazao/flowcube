'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'

interface Instance {
  id: number
  name: string
  phone_number?: string
  status: string
  provider: string
}

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/v1/chatcube/instances/')
      .then(res => setInstances(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Instancias WhatsApp</h1>
          <p className="text-muted-foreground">Gerenciar conexoes WhatsApp</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Atualizar
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : instances.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma instancia encontrada</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((inst) => (
            <Card key={inst.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{inst.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{inst.phone_number || 'Sem numero'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium " + (inst.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-surface-hover text-text-primary')}>
                    {inst.status}
                  </span>
                  <span className="text-xs text-muted-foreground">{inst.provider}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
