"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  AlertCircle,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type FormSubmission } from "@/lib/pagecubeApi";
import { cn } from "@/lib/utils";

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await pagecubeApi.listSubmissions();
      setSubmissions(data);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar submissoes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Submissoes</h1>
            <p className="text-sm text-text-muted">Respostas de formularios das landing pages</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Atualizar
          </button>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Inbox className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-text-secondary font-medium mb-1">Nenhuma submissao</h3>
              <p className="text-text-muted text-sm">
                As respostas dos formularios aparecerao aqui.
              </p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Pagina</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Dados</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {sub.page_title || `Pagina #${sub.page}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        <pre className="text-xs bg-background rounded p-2 max-w-md overflow-auto">
                          {JSON.stringify(sub.data, null, 2)}
                        </pre>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                        {new Date(sub.created_at).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
