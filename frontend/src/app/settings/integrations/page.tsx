"use client";

import { useState } from "react";
import { Plug, Settings, CheckCircle, XCircle } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";

interface Integration {
  name: string;
  description: string;
  status: "connected" | "disconnected";
  icon: string;
}

const integrations: Integration[] = [
  { name: "Evolution API", description: "WhatsApp Business via Evolution", status: "connected", icon: "EV" },
  { name: "Meta Ads", description: "Facebook & Instagram Ads", status: "disconnected", icon: "MT" },
  { name: "OpenAI", description: "GPT & Embeddings", status: "connected", icon: "AI" },
  { name: "Google Workspace", description: "Sheets, Drive, Calendar", status: "disconnected", icon: "GW" },
  { name: "Stripe", description: "Pagamentos e cobrancas", status: "disconnected", icon: "ST" },
  { name: "SMTP", description: "Envio de emails", status: "connected", icon: "EM" },
];

export default function IntegrationsPage() {
  const [items] = useState(integrations);

  return (
    <div className="flex h-screen bg-gray-900">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-700 bg-gray-900 flex items-center px-6">
          <div className="flex items-center gap-3">
            <Plug className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-semibold text-gray-100">Integracoes</h1>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.name} className="bg-gray-800 rounded-lg border border-gray-700 p-5 hover:border-indigo-500/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 font-bold text-sm">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-100">{item.name}</h3>
                      <p className="text-xs text-gray-400">{item.description}</p>
                    </div>
                  </div>
                  {item.status === "connected" ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
                  <span className={`text-xs font-medium ${item.status === "connected" ? "text-green-400" : "text-gray-500"}`}>
                    {item.status === "connected" ? "Conectado" : "Desconectado"}
                  </span>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs">
                    <Settings className="w-3 h-3" /> Configurar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
