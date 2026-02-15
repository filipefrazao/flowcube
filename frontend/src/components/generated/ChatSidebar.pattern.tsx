/**
 * REFERENCE PATTERN: v0 Chat 3-Panel Layout with Right Sidebar
 * Used in: /chatcube/conversations/page.tsx
 *
 * This is NOT a standalone component. It documents the pattern used
 * in the conversations page for other agents to reference.
 */

// ============================================================================
// Pattern: Collapsible Sidebar Section
// ============================================================================

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  badge?: number;
  children: React.ReactNode;
}

function SidebarSection({ title, icon: Icon, defaultOpen = false, badge, children }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-surface-hover/50 transition-colors"
      >
        <Icon className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium text-text-primary flex-1 text-left">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary font-semibold">
            {badge}
          </span>
        )}
        {open ? (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

// ============================================================================
// Pattern: 3-Panel Layout
// ============================================================================

/*
<div className="flex h-screen bg-background">
  <AppSidebar />
  <div className="flex-1 flex overflow-hidden">
    {/* LEFT: Conversation List (w-80) *\/}
    <div className="w-80 border-r border-border flex flex-col">
      {/* Search + Filters *\/}
      {/* Conversation items *\/}
    </div>

    {/* CENTER: Chat Messages (flex-1) *\/}
    <div className="flex-1 flex flex-col">
      {/* Chat header *\/}
      {/* Messages area (flex-1 overflow-auto) *\/}
      {/* Input bar (bottom) *\/}
    </div>

    {/* RIGHT: Detail Sidebar (w-80, collapsible) *\/}
    {showSidebar && (
      <div className="w-80 border-l border-border overflow-y-auto">
        <SidebarSection title="Canal" icon={Hash} defaultOpen={true}>
          {/* Instance/channel selector *\/}
        </SidebarSection>
        <SidebarSection title="Pipeline" icon={Building2} defaultOpen={true}>
          {/* Pipeline + Stage selects *\/}
        </SidebarSection>
        <SidebarSection title="Responsavel" icon={User} defaultOpen={true}>
          {/* User select *\/}
        </SidebarSection>
        <SidebarSection title="Etiquetas" icon={Tag} defaultOpen={false} badge={tags.length}>
          {/* Tag badges + add button *\/}
        </SidebarSection>
        <SidebarSection title="Anotacoes" icon={StickyNote} defaultOpen={false} badge={notes.length}>
          {/* Notes with type icons (note/call/meeting/email) *\/}
        </SidebarSection>
        <SidebarSection title="Tarefas" icon={CheckSquare} defaultOpen={false} badge={tasks.length}>
          {/* Task checklist with checkboxes *\/}
        </SidebarSection>
        <SidebarSection title="Vendas" icon={DollarSign} defaultOpen={false} badge={sales.length}>
          {/* Sales summary cards *\/}
        </SidebarSection>
      </div>
    )}
  </div>
</div>
*/

export { SidebarSection };
