"use client";

import { useEffect, useState } from "react";
import { Contact, Search, Loader2, Upload, MessageSquare } from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  jid: string;
  is_business: boolean;
  last_message_at: string | null;
  instance_id?: string;
  instance_name?: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");

  useEffect(() => { loadInstances(); }, []);

  async function loadInstances() {
    try {
      const d = await chatcubeApi.listInstances();
      setInstances(d.results || []);
      if (d.results?.length > 0) {
        setSelectedInstance(d.results[0].id);
        loadContacts(d.results[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) { console.error(err); setLoading(false); }
  }

  async function loadContacts(instanceId: string) {
    try {
      setLoading(true);
      const d = await chatcubeApi.getContacts(instanceId);
      let filtered = d.results || [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter((c: any) => c.name?.toLowerCase().includes(s) || c.phone?.includes(s));
      }
      setContacts(filtered);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (selectedInstance) loadContacts(selectedInstance);
  }, [selectedInstance]);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Contact className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Contatos</h1>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-hover hover:bg-surface-hover text-text-primary rounded-lg text-sm">
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" placeholder="Buscar contatos..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && selectedInstance && loadContacts(selectedInstance)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary" />
            </div>
            {instances.length > 1 && (
              <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)}
                className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary">
                {instances.map((inst: any) => (
                  <option key={inst.id} value={inst.id}>{inst.name || inst.id}</option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-20 text-text-muted">
              <Contact className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum contato encontrado</p>
            </div>
          ) : (
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Telefone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">JID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Business</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase">Ultima Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface-hover/30">
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">{c.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{c.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm text-text-muted font-mono text-xs">{c.jid || "-"}</td>
                      <td className="px-4 py-3">
                        {c.is_business && <span className="px-2 py-1 bg-accent-blue/10 text-accent-blue rounded-full text-xs">Business</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{c.last_message_at ? new Date(c.last_message_at).toLocaleString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
