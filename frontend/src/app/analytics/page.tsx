"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  Activity,
  Zap,
  Bot,
  Loader2,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { GlassCard, BentoGrid, BentoItem, StatsCard, PremiumButton } from "@/components/ui/premium";
import { GradientBlobs, Sparkles } from "@/components/effects";
import { cn } from "@/lib/utils";
import { chatApi, executionApi, workflowApi, ChatStats, ExecutionStats } from "@/lib/api";
import type { Workflow } from "@/types/workflow.types";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: "purple" | "cyan" | "green" | "yellow" | "red";
  loading?: boolean;
}

function MetricCard({ title, value, change, icon, color, loading }: MetricCardProps) {
  const colorClasses = {
    purple: "from-purple-500/20 to-purple-600/10 text-purple-400",
    cyan: "from-cyan-500/20 to-cyan-600/10 text-cyan-400",
    green: "from-green-500/20 to-green-600/10 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-600/10 text-yellow-400",
    red: "from-red-500/20 to-red-600/10 text-red-400",
  };

  return (
    <GlassCard className="relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colorClasses[color])} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400 font-medium">{title}</span>
          <div className={cn("p-2 rounded-lg bg-gray-800/50", colorClasses[color].split(" ")[2])}>
            {icon}
          </div>
        </div>
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-white"
            >
              {value}
            </motion.div>
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-sm mt-1",
                change >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{Math.abs(change).toFixed(1)}%</span>
                <span className="text-gray-500">vs periodo anterior</span>
              </div>
            )}
          </>
        )}
      </div>
    </GlassCard>
  );
}

interface DailyCount {
  date: string;
  count: number;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Real data states
  const [chatStats, setChatStats] = useState<ChatStats | null>(null);
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [chatData, execData, workflowData] = await Promise.all([
        chatApi.getStats(),
        executionApi.stats(),
        workflowApi.list(),
      ]);
      setChatStats(chatData);
      setExecutionStats(execData);
      setWorkflows(workflowData);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError("Erro ao carregar dados. Verifique se voce esta autenticado.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  // Process daily counts for chart
  const dailyCounts = executionStats?.daily_counts || [];
  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);
  
  // Calculate containment rate (sessions handled by AI without handoff)
  const containmentRate = chatStats ? (
    chatStats.total > 0 
      ? ((chatStats.total - chatStats.by_status.handoff) / chatStats.total * 100).toFixed(1)
      : "100"
  ) : "--";

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Effects */}
        <GradientBlobs className="opacity-20" />
        <Sparkles particleCount={30} className="opacity-30" />

        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Analytics
            </h1>
            <p className="text-sm text-gray-400">Insights e metricas em tempo real</p>
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex bg-gray-800/50 rounded-lg p-1">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    period === p
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </button>

            <PremiumButton variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
              Exportar
            </PremiumButton>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 z-10">
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 text-purple-400 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Main KPIs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
              >
                <MetricCard
                  title="Total Conversas"
                  value={chatStats?.total.toLocaleString() || "--"}
                  icon={<MessageSquare className="w-5 h-5" />}
                  color="purple"
                  loading={isLoading}
                />
                <MetricCard
                  title="Execucoes (30d)"
                  value={executionStats?.last_30_days.toLocaleString() || "--"}
                  icon={<Zap className="w-5 h-5" />}
                  color="cyan"
                  loading={isLoading}
                />
                <MetricCard
                  title="Taxa de Sucesso"
                  value={executionStats ? `${executionStats.success_rate.toFixed(1)}%` : "--"}
                  icon={<CheckCircle className="w-5 h-5" />}
                  color="green"
                  loading={isLoading}
                />
                <MetricCard
                  title="Taxa Contencao"
                  value={`${containmentRate}%`}
                  icon={<Bot className="w-5 h-5" />}
                  color="yellow"
                  loading={isLoading}
                />
              </motion.div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Daily Activity Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-2"
                >
                  <GlassCard className="h-full">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Atividade Diaria
                      </h3>
                    </div>
                    
                    {isLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                      </div>
                    ) : dailyCounts.length === 0 ? (
                      <div className="h-48 flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500">Nenhuma execucao registrada</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end gap-2 h-48">
                        {dailyCounts.slice(-14).map((day, idx) => {
                          const height = (day.count / maxCount) * 100;
                          const date = new Date(day.date);
                          const dayLabel = date.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3);
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${Math.max(height, 4)}%` }}
                                transition={{ delay: 0.3 + idx * 0.05, duration: 0.5 }}
                                className={cn(
                                  "w-full rounded-t-md bg-gradient-to-t",
                                  idx % 2 === 0 
                                    ? "from-purple-600 to-purple-400" 
                                    : "from-cyan-600 to-cyan-400"
                                )}
                                title={`${day.count} execucoes`}
                              />
                              <span className="text-xs text-gray-500">{dayLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>

                {/* Status Breakdown */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <GlassCard className="h-full">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      Status das Conversas
                    </h3>
                    
                    {isLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <StatusBar 
                          label="Ativas" 
                          value={chatStats?.by_status.active || 0} 
                          total={chatStats?.total || 1}
                          color="bg-green-500"
                        />
                        <StatusBar 
                          label="Aguardando" 
                          value={chatStats?.by_status.waiting || 0} 
                          total={chatStats?.total || 1}
                          color="bg-yellow-500"
                        />
                        <StatusBar 
                          label="Handoff" 
                          value={chatStats?.by_status.handoff || 0} 
                          total={chatStats?.total || 1}
                          color="bg-red-500"
                        />
                        <StatusBar 
                          label="Finalizadas" 
                          value={chatStats?.by_status.completed || 0} 
                          total={chatStats?.total || 1}
                          color="bg-gray-500"
                        />
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workflows List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <GlassCard>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Workflows Ativos
                    </h3>
                    
                    {isLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                      </div>
                    ) : workflows.length === 0 ? (
                      <div className="text-center py-8">
                        <Zap className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-500">Nenhum workflow criado</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {workflows.slice(0, 5).map((workflow, idx) => (
                          <motion.div
                            key={workflow.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + idx * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                workflow.is_published ? "bg-green-400" : "bg-gray-500"
                              )} />
                              <span className="font-medium text-white">{workflow.name}</span>
                            </div>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded",
                              workflow.is_published 
                                ? "bg-green-500/20 text-green-400" 
                                : "bg-gray-500/20 text-gray-400"
                            )}>
                              {workflow.is_published ? "Publicado" : "Rascunho"}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>

                {/* Execution Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <GlassCard>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-cyan-400" />
                      Execucoes por Status
                    </h3>
                    
                    {isLoading ? (
                      <div className="h-48 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <StatBox label="Completas" value={executionStats?.by_status.completed || 0} color="text-green-400" />
                        <StatBox label="Falhas" value={executionStats?.by_status.failed || 0} color="text-red-400" />
                        <StatBox label="Executando" value={executionStats?.by_status.running || 0} color="text-cyan-400" />
                        <StatBox label="Pendentes" value={executionStats?.by_status.pending || 0} color="text-yellow-400" />
                      </div>
                    )}

                    {executionStats && executionStats.avg_duration_ms > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Tempo medio de execucao</span>
                          <span className="text-lg font-semibold text-white">
                            {(executionStats.avg_duration_ms / 1000).toFixed(2)}s
                          </span>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Helper Components
function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={cn("h-full rounded-full", color)}
        />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-4 rounded-lg bg-gray-800/30">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", color)}>{value.toLocaleString()}</p>
    </div>
  );
}
