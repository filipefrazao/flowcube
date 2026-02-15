/**
 * REFERENCE PATTERN: Google AI TelephonyDashboard
 * Used in: /chatcube/telephony/page.tsx
 *
 * Key design patterns for PABX/telephony dashboards.
 */

// ============================================================================
// Pattern: Stats Card
// ============================================================================

import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;   // e.g. "text-accent-blue"
  bgColor: string;  // e.g. "bg-accent-blue/10"
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

// ============================================================================
// Pattern: Quick Link Card
// ============================================================================

import Link from "next/link";

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

// ============================================================================
// Pattern: Status Color Maps (Telephony)
// ============================================================================

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

const callStatusColors: Record<string, string> = {
  COMPLETED: "text-green-400",
  ANSWERED: "text-green-400",
  NO_ANSWER: "text-yellow-400",
  MISSED: "text-red-400",
  BUSY: "text-orange-400",
  FAILED: "text-red-500",
  RINGING: "text-blue-400",
};

// ============================================================================
// Pattern: Dashboard Layout
// ============================================================================

/*
<main className="flex-1 overflow-auto p-6 space-y-6">
  {/* Row 1: 5 StatsCards *\/}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    <StatsCard ... />
  </div>

  {/* Row 2: Extensions (1/3) + Recent Calls (2/3) *\/}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-1"> {/* Extensions *\/} </div>
    <div className="lg:col-span-2"> {/* Calls table *\/} </div>
  </div>

  {/* Row 3: Quick Links (4 columns) *\/}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <QuickLink ... />
  </div>
</main>
*/

// ============================================================================
// Pattern: Duration Formatter
// ============================================================================

function formatDuration(seconds: number): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export { StatsCard, QuickLink, formatDuration, statusColors, statusLabels, callStatusColors };
