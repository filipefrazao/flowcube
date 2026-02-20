/**
 * FlowCube 3.2 - Editor Toolbar (N8N Style)
 *
 * Dark theme header with coral accents
 */
'use client';

import Link from 'next/link';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useExecutionStore } from '../../stores/executionStore';
import {
  ArrowLeft,
  Loader2,
  Check,
  Settings,
  Play,
  Square,
  Save,
  Share2,
  MoreHorizontal,
  ChevronDown,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useCallback } from 'react';
import { workflowApi } from '../../lib/api';

interface EditorToolbarProps {
  onTogglePalette?: () => void;
  onToggleProperties?: () => void;
  showPalette?: boolean;
  showProperties?: boolean;
}

export function EditorToolbar({
  onTogglePalette,
  onToggleProperties,
  showPalette = true,
  showProperties = true,
}: EditorToolbarProps) {
  const {
    workflowName,
    isPublished,
    isDirty,
    isSaving,
    setWorkflowName,
  } = useWorkflowStore();

  const { isExecuting, startExecution, reset: resetExecution } = useExecutionStore();

  const handleExecute = useCallback(async () => {
    const workflowId = useWorkflowStore.getState().workflowId;
    if (!workflowId) return;

    try {
      // Call API to create execution + dispatch Celery task
      const response = await workflowApi.execute(workflowId);
      const executionId = response.execution_id;

      // Start tracking in execution store (WebSocket connects via WorkflowEditor)
      startExecution(executionId);
    } catch (error) {
      console.error('Failed to start execution:', error);
      resetExecution();
    }
  }, [startExecution, resetExecution]);
  const handleSave = useCallback(async () => {
    const workflowId = useWorkflowStore.getState().workflowId;

    if (!workflowId) {
      console.error('No workflow ID - cannot save');
      return;
    }

    try {
      useWorkflowStore.getState().setSaving(true);

      const graph = useWorkflowStore.getState().getGraph();
      const name = useWorkflowStore.getState().workflowName;

      await workflowApi.updateWorkflow(workflowId, {
        name: name,
        graph: graph,
      });

      useWorkflowStore.getState().setIsDirty(false);
      console.log('✅ Workflow saved successfully');
    } catch (error) {
      console.error('❌ Failed to save workflow:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      useWorkflowStore.getState().setSaving(false);
    }
  }, []);



  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Back Button */}
        <Link
          href="/workflows"
          className="p-2 hover:bg-surface rounded-lg transition-colors"
          title="Back to Workflows"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Workflow Name */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-base font-medium text-text-primary bg-transparent border-0 focus:outline-none focus:ring-0 px-2 py-1 hover:bg-surface rounded transition-colors min-w-[200px]"
            placeholder="Untitled workflow"
          />

          {/* Save Status */}
          <div className="flex items-center gap-1.5">
            {isSaving ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-xs text-text-secondary">Saving...</span>
              </div>
            ) : isDirty ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-warning/10">
                <div className="w-1.5 h-1.5 bg-warning rounded-full" />
                <span className="text-xs text-warning">Unsaved</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-success/10">
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-success">Saved</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center Section - Status */}
      <div className="flex items-center gap-2">
        {/* Published/Draft Badge */}
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5',
            isPublished
              ? 'bg-success/15 text-success'
              : 'bg-surface text-text-muted'
          )}
        >
          {isPublished ? (
            <>
              <Zap className="w-3 h-3" />
              Active
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" />
              Draft
            </>
          )}
        </span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Save Button */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          title="Save (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
          Save
        </button>

        {/* Share Button */}
        <button
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-border mx-1" />

        {/* Execute Workflow Button */}
        <button
          onClick={handleExecute}
          disabled={isExecuting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
            isExecuting
              ? 'bg-primary/50 text-text-primary cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover text-gray-900'
          )}
        >
          {isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute workflow
            </>
          )}
        </button>

        {/* More Options */}
        <button
          className="p-2 hover:bg-surface rounded-lg transition-colors"
          title="More options"
        >
          <MoreHorizontal className="w-5 h-5 text-text-secondary" />
        </button>
      </div>
    </header>
  );
}

export default EditorToolbar;
