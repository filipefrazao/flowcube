"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Users,
  Clock,
  Loader2,
  ArrowRight,
  Wifi,
  WifiOff,
  PhoneCall,
} from "lucide-react";
import { telephonyApi } from "@/lib/telephonyApi";
import type { DashboardStats, Extension, CallRecordList } from "@/lib/telephonyApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-500",
  ON_CALL: "bg-red-500",
  RINGING: "bg-yellow-500",
  DND: "bg-orange-500",
  UNAVAILABLE: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Disponivel",
  ON_CALL: "Em Chamada",
  RINGING: "Tocando",
  DND: "Nao Perturbe",
  UNAVAILABLE: "Indisponivel",
};

const directionIcons: Record<string, React.ReactNode> = {
  INBOUND: <PhoneIncoming className="w-4 h-4 text-green-400" />,
  OUTBOUND: <PhoneOutgoing className="w-4 h-4 text-blue-400" />,
  INTERNAL: <Phone className="w-4 h-4 text-text-secondary" />,
};

const callStatusColors: Record<string, string> = {
  COMPLETED: "text-green-400",
  ANSWERED: "text-green-400",
  NO_ANSWER: "text-yellow-400",
  MISSED: "text-red-400",
  BUSY: "text-orange-400",
  FAILED: "text-red-500",
  RINGING: "text-blue-400",
};

export default function TelephonyDashboard() {
  const [dashStats, setDashStats] = useState<DashboardStats | null>(null);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallRecordList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [stats, exts, calls] = await Promise.all([
        telephonyApi.getDashboardStats(30).catch(() => null),
        telephonyApi.listExtensions().catch(() => ({ results: [] })),
        telephonyApi.listCalls({ ordering: "-start_time" }).catch(() => ({ results: [] })),
      ]);
      setDashStats(stats);
      setExtensions(exts.results || []);
      setRecentCalls((calls.results || []).slice(0, 10));
    } catch (err) {
      console.error("Failed to load telephony data", err);
    } finally {
      setLoading(false);
    }
  }

  const totalCalls = dashStats?.summary?.total_calls ?? 0;
  const totalAnswered = dashStats?.summary?.total_answered ?? 0;
  const totalMissed = dashStats?.summary?.total_missed ?? 0;
  const avgDuration = dashStats?.summary?.avg_duration ?? 0;
  const totalTalkTime = dashStats?.summary?.total_talk_time ?? 0;
  const onlineExts = extensions.filter((e) => e.status === "AVAILABLE").length;
  const busyExts = extensions.filter((e) => e.status === "ON_CALL").length;

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-text-secondary text-sm">Carregando telefonia...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Telefonia (PABX)</h1>
            <p className="text-sm text-text-muted">
              {extensions.length} ramal(is) configurado(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/chatcube/telephony/extensions"
              className="flex items-center gap-2 px-3 py-2 bg-surface border border-border hover:bg-surface-hover rounded-lg text-text-primary text-sm transition-colors"
            >
              <Users className="w-4 h-4" /> Ramais
            </Link>
            <Link
              href="/chatcube/telephony/calls"
              className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" /> Historico
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatsCard
              icon={<Phone className="w-5 h-5" />}
              label="Total de Chamadas"
              value={totalCalls}
              color="text-accent-blue"
              bgColor="bg-accent-blue/10"
            />
            <StatsCard
              icon={<PhoneIncoming className="w-5 h-5" />}
              label="Atendidas"
              value={totalAnswered}
              color="text-green-400"
              bgColor="bg-green-400/10"
            />
            <StatsCard
              icon={<PhoneMissed className="w-5 h-5" />}
              label="Perdidas"
              value={totalMissed}
              color="text-red-400"
              bgColor="bg-red-400/10"
            />
            <StatsCard
              icon={<Clock className="w-5 h-5" />}
              label="Duracao Media"
              value={formatDuration(Math.round(avgDuration))}
              color="text-accent-purple"
              bgColor="bg-accent-purple/10"
            />
            <StatsCard
              icon={<Users className="w-5 h-5" />}
              label="Ramais Online"
              value={`${onlineExts}/${extensions.length}`}
              color="text-accent-green"
              bgColor="bg-accent-green/10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Extensions Status Grid */}
            <div className="lg:col-span-1 bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Status dos Ramais</h2>
                <Link
                  href="/chatcube/telephony/extensions"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Ver todos <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {extensions.length === 0 ? (
                <p className="text-text-muted text-sm py-8 text-center">Nenhum ramal configurado</p>
              ) : (
                <div className="space-y-2">
                  {extensions.slice(0, 10).map((ext) => (
                    <div
                      key={ext.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2.5 h-2.5 rounded-full", statusColors[ext.status] || "bg-gray-500")} />
                        <div>
                          <p className="text-sm text-text-primary font-medium">{ext.extension_number}</p>
                          <p className="text-xs text-text-muted">{ext.user_name}</p>
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">{statusLabels[ext.status] || ext.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Calls */}
            <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Chamadas Recentes</h2>
                <Link
                  href="/chatcube/telephony/calls"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Ver todas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {recentCalls.length === 0 ? (
                <p className="text-text-muted text-sm py-8 text-center">Nenhuma chamada registrada</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Dir</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">De</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Para</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Duracao</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Status</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-text-muted uppercase">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCalls.map((call) => (
                        <tr key={call.id} className="border-b border-border/50 hover:bg-surface-hover/30">
                          <td className="px-3 py-2">{directionIcons[call.direction]}</td>
                          <td className="px-3 py-2 text-sm text-text-primary">{call.caller_number || "-"}</td>
                          <td className="px-3 py-2 text-sm text-text-secondary">{call.callee_number || "-"}</td>
                          <td className="px-3 py-2 text-sm text-text-muted font-mono">{formatDuration(call.duration_seconds)}</td>
                          <td className="px-3 py-2">
                            <span className={cn("text-xs font-medium", callStatusColors[call.status] || "text-text-muted")}>
                              {call.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-text-muted">{formatTime(call.start_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickLink href="/chatcube/telephony/queues" icon={<Users className="w-5 h-5" />} label="Filas" desc="Gerenciar filas de atendimento" />
            <QuickLink href="/chatcube/telephony/ivr" icon={<Phone className="w-5 h-5" />} label="URA (IVR)" desc="Menus de atendimento" />
            <QuickLink href="/chatcube/telephony/recordings" icon={<PhoneCall className="w-5 h-5" />} label="Gravacoes" desc="Ouvir chamadas gravadas" />
            <QuickLink href="/chatcube/telephony/voicemail" icon={<PhoneMissed className="w-5 h-5" />} label="Caixa Postal" desc="Mensagens de voz" />
          </div>
        </main>
      </div>
    </div>
  );
}

// ============ Stats Card ============

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
}

function StatsCard({ icon, label, value, color, bgColor }: StatsCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bgColor, color)}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

// ============ Quick Link ============

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}

function QuickLink({ href, icon, label, desc }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="bg-surface border border-border rounded-lg p-4 hover:bg-surface-hover transition-colors group"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-sm font-semibold text-text-primary">{label}</p>
      <p className="text-xs text-text-muted">{desc}</p>
    </Link>
  );
}
