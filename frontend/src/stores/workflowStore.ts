/**
 * FlowCube 4.0 - Workflow Store (Simplified)
 *
 * Zustand store with temporal middleware for undo/redo
 */
import { create } from 'zustand';
import { temporal } from 'zundo';
import {
  Node,
  Edge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge as addEdgeUtil
} from '@xyflow/react';

// Node stats type (Funnellytics-style)
export interface NodeStats {
  views: number;
  conversions: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeMs: number;
  revenue?: number;
}

// Viewport state
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Workflow state
export interface WorkflowState {
  // Workflow metadata
  workflowId: string | null;
  workflowName: string;
  isPublished: boolean;
  isDirty: boolean;

  // Graph state - using any for data to avoid type conflicts
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;

  // Selection
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // UI state
  isSaving: boolean;
  isLoading: boolean;
  showMinimap: boolean;
  showNodeStats: boolean;

  // Actions - Metadata
  setWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setIsPublished: (published: boolean) => void;
  setIsDirty: (dirty: boolean) => void;

  // Actions - Graph
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  setViewport: (viewport: Viewport) => void;

  // Actions - React Flow callbacks
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions - Selection
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;

  // Actions - UI
  setSaving: (saving: boolean) => void;
  setLoading: (loading: boolean) => void;
  toggleMinimap: () => void;
  toggleNodeStats: () => void;

  // Actions - Nodes
  addNode: (node: Node) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  updateNodeStats: (nodeId: string, stats: NodeStats) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;

  // Actions - Edges
  addEdge: (edge: Edge) => void;
  removeEdge: (id: string) => void;

  // Actions - Bulk
  loadWorkflow: (data: {
    id: string;
    name: string;
    graph: { nodes: Node[]; edges: Edge[]; viewport?: Viewport };
    isPublished: boolean;
  }) => void;
  getGraph: () => { nodes: Node[]; edges: Edge[]; viewport: Viewport };
  reset: () => void;
}


// Trigger node types (cannot have incoming connections)
const TRIGGER_TYPES = new Set([
  'webhook_trigger', 'schedule', 'manual_trigger', 'whatsapp_trigger',
  'evolution_trigger', 'facebook_lead_ads', 'premium_trigger',
  'email_trigger', 'form_trigger', 'api_trigger',
]);

const initialState = {
  workflowId: null,
  workflowName: 'Untitled Workflow',
  isPublished: false,
  isDirty: false,
  nodes: [] as Node[],
  edges: [] as Edge[],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  selectedEdgeId: null,
  isSaving: false,
  isLoading: false,
  showMinimap: true,
  showNodeStats: true,
};

