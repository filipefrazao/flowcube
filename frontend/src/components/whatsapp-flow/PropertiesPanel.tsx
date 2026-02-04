'use client'

import { Trash2, Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { FlowNodeData } from '@/types/whatsapp-flow'

interface PropertiesPanelProps {
  selectedNodeId: string | null
  selectedNodeData: FlowNodeData | null
  onUpdateNode: (data: Partial<FlowNodeData>) => void
  onDeleteNode: () => void
}

const NODE_TYPE_LABELS = {
  message: 'Message',
  question: 'Question',
  condition: 'Condition',
  action: 'Action',
  delay: 'Delay',
}

const NODE_TYPE_COLORS = {
  message: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  question: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  condition: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  action: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  delay: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export function PropertiesPanel({
  selectedNodeId,
  selectedNodeData,
  onUpdateNode,
  onDeleteNode,
}: PropertiesPanelProps) {
  const generateButtonId = () => `btn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const handleAddButton = () => {
    if (!selectedNodeData) return
    const currentButtons = (selectedNodeData as any).buttons || []
    onUpdateNode({
      buttons: [...currentButtons, { id: generateButtonId(), text: '' }],
    } as any)
  }

  const handleRemoveButton = (buttonId: string) => {
    if (!selectedNodeData) return
    const currentButtons = (selectedNodeData as any).buttons || []
    onUpdateNode({
      buttons: currentButtons.filter((btn: any) => btn.id !== buttonId),
    } as any)
  }

  const handleUpdateButton = (buttonId: string, text: string) => {
    if (!selectedNodeData) return
    const currentButtons = (selectedNodeData as any).buttons || []
    onUpdateNode({
      buttons: currentButtons.map((btn: any) =>
        btn.id === buttonId ? { ...btn, text } : btn
      ),
    } as any)
  }

  if (!selectedNodeId || !selectedNodeData) {
    return (
      <div className="hidden md:flex w-80 border-l border-border bg-background">
        <Card className="w-full border-0 rounded-none">
          <CardContent className="flex items-center justify-center h-full p-6">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">Select a node to view its properties</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-border bg-background overflow-y-auto">
      <Card className="border-0 rounded-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Properties</CardTitle>
            <Badge className={NODE_TYPE_COLORS[selectedNodeData.type]}>
              {NODE_TYPE_LABELS[selectedNodeData.type]}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          {(selectedNodeData.type === 'message' || selectedNodeData.type === 'question') && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Enter message content..."
                  value={(selectedNodeData as any).content || ''}
                  onChange={(e) => onUpdateNode({ content: e.target.value } as any)}
                  className="min-h-[100px] resize-none"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Buttons</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddButton}
                    className="h-8 px-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                
                {((selectedNodeData as any).buttons || []).map((button: any, index: number) => (
                  <div key={button.id} className="flex items-center gap-2">
                    <Input
                      placeholder={`Button ${index + 1} text`}
                      value={button.text}
                      onChange={(e) => handleUpdateButton(button.id, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveButton(button.id)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {selectedNodeData.type === 'condition' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Field Name</label>
                <Input
                  placeholder="e.g., user_input, email"
                  value={(selectedNodeData as any).field || ''}
                  onChange={(e) => onUpdateNode({ field: e.target.value } as any)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Operator</label>
                <Select
                  value={(selectedNodeData as any).operator || ''}
                  onChange={(e) => onUpdateNode({ operator: e.target.value } as any)}
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Value</label>
                <Input
                  placeholder="Comparison value"
                  value={(selectedNodeData as any).value || ''}
                  onChange={(e) => onUpdateNode({ value: e.target.value } as any)}
                />
              </div>
            </>
          )}
          
          {selectedNodeData.type === 'action' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Action Type</label>
                <Select
                  value={(selectedNodeData as any).actionType || ''}
                  onChange={(e) => onUpdateNode({ actionType: e.target.value } as any)}
                >
                  <option value="create_lead">Create Lead</option>
                  <option value="send_email">Send Email</option>
                  <option value="webhook">Webhook</option>
                  <option value="tag_contact">Tag Contact</option>
                </Select>
              </div>
            </>
          )}
          
          {selectedNodeData.type === 'delay' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (seconds)</label>
              <Input
                type="number"
                placeholder="e.g., 5"
                value={(selectedNodeData as any).duration || 0}
                onChange={(e) => onUpdateNode({ duration: parseInt(e.target.value) || 0 } as any)}
              />
            </div>
          )}
        </CardContent>
        
        <div className="p-4 border-t">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onDeleteNode}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Node
          </Button>
        </div>
      </Card>
    </div>
  )
}
