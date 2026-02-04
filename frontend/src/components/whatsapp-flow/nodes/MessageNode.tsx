import { MessageSquare } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { MessageNodeData } from '@/types/whatsapp-flow'

interface MessageNodeProps {
  data: MessageNodeData
  selected?: boolean
}

export function MessageNode({ data, selected }: MessageNodeProps) {
  return (
    <BaseNode
      data={data}
      selected={selected}
      icon={<MessageSquare size={16} />}
      className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
    >
      <div className="space-y-2">
        <div className="bg-green-500 text-white p-2 rounded-lg text-sm max-w-full break-words">
          {data.content || 'Enter message...'}
        </div>
        
        {data.buttons && data.buttons.length > 0 && (
          <div className="space-y-1">
            {data.buttons.map((button) => (
              <div
                key={button.id}
                className="border border-green-500 text-green-600 dark:text-green-400 p-1 rounded text-xs text-center"
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
