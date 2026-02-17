/**
 * FlowCube - Execution State Store
 *
 * Tracks active execution, per-node statuses, and live logs
 * received via WebSocket from the backend WorkflowExecutor.
 */
import { create } from 'zustand';

export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'skipped';

export interface NodeLog {
  node_id: string;
  node_type: string;
  node_label?: string;
  status: NodeStatus;
  duration_ms?: number;
  error?: string;
  timestamp: string;
}

export interface ExecutionState {
  // Active execution tracking
  activeExecutionId: string | null;
  isExecuting: boolean;

  // Per-node status map: nodeId -> status
  nodeStatuses: Record<string, NodeStatus>;

  // Live logs received from WebSocket
  nodeLogs: NodeLog[];

  // Actions
  startExecution: (executionId: string) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  addNodeLog: (log: NodeLog) => void;
  finishExecution: () => void;
  reset: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  activeExecutionId: null,
  isExecuting: false,
  nodeStatuses: {},
  nodeLogs: [],

  startExecution: (executionId: string) =>
    set({
      activeExecutionId: executionId,
      isExecuting: true,
      nodeStatuses: {},
      nodeLogs: [],
    }),

  setNodeStatus: (nodeId: string, status: NodeStatus) =>
    set((state) => ({
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
    })),

  addNodeLog: (log: NodeLog) =>
    set((state) => ({
      nodeLogs: [...state.nodeLogs, log],
    })),

  finishExecution: () =>
    set({ isExecuting: false }),

  reset: () =>
    set({
      activeExecutionId: null,
      isExecuting: false,
      nodeStatuses: {},
      nodeLogs: [],
    }),
}));
