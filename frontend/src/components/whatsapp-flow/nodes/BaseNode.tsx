import { Handle, Position } from '@xyflow/react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { FlowNodeData } from '@/types/whatsapp-flow'

interface BaseNodeProps {
  data: FlowNodeData
  selected?: boolean
  children: React.ReactNode
  icon: React.ReactNode
  className?: string
}

export function BaseNode({ data, selected, children, icon, className }: BaseNodeProps) {
  return (
    <Card className={cn(
      'min-w-[200px] max-w-[250px] border-2 transition-all duration-200',
      selected ? 'border-green-500 shadow-lg' : 'border-gray-200 dark:border-gray-700',
      'bg-white dark:bg-gray-800',
      className
    )}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-green-600 dark:text-green-400">
            {icon}
          </div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            {data.type}
          </span>
        </div>
        
        {children}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </Card>
  )
}
