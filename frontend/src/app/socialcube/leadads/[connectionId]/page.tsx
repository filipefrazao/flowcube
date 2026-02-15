"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, RefreshCw, FileText, Settings2, Save } from "lucide-react";
import {
  getConnections, getConnectionForms, syncForms, updateForm,
  type LeadAdsConnection, type LeadAdsForm,
} from "@/lib/leadadsApi";

export default function ConnectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const connectionId = Number(params.connectionId);

  const [connection, setConnection] = useState<LeadAdsConnection | null>(null);
  const [forms, setForms] = useState<LeadAdsForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingForm, setEditingForm] = useState<LeadAdsForm | null>(null);
  const [distMode, setDistMode] = useState("none");
  const [distConfig, setDistConfig] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [connRes, formsRes] = await Promise.all([
        getConnections(),
        getConnectionForms(connectionId),
      ]);
      const conns = Array.isArray(connRes.data) ? connRes.data : (connRes.data as any).results || [];
      const conn = conns.find((c: LeadAdsConnection) => c.id === connectionId);
      setConnection(conn || null);
      setForms(Array.isArray(formsRes.data) ? formsRes.data : []);
    } catch {
      setConnection(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [connectionId]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncForms(connectionId);
      alert(`Synced ${res.data.synced} forms (${res.data.new} new)`);
      load();
    } catch {
      alert("Failed to sync forms");
    } finally {
      setSyncing(false);
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
      if (distConfig.trim()) {
        parsedConfig = JSON.parse(distConfig);
      }
      await updateForm(editingForm.id, {
        distribution_mode: distMode,
        distribution_config: parsedConfig,
      });
      setEditingForm(null);
      load();
    } catch (e) {
      alert("Failed to save. Check JSON syntax.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 h-full flex items-center justify-center text-text-secondary">Loading...</div>;
  }

  if (!connection) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <p className="text-text-secondary">Connection not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/socialcube/leadads")} className="text-text-secondary hover:text-text-primary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{connection.page_name}</h1>
              <p className="text-text-secondary text-sm">
                {connection.social_account_platform} · @{connection.social_account_username} ·
                Connected {new Date(connection.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Forms
          </button>
        </div>

        {/* Connection Status */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${connection.is_subscribed ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-text-primary font-medium">
            {connection.is_subscribed ? "Subscribed to leadgen events" : "Not subscribed"}
          </span>
          <span className="text-text-secondary text-sm ml-auto">Page ID: {connection.page_id}</span>
        </div>

        {/* Forms */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Lead Forms ({forms.length})</h2>
          {forms.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No forms found. Click "Sync Forms" to fetch from Facebook.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {forms.map((form) => (
                <div key={form.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text-primary">{form.form_name || form.form_id}</p>
                      <div className="flex gap-4 mt-1 text-sm text-text-secondary">
                        <span>Status: <span className={form.form_status === "active" ? "text-green-400" : "text-yellow-400"}>{form.form_status}</span></span>
                        <span>Leads: <span className="text-text-primary font-medium">{form.leads_count}</span></span>
                        {form.last_lead_at && (
                          <span>Last: {new Date(form.last_lead_at).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        form.distribution_mode === "salescube" ? "bg-green-500/20 text-green-400" :
                        form.distribution_mode === "webhook" ? "bg-blue-500/20 text-blue-400" :
                        "bg-surface text-text-tertiary"
                      }`}>
                        {form.distribution_mode === "none" ? "No Distribution" :
                         form.distribution_mode === "salescube" ? "SalesCube" : "Webhook"}
                      </span>
                      <button
                        onClick={() => openEditModal(form)}
                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
                        title="Configure distribution"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
                    <label className="text-sm text-text-secondary mb-1 block">
                      Configuration (JSON)
                    </label>
                    <textarea
                      value={distConfig}
                      onChange={(e) => setDistConfig(e.target.value)}
                      rows={10}
                      className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary font-mono text-sm"
                      placeholder={distMode === "salescube" ? `{
  "api_url": "https://api.frzglobal.com.br/api/leads/",
  "api_token": "Token ...",
  "field_mapping": {
    "column": 48,
    "origin": 6,
    "channel": 78,
    "responsibles": [78],
    "is_ai_enabled": false
  }
}` : `{
  "url": "https://example.com/api/leads",
  "method": "POST",
  "headers": {"Authorization": "Bearer xxx"},
  "body_template": {"name": "{{name}}", "email": "{{email}}", "phone": "{{phone}}"}
}`}
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
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
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
