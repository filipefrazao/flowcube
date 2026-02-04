import { create } from 'zustand'
import { FlowState, FlowNode, FlowEdge } from '@/types/whatsapp-flow'

export const useWhatsAppFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  setNodes: (nodes: FlowNode[]) => set({ nodes }),
  
  setEdges: (edges: FlowEdge[]) => set({ edges }),
  
  setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),
  
  addNode: (node: FlowNode) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }))
  },
  
  updateNode: (id: string, data: Partial<any>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }))
  },
  
  deleteNode: (id: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }))
  },
}))
