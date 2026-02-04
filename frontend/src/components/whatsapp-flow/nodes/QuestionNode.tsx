import { HelpCircle } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { QuestionNodeData } from '@/types/whatsapp-flow'

interface QuestionNodeProps {
  data: QuestionNodeData
  selected?: boolean
}

export function QuestionNode({ data, selected }: QuestionNodeProps) {
  return (
    <BaseNode
      data={data}
      selected={selected}
      icon={<HelpCircle size={16} />}
      className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
    >
      <div className="space-y-2">
        <div className="bg-blue-500 text-white p-2 rounded-lg text-sm max-w-full break-words">
          {data.content || 'Enter question...'}
        </div>
        
        {data.buttons && data.buttons.length > 0 && (
          <div className="space-y-1">
            {data.buttons.map((button) => (
              <div
                key={button.id}
                className="border border-blue-500 text-blue-600 dark:text-blue-400 p-1 rounded text-xs text-center"
              >
                {button.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseNode>
  )
}
