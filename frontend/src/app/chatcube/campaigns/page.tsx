"use client";

import { useState } from "react";
import { Megaphone, Plus, X, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface Campaign {
  id: number;
  name: string;
  template: string;
  status: "draft" | "running" | "completed" | "failed";
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  scheduled_at: string;
  created_at: string;
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: 1, name: "Lancamento MCIS 2026", template: "Boas Vindas", status: "completed", sent: 500, delivered: 485, read: 320, failed: 15, scheduled_at: "2026-02-01T10:00:00", created_at: "2026-01-30" },
  { id: 2, name: "Follow Up TCE", template: "Follow Up", status: "running", sent: 200, delivered: 150, read: 80, failed: 5, scheduled_at: "2026-02-13T14:00:00", created_at: "2026-02-12" },
  { id: 3, name: "Reengajamento Q1", template: "Follow Up", status: "draft", sent: 0, delivered: 0, read: 0, failed: 0, scheduled_at: "", created_at: "2026-02-13" },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "bg-gray-500/20 text-gray-400", label: "Rascunho" },
  running: { color: "bg-blue-500/20 text-blue-400", label: "Executando" },
  completed: { color: "bg-green-500/20 text-green-400", label: "Concluida" },
  failed: { color: "bg-red-500/20 text-red-400", label: "Falhou" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardData, setWizardData] = useState({ name: "", template: "", recipients: "", scheduled_at: "" });

  function handleCreateCampaign() {
    const newCampaign: Campaign = {
      id: Date.now(),
      name: wizardData.name,
      template: wizardData.template || "Custom",
      status: "draft",
      sent: 0, delivered: 0, read: 0, failed: 0,
      scheduled_at: wizardData.scheduled_at,
      created_at: new Date().toISOString().split("T")[0],
    };
    setCampaigns([...campaigns, newCampaign]);
    setShowWizard(false);
    setWizardStep(0);
    setWizardData({ name: "", template: "", recipients: "", scheduled_at: "" });
  }

  function handleDelete(id: number) {
    if (!confirm("Excluir campanha?")) return;
    setCampaigns(campaigns.filter((c) => c.id !== id));
  }

  const WIZARD_STEPS = ["Nome", "Template", "Destinatarios", "Agendamento"];

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Campanhas</h1>
          </div>
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nova Campanha
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {campaigns.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma campanha criada</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Template</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Enviados</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Entregues</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Lidos</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Falhou</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const sc = statusConfig[c.status] || statusConfig.draft;
                    return (
                      <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-sm text-gray-100 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{c.template}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-300 text-right">{c.sent}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 text-right">{c.delivered}</td>
                        <td className="px-4 py-3 text-sm text-gray-300 text-right">{c.read}</td>
                        <td className="px-4 py-3 text-sm text-red-400 text-right">{c.failed}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
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
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-100">Nova Campanha</h2>
                <button onClick={() => { setShowWizard(false); setWizardStep(0); }}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {/* Steps indicator */}
              <div className="flex items-center gap-2 mb-6">
                {WIZARD_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      i <= wizardStep ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-400"
                    }`}>{i + 1}</div>
                    <span className={`text-xs ${i <= wizardStep ? "text-gray-200" : "text-gray-500"}`}>{step}</span>
                    {i < WIZARD_STEPS.length - 1 && <div className="w-8 h-px bg-gray-600" />}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-[120px]">
                {wizardStep === 0 && (
                  <div><label className="block text-sm text-gray-300 mb-1">Nome da Campanha</label>
                    <input type="text" value={wizardData.name} onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                      placeholder="Ex: Lancamento MCIS 2026"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500" /></div>
                )}
                {wizardStep === 1 && (
                  <div><label className="block text-sm text-gray-300 mb-1">Template</label>
                    <select value={wizardData.template} onChange={(e) => setWizardData({ ...wizardData, template: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500">
                      <option value="">Selecione um template...</option>
                      <option value="Boas Vindas">Boas Vindas</option>
                      <option value="Follow Up">Follow Up</option>
                      <option value="Confirmacao">Confirmacao</option>
                    </select></div>
                )}
                {wizardStep === 2 && (
                  <div><label className="block text-sm text-gray-300 mb-1">Destinatarios (um por linha)</label>
                    <textarea value={wizardData.recipients} onChange={(e) => setWizardData({ ...wizardData, recipients: e.target.value })}
                      placeholder="5591999999999\n5511988888888"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500" rows={5} /></div>
                )}
                {wizardStep === 3 && (
                  <div><label className="block text-sm text-gray-300 mb-1">Agendar Para</label>
                    <input type="datetime-local" value={wizardData.scheduled_at} onChange={(e) => setWizardData({ ...wizardData, scheduled_at: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-500" />
                    <p className="text-xs text-gray-500 mt-2">Deixe vazio para enviar imediatamente</p></div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                <button onClick={() => setWizardStep(Math.max(0, wizardStep - 1))} disabled={wizardStep === 0}
                  className="flex items-center gap-1 px-3 py-2 text-gray-300 hover:text-gray-100 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button onClick={() => setWizardStep(wizardStep + 1)}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                    Proximo <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleCreateCampaign}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
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
