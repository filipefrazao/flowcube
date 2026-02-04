import { Zap } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { ActionNodeData } from '@/types/whatsapp-flow'

interface ActionNodeProps {
  data: ActionNodeData
  selected?: boolean
}

export function ActionNode({ data, selected }: ActionNodeProps) {
  return (
    <BaseNode
      data={data}
      selected={selected}
      icon={<Zap size={16} />}
      className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
    >
      <div className="text-sm space-y-1">
        <div className="font-medium text-gray-700 dark:text-gray-300">
          {data.actionType?.replace('_', ' ').toUpperCase() || 'SELECT ACTION'}
        </div>
        {Object.keys(data.parameters || {}).length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {Object.keys(data.parameters).length} parameter(s)
          </div>
        )}
      </div>
    </BaseNode>
  )
}
