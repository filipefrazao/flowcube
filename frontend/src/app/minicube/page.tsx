'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { GraduationCap, MapPin, Users, Blocks, Workflow } from 'lucide-react'
import { miniApi } from '@/lib/miniApi'

const modules = [
  { title: 'Turmas', description: 'Gerenciar turmas e matriculas', href: '/minicube/turmas', icon: GraduationCap, color: 'text-blue-500' },
  { title: 'Polos', description: 'Locais e unidades de ensino', href: '/minicube/polos', icon: MapPin, color: 'text-green-500' },
  { title: 'Clientes', description: 'Alunos e participantes', href: '/minicube/clientes', icon: Users, color: 'text-purple-500' },
  { title: 'Blocos', description: 'Blocos de conteudo', href: '/minicube/blocos', icon: Blocks, color: 'text-orange-500' },
  { title: 'Flows', description: 'Fluxos de ensino', href: '/minicube/flows', icon: Workflow, color: 'text-cyan-500' },
]

export default function MiniCubePage() {
  const [stats, setStats] = useState({ turmas: 0, polos: 0, clientes: 0 })

  useEffect(() => {
    Promise.all([
      miniApi.classes.list().then(r => r.length || r.count || 0).catch(() => 0),
      miniApi.locations.list().then(r => r.length || r.count || 0).catch(() => 0),
      miniApi.students.list().then(r => r.length || r.count || 0).catch(() => 0),
    ]).then(([turmas, polos, clientes]) => setStats({ turmas, polos, clientes }))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">MiniCube</h1>
        <p className="text-muted-foreground">Plataforma educacional</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <mod.icon className={'h-6 w-6 ' + mod.color} />
                <CardTitle className="text-lg">{mod.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mod.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
