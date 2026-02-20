"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileText, Loader2, AlertCircle, Inbox, RefreshCw,
  Layout, ClipboardList, LayoutTemplate, Download,
  ChevronDown, ChevronRight, Mail, Phone, User, Calendar,
  Search, RotateCw, CheckCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { pagecubeApi, type FormSubmission, type FormSchema } from "@/lib/pagecubeApi";
import { cn } from "@/lib/utils";

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const formIdParam = searchParams.get("form_id");

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [forms, setForms] = useState<FormSchema[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>(formIdParam || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncDone, setSyncDone] = useState<number | null>(null);

  async function load(formId?: string) {
    try {
      setLoading(true); setError(null);
      const id = formId ?? selectedFormId;
      const [subsData, formsData] = await Promise.all([
        pagecubeApi.listSubmissions(id ? { form_id: parseInt(id) } : undefined),
        pagecubeApi.listForms(),
      ]);
      setSubmissions(subsData);
      setForms(formsData);
    } catch { setError("Falha ao carregar submissoes"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function handleFormFilter(id: string) {
    setSelectedFormId(id);
    load(id);
  }

  async function handleSync(formId: number) {
    setSyncingId(formId);
    try {
      await pagecubeApi.syncSheets(formId);
      setSyncDone(formId);
      setTimeout(() => { setSyncDone(null); setSyncingId(null); }, 3000);
    } catch { setSyncingId(null); }
  }

  const navLinks = [
    { href: "/pagecube", label: "Paginas", icon: Layout, active: false },
    { href: "/pagecube/forms", label: "Formularios", icon: ClipboardList, active: false },
    { href: "/pagecube/templates", label: "Templates", icon: LayoutTemplate, active: false },
    { href: "/pagecube/submissions", label: "Submissoes", icon: FileText, active: true },
  ];

  const filteredSubmissions = searchTerm
    ? submissions.filter((sub) => {
        const dataStr = JSON.stringify(sub.data || {}).toLowerCase();
        const formStr = (sub as any).form_name || "";
        return dataStr.includes(searchTerm.toLowerCase()) || formStr.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : submissions;

  function getDisplayFields(data: Record<string, any>) {
    const fields: { icon: any; label: string; value: string }[] = [];
    const dl: Record<string, any> = {};
    Object.entries(data).forEach(([k, v]) => { dl[k.toLowerCase()] = v; });
    if (dl.name || dl.nome || dl.full_name) fields.push({ icon: User, label: "Nome", value: String(dl.name || dl.nome || dl.full_name) });
    if (dl.email || dl.e_mail) fields.push({ icon: Mail, label: "Email", value: String(dl.email || dl.e_mail) });
    if (dl.phone || dl.telefone || dl.whatsapp || dl.celular) fields.push({ icon: Phone, label: "Telefone", value: String(dl.phone || dl.telefone || dl.whatsapp || dl.celular) });
    return fields;
  }

  function handleExportCSV() {
    if (submissions.length === 0) return;
    const allKeys = new Set<string>();
    submissions.forEach((sub) => Object.keys(sub.data || {}).forEach((k) => allKeys.add(k)));
    const headers = ["ID", "Formulario", "Data", ...Array.from(allKeys)];
    const rows = submissions.map((sub) => {
      const base = [String(sub.id), (sub as any).form_name || `Form #${sub.page}`, new Date(sub.created_at).toLocaleString("pt-BR")];
      const dataValues = Array.from(allKeys).map((key) => {
        const val = (sub.data || {})[key];
        return val !== undefined ? String(val).replace(/"/g, '""') : "";
      });
      return [...base, ...dataValues];
    });
    const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `submissoes_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  }

  // Find the selected form for Sheets sync button
  const selectedForm = selectedFormId ? forms.find((f) => String(f.id) === selectedFormId) : null;

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Submissoes</h1>
            <p className="text-sm text-text-muted">Respostas de formularios das landing pages</p>
          </div>
          <div className="flex gap-2">
            {/* Google Sheets sync button (visible when a form with Sheets is selected) */}
            {selectedForm?.google_sheets_url && (
              <button type="button" onClick={() => handleSync(selectedForm.id)} disabled={syncingId === selectedForm.id}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50"
                title="Sincronizar com Google Sheets">
                {syncDone === selectedForm.id
                  ? <><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-xs text-green-400">Sincronizado!</span></>
                  : <><RotateCw className={cn("w-4 h-4", syncingId === selectedForm.id && "animate-spin")} /><span className="text-xs">Sincronizar Sheets</span></>}
              </button>
            )}
            {submissions.length > 0 && (
              <button type="button" onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-xs">Exportar CSV</span>
              </button>
            )}
            <button type="button" onClick={() => load()} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </header>

        <div className="border-b border-border bg-background px-6">
          <div className="flex gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${link.active ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text-secondary"}`}>
                <link.icon className="w-4 h-4" />{link.label}
              </Link>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>
          ) : submissions.length === 0 && !selectedFormId ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-text-secondary font-medium mb-1">Nenhuma submissao recebida</h3>
              <p className="text-text-muted text-sm max-w-sm mb-6">
                Quando alguem preencher um formulario, as respostas aparecerao aqui.
              </p>
              <Link href="/pagecube/forms"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary font-medium transition-colors text-sm">
                <ClipboardList className="w-4 h-4" /> Ver Formularios
              </Link>
            </div>
          ) : (
            <>
              {/* Filter + search bar */}
              <div className="flex items-center gap-3 mb-4">
                <select value={selectedFormId} onChange={(e) => handleFormFilter(e.target.value)}
                  className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm min-w-[200px]">
                  <option value="">Todos os formularios</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar nas respostas..."
                    className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm" />
                </div>
                <span className="text-sm text-text-muted ml-auto">
                  {filteredSubmissions.length} de {submissions.length} submissoes
                </span>
              </div>

              {filteredSubmissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Inbox className="w-10 h-10 text-text-muted mb-3" />
                  <p className="text-text-muted text-sm">Nenhuma submissao encontrada com esse filtro.</p>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-8 px-4 py-3" />
                        <th className="text-left px-4 py-3 text-sm font-medium text-text-muted">Formulario</th>
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
                            <tr key={sub.id}
                              onClick={() => setExpandedRow(isExpanded ? null : sub.id)}
                              className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors cursor-pointer">
                              <td className="px-4 py-3">
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                              </td>
                              <td className="px-4 py-3 text-sm text-text-primary font-medium">
                                {(sub as any).form_name || `Form #${sub.page}`}
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
                                    <span className="text-text-muted">{Object.keys(sub.data || {}).length} campos</span>
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
                                        <span className="text-xs font-medium text-text-muted min-w-[160px] uppercase tracking-wider pt-0.5">{key}</span>
                                        <span className="text-sm text-text-primary break-all">
                                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                                        </span>
                                      </div>
                                    ))}
                                    {sub.ip_address && (
                                      <div className="flex items-start gap-3 mt-2 pt-2 border-t border-border">
                                        <span className="text-xs font-medium text-text-muted min-w-[160px] uppercase tracking-wider pt-0.5">IP</span>
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
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <SubmissionsContent />
    </Suspense>
  );
}
