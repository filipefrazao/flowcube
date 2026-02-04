"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GitBranch,
  Play,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Loader2,
  Zap,
  Users,
  MessageSquare,
  Key,
} from "lucide-react";
import { workflowApi, executionApi, type ExecutionStats } from "@/lib/api";
import type { Workflow } from "@/types/workflow.types";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";
import { GlassCard, BentoGrid, BentoItem, StatsCard, PremiumButton } from "@/components/ui/premium";
import { GradientBlobs } from "@/components/effects";

interface DashboardData {
  workflows: Workflow[];
  execStats: ExecutionStats | null;
  loading: boolean;
  error: string | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    workflows: [],
    execStats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const [workflows, execStats] = await Promise.all([
        workflowApi.list(),
        executionApi.stats().catch(() => null),
      ]);
      setData({ workflows, execStats, loading: false, error: null });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load dashboard data",
      }));
      console.error(err);
    }
  }

  const totalWorkflows = data.workflows.length;
  const activeWorkflows = data.workflows.filter((w) => w.is_published).length;
  const executionsToday = data.execStats?.daily_counts?.slice(-1)[0]?.count || 0;
  const failedToday = data.execStats?.by_status?.failed || 0;
  const successRate = data.execStats?.success_rate || 0;

  if (data.loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <GradientBlobs />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 z-10"
          >
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-text-secondary text-sm">Loading dashboard...</span>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Effects */}
        <GradientBlobs className="opacity-30" />

        {/* Header */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-xl font-semibold text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-muted">
              Welcome back • Press <kbd className="px-1.5 py-0.5 text-xs bg-surface rounded border border-border">⌘K</kbd> for commands
            </p>
          </motion.div>
          <PremiumButton
            variant="gradient"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            glow
            onClick={() => window.location.href = '/workflows/new'}
          >
            New Workflow
          </PremiumButton>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 z-10">
          {data.error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4" />
              {data.error}
            </motion.div>
          )}

          {/* Stats Cards - Bento Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <BentoGrid className="mb-8">
              <BentoItem colSpan={1}>
                <StatsCard
                  title="Total Workflows"
                  value={totalWorkflows}
                  icon={<GitBranch className="w-5 h-5" />}
                  trend="neutral"
                />
              </BentoItem>
              <BentoItem colSpan={1}>
                <StatsCard
                  title="Active Workflows"
                  value={activeWorkflows}
                  icon={<Play className="w-5 h-5" />}
                  change={totalWorkflows > 0 ? Math.round((activeWorkflows / totalWorkflows) * 100) : 0}
                  trend="up"
                />
              </BentoItem>
              <BentoItem colSpan={1}>
                <StatsCard
                  title="Executions Today"
                  value={executionsToday}
                  icon={<TrendingUp className="w-5 h-5" />}
                  trend="up"
                />
              </BentoItem>
            </BentoGrid>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Workflows - Takes 2 columns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <GlassCard hover={false} padding="sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                  <h2 className="text-sm font-medium text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    Recent Workflows
                  </h2>
                  <Link
                    href="/workflows"
                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    View all
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {data.workflows.length === 0 ? (
                    <div className="p-8 text-center">
                      <GitBranch className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">No workflows yet</p>
                      <Link
                        href="/workflows/new"
                        className="text-purple-400 text-sm hover:underline mt-2 inline-block"
                      >
                        Create your first workflow
                      </Link>
                    </div>
                  ) : (
                    data.workflows.slice(0, 5).map((workflow, idx) => (
                      <motion.div
                        key={workflow.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Link
                          href={'/workflows/' + workflow.id}
                          className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center",
                                workflow.is_published
                                  ? "bg-green-500/20"
                                  : "bg-gray-700/50"
                              )}
                            >
                              <GitBranch
                                className={cn(
                                  "w-4 h-4",
                                  workflow.is_published
                                    ? "text-green-400"
                                    : "text-gray-500"
                                )}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {workflow.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatRelativeTime(workflow.updated_at)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              workflow.is_published
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-700/50 text-gray-400"
                            )}
                          >
                            {workflow.is_published ? "Active" : "Draft"}
                          </span>
                        </Link>
                      </motion.div>
                    ))
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Execution Stats - Takes 1 column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <GlassCard hover={false} glow="purple" padding="sm">
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                  <h2 className="text-sm font-medium text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Execution Stats
                  </h2>
                </div>
                {!data.execStats ? (
                  <div className="p-8 text-center">
                    <Play className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No executions yet</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <StatusBadge label="Done" value={data.execStats.by_status.completed} variant="success" />
                      <StatusBadge label="Failed" value={data.execStats.by_status.failed} variant="error" />
                      <StatusBadge label="Running" value={data.execStats.by_status.running} variant="info" />
                    </div>
                    <div className="pt-4 border-t border-gray-700/50 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Success Rate</span>
                        <span className={cn(
                          "font-medium",
                          successRate >= 95 ? "text-green-400" : successRate >= 80 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {successRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Avg. Duration</span>
                        <span className="text-white font-medium">
                          {formatDuration(data.execStats.avg_duration_ms)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-6"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <QuickActionCard
                title="Create Workflow"
                description="Build new automation"
                href="/workflows/new"
                icon={<Plus className="w-5 h-5" />}
                color="purple"
              />
              <QuickActionCard
                title="Credentials"
                description="Manage API keys"
                href="/credentials"
                icon={<Key className="w-5 h-5" />}
                color="cyan"
              />
              <QuickActionCard
                title="Executions"
                description="Monitor runs"
                href="/executions"
                icon={<Play className="w-5 h-5" />}
                color="green"
              />
              <QuickActionCard
                title="Conversations"
                description="Live chat inbox"
                href="/conversations"
                icon={<MessageSquare className="w-5 h-5" />}
                color="pink"
              />
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// ============ Components ============

interface StatusBadgeProps {
  label: string;
  value: number;
  variant: "success" | "error" | "info";
}

function StatusBadge({ label, value, variant }: StatusBadgeProps) {
  const styles = {
    success: "bg-green-500/10 text-green-400 border-green-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  return (
    <div className={cn("rounded-lg border p-2 text-center", styles[variant])}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: "purple" | "cyan" | "green" | "pink";
}

function QuickActionCard({ title, description, href, icon, color }: QuickActionCardProps) {
  const colors = {
    purple: "from-purple-500/20 to-purple-600/10 hover:border-purple-500/50 text-purple-400",
    cyan: "from-cyan-500/20 to-cyan-600/10 hover:border-cyan-500/50 text-cyan-400",
    green: "from-green-500/20 to-green-600/10 hover:border-green-500/50 text-green-400",
    pink: "from-pink-500/20 to-pink-600/10 hover:border-pink-500/50 text-pink-400",
  };

  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "p-4 rounded-xl border border-gray-700/50 bg-gradient-to-br transition-colors cursor-pointer",
          colors[color]
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-800/50">
            {icon}
          </div>
          <div>
            <p className="font-medium text-white text-sm">{title}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ============ Helpers ============

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return Math.floor(diffInSeconds / 60) + "m ago";
  if (diffInSeconds < 86400) return Math.floor(diffInSeconds / 3600) + "h ago";
  if (diffInSeconds < 604800) return Math.floor(diffInSeconds / 86400) + "d ago";

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return ms + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  return Math.round(ms / 60000) + "m";
}
