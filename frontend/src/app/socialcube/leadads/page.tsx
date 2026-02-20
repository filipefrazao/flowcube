"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Users, FileText, Settings, RefreshCw, Unplug,
  Zap, Send, Globe, ChevronRight, Settings2, Save, Tag, UserCheck,
} from "lucide-react";
import {
  getConnections, getAllForms, getAvailablePages, createConnection,
  deleteConnection, updateForm,
  type LeadAdsConnection, type LeadAdsForm, type FacebookPage,
} from "@/lib/leadadsApi";

function DistributionSummary({ form }: { form: LeadAdsForm }) {
  const config = form.distribution_config || {};
  const mapping = config.field_mapping || {};

  if (form.distribution_mode === "none") {
    return <span className="text-text-tertiary text-xs">No distribution configured</span>;
  }

  if (form.distribution_mode === "salescube") {
    const sellers = mapping.sellers || mapping.responsibles || [];
    const tags = mapping.tags || [];
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-500/10 text-green-400">
          <Zap className="w-3 h-3" /> SalesCube
        </span>
        {sellers.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
            <UserCheck className="w-3 h-3" /> {sellers.length} seller{sellers.length > 1 ? "s" : ""} (random)
          </span>
        )}
        {tags.length > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
            <Tag className="w-3 h-3" /> Tag #{tags.join(", #")}
          </span>
        )}
        {mapping.column && (
          <span className="px-2 py-0.5 rounded bg-surface text-text-secondary">
            Col {mapping.column}
          </span>
        )}
        {mapping.profession_field && (
          <span className="px-2 py-0.5 rounded bg-surface text-text-secondary truncate max-w-[160px]" title={mapping.profession_field}>
            Field: {mapping.profession_field}
          </span>
        )}
      </div>
    );
  }

  if (form.distribution_mode === "webhook") {
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">
          <Globe className="w-3 h-3" /> Webhook
        </span>
        {config.url && (
          <span className="px-2 py-0.5 rounded bg-surface text-text-secondary truncate max-w-[200px]" title={config.url}>
            {config.url}
          </span>
        )}
      </div>
    );
  }

  return null;
}

