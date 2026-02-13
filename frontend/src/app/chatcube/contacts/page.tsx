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
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Contact className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Contatos</h1>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm">
            <Upload className="w-4 h-4" /> Importar CSV
          </button>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar contatos..." value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && selectedInstance && loadContacts(selectedInstance)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500" />
            </div>
            {instances.length > 1 && (
              <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-indigo-500">
                {instances.map((inst: any) => (
                  <option key={inst.id} value={inst.id}>{inst.name || inst.id}</option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Contact className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum contato encontrado</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Telefone</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">JID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Business</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Ultima Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c, i) => (
                    <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-100 font-medium">{c.name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{c.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono text-xs">{c.jid || "-"}</td>
                      <td className="px-4 py-3">
                        {c.is_business && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Business</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{c.last_message_at ? new Date(c.last_message_at).toLocaleString("pt-BR") : "-"}</td>
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
