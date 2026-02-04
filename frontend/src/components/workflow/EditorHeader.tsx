"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Play, Settings, MoreVertical, Check } from "lucide-react";
import { workflowApi } from "@/lib/api";
import type { Workflow, WorkflowDetail } from "@/types/workflow.types";
import { cn } from "@/lib/utils";

interface EditorHeaderProps {
  workflow: WorkflowDetail | null;
}

export function EditorHeader({ workflow }: EditorHeaderProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(workflow?.name || "");
  const [editing, setEditing] = useState(false);

  async function handleSaveName() {
    if (!workflow || !name.trim()) return;
    
    try {
      setSaving(true);
      await workflowApi.update(workflow.id, { name });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Erro ao salvar nome:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!workflow) return;
    try {
      await workflowApi.publish(workflow.id);
    } catch (err) {
      console.error("Erro ao publicar:", err);
    }
  }

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Link
          href="/workflows"
          className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-secondary" />
        </Link>

        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="p-1.5 bg-primary hover:bg-primary-hover rounded-lg"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setName(workflow?.name || "");
              setEditing(true);
            }}
            className="text-lg font-medium text-text-primary hover:text-primary transition-colors"
          >
            {workflow?.name || "Carregando..."}
          </button>
        )}

        {saved && (
          <span className="text-sm text-success flex items-center gap-1">
            <Check className="w-4 h-4" />
            Salvo
          </span>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            workflow?.is_published
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          )}
        >
          {workflow?.is_published ? "Publicado" : "Rascunho"}
        </span>

        <button className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-text-secondary" />
        </button>

        <button
          onClick={handlePublish}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Publicar
        </button>
      </div>
    </header>
  );
}