export default function LeadAdsDashboard() {
  const router = useRouter();
  const [connections, setConnections] = useState<LeadAdsConnection[]>([]);
  const [forms, setForms] = useState<LeadAdsForm[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [editingForm, setEditingForm] = useState<LeadAdsForm | null>(null);
  const [distMode, setDistMode] = useState("none");
  const [distConfig, setDistConfig] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"forms" | "connections">("forms");

  const load = async () => {
    setLoading(true);
    try {
      const [connRes, formsRes] = await Promise.all([
        getConnections(),
        getAllForms(),
      ]);
      setConnections(Array.isArray(connRes.data) ? connRes.data : (connRes.data as any).results || []);
      const formsData = Array.isArray(formsRes.data) ? formsRes.data : (formsRes.data as any).results || [];
      setForms(formsData);
    } catch {
      setConnections([]);
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleShowPagePicker = async () => {
    try {
      const res = await getAvailablePages();
      setPages(Array.isArray(res.data) ? res.data : []);
      setShowPagePicker(true);
    } catch {
      alert("Failed to load Facebook pages. Make sure you have a connected Facebook/Instagram account.");
    }
  };

  const handleConnectPage = async (page: FacebookPage) => {
    setConnecting(true);
    try {
      await createConnection(page.account_id, page.id);
      setShowPagePicker(false);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to connect page");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm("Disconnect this page from Lead Ads?")) return;
    try {
      await deleteConnection(id);
      load();
    } catch {
      alert("Failed to disconnect");
    }
  };

  const openEditModal = (form: LeadAdsForm) => {
    setEditingForm(form);
    setDistMode(form.distribution_mode);
    setDistConfig(JSON.stringify(form.distribution_config || {}, null, 2));
  };

  const handleSaveDistribution = async () => {
    if (!editingForm) return;
    setSaving(true);
    try {
      let parsedConfig = {};
      if (distConfig.trim()) parsedConfig = JSON.parse(distConfig);
      await updateForm(editingForm.id, { distribution_mode: distMode, distribution_config: parsedConfig });
      setEditingForm(null);
      load();
    } catch {
      alert("Failed to save. Check JSON syntax.");
    } finally {
      setSaving(false);
    }
  };

  const totalLeads = forms.reduce((sum, f) => sum + (f.leads_count || 0), 0);
  const activeForms = forms.filter((f) => f.distribution_mode !== "none").length;

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/socialcube")} className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
                <FileText className="w-8 h-8 text-blue-500" />
                Lead Ads
              </h1>
              <p className="text-text-secondary mt-1">Facebook Lead Ads integration & distribution</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/socialcube/leadads/config")}
              className="flex items-center gap-2 px-3 py-2 bg-card border border-border hover:bg-surface-hover text-text-secondary rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Config
            </button>
            <button
              onClick={handleShowPagePicker}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-text-primary rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Connect Page
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-text-primary">{loading ? "..." : connections.length}</p>
                <p className="text-sm text-text-secondary">Pages</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-text-primary">{loading ? "..." : forms.length}</p>
                <p className="text-sm text-text-secondary">Forms</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-text-primary">{loading ? "..." : activeForms}</p>
                <p className="text-sm text-text-secondary">Active Workflows</p>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-blue-500/30 transition-colors"
               onClick={() => router.push("/socialcube/leadads/leads")}>
            <div className="flex items-center gap-3">
              <Send className="w-6 h-6 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-text-primary">{loading ? "..." : totalLeads}</p>
                <p className="text-sm text-text-secondary">Total Leads</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("forms")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "forms" ? "bg-blue-600 text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Workflows ({forms.length})
          </button>
          <button
            onClick={() => setActiveTab("connections")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "connections" ? "bg-blue-600 text-text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Connected Pages ({connections.length})
          </button>
        </div>

        {/* Forms / Workflows Tab */}
        {activeTab === "forms" && (
          <div>
            {loading ? (
              <div className="text-text-secondary text-center py-8">Loading...</div>
            ) : forms.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary">No forms found yet.</p>
                <p className="text-text-tertiary text-sm mt-1">Connect a Facebook page and sync its forms.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {forms.map((form) => (
                  <div key={form.id} className="bg-card border border-border rounded-xl p-4 hover:border-blue-500/20 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary">{form.form_name || form.form_id}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            form.form_status === "active" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
                          }`}>
                            {form.form_status}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary mt-0.5">
                          {form.connection_page_name} · Form ID: {form.form_id}
                        </p>
                        <div className="mt-2">
                          <DistributionSummary form={form} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-bold text-text-primary">{form.leads_count}</p>
                          <p className="text-xs text-text-secondary">leads</p>
                        </div>
                        <button
                          onClick={() => openEditModal(form)}
                          className="p-2 text-text-secondary hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Configure distribution"
                        >
                          <Settings2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === "connections" && (
          <div>
            {loading ? (
              <div className="text-text-secondary text-center py-8">Loading...</div>
            ) : connections.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary">No pages connected yet</p>
                <button onClick={handleShowPagePicker} className="mt-3 text-blue-500 hover:text-blue-400 text-sm font-medium">
                  Connect your first page
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-blue-500/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/socialcube/leadads/${conn.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${conn.is_subscribed ? "bg-green-500" : "bg-red-500"}`} />
                      <div>
                        <p className="font-medium text-text-primary">{conn.page_name}</p>
                        <p className="text-sm text-text-secondary">
                          {conn.forms_count} form{conn.forms_count !== 1 ? "s" : ""} · Connected {new Date(conn.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDisconnect(conn.id); }}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Disconnect"
                      >
                        <Unplug className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Page Picker Modal */}
        {showPagePicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPagePicker(false)}>
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Select a Facebook Page</h3>
              {pages.length === 0 ? (
                <p className="text-text-secondary text-center py-4">No pages available. Connect a Facebook account first.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => !page.already_connected && handleConnectPage(page)}
                      disabled={page.already_connected || connecting}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        page.already_connected
                          ? "border-border bg-surface opacity-50 cursor-not-allowed"
                          : "border-border hover:border-blue-500/50 hover:bg-surface-hover cursor-pointer"
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-text-primary">{page.name}</p>
                        <p className="text-xs text-text-secondary">via @{page.account_username}</p>
                      </div>
                      {page.already_connected ? (
                        <span className="text-xs text-green-400">Connected</span>
                      ) : (
                        <Plus className="w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowPagePicker(false)}
                className="mt-4 w-full py-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Distribution Config Modal */}
        {editingForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingForm(null)}>
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Distribution: {editingForm.form_name}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">Distribution Mode</label>
                  <select
                    value={distMode}
                    onChange={(e) => setDistMode(e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary"
                  >
                    <option value="none">No Distribution</option>
                    <option value="salescube">SalesCube CRM</option>
                    <option value="webhook">External Webhook</option>
                  </select>
                </div>
                {distMode !== "none" && (
                  <div>
                    <label className="text-sm text-text-secondary mb-1 block">Configuration (JSON)</label>
                    <textarea
                      value={distConfig}
                      onChange={(e) => setDistConfig(e.target.value)}
                      rows={10}
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary font-mono text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingForm(null)}
                  className="flex-1 py-2 bg-surface hover:bg-surface-hover text-text-secondary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDistribution}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-text-primary rounded-lg transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
