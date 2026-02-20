"use client";

import { useState } from "react";
import { Brain, Loader2, AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AINodeBuilder } from "@/components/ai/AINodeBuilder";
import { getAuthToken } from "@/lib/auth";

async function authedPostJson(path: string, body: any) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Token ${token}`;

  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function AIPage() {
  const [workflowId, setWorkflowId] = useState("");
  const [executionId, setExecutionId] = useState("");

  const [healthLoading, setHealthLoading] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);

  const [healthResult, setHealthResult] = useState<any>(null);
  const [debugResult, setDebugResult] = useState<any>(null);

  const [error, setError] = useState<string | null>(null);

  async function runHealth() {
    if (!workflowId.trim()) return;
    setError(null);
    setHealthLoading(true);
    try {
      const r = await authedPostJson("/api/v1/ai/health/", {
        workflow_id: workflowId.trim(),
        limit: 50,
      });
      if (!r.ok) {
        setError(r.data?.error || `Falha ao analisar health (HTTP ${r.status})`);
        setHealthResult(null);
        return;
      }
      setHealthResult(r.data);
    } finally {
      setHealthLoading(false);
    }
  }

  async function runDebug() {
    if (!executionId.trim()) return;
    setError(null);
    setDebugLoading(true);
    try {
      const r = await authedPostJson("/api/v1/ai/debug/", {
        execution_id: executionId.trim(),
      });
      if (!r.ok) {
        setError(r.data?.error || `Falha ao analisar execucao (HTTP ${r.status})`);
        setDebugResult(null);
        return;
      }
      setDebugResult(r.data);
    } finally {
      setDebugLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">AI</h1>
            <p className="text-sm text-text-muted">Node Builder, Debug Assistant e Health</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : null}

          {/* Node Builder */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-primary" />
              <h2 className="text-text-primary font-semibold">AI Node Builder</h2>
            </div>
            <AINodeBuilder />
          </section>

          {/* Workflow Health */}
          <section className="bg-surface border border-border rounded-lg p-4">
            <h2 className="text-text-primary font-semibold mb-2">Workflow Health</h2>
            <p className="text-sm text-text-muted mb-3">
              Informe um <code className="text-text-secondary">workflow_id</code> para analisar historico e sugerir melhorias.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={workflowId}
                onChange={(e) => setWorkflowId(e.target.value)}
                placeholder="workflow_id (UUID)"
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={runHealth}
                disabled={healthLoading || !workflowId.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors flex items-center justify-center gap-2"
              >
                {healthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Analisar
              </button>
            </div>

            {healthResult ? (
              <pre className="mt-4 text-xs bg-background border border-border rounded-lg p-3 overflow-auto">
                {JSON.stringify(healthResult, null, 2)}
              </pre>
            ) : null}
          </section>

          {/* Execution Debug */}
          <section className="bg-surface border border-border rounded-lg p-4">
            <h2 className="text-text-primary font-semibold mb-2">Execution Debug</h2>
            <p className="text-sm text-text-muted mb-3">
              Informe um <code className="text-text-secondary">execution_id</code> para gerar analise e fixes.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={executionId}
                onChange={(e) => setExecutionId(e.target.value)}
                placeholder="execution_id (UUID)"
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={runDebug}
                disabled={debugLoading || !executionId.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors flex items-center justify-center gap-2"
              >
                {debugLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Analisar
              </button>
            </div>

            {debugResult ? (
              <pre className="mt-4 text-xs bg-background border border-border rounded-lg p-3 overflow-auto">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
