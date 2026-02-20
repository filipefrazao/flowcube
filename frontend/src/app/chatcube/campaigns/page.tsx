"use client";

import { useState, useEffect } from "react";
import { Megaphone, Plus, X, Loader2, ChevronRight, ChevronLeft, Play, Pause, Trash2 } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  template: string | null;
  instance: string | null;
  status: string;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  scheduled_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-text-muted/20 text-text-muted", label: "Rascunho" },
  scheduled: { color: "bg-accent-blue/10 text-accent-blue", label: "Agendada" },
  running: { color: "bg-accent-green/10 text-accent-green", label: "Executando" },
  completed: { color: "bg-accent-green/10 text-accent-green", label: "Concluida" },
  paused: { color: "bg-accent-orange/10 text-accent-orange", label: "Pausada" },
  failed: { color: "bg-error/10 text-error", label: "Falhou" },
};

function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '/api/v1/chatcube') || '';
  return `${base}${path}`;
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : '';
  return { 'Content-Type': 'application/json', Authorization: `Token ${token}` };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({ name: "", template: "", recipients: "", scheduled_at: "" });
  const [instances, setInstances] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [campResp, instResp, tmplResp] = await Promise.all([
        fetch(apiUrl('/campaigns/'), { headers: authHeaders() }),
        fetch(apiUrl('/instances/'), { headers: authHeaders() }),
        fetch(apiUrl('/templates/'), { headers: authHeaders() }),
      ]);
      if (campResp.ok) { const d = await campResp.json(); setCampaigns(d.results || []); }
      if (instResp.ok) { const d = await instResp.json(); setInstances(d.results || []); if (d.results?.length) setSelectedInstance(d.results[0].id); }
      if (tmplResp.ok) { const d = await tmplResp.json(); setTemplates(d.results || []); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreateCampaign() {
    try {
      const recipients = wizardData.recipients.split('\n').map(r => r.trim()).filter(Boolean);
      const resp = await fetch(apiUrl('/campaigns/'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: wizardData.name,
          instance: selectedInstance,
          template: wizardData.template || null,
          recipients,
          scheduled_at: wizardData.scheduled_at || null,
        }),
      });
      if (resp.ok) {
        setShowWizard(false);
        setWizardStep(0);
        setWizardData({ name: "", template: "", recipients: "", scheduled_at: "" });
        loadData();
      }
    } catch (err) { console.error(err); }
  }

  async function handleAction(id: string, action: string) {
    try {
      await fetch(apiUrl(`/campaigns/${id}/${action}/`), { method: 'POST', headers: authHeaders() });
      loadData();
    } catch (err) { console.error(err); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir campanha?")) return;
    try {
      await fetch(apiUrl(`/campaigns/${id}/`), { method: 'DELETE', headers: authHeaders() });
      loadData();
    } catch (err) { console.error(err); }
  }

  const WIZARD_STEPS = ["Nome", "Instancia", "Template", "Destinatarios", "Agendamento"];

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Campanhas</h1>
          </div>
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nova Campanha
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma campanha criada</p>
              <p className="text-sm mt-1">Crie sua primeira campanha de mensagens.</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Enviados</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Entregues</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Lidos</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Falhou</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const sc = statusConfig[c.status] || statusConfig.draft;
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-surface-hover">
                        <td className="px-4 py-3 text-sm text-text-primary font-medium">{c.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary text-right">{c.sent_count}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary text-right">{c.delivered_count}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary text-right">{c.read_count}</td>
                        <td className="px-4 py-3 text-sm text-error text-right">{c.failed_count}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.status === 'draft' && <button onClick={() => handleAction(c.id, 'start')} className="p-1 text-accent-green hover:bg-accent-green/10 rounded" title="Iniciar"><Play className="w-4 h-4" /></button>}
                            {c.status === 'running' && <button onClick={() => handleAction(c.id, 'pause')} className="p-1 text-accent-orange hover:bg-accent-orange/10 rounded" title="Pausar"><Pause className="w-4 h-4" /></button>}
                            {c.status === 'paused' && <button onClick={() => handleAction(c.id, 'resume')} className="p-1 text-accent-green hover:bg-accent-green/10 rounded" title="Retomar"><Play className="w-4 h-4" /></button>}
                            <button onClick={() => handleDelete(c.id)} className="p-1 text-error hover:bg-error/10 rounded" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Campaign Wizard Modal */}
        {showWizard && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-text-primary">Nova Campanha</h2>
                <button onClick={() => { setShowWizard(false); setWizardStep(0); }}><X className="w-5 h-5 text-text-muted" /></button>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center gap-1 mb-6 overflow-x-auto">
                {WIZARD_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium",
                      i <= wizardStep ? "bg-primary text-gray-900" : "bg-surface-hover text-text-muted"
                    )}>{i + 1}</div>
                    <span className={cn("text-xs whitespace-nowrap", i <= wizardStep ? "text-text-primary" : "text-text-muted")}>{step}</span>
                    {i < WIZARD_STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-[120px]">
                {wizardStep === 0 && (
                  <div><label className="block text-sm text-text-secondary mb-1">Nome da Campanha</label>
                    <input type="text" value={wizardData.name} onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                      placeholder="Ex: Lancamento MCIS 2026"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" /></div>
                )}
                {wizardStep === 1 && (
                  <div><label className="block text-sm text-text-secondary mb-1">Instancia WhatsApp</label>
                    <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                      {instances.map((inst: any) => (
                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.status})</option>
                      ))}
                    </select></div>
                )}
                {wizardStep === 2 && (
                  <div><label className="block text-sm text-text-secondary mb-1">Template (opcional)</label>
                    <select value={wizardData.template} onChange={(e) => setWizardData({ ...wizardData, template: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                      <option value="">Nenhum template</option>
                      {templates.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select></div>
                )}
                {wizardStep === 3 && (
                  <div><label className="block text-sm text-text-secondary mb-1">Destinatarios (um por linha)</label>
                    <textarea value={wizardData.recipients} onChange={(e) => setWizardData({ ...wizardData, recipients: e.target.value })}
                      placeholder="5591999999999\n5511988888888"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" rows={5} /></div>
                )}
                {wizardStep === 4 && (
                  <div><label className="block text-sm text-text-secondary mb-1">Agendar Para</label>
                    <input type="datetime-local" value={wizardData.scheduled_at} onChange={(e) => setWizardData({ ...wizardData, scheduled_at: e.target.value })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" />
                    <p className="text-xs text-text-muted mt-2">Deixe vazio para enviar imediatamente</p></div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <button onClick={() => setWizardStep(Math.max(0, wizardStep - 1))} disabled={wizardStep === 0}
                  className="flex items-center gap-1 px-3 py-2 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button onClick={() => setWizardStep(wizardStep + 1)}
                    className="flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium transition-colors">
                    Proximo <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleCreateCampaign} disabled={!wizardData.name.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium disabled:opacity-50 transition-colors">
                    Criar Campanha
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
