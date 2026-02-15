# Generated UI Components Reference

This directory contains AI-generated UI component patterns from v0 and Google AI,
saved as reference for other agents building pages in the FRZ Platform.

## Files

### Customer360.pattern.tsx
- **Source:** v0 Customer 360 component
- **Used in:** `/minicube/clientes/page.tsx`
- **Pattern:** Split-panel layout (list left, detail right) with 9 tabbed sections
- **Tabs:** Resumo, Dados Pessoais, Academico, Financeiro, Atendimento, Tarefas, Historico, Anotacoes, Conteudo
- **Key patterns:** KpiCard, InfoRow, FieldDisplay, ProgressCard, ContentModule, timeline view

### ChatSidebar.pattern.tsx
- **Source:** v0 Chat component
- **Used in:** `/chatcube/conversations/page.tsx`
- **Pattern:** 3-panel layout with RIGHT PANEL containing collapsible SidebarSection components
- **Sections:** Canal, Pipeline, Responsavel, Etiquetas, Anotacoes, Tarefas, Vendas
- **Key patterns:** SidebarSection with collapse/expand, inline editing, tag badges

### TelephonyDashboard.pattern.tsx
- **Source:** Google AI TelephonyDashboard
- **Used in:** `/chatcube/telephony/page.tsx`
- **Pattern:** Dashboard with stats cards, extension status grid, recent calls table, quick links
- **Key patterns:** StatsCard, QuickLink, status color maps, direction icons

### FinancialPipeline.pattern.tsx
- **Source:** v0 Pipeline Financial component
- **Used in:** `/salescube/financial/page.tsx`
- **Pattern:** KPI cards + stage pipeline overview + paginated sales table with filters
- **Key patterns:** STAGE_CONFIG map, formatBRL, sale stage badges, sorting

## Usage by Other Agents

When building new pages, reference these patterns for consistent UI/UX:

```tsx
// Import pattern examples:
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

// Standard page layout:
<div className="flex h-screen bg-background">
  <AppSidebar />
  <div className="flex-1 flex flex-col overflow-hidden">
    <header className="h-14 border-b border-border ...">
    <main className="flex-1 overflow-auto p-6">
  </div>
</div>

// CSS variable theme tokens (from globals.css):
// bg-background, bg-surface, bg-surface-hover
// text-text-primary, text-text-secondary, text-text-muted
// border-border
// bg-primary, bg-primary-hover, text-primary
// text-accent-blue, text-accent-green, text-accent-purple
```

## Date Created
2026-02-15
