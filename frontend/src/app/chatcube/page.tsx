"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Smartphone,
  Plus,
  Loader2,
  Wifi,
  MessageSquare,
  Signal,
  BarChart3,
} from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import type { WhatsAppInstance, ChatCubeStats } from "@/types/chatcube.types";
import { InstanceCard } from "@/components/chatcube/InstanceCard";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

export default function ChatCubeDashboard() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [stats, setStats] = useState<ChatCubeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [instancesData, statsData] = await Promise.all([
        chatcubeApi.listInstances().catch(() => ({ results: [] })),
        chatcubeApi.getStats().catch(() => null),
      ]);
      setInstances(instancesData.results || []);
      setStats(statsData);
    } catch (err) {
      setError("Failed to load ChatCube data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Compute stats from instances if API stats not available
  const totalInstances = stats?.total_instances ?? instances.length;
  const connectedInstances = stats?.connected_instances ?? instances.filter((i) => i.status === "connected").length;
  const messagesToday = stats?.messages_today ?? instances.reduce((sum, i) => sum + i.messages_sent_today + i.messages_received_today, 0);
  const healthScore = stats?.health_score ?? (totalInstances > 0 ? Math.round((connectedInstances / totalInstances) * 100) : 0);

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-text-secondary text-sm">Loading ChatCube...</span>
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
            <h1 className="text-lg font-semibold text-text-primary">ChatCube</h1>
            <p className="text-sm text-text-muted">
              {totalInstances} instance{totalInstances !== 1 ? "s" : ""} configured
            </p>
          </div>
          <Link
            href="/chatcube/instances/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Instance
          </Link>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              icon={<Smartphone className="w-5 h-5" />}
              label="Total Instances"
              value={totalInstances}
              color="text-accent-purple"
              bgColor="bg-accent-purple/10"
            />
            <StatsCard
              icon={<Wifi className="w-5 h-5" />}
              label="Connected"
              value={connectedInstances}
              color="text-accent-green"
              bgColor="bg-accent-green/10"
            />
            <StatsCard
              icon={<MessageSquare className="w-5 h-5" />}
              label="Messages Today"
              value={messagesToday}
              color="text-accent-blue"
              bgColor="bg-accent-blue/10"
            />
            <StatsCard
              icon={<Signal className="w-5 h-5" />}
              label="Health Score"
              value={`${healthScore}%`}
              color={healthScore >= 80 ? "text-accent-green" : healthScore >= 50 ? "text-accent-orange" : "text-error"}
              bgColor={healthScore >= 80 ? "bg-accent-green/10" : healthScore >= 50 ? "bg-accent-orange/10" : "bg-error/10"}
            />
          </div>

          {/* Instances Grid */}
          {instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 mb-6 rounded-2xl bg-surface flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-text-muted" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">
                No WhatsApp instances yet
              </h2>
              <p className="text-text-secondary mb-6 text-center max-w-md">
                Create your first WhatsApp instance to start sending and receiving messages through ChatCube.
              </p>
              <Link
                href="/chatcube/instances/new"
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create your first instance
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {instances.map((instance) => (
                <InstanceCard key={instance.id} instance={instance} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============ Stats Card Component ============

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