export const useWorkflowStore = create<WorkflowState>()(
  temporal(
    (set, get) => ({
      ...initialState,

      // Metadata actions
      setWorkflowId: (id) => set({ workflowId: id }),
      setWorkflowName: (name) => set({ workflowName: name, isDirty: true }),
      setIsPublished: (published) => set({ isPublished: published }),
      setIsDirty: (dirty) => set({ isDirty: dirty }),

      // Graph actions
      setNodes: (nodesOrFn) => {
        if (typeof nodesOrFn === 'function') {
          set((state) => ({ nodes: nodesOrFn(state.nodes), isDirty: true }));
        } else {
          set({ nodes: nodesOrFn, isDirty: true });
        }
      },

      setEdges: (edgesOrFn) => {
        if (typeof edgesOrFn === 'function') {
          set((state) => ({ edges: edgesOrFn(state.edges), isDirty: true }));
        } else {
          set({ edges: edgesOrFn, isDirty: true });
        }
      },

      setViewport: (viewport) => set({ viewport }),

      // React Flow callbacks
      onNodesChange: (changes) => {
        const isDirtyChange = changes.some(
          change => change.type === 'remove' ||
                   (change.type === 'position' && change.dragging === false)
        );
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes) as Node[],
          isDirty: isDirtyChange ? true : state.isDirty,
        }));
      },

      onEdgesChange: (changes) => {
        const isDirtyChange = changes.some(change => change.type === 'remove');
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges) as Edge[],
          isDirty: isDirtyChange ? true : state.isDirty,
        }));
      },

      onConnect: (connection) => {
        set((state) => {
          // Validate: no self-loops
          if (connection.source === connection.target) return state;

          // Validate: no duplicate edges (same source + target + handle)
          const handle = connection.sourceHandle || 'default';
          const isDuplicate = state.edges.some(
            (e) => e.source === connection.source &&
                   e.target === connection.target &&
                   (e.sourceHandle || 'default') === handle
          );
          if (isDuplicate) return state;

          // Validate: trigger nodes cannot receive connections
          const targetNode = state.nodes.find((n) => n.id === connection.target);
          if (targetNode) {
            const targetType = targetNode.data?.type || targetNode.type || '';
            if (TRIGGER_TYPES.has(targetType)) return state;
          }

          return {
            edges: addEdgeUtil({
              ...connection,
              id: `edge-${Date.now()}`,
              type: 'smoothstep',
            }, state.edges),
            isDirty: true,
          };
        });
      },

      // Selection actions
      setSelectedNodeId: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
      setSelectedEdgeId: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),

      // UI actions
      setSaving: (saving) => set({ isSaving: saving }),
      setLoading: (loading) => set({ isLoading: loading }),
      toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
      toggleNodeStats: () => set((state) => ({ showNodeStats: !state.showNodeStats })),

      // Node actions
      addNode: (node) => set((state) => ({
        nodes: [...state.nodes, node],
        isDirty: true,
      })),

      updateNodeData: (id, data) => set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...data } } : node
        ),
        isDirty: true,
      })),

      updateNodeStats: (nodeId, stats) => set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, stats } }
            : node
        ),
      })),

      removeNode: (id) => set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        edges: state.edges.filter(
          (edge) => edge.source !== id && edge.target !== id
        ),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        isDirty: true,
      })),

      duplicateNode: (id) => {
        const state = get();
        const node = state.nodes.find((n) => n.id === id);
        if (!node) return;

        const newNode: Node = {
          ...node,
          id: `${node.type}-${Date.now()}`,
          position: {
            x: node.position.x + 50,
            y: node.position.y + 50,
          },
          data: { ...node.data },
          selected: false,
        };

        set({
          nodes: [...state.nodes, newNode],
          selectedNodeId: newNode.id,
          isDirty: true,
        });
      },

      // Edge actions
      addEdge: (edge) => set((state) => ({
        edges: [...state.edges, edge],
        isDirty: true,
      })),

      removeEdge: (id) => set((state) => ({
        edges: state.edges.filter((edge) => edge.id !== id),
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        isDirty: true,
      })),

      // Bulk actions
      loadWorkflow: (data) => {
        // No need to normalize node types here
        // The Proxy in nodeTypes (index.ts) handles ALL unknown types gracefully
        // by returning AnalyticsNode as a fallback
        const nodes = data.graph.nodes || [];
        const edges = data.graph.edges || [];
        const viewport = data.graph.viewport || { x: 0, y: 0, zoom: 1 };

        set({
          workflowId: data.id,
          workflowName: data.name,
          nodes: nodes,
          edges: edges,
          viewport: viewport,
          isPublished: data.isPublished,
          isDirty: false,
          isLoading: false,
        });
      },

      getGraph: () => {
        const state = get();
        return {
          nodes: state.nodes,
          edges: state.edges,
          viewport: state.viewport,
        };
      },

      reset: () => set(initialState),
    }),
    {
      limit: 50,
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
      equality: (pastState, currentState) =>
        JSON.stringify(pastState) === JSON.stringify(currentState),
    }
  )
);

// Hook to access temporal store for undo/redo
export const useTemporalStore = () => {
  return useWorkflowStore.temporal.getState();
};

// Hook to get selected node with reactive updates
export const useSelectedNode = () => {
  return useWorkflowStore((state) => {
    if (!state.selectedNodeId) return null;
    return state.nodes.find((n) => n.id === state.selectedNodeId) || null;
  });
};
