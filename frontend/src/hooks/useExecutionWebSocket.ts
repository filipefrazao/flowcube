/**
 * FlowCube - Execution WebSocket Hook
 *
 * Connects to ws/executions/<id>/ and updates the executionStore
 * with real-time node progress events from the backend.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useExecutionStore, NodeStatus } from '../stores/executionStore';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function useExecutionWebSocket(executionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { setNodeStatus, addNodeLog, finishExecution } = useExecutionStore();

  const connect = useCallback(() => {
    if (!executionId) return;

    // Build WS URL
    const url = `${WS_BASE_URL}/ws/executions/${executionId}/`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to execution', executionId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.event_type;

        if (eventType === 'node_start') {
          setNodeStatus(data.node_id, 'running');
          addNodeLog({
            node_id: data.node_id,
            node_type: data.node_type,
            node_label: data.node_label,
            status: 'running',
            timestamp: new Date().toISOString(),
          });
        } else if (eventType === 'node_complete') {
          setNodeStatus(data.node_id, 'success');
          addNodeLog({
            node_id: data.node_id,
            node_type: data.node_type,
            status: 'success',
            duration_ms: data.duration_ms,
            timestamp: new Date().toISOString(),
          });
        } else if (eventType === 'node_error') {
          setNodeStatus(data.node_id, 'error');
          addNodeLog({
            node_id: data.node_id,
            node_type: data.node_type,
            status: 'error',
            error: data.error,
            duration_ms: data.duration_ms,
            timestamp: new Date().toISOString(),
          });
        } else if (eventType === 'execution_complete') {
          finishExecution();
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code);
      wsRef.current = null;
      // Don't reconnect if execution is done or component unmounted
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };
  }, [executionId, setNodeStatus, addNodeLog, finishExecution]);

  // Connect when executionId changes
  useEffect(() => {
    if (executionId) {
      connect();
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [executionId, connect]);

  // Ping to keep alive
  useEffect(() => {
    if (!executionId) return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [executionId]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
