"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Loader2,
  AlertCircle,
  Inbox,
  RefreshCw,
  Layout,
  ClipboardList,
  LayoutTemplate,
  Download,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  User,
  Calendar,
  Search,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type FormSubmission } from "@/lib/pagecubeApi";
import { cn } from "@/lib/utils";

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const navLinks = [
    { href: "/pagecube", label: "Paginas", icon: Layout, active: false },
    { href: "/pagecube/forms", label: "Formularios", icon: ClipboardList, active: false },
    { href: "/pagecube/templates", label: "Templates", icon: LayoutTemplate, active: false },
    { href: "/pagecube/submissions", label: "Submissoes", icon: FileText, active: true },
  ];

  // Simple search filter across submission data
  const filteredSubmissions = searchTerm
    ? submissions.filter((sub) => {
        const dataStr = JSON.stringify(sub.data || {}).toLowerCase();
        const pageStr = (sub.page_title || "").toLowerCase();
        return dataStr.includes(searchTerm.toLowerCase()) || pageStr.includes(searchTerm.toLowerCase());
      })
    : submissions;

  // Extract common fields for display
  function getDisplayFields(data: Record<string, any>) {
    const fields: { icon: any; label: string; value: string }[] = [];
    const dataLower: Record<string, any> = {};
    Object.entries(data).forEach(([k, v]) => {
      dataLower[k.toLowerCase()] = v;
    });

    if (dataLower.name || dataLower.nome || dataLower.full_name) {
      fields.push({ icon: User, label: "Nome", value: String(dataLower.name || dataLower.nome || dataLower.full_name) });
    }
    if (dataLower.email || dataLower.e_mail) {
      fields.push({ icon: Mail, label: "Email", value: String(dataLower.email || dataLower.e_mail) });
    }
    if (dataLower.phone || dataLower.telefone || dataLower.whatsapp || dataLower.celular) {
      fields.push({ icon: Phone, label: "Telefone", value: String(dataLower.phone || dataLower.telefone || dataLower.whatsapp || dataLower.celular) });
    }
    return fields;
  }

  function handleExportCSV() {
    if (submissions.length === 0) return;

    // Collect all unique keys from all submissions
    const allKeys = new Set<string>();
    submissions.forEach((sub) => {
      Object.keys(sub.data || {}).forEach((k) => allKeys.add(k));
    });

    const headers = ["ID", "Pagina", "Data", ...Array.from(allKeys)];
    const rows = submissions.map((sub) => {
      const base = [
        String(sub.id),
        sub.page_title || `Pagina #${sub.page}`,
        new Date(sub.created_at).toLocaleString("pt-BR"),
      ];
      const dataValues = Array.from(allKeys).map((key) => {
        const val = (sub.data || {})[key];
        return val !== undefined ? String(val).replace(/"/g, '""') : "";
      });
      return [...base, ...dataValues];
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `submissoes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Submissoes</h1>
            <p className="text-sm text-text-muted">
              Respostas de formularios das landing pages
            </p>
          </div>
          <div className="flex gap-2">
            {submissions.length > 0 && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </header>

        {/* Sub-navigation */}
        <div className="border-b border-border bg-background px-6">
          <div className="flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  link.active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

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
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-text-secondary font-medium mb-1">Nenhuma submissao recebida</h3>
              <p className="text-text-muted text-sm max-w-sm mb-6">
                Quando visitantes preencherem formularios nas suas landing pages, as respostas aparecerao aqui. Voce podera visualizar, filtrar e exportar os dados.
              </p>

              {/* Visual guide */}
              <div className="bg-surface border border-border rounded-lg p-6 max-w-md text-left">
                <h4 className="text-sm font-medium text-text-secondary mb-4">Para receber submissoes:</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                    <div>
                      <p className="text-sm text-text-primary font-medium">Crie uma pagina</p>
                      <p className="text-xs text-text-muted">Aba Paginas do PageCube</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                    <div>
                      <p className="text-sm text-text-primary font-medium">Adicione um formulario</p>
                      <p className="text-xs text-text-muted">Aba Formularios com campos personalizados</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                    <div>
                      <p className="text-sm text-text-primary font-medium">Publique e compartilhe</p>
                      <p className="text-xs text-text-muted">Os leads chegam automaticamente aqui</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search and stats bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar nas submissoes..."
                    className="w-72 pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm"
                  />
                </div>
                <span className="text-sm text-text-muted">
                  {filteredSubmissions.length} de {submissions.length} submissoes
                </span>
              </div>

              <div className="bg-surface border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-8 px-4 py-3" />
                      <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Pagina</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Resumo</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => {
                      const isExpanded = expandedRow === sub.id;
                      const displayFields = getDisplayFields(sub.data || {});
                      return (
                        <>
                          <tr
                            key={sub.id}
                            onClick={() => setExpandedRow(isExpanded ? null : sub.id)}
                            className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-text-muted" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-text-muted" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-primary font-medium">
                              {sub.page_title || `Pagina #${sub.page}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-text-secondary">
                              <div className="flex items-center gap-3">
                                {displayFields.length > 0 ? (
                                  displayFields.map((field, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                      <field.icon className="w-3 h-3 text-text-muted" />
                                      <span className="truncate max-w-[120px]">{field.value}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-text-muted">
                                    {Object.keys(sub.data || {}).length} campos
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(sub.created_at).toLocaleString("pt-BR")}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${sub.id}-detail`} className="border-b border-border">
                              <td colSpan={4} className="px-8 py-4 bg-background">
                                <div className="grid gap-2 max-w-2xl">
                                  {Object.entries(sub.data || {}).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-3">
                                      <span className="text-xs font-medium text-text-muted min-w-[120px] uppercase tracking-wider pt-0.5">
                                        {key}
                                      </span>
                                      <span className="text-sm text-text-primary break-all">
                                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                      </span>
                                    </div>
                                  ))}
                                  {sub.ip_address && (
                                    <div className="flex items-start gap-3 mt-2 pt-2 border-t border-border">
                                      <span className="text-xs font-medium text-text-muted min-w-[120px] uppercase tracking-wider pt-0.5">IP</span>
                                      <span className="text-sm text-text-muted">{sub.ip_address}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
