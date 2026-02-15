"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Check, X, RefreshCw, Download } from "lucide-react";
import { getLeads, redistributeLead, type LeadEntryList } from "@/lib/leadadsApi";

export default function LeadsListPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadEntryList[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterDistributed, setFilterDistributed] = useState<string>("");
  const [filterForm, setFilterForm] = useState<string>("");

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page) };
    if (filterDistributed) params.distributed = filterDistributed;
    if (filterForm) params.form = filterForm;

    getLeads(params)
      .then((res) => {
        setLeads(res.data.results || []);
        setCount(res.data.count || 0);
      })
      .catch(() => { setLeads([]); setCount(0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, filterDistributed, filterForm]);

  const handleRedistribute = async (id: number) => {
    try {
      await redistributeLead(id);
      alert("Distribution queued");
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to redistribute");
    }
  };

  const handleExportCsv = () => {
    const header = "ID,Name,Email,Phone,Form,Distributed,Date\n";
    const rows = leads.map((l) =>
      `${l.id},"${l.name}","${l.email}","${l.phone}","${l.form_name}",${l.distributed},${l.created_at}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(count / 25);

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/socialcube/leadads")} className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                <FileText className="w-7 h-7 text-blue-500" />
                Leads
              </h1>
              <p className="text-text-secondary text-sm">{count} total leads</p>
            </div>
          </div>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3 py-2 bg-card border border-border hover:bg-surface-hover text-text-secondary rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <select
            value={filterDistributed}
            onChange={(e) => { setFilterDistributed(e.target.value); setPage(1); }}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            <option value="">All status</option>
            <option value="true">Distributed</option>
            <option value="false">Not distributed</option>
          </select>
          <button onClick={load} className="p-2 text-text-secondary hover:text-text-primary">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-text-secondary text-center py-8">Loading...</div>
        ) : leads.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No leads found</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Phone</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Form</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-text-secondary font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3 text-text-primary">{lead.name || "—"}</td>
                      <td className="px-4 py-3 text-text-secondary">{lead.email || "—"}</td>
                      <td className="px-4 py-3 text-text-secondary">{lead.phone || "—"}</td>
                      <td className="px-4 py-3 text-text-secondary">{lead.form_name}</td>
                      <td className="px-4 py-3">
                        {lead.distributed ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <Check className="w-3 h-3" /> Distributed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-400 text-xs">
                            <X className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-tertiary text-xs">
                        {new Date(lead.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3">
                        {!lead.distributed && (
                          <button
                            onClick={() => handleRedistribute(lead.id)}
                            className="text-blue-400 hover:text-blue-500 text-xs font-medium"
                          >
                            Redistribute
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-text-secondary">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:bg-surface-hover disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
