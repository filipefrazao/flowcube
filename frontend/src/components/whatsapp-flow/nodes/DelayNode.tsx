import { Clock } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { DelayNodeData } from '@/types/whatsapp-flow'

interface DelayNodeProps {
  data: DelayNodeData
  selected?: boolean
}

export function DelayNode({ data, selected }: DelayNodeProps) {
  return (
    <BaseNode
      data={data}
      selected={selected}
      icon={<Clock size={16} />}
      className="bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700"
    >
      <div className="text-sm text-center">
        <div className="font-medium text-gray-700 dark:text-gray-300">
          Wait {data.duration || 0}s
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Delay execution
        </div>
      </div>
    </BaseNode>
  )
}
