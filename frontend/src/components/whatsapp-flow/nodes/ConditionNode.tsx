import { GitBranch } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { ConditionNodeData } from '@/types/whatsapp-flow'

interface ConditionNodeProps {
  data: ConditionNodeData
  selected?: boolean
}

export function ConditionNode({ data, selected }: ConditionNodeProps) {
  return (
    <BaseNode
      data={data}
      selected={selected}
      icon={<GitBranch size={16} />}
      className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
    >
      <div className="text-sm space-y-1">
        <div className="font-medium text-gray-700 dark:text-gray-300">
          If {data.field || 'field'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {data.operator || 'equals'} "{data.value || 'value'}"
        </div>
      </div>
    </BaseNode>
  )
}
