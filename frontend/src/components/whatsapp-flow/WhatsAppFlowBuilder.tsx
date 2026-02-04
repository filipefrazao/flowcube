'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { FlowSidebar } from './FlowSidebar'
import { PropertiesPanel } from './PropertiesPanel'
import { MessageNode, QuestionNode, ConditionNode, ActionNode, DelayNode } from './nodes'
import { useWhatsAppFlowStore } from '@/stores/whatsapp-flow-store'
import { generateId } from '@/lib/utils'
import { FlowNodeData } from '@/types/whatsapp-flow'

const nodeTypes: NodeTypes = {
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
}

export function WhatsAppFlowBuilder() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    selectedNodeId,
    setNodes,
    setEdges,
    setSelectedNodeId,
    addNode,
    updateNode,
    deleteNode,
  } = useWhatsAppFlowStore()

  const [nodes, , onNodesChange] = useNodesState(storeNodes)
  const [edges, , onEdgesChange] = useEdgesState(storeEdges)

  // Update store when nodes/edges change
  useMemo(() => {
    setNodes(nodes)
    setEdges(edges)
  }, [nodes, edges, setNodes, setEdges])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(addEdge(connection, edges))
    },
    [edges, setEdges]
  )

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const reactFlowBounds = (event.target as Element).getBoundingClientRect()
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }

      const nodeId = generateId('node')
      const newNode: Node<FlowNodeData> = {
        id: nodeId,
        type,
        position,
        data: {
          label: `New ${type}`,
          type: type as any,
          content: type === 'message' || type === 'question' ? '' : undefined,
          buttons: type === 'message' || type === 'question' ? [] : undefined,
          field: type === 'condition' ? '' : undefined,
          operator: type === 'condition' ? 'equals' : undefined,
          value: type === 'condition' ? '' : undefined,
          actionType: type === 'action' ? 'create_lead' : undefined,
          parameters: type === 'action' ? {} : undefined,
          duration: type === 'delay' ? 5 : undefined,
        },
      }

      addNode(newNode)
    },
    [addNode]
  )

  const selectedNodeData = useMemo(() => {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId)
    return selectedNode?.data || null
  }, [nodes, selectedNodeId])

  const handleUpdateNode = useCallback(
    (data: Partial<FlowNodeData>) => {
      if (!selectedNodeId) return
      updateNode(selectedNodeId, data)
    },
    [selectedNodeId, updateNode]
  )

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId) return
    deleteNode(selectedNodeId)
  }, [selectedNodeId, deleteNode])

  return (
    <div className="flex h-screen w-full">
      <FlowSidebar />
      
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50 dark:bg-gray-900"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      
      <PropertiesPanel
        selectedNodeId={selectedNodeId}
        selectedNodeData={selectedNodeData}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  )
}
