/**
 * REFERENCE PATTERN: v0 Customer 360 Component
 * Used in: /minicube/clientes/page.tsx
 *
 * Split-panel layout with list/detail view and 9 tabbed sections.
 */

// ============================================================================
// Pattern: Split Panel Layout (List + Detail)
// ============================================================================

/*
<div className="flex h-screen bg-background">
  <AppSidebar />
  <div className="flex-1 flex overflow-hidden">
    {/* LEFT: Entity List *\/}
    <div className={cn(
      "flex flex-col border-r border-border bg-background",
      selectedItem ? "w-80 hidden lg:flex" : "flex-1"
    )}>
      {/* Header with count badge + New button *\/}
      {/* Search + filter tabs *\/}
      {/* Stats bar (colored dots) *\/}
      {/* Scrollable list with avatar initials *\/}
    </div>

    {/* RIGHT: Detail View (or empty state) *\/}
    {selectedItem ? (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Profile header with avatar, name, status, meta *\/}
        {/* Horizontal tab bar (scrollable) *\/}
        {/* Tab content (flex-1 overflow-auto p-6) *\/}
      </div>
    ) : (
      <EmptyState />
    )}
  </div>
</div>
*/

// ============================================================================
// Pattern: 9 Tab Configuration
// ============================================================================

const TABS = [
  { id: "resumo",      label: "Resumo",          icon: "User" },
  { id: "dados",        label: "Dados Pessoais",  icon: "FileText" },
  { id: "academico",    label: "Academico",       icon: "GraduationCap" },
  { id: "financeiro",   label: "Financeiro",      icon: "DollarSign" },
  { id: "atendimento",  label: "Atendimento",     icon: "MessageSquare" },
  { id: "tarefas",      label: "Tarefas",         icon: "ListChecks" },
  { id: "historico",    label: "Historico",        icon: "Activity" },
  { id: "notas",        label: "Anotacoes",       icon: "StickyNote" },
  { id: "conteudo",     label: "Conteudo",         icon: "BookOpen" },
];

// ============================================================================
// Pattern: Tab Bar (Horizontal, Scrollable)
// ============================================================================

/*
<div className="px-6 overflow-x-auto">
  <div className="flex gap-1 min-w-max">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
          activeTab === tab.id
            ? "border-primary text-primary"
            : "border-transparent text-text-muted hover:text-text-secondary"
        )}
      >
        <TabIcon className="w-4 h-4" />
        {tab.label}
      </button>
    ))}
  </div>
</div>
*/

// ============================================================================
// Sub-Component: KpiCard
// ============================================================================

/*
function KpiCard({ icon, label, value, color, bg }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", bg, color)}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-semibold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
    </div>
  );
}
*/

// ============================================================================
// Sub-Component: FieldDisplay (for detail tabs)
// ============================================================================

/*
function FieldDisplay({ label, value, icon }) {
  return (
    <div className="p-3 bg-background rounded-lg">
      <div className="flex items-center gap-1.5 mb-1 text-text-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm text-text-primary font-medium">{value}</p>
    </div>
  );
}
*/

// ============================================================================
// Sub-Component: ProgressCard (for academic tab)
// ============================================================================

/*
function ProgressCard({ label, value, color }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <p className="text-xs text-text-muted mb-2">{label}</p>
      <p className="text-2xl font-bold text-text-primary mb-2">{value}%</p>
      <div className="w-full h-2 bg-background rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
*/

// ============================================================================
// Sub-Component: ContentModule (collapsible lesson list)
// ============================================================================

/*
function ContentModule({ title, progress, lessons }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-background rounded-lg border border-border/50">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3">
        {open ? <ChevronDown /> : <ChevronRight />}
        <span>{title}</span>
        <ProgressBar value={progress} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1">
          {lessons.map((lesson) => (
            <LessonRow done={lesson.done} type={lesson.type} name={lesson.name} />
          ))}
        </div>
      )}
    </div>
  );
}
*/

// ============================================================================
// Sub-Component: Timeline (for historico tab)
// ============================================================================

/*
<div className="relative">
  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border" />
  <div className="space-y-4">
    {timeline.map((item) => (
      <div className="relative pl-10">
        <div className="absolute left-[7px] top-1 w-[17px] h-[17px] rounded-full bg-surface border-2 border-border flex items-center justify-center">
          {typeIcon}
        </div>
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-text-secondary">{item.detail}</p>
        <p className="text-xs text-text-muted">{formatDate(item.date)}</p>
      </div>
    ))}
  </div>
</div>
*/

// ============================================================================
// Cross-Module Data Pattern
// ============================================================================

/*
The Customer 360 aggregates data from MULTIPLE API modules:
- miniApi.getStudent() - Core student data (name, class, location)
- contactApi.list({ search: phone }) - SalesCube contact lookup
- leadApi.list({ search: phone }) - Associated leads
- saleApi.list({ search: name }) - Purchase history
- taskApi.list({ search: name }) - Related tasks
- ticketApi.list({ search: name }) - Support tickets

All cross-module calls use try/catch with empty fallback (optional enrichment).
*/

export { TABS };
