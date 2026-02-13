"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, Search } from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  participants_count: number;
  is_admin: boolean;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");

  useEffect(() => { loadInstances(); }, []);

  async function loadInstances() {
    try {
      const d = await chatcubeApi.listInstances();
      setInstances(d.results || []);
      if (d.results?.length > 0) {
        setSelectedInstance(d.results[0].id);
        loadGroups(d.results[0].id);
      } else { setLoading(false); }
    } catch (err) { console.error(err); setLoading(false); }
  }

  async function loadGroups(instanceId: string) {
    try {
      setLoading(true);
      const d = await chatcubeApi.getGroups(instanceId);
      setGroups(d.results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (selectedInstance) loadGroups(selectedInstance);
  }, [selectedInstance]);

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center px-6">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Grupos</h1>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <div className="mb-4">
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
          ) : groups.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum grupo encontrado</p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Descricao</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Participantes</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, i) => (
                    <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-100 font-medium">{g.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{g.description || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{g.participants_count || 0}</td>
                      <td className="px-4 py-3">
                        {g.is_admin && <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-xs">Admin</span>}
                      </td>
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
