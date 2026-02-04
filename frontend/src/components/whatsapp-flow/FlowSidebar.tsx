'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  MessageSquare,
  HelpCircle,
  GitBranch,
  Zap,
  Clock,
  Search,
  GripVertical
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NodeTemplate {
  id: string
  type: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: {
    bg: string
    border: string
    icon: string
    hover: string
  }
}

interface FlowSidebarProps {
  className?: string
}

const nodeTemplates: NodeTemplate[] = [
  {
    id: 'message',
    type: 'message',
    label: 'Message',
    description: 'Send a text message to users',
    icon: MessageSquare,
    color: {
      bg: 'bg-green-50 dark:bg-green-950/20',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      hover: 'hover:bg-green-100 dark:hover:bg-green-950/40'
    }
  },
  {
    id: 'question',
    type: 'question',
    label: 'Question',
    description: 'Ask users for input or feedback',
    icon: HelpCircle,
    color: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      hover: 'hover:bg-blue-100 dark:hover:bg-blue-950/40'
    }
  },
  {
    id: 'condition',
    type: 'condition',
    label: 'Condition',
    description: 'Create branching logic paths',
    icon: GitBranch,
    color: {
      bg: 'bg-yellow-50 dark:bg-yellow-950/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      hover: 'hover:bg-yellow-100 dark:hover:bg-yellow-950/40'
    }
  },
  {
    id: 'action',
    type: 'action',
    label: 'Action',
    description: 'Trigger automated actions',
    icon: Zap,
    color: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-600 dark:text-purple-400',
      hover: 'hover:bg-purple-100 dark:hover:bg-purple-950/40'
    }
  },
  {
    id: 'delay',
    type: 'delay',
    label: 'Delay',
    description: 'Add time delays between steps',
    icon: Clock,
    color: {
      bg: 'bg-gray-50 dark:bg-gray-950/20',
      border: 'border-gray-200 dark:border-gray-800',
      icon: 'text-gray-600 dark:text-gray-400',
      hover: 'hover:bg-gray-100 dark:hover:bg-gray-950/40'
    }
  }
]

export function FlowSidebar({ className }: FlowSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return nodeTemplates
    
    const query = searchQuery.toLowerCase()
    return nodeTemplates.filter(
      template =>
        template.label.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.type.toLowerCase().includes(query)
    )
  }, [searchQuery])

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', template.type)
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: template.type,
      label: template.label
    }))
    event.dataTransfer.effectAllowed = 'copy'
    setDraggedItem(template.id)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-background border-r border-border',
        'w-80',
        className
      )}
      role="complementary"
      aria-label="Flow builder elements sidebar"
    >
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Flow Elements
        </h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search flow elements"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No elements found</p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const IconComponent = template.icon
            const isDragging = draggedItem === template.id

            return (
              <Card
                key={template.id}
                className={cn(
                  'relative cursor-grab active:cursor-grabbing transition-all duration-200',
                  'border-2 border-dashed border-transparent',
                  template.color.bg,
                  template.color.border,
                  template.color.hover,
                  'hover:shadow-md hover:scale-[1.02]',
                  isDragging && 'opacity-50 scale-95 shadow-lg'
                )}
                draggable
                onDragStart={(e) => handleDragStart(e, template)}
                onDragEnd={handleDragEnd}
                role="button"
                tabIndex={0}
                aria-label={`Drag ${template.label} element to canvas`}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="p-4">
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg mb-3',
                    'bg-background/50 border border-current/20',
                    template.color.icon
                  )}>
                    <IconComponent className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-1">
                      {template.label}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </div>

                {isDragging && (
                  <div className="absolute inset-0 bg-primary/10 rounded-lg border-2 border-primary border-dashed" />
                )}
              </Card>
            )
          })
        )}
      </div>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Drag elements to the canvas to build your flow
        </p>
      </div>
    </aside>
  )
}
