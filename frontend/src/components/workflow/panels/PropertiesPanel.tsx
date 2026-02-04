/**
 * FlowCube 3.0 - Properties Panel
 *
 * Right sidebar for editing selected node properties
 */
import { useState, useEffect, useCallback } from "react";
import { cn } from "../../../lib/utils";
import { useWorkflowStore, useSelectedNode, NodeStats } from "../../../stores/workflowStore";
import { getLabelForType, getCategoryForType } from "../nodes";
import NodeConfigEditor from "./NodeConfigEditor";
import {
  X,
  Settings,
  Sliders,
  BarChart3,
  Link,
  Copy,
  Trash2,
  Lock,
  Unlock,
  ExternalLink
} from "lucide-react";

type TabId = "general" | "config" | "analytics";

interface FlowNodeData {
  label?: string;
  type?: string;
  config?: Record<string, unknown>;
  stats?: NodeStats;
  status?: "active" | "paused" | "error" | "draft";
}

interface PropertiesPanelProps {
  className?: string;
  onClose?: () => void;
}

export default function PropertiesPanel({ className, onClose }: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [isLocked, setIsLocked] = useState(false);

  const selectedNode = useSelectedNode();
  const { updateNodeData, removeNode, duplicateNode, setSelectedNodeId } = useWorkflowStore();

  useEffect(() => {
    setActiveTab("general");
  }, [selectedNode?.id]);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedNode) return;
      updateNodeData(selectedNode.id, { label: e.target.value });
    },
    [selectedNode, updateNodeData]
  );

  const handleStatusChange = useCallback(
    (status: "active" | "paused" | "error" | "draft") => {
      if (!selectedNode) return;
      updateNodeData(selectedNode.id, { status });
    },
    [selectedNode, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    if (!selectedNode) return;
    removeNode(selectedNode.id);
    setSelectedNodeId(null);
  }, [selectedNode, removeNode, setSelectedNodeId]);

  const handleDuplicate = useCallback(() => {
    if (!selectedNode) return;
    duplicateNode(selectedNode.id);
  }, [selectedNode, duplicateNode]);

  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
    onClose?.();
  }, [setSelectedNodeId, onClose]);

  if (!selectedNode) {
    return (
      <div className={cn("w-80 bg-white border-l border-gray-200 flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4">
          Select a node to view properties
        </div>
      </div>
    );
  }

  const nodeData = selectedNode.data as FlowNodeData;
  const nodeType = nodeData.type || "default";
  const category = getCategoryForType(nodeType);

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "general", label: "General", icon: Settings },
    { id: "config", label: "Config", icon: Sliders },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className={cn("w-80 bg-white border-l border-gray-200 flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {nodeData.label || "Untitled Node"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="text-sm text-gray-500">
          {getLabelForType(nodeType)} • {category}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "general" && (
          <div className="space-y-6">
            {/* Element Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Element Name
              </label>
              <input
                type="text"
                value={nodeData.label || ""}
                onChange={handleLabelChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                {getLabelForType(nodeType)}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex gap-2">
                {(["active", "paused", "draft"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm rounded-lg border transition-colors capitalize",
                      nodeData.status === status
                        ? status === "active"
                          ? "bg-green-50 border-green-200 text-green-700"
                          : status === "paused"
                          ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                          : "bg-gray-50 border-gray-200 text-gray-700"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Lock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsLocked(!isLocked)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                    isLocked
                      ? "bg-orange-50 border-orange-200 text-orange-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  {isLocked ? "Locked" : "Unlocked"}
                </button>
                <div className="text-sm text-gray-500">
                  X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <NodeConfigEditor />
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            {nodeData.stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-700">
                      {nodeData.stats.views.toLocaleString()}
                    </div>
                    <div className="text-xs text-blue-600">Views</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-700">
                      {nodeData.stats.conversions.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600">Conversions</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-gray-700">
                      {nodeData.stats.conversionRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Conv. Rate</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-red-700">
                      {nodeData.stats.dropOffRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-red-500">Drop-off</div>
                  </div>
                </div>

                {nodeData.stats.revenue !== undefined && (
                  <div className="bg-emerald-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-emerald-700">
                      ${nodeData.stats.revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-emerald-600">Revenue Generated</div>
                  </div>
                )}

                {nodeData.stats.avgTimeMs !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avg. Time on Step
                    </label>
                    <div className="text-sm text-gray-600">
                      {(nodeData.stats.avgTimeMs / 1000).toFixed(1)} seconds
                    </div>
                  </div>
                )}

                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  View Full Report
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No analytics data yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Data will appear after the workflow is published and running
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
        <button
          onClick={handleDuplicate}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
