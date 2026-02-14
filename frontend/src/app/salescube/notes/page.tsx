"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  ChevronDown,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";
import { allNotesApi, type LeadNote } from "@/lib/salesApi";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ============================================================================
// Constants
// ============================================================================

const NOTE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  note: { label: "Nota", icon: FileText, color: "bg-blue-500/20 text-blue-400" },
  call: { label: "Ligacao", icon: Phone, color: "bg-green-500/20 text-green-400" },
  email: { label: "E-mail", icon: Mail, color: "bg-purple-500/20 text-purple-400" },
  meeting: { label: "Reuniao", icon: Users, color: "bg-orange-500/20 text-orange-400" },
  task: { label: "Tarefa", icon: CheckSquare, color: "bg-indigo-500/20 text-indigo-400" },
};

const PAGE_SIZE = 20;

// ============================================================================
// Extended note type with lead info (returned by all-notes endpoint)
// ============================================================================

interface NoteWithLead extends LeadNote {
  lead_name?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --------------------------------------------------------------------------
  // Fetch notes
  // --------------------------------------------------------------------------

  const fetchNotes = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params: Record<string, string> = {
          page: String(pageNum),
          page_size: String(PAGE_SIZE),
        };
        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (filterType) params.note_type = filterType;

        const res = await allNotesApi.list(params);
        const data = res.data;
        const results: NoteWithLead[] = data.results || data || [];
        const count = data.count ?? results.length;

        if (append) {
          setNotes((prev) => [...prev, ...results]);
        } else {
          setNotes(results);
        }
        setTotalCount(count);
        setHasMore(results.length === PAGE_SIZE);
      } catch (err) {
        console.error("Erro ao carregar notas:", err);
        if (!append) setNotes([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, filterType]
  );

  // --------------------------------------------------------------------------
  // Initial load & filter changes
  // --------------------------------------------------------------------------

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchNotes(1, false);
  }, [fetchNotes]);

  // --------------------------------------------------------------------------
  // Infinite scroll via IntersectionObserver
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchNotes(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchNotes]);

  // --------------------------------------------------------------------------
  // Debounced search
  // --------------------------------------------------------------------------

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // --------------------------------------------------------------------------
  // Navigate to lead
  // --------------------------------------------------------------------------

  const navigateToLead = (leadId: string) => {
    router.push(`/salescube/leads?lead=${leadId}`);
  };

  // --------------------------------------------------------------------------
  // Format date
  // --------------------------------------------------------------------------

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelative = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Agora";
    if (diffMin < 60) return `${diffMin}min atras`;
    if (diffHrs < 24) return `${diffHrs}h atras`;
    if (diffDays < 7) return `${diffDays}d atras`;
    return d.toLocaleDateString("pt-BR");
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notas</h1>
          <p className="text-sm text-gray-400">
            {totalCount} {totalCount === 1 ? "nota" : "notas"} em todos os leads
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar no conteudo das notas..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-8 py-2 text-sm text-gray-100 placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {Object.entries(NOTE_TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = filterType === key;
            return (
              <button
                key={key}
                onClick={() => setFilterType(active ? "" : key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                  active
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
              </button>
            );
          })}
          {filterType && (
            <button
              onClick={() => setFilterType("")}
              className="text-xs text-gray-500 hover:text-gray-300 px-2"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Nenhuma nota encontrada</p>
          {(searchQuery || filterType) && (
            <p className="text-gray-500 text-xs mt-1">
              Tente ajustar os filtros de busca
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const typeCfg = NOTE_TYPE_CONFIG[note.note_type] || NOTE_TYPE_CONFIG.note;
            const TypeIcon = typeCfg.icon;

            return (
              <div
                key={note.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Type icon */}
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      typeCfg.color
                    )}
                  >
                    <TypeIcon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: lead name + type badge */}
                    <div className="flex items-center gap-2 mb-1.5">
                      {note.lead_name ? (
                        <button
                          onClick={() => navigateToLead(note.lead)}
                          className="text-sm font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                        >
                          {note.lead_name}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </button>
                      ) : (
                        <span className="text-sm font-medium text-gray-300">
                          Lead removido
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded-full",
                          typeCfg.color
                        )}
                      >
                        {typeCfg.label}
                      </span>
                    </div>

                    {/* Note content */}
                    <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                      {note.content}
                    </p>

                    {/* Bottom meta */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {note.user_name && (
                        <span>Por {note.user_name}</span>
                      )}
                      <span title={formatDate(note.created_at)}>
                        {formatRelative(note.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">
                Carregando mais...
              </span>
            </div>
          )}

          {/* End of list */}
          {!hasMore && notes.length > 0 && (
            <div className="text-center py-4 text-xs text-gray-600">
              Todas as {totalCount} notas carregadas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
