/**
 * FlowCube - Email Template List
 * List of templates with filters and search
 */
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Search,
  Plus,
  Copy,
  Trash2,
  Edit,
  Eye,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  Tag,
  Clock,
  BarChart3,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore, useFilteredTemplates } from "@/stores/emailStore";
import { TemplateCategory } from "@/types/email.types";
import type { EmailTemplate } from "@/types/email.types";

interface EmailTemplateListProps {
  onSelectTemplate?: (template: EmailTemplate) => void;
  onCreateTemplate?: () => void;
}

const CATEGORIES = [
  { value: null, label: "All Categories" },
  { value: TemplateCategory.WELCOME, label: "Welcome" },
  { value: TemplateCategory.ONBOARDING, label: "Onboarding" },
  { value: TemplateCategory.PROMOTIONAL, label: "Promotional" },
  { value: TemplateCategory.TRANSACTIONAL, label: "Transactional" },
  { value: TemplateCategory.NEWSLETTER, label: "Newsletter" },
  { value: TemplateCategory.ABANDONED_CART, label: "Abandoned Cart" },
  { value: TemplateCategory.RE_ENGAGEMENT, label: "Re-engagement" },
  { value: TemplateCategory.FEEDBACK, label: "Feedback" },
  { value: TemplateCategory.CUSTOM, label: "Custom" },
];

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  [TemplateCategory.WELCOME]: "bg-green-500/20 text-green-400",
  [TemplateCategory.ONBOARDING]: "bg-blue-500/20 text-blue-400",
  [TemplateCategory.PROMOTIONAL]: "bg-purple-500/20 text-purple-400",
  [TemplateCategory.TRANSACTIONAL]: "bg-gray-500/20 text-text-secondary",
  [TemplateCategory.NEWSLETTER]: "bg-orange-500/20 text-orange-400",
  [TemplateCategory.ABANDONED_CART]: "bg-red-500/20 text-red-400",
  [TemplateCategory.RE_ENGAGEMENT]: "bg-yellow-500/20 text-yellow-400",
  [TemplateCategory.FEEDBACK]: "bg-cyan-500/20 text-cyan-400",
  [TemplateCategory.CUSTOM]: "bg-pink-500/20 text-pink-400",
};

export function EmailTemplateList({
  onSelectTemplate,
  onCreateTemplate,
}: EmailTemplateListProps) {
  const {
    fetchTemplates,
    deleteTemplate,
    duplicateTemplate,
    setTemplateFilter,
    templateFilter,
    templatesLoading,
  } = useEmailStore();
  
  const templates = useFilteredTemplates();

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    setTemplateFilter({ search: searchQuery });
  }, [searchQuery]);

  const handleDuplicate = async (template: EmailTemplate) => {
    await duplicateTemplate(template.id, `${template.name} (Copy)`);
    setOpenMenu(null);
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      await deleteTemplate(template.id);
    }
    setOpenMenu(null);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Email Templates</h2>
              <p className="text-sm text-text-secondary">{Array.isArray(templates) ? templates.length : 0} templates</p>
            </div>
          </div>
          <button
            onClick={onCreateTemplate}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-text-primary rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={templateFilter.category || ""}
            onChange={(e) => setTemplateFilter({ category: e.target.value as TemplateCategory || null })}
            className="px-4 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value || "all"} value={cat.value || ""}>{cat.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-surface/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-2 rounded-md transition-colors", viewMode === "grid" ? "bg-blue-500/20 text-blue-400" : "text-text-secondary hover:text-text-primary")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-2 rounded-md transition-colors", viewMode === "list" ? "bg-blue-500/20 text-blue-400" : "text-text-secondary hover:text-text-primary")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {templatesLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (!templates || !Array.isArray(templates) || templates.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Mail className="w-12 h-12 text-text-muted mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No templates found</h3>
            <p className="text-text-secondary mb-4">Create your first email template to get started</p>
            <button
              onClick={onCreateTemplate}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-text-primary rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-surface/5 border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-all cursor-pointer"
                onClick={() => onSelectTemplate?.(template)}
              >
                {/* Preview thumbnail */}
                <div className="h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-text-muted" />
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", CATEGORY_COLORS[template.category])}>
                      {template.category.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-medium text-text-primary mb-1 truncate">{template.name}</h3>
                  <p className="text-sm text-text-secondary truncate mb-3">{template.subject}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatDate(template.updated_at)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <BarChart3 className="w-3 h-3" />
                      {template.uses_count} uses
                    </div>
                  </div>

                  {template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {template.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-surface/5 text-text-secondary rounded text-xs">{tag}</span>
                      ))}
                      {template.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-text-muted text-xs">+{template.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectTemplate?.(template); }}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-text-primary transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-text-primary transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(template); }}
                    className="p-2 bg-black/50 hover:bg-red-500/70 rounded-lg text-text-primary transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 p-4 bg-surface/5 border border-white/10 rounded-lg hover:border-blue-500/50 transition-all cursor-pointer"
                onClick={() => onSelectTemplate?.(template)}
              >
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-text-primary truncate">{template.name}</h3>
                  <p className="text-sm text-text-secondary truncate">{template.subject}</p>
                </div>

                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", CATEGORY_COLORS[template.category])}>
                  {template.category.replace("_", " ")}
                </span>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Clock className="w-3 h-3" />
                  {formatDate(template.updated_at)}
                </div>

                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <BarChart3 className="w-3 h-3" />
                  {template.uses_count}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }}
                    className="p-2 hover:bg-surface/10 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(template); }}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-text-secondary hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmailTemplateList;
