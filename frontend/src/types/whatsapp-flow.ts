import { Node, Edge } from '@xyflow/react'

export type NodeType = 'message' | 'question' | 'condition' | 'action' | 'delay'

export interface BaseNodeData {
  label: string
  type: NodeType
}

export interface MessageNodeData extends BaseNodeData {
  type: 'message'
  content: string
  buttons?: Array<{ id: string; text: string }>
}

export interface QuestionNodeData extends BaseNodeData {
  type: 'question'
  content: string
  buttons?: Array<{ id: string; text: string }>
}

export interface ConditionNodeData extends BaseNodeData {
  type: 'condition'
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than'
  value: string
}

export interface ActionNodeData extends BaseNodeData {
  type: 'action'
  actionType: 'create_lead' | 'send_email' | 'webhook' | 'tag_contact'
  parameters: Record<string, any>
}

export interface DelayNodeData extends BaseNodeData {
  type: 'delay'
  duration: number
}

export type FlowNodeData = 
  | MessageNodeData 
  | QuestionNodeData 
  | ConditionNodeData 
  | ActionNodeData 
  | DelayNodeData

export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge

export interface FlowState {
  nodes: FlowNode[]
  edges: FlowEdge[]
  selectedNodeId: string | null
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  setSelectedNodeId: (id: string | null) => void
  addNode: (node: FlowNode) => void
  updateNode: (id: string, data: Partial<FlowNodeData>) => void
  deleteNode: (id: string) => void
}
