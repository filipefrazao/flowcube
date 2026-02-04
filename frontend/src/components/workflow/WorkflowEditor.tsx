/**
 * FlowCube 3.2 - Workflow Editor (N8N Style)
 *
 * Main canvas component with dark theme, React Flow, and N8N-inspired controls
 */
'use client';

import { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore, useTemporalStore } from '../../stores/workflowStore';
import { nodeTypes, createNode } from './nodes';
import ElementsPalette from './panels/ElementsPalette';
import PropertiesPanel from './panels/PropertiesPanel';
import { EditorToolbar } from './EditorToolbar';
import { CommandPalette } from '../command-palette';
import { cn } from '../../lib/utils';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Map,
  BarChart3,
  Save,
  Loader2,
  Keyboard,
  HelpCircle,
} from 'lucide-react';

interface WorkflowEditorProps {
  workflowId?: string;
}

function WorkflowEditorInner({ workflowId }: WorkflowEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, getZoom } = useReactFlow();

  const [showPalette, setShowPalette] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  const {
    nodes,
    edges,
    viewport,
    selectedNodeId,
    isSaving,
    isDirty,
    showMinimap,
    showNodeStats,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setViewport,
    setSelectedNodeId,
    addNode,
    toggleMinimap,
    toggleNodeStats,
    loadWorkflow,
    getGraph,
    setIsDirty,
    setSaving,
  } = useWorkflowStore();

  // Undo/redo from temporal store
  const { undo, redo, pastStates, futureStates } = useTemporalStore();

  // Load workflow on mount
  useEffect(() => {
    if (workflowId) {
      loadWorkflow({
        id: workflowId,
        name: 'Demo Workflow',
        graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        isPublished: false,
      });
    }
  }, [workflowId, loadWorkflow]);

  // Handle viewport change
  const onMoveEnd = useCallback(
    (event: unknown, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
      setZoomLevel(Math.round(viewport.zoom * 100));
    },
    [setViewport]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: { id: string }) => {
      setSelectedNodeId(node.id);
      setShowProperties(true);
    },
    [setSelectedNodeId]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  // Handle drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');

      if (!data || !reactFlowBounds) return;

      const { type, label } = JSON.parse(data);

      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = createNode(type, label, position);
      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Add node from palette click (center of canvas)
  const handleAddNodeFromPalette = useCallback(
    (type: string, label: string) => {
      const centerPosition = screenToFlowPosition({
        x: (reactFlowWrapper.current?.clientWidth || 800) / 2,
        y: (reactFlowWrapper.current?.clientHeight || 600) / 2,
      });

      const newNode = createNode(type, label, centerPosition);
      addNode(newNode);
      setSelectedNodeId(newNode.id);
      setShowProperties(true);
    },
    [screenToFlowPosition, addNode, setSelectedNodeId]
  );


  // Command Palette - Add Node Handler
  const handleCommandAddNode = useCallback(
    (type: string) => {
      const nodeLabels: Record<string, string> = {
        trigger: 'Webhook Trigger',
        action: 'HTTP Request',
        condition: 'IF Condition',
        ai: 'AI Assistant',
      };

      const label = nodeLabels[type] || 'New Node';
      handleAddNodeFromPalette(type, label);
    },
    [handleAddNodeFromPalette]
  );

  // Command Palette - Action Handler
  const handleCommandAction = useCallback(
    (action: string) => {
      switch (action) {
        case 'duplicate':
          if (selectedNodeId) {
            const selectedNode = nodes.find(n => n.id === selectedNodeId);
            if (selectedNode) {
              const newNode = {
                ...selectedNode,
                id: `${selectedNode.type}-${Date.now()}`,
                position: {
                  x: selectedNode.position.x + 50,
                  y: selectedNode.position.y + 50,
                },
              };
              addNode(newNode);
              setSelectedNodeId(newNode.id);
            }
          }
          break;

        case 'delete':
          if (selectedNodeId) {
            useWorkflowStore.getState().removeNode(selectedNodeId);
            setSelectedNodeId(null);
          }
          break;

        case 'test':
          console.log('Testing workflow...', getGraph());
          break;

        default:
          console.log('Unknown action:', action);
      }
    },
    [selectedNodeId, nodes, addNode, setSelectedNodeId, getGraph]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((isMod && event.key === 'z' && event.shiftKey) || (isMod && event.key === 'y')) {
        event.preventDefault();
        redo();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeId) {
          useWorkflowStore.getState().removeNode(selectedNodeId);
        }
      } else if (isMod && event.key === 's') {
        event.preventDefault();
        console.log('Save workflow', getGraph());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedNodeId, getGraph]);

  // Auto-save
  useEffect(() => {
    if (isDirty && workflowId) {
      const timeoutId = setTimeout(() => {
        setSaving(true);
        console.log('Auto-saving...', getGraph());
        setTimeout(() => {
          setSaving(false);
          setIsDirty(false);
        }, 500);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [isDirty, workflowId, getGraph, setSaving, setIsDirty]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <EditorToolbar />
      {/* Command Palette (Cmd+K) */}
      <CommandPalette 
        onAddNode={handleCommandAddNode}
        onAction={handleCommandAction}
      />


      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Elements Palette */}
        {showPalette && (
          <ElementsPalette onAddNode={handleAddNodeFromPalette} />
        )}

        {/* Canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 relative"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onMoveEnd={onMoveEnd}
            defaultViewport={viewport}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            minZoom={0.1}
            maxZoom={2}
            deleteKeyCode={['Delete', 'Backspace']}
            className="bg-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#333333"
            />
            <Controls
              showZoom={false}
              showFitView={false}
              showInteractive={false}
              className="hidden"
            />

            {/* Minimap */}
            {showMinimap && (
              <MiniMap
                nodeStrokeWidth={3}
                className="!bg-surface !border !border-border !rounded-lg"
                maskColor="rgba(255, 109, 90, 0.1)"
              />
            )}

            {/* Bottom Left Controls */}
            <Panel position="bottom-left" className="flex gap-2 mb-4 ml-4">
              {/* Undo/Redo */}
              <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => undo()}
                  disabled={pastStates.length === 0}
                  className={cn(
                    'p-2.5 transition-colors',
                    pastStates.length === 0
                      ? 'text-text-muted cursor-not-allowed'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  )}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <div className="w-px bg-border" />
                <button
                  onClick={() => redo()}
                  disabled={futureStates.length === 0}
                  className={cn(
                    'p-2.5 transition-colors',
                    futureStates.length === 0
                      ? 'text-text-muted cursor-not-allowed'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  )}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => zoomOut()}
                  className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-px bg-border" />
                <span className="px-3 text-xs text-text-secondary font-medium min-w-[48px] text-center">
                  {zoomLevel}%
                </span>
                <div className="w-px bg-border" />
                <button
                  onClick={() => zoomIn()}
                  className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px bg-border" />
                <button
                  onClick={() => fitView()}
                  className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                  title="Fit View"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* View Options */}
              <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
                <button
                  onClick={toggleMinimap}
                  className={cn(
                    'p-2.5 transition-colors',
                    showMinimap
                      ? 'text-primary bg-primary-muted'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  )}
                  title="Toggle Minimap"
                >
                  <Map className="w-4 h-4" />
                </button>
                <div className="w-px bg-border" />
                <button
                  onClick={toggleNodeStats}
                  className={cn(
                    'p-2.5 transition-colors',
                    showNodeStats
                      ? 'text-primary bg-primary-muted'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  )}
                  title="Toggle Node Stats"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </Panel>

            {/* Bottom Right - Help & Keyboard */}
            <Panel position="bottom-right" className="flex gap-2 mb-4 mr-4">
              <button
                className="p-2.5 bg-surface rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                title="Keyboard shortcuts"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <button
                className="p-2.5 bg-surface rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                title="Help"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Sidebar - Properties Panel */}
        {showProperties && selectedNodeId && (
          <PropertiesPanel onClose={() => setShowProperties(false)} />
        )}
      </div>
    </div>
  );
}

// Wrap with ReactFlowProvider
export default function WorkflowEditor(props: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner {...props} />
    </ReactFlowProvider>
  );
}
