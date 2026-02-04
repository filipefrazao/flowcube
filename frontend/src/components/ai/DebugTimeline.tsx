import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, ChevronRight, ChevronDown, Code } from 'lucide-react';

interface NodeExecution {
  id: string;
  name: string;
  type: string;
  status: 'success' | 'error' | 'pending';
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
  timestamp: string;
}

interface DebugTimelineProps {
  executions: NodeExecution[];
  failedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
}

export function DebugTimeline({ executions, failedNodeId, onNodeClick }: DebugTimelineProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([failedNodeId || '']));

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-500/30 bg-green-500/10';
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-400" />
        Execution Timeline
      </h3>

      <div className="space-y-2">
        {executions.map((execution, index) => {
          const isExpanded = expandedNodes.has(execution.id);
          const isFailed = execution.id === failedNodeId;
          const isLast = index === executions.length - 1;

          return (
            <div key={execution.id} className="relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[21px] top-10 w-0.5 h-full bg-gray-700"></div>
              )}

              {/* Node card */}
              <div
                className={`
                  glass-card p-4 cursor-pointer transition-all hover:border-purple-500/30
                  ${getStatusColor(execution.status)}
                  ${isFailed ? 'ring-2 ring-red-500/50' : ''}
                `}
                onClick={() => {
                  toggleNode(execution.id);
                  onNodeClick?.(execution.id);
                }}
              >
                {/* Node header */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(execution.status)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium truncate">
                        {execution.name || execution.id}
                      </h4>
                      {isFailed && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs rounded-full">
                          Failed Here
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                        {execution.type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(execution.duration)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                    {/* Timestamp */}
                    <div>
                      <span className="text-xs text-gray-400">Timestamp:</span>
                      <p className="text-sm text-gray-300 font-mono">
                        {new Date(execution.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {/* Input data */}
                    {execution.input && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-gray-400">Input Data:</span>
                        </div>
                        <pre className="text-xs text-gray-300 bg-black/30 p-3 rounded border border-gray-700 overflow-x-auto max-h-40">
                          {JSON.stringify(execution.input, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Output data */}
                    {execution.output && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-gray-400">Output Data:</span>
                        </div>
                        <pre className="text-xs text-gray-300 bg-black/30 p-3 rounded border border-gray-700 overflow-x-auto max-h-40">
                          {JSON.stringify(execution.output, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Error */}
                    {execution.error && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-gray-400">Error:</span>
                        </div>
                        <div className="text-sm text-red-300 bg-red-500/10 p-3 rounded border border-red-500/30">
                          {execution.error}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-700 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-400">
            Total: <span className="text-white font-medium">{executions.length}</span> nodes
          </span>
          <span className="text-gray-400">
            Success: <span className="text-green-400 font-medium">
              {executions.filter(e => e.status === 'success').length}
            </span>
          </span>
          <span className="text-gray-400">
            Failed: <span className="text-red-400 font-medium">
              {executions.filter(e => e.status === 'error').length}
            </span>
          </span>
        </div>
        <span className="text-gray-400">
          Total time: <span className="text-white font-medium">
            {formatDuration(executions.reduce((sum, e) => sum + (e.duration || 0), 0))}
          </span>
        </span>
      </div>
    </div>
  );
}
