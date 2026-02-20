"use client";

import { useEffect, useState, useRef } from "react";
import { Bot, Plus, Loader2, X, MessageSquare, Power, Send } from "lucide-react";
import { aiApi, type AIAgent, type ChatTestMessage } from "@/lib/aiApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showChat, setShowChat] = useState<AIAgent | null>(null);
  const [formData, setFormData] = useState<Partial<AIAgent>>({
    name: "", description: "", system_prompt: "", model: "gpt-4o-mini", temperature: 0.7, max_tokens: 2048, is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatTestMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadAgents(); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  async function loadAgents() {
    try { setLoading(true); const d = await aiApi.listAgents(); setAgents(d.results || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }

  async function handleCreate() {
    try { setSaving(true); await aiApi.createAgent(formData); setShowForm(false);
      setFormData({ name: "", description: "", system_prompt: "", model: "gpt-4o-mini", temperature: 0.7, max_tokens: 2048, is_active: true });
      loadAgents(); }
    catch (err) { console.error(err); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza?")) return;
    try { await aiApi.deleteAgent(id); loadAgents(); } catch (err) { console.error(err); }
  }

  async function handleSendChat() {
    if (!chatInput.trim() || !showChat) return;
    const userMsg: ChatTestMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    try {
      setChatLoading(true);
      const resp = await aiApi.testChat(showChat.id, chatInput, chatMessages);
      setChatMessages((prev) => [...prev, { role: "assistant", content: resp.response }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Erro ao processar mensagem." }]);
    } finally { setChatLoading(false); }
  }

  const MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"];

  return (
    <div className="flex h-screen bg-background-secondary">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background-secondary flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Agentes IA</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Agente
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : agents.length === 0 ? (
            <div className="text-center py-20 text-text-secondary"><Bot className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum agente encontrado</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((a) => (
                <div key={a.id} className="bg-surface rounded-lg border border-border p-5 hover:border-primary/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      <h3 className="text-sm font-semibold text-text-primary">{a.name}</h3>
                    </div>
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${a.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-text-secondary"}`}>
                      <Power className="w-3 h-3" /> {a.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">{a.description || "Sem descricao"}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-surface-hover rounded text-xs text-text-primary">{a.model}</span>
                    <span className="px-2 py-1 bg-surface-hover rounded text-xs text-text-primary">temp: {a.temperature}</span>
                    <span className="px-2 py-1 bg-surface-hover rounded text-xs text-text-primary">{a.max_tokens} tokens</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-text-muted">{a.knowledge_bases_count || 0} base(s)</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowChat(a); setChatMessages([]); }}
                        className="flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30">
                        <MessageSquare className="w-3 h-3" /> Testar
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Agent Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Novo Agente</h2>
                <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="space-y-4">
                <div><label className="block text-sm text-text-primary mb-1">Nome</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-sm text-text-primary mb-1">Descricao</label>
                  <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" /></div>
                <div><label className="block text-sm text-text-primary mb-1">System Prompt</label>
                  <textarea value={formData.system_prompt} onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" rows={4} /></div>
                <div><label className="block text-sm text-text-primary mb-1">Modelo</label>
                  <select value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary">
                    {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm text-text-primary mb-1">Temperatura: {formData.temperature}</label>
                    <input type="range" min={0} max={2} step={0.1} value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-primary" /></div>
                  <div><label className="block text-sm text-text-primary mb-1">Max Tokens</label>
                    <input type="number" value={formData.max_tokens} onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 2048 })}
                      className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-text-primary hover:text-text-primary">Cancelar</button>
                  <button onClick={handleCreate} disabled={saving} className="px-4 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Agente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Test Chat Modal */}
        {showChat && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg border border-border w-full max-w-lg h-[600px] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold text-text-primary">Testar: {showChat.name}</h2>
                </div>
                <button onClick={() => setShowChat(null)}><X className="w-5 h-5 text-text-secondary" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-text-muted py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Envie uma mensagem para testar o agente</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === "user" ? "bg-primary text-gray-900" : "bg-surface-hover text-text-primary"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-surface-hover px-3 py-2 rounded-lg"><Loader2 className="w-4 h-4 text-text-secondary animate-spin" /></div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-3 py-2 bg-background-secondary border border-border rounded-lg text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary" />
                  <button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}
                    className="px-3 py-2 bg-primary hover:bg-primary-hover text-gray-900 rounded-lg disabled:opacity-50">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
