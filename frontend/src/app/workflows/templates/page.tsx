/**
 * FlowCube - Template Gallery Page
 *
 * Grid of workflow templates with category filtering and search.
 */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Sparkles, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import TemplateCard, { type WorkflowTemplate } from "@/components/templates/TemplateCard";
import TemplatePreview from "@/components/templates/TemplatePreview";
import { workflowApi } from "@/lib/api";

// Built-in templates (will eventually come from API)
const BUILT_IN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "tpl-lead-whatsapp",
    name: "WhatsApp Lead Capture",
    description: "Capture leads from WhatsApp messages, create in SalesCube, and send auto-reply",
    category: "sales",
    node_count: 4,
    tags: ["whatsapp", "salescube", "leads"],
    usage_count: 142,
    graph: {
      nodes: [
        { id: "1", type: "whatsapp_trigger", position: { x: 250, y: 80 }, data: { label: "WhatsApp Message", type: "whatsapp_trigger", config: { source: "evolution" } } },
        { id: "2", type: "openai", position: { x: 250, y: 240 }, data: { label: "Extract Lead Info", type: "openai", config: { model: "gpt-4o-mini", system_prompt: "Extract name, email, phone from message" } } },
        { id: "3", type: "salescube_create_lead", position: { x: 250, y: 400 }, data: { label: "Create Lead", type: "salescube_create_lead", config: { channel: 78, column: 48 } } },
        { id: "4", type: "whatsapp_send", position: { x: 250, y: 560 }, data: { label: "Send Welcome", type: "whatsapp_send", config: { message: "Obrigado pelo contato! Em breve retornaremos." } } },
      ],
      edges: [
        { id: "e1", source: "1", target: "2", type: "default" },
        { id: "e2", source: "2", target: "3", type: "default" },
        { id: "e3", source: "3", target: "4", type: "default" },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: "tpl-webhook-email",
    name: "Webhook to Email Notification",
    description: "Receive webhook data and send formatted email notification",
    category: "integration",
    node_count: 3,
    tags: ["webhook", "email", "notification"],
    usage_count: 89,
    graph: {
      nodes: [
        { id: "1", type: "webhook_trigger", position: { x: 250, y: 80 }, data: { label: "Webhook Trigger", type: "webhook_trigger", config: {} } },
        { id: "2", type: "json_transform", position: { x: 250, y: 240 }, data: { label: "Format Data", type: "json_transform", config: { expression: "{name: payload.name, event: payload.event}" } } },
        { id: "3", type: "send_email", position: { x: 250, y: 400 }, data: { label: "Send Email", type: "send_email", config: { subject: "New Event: {{event}}" } } },
      ],
      edges: [
        { id: "e1", source: "1", target: "2", type: "default" },
        { id: "e2", source: "2", target: "3", type: "default" },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: "tpl-ai-classifier",
    name: "AI Message Classifier & Router",
    description: "Classify incoming messages with AI and route to different branches based on intent",
    category: "ai",
    node_count: 5,
    tags: ["ai", "openai", "router", "classification"],
    usage_count: 67,
    graph: {
      nodes: [
        { id: "1", type: "webhook_trigger", position: { x: 250, y: 80 }, data: { label: "Incoming Message", type: "webhook_trigger", config: {} } },
        { id: "2", type: "openai", position: { x: 250, y: 240 }, data: { label: "Classify Intent", type: "openai", config: { model: "gpt-4o-mini", system_prompt: "Classify: sales, support, spam" } } },
        { id: "3", type: "router", position: { x: 250, y: 400 }, data: { label: "Route by Intent", type: "router", config: { routes: [{ label: "Sales" }, { label: "Support" }, { label: "Spam" }] } } },
        { id: "4", type: "text_response", position: { x: 100, y: 560 }, data: { label: "Sales Reply", type: "text_response", config: { text: "Our sales team will contact you!" } } },
        { id: "5", type: "text_response", position: { x: 400, y: 560 }, data: { label: "Support Reply", type: "text_response", config: { text: "A support agent will help you shortly." } } },
      ],
      edges: [
        { id: "e1", source: "1", target: "2", type: "default" },
        { id: "e2", source: "2", target: "3", type: "default" },
        { id: "e3", source: "3", target: "4", sourceHandle: "route-0", type: "default" },
        { id: "e4", source: "3", target: "5", sourceHandle: "route-1", type: "default" },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: "tpl-daily-report",
    name: "Daily Report Generator",
    description: "Every day at 9am, fetch data from API, aggregate, and send report via email",
    category: "scheduling",
    node_count: 4,
    tags: ["schedule", "report", "email", "api"],
    usage_count: 53,
    graph: {
      nodes: [
        { id: "1", type: "schedule", position: { x: 250, y: 80 }, data: { label: "Daily 9am", type: "schedule", config: {} } },
        { id: "2", type: "http_request", position: { x: 250, y: 240 }, data: { label: "Fetch Data", type: "http_request", config: { method: "GET", url: "https://api.example.com/daily-stats" } } },
        { id: "3", type: "openai", position: { x: 250, y: 400 }, data: { label: "Generate Summary", type: "openai", config: { model: "gpt-4o-mini", system_prompt: "Summarize this data into a brief daily report" } } },
        { id: "4", type: "send_email", position: { x: 250, y: 560 }, data: { label: "Send Report", type: "send_email", config: { subject: "Daily Report - {{date}}" } } },
      ],
      edges: [
        { id: "e1", source: "1", target: "2", type: "default" },
        { id: "e2", source: "2", target: "3", type: "default" },
        { id: "e3", source: "3", target: "4", type: "default" },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
  {
    id: "tpl-data-pipeline",
    name: "Data Transform Pipeline",
    description: "Fetch data, iterate over items, filter, transform, and send to destination API",
    category: "automation",
    node_count: 6,
    tags: ["data", "iterator", "filter", "api"],
    usage_count: 41,
    graph: {
      nodes: [
        { id: "1", type: "manual_trigger", position: { x: 250, y: 80 }, data: { label: "Manual Start", type: "manual_trigger", config: {} } },
        { id: "2", type: "http_request", position: { x: 250, y: 240 }, data: { label: "Fetch Records", type: "http_request", config: { method: "GET", url: "https://api.example.com/records" } } },
        { id: "3", type: "filter", position: { x: 250, y: 400 }, data: { label: "Filter Active", type: "filter", config: { field: "status", operator: "equals", value: "active" } } },
        { id: "4", type: "iterator", position: { x: 250, y: 560 }, data: { label: "Each Record", type: "iterator", config: { source_field: "items" } } },
        { id: "5", type: "json_transform", position: { x: 250, y: 720 }, data: { label: "Transform", type: "json_transform", config: { expression: "{id: id, name: full_name}" } } },
        { id: "6", type: "http_request", position: { x: 250, y: 880 }, data: { label: "Send to API", type: "http_request", config: { method: "POST", url: "https://destination.api/import" } } },
      ],
      edges: [
        { id: "e1", source: "1", target: "2", type: "default" },
        { id: "e2", source: "2", target: "3", type: "default" },
        { id: "e3", source: "3", target: "4", type: "default" },
        { id: "e4", source: "4", target: "5", type: "default" },
        { id: "e5", source: "5", target: "6", type: "default" },
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
  },
];

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "sales", label: "Sales" },
  { value: "marketing", label: "Marketing" },
  { value: "support", label: "Support" },
  { value: "integration", label: "Integration" },
  { value: "ai", label: "AI" },
  { value: "automation", label: "Automation" },
  { value: "scheduling", label: "Scheduling" },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    return BUILT_IN_TEMPLATES.filter((t) => {
      const matchesCategory = category === "all" || t.category === category;
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [search, category]);

  const handleUseTemplate = async (template: WorkflowTemplate) => {
    try {
      const workflow = await workflowApi.createWorkflow({
        name: template.name,
        description: template.description,
        graph: template.graph,
        tags: ["from-template", ...template.tags],
      });
      router.push(`/workflows/${workflow.id}`);
    } catch {
      // Error handled by API interceptor
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LayoutGrid className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-100">Template Gallery</h1>
        </div>
        <p className="text-sm text-gray-500">
          Start with a pre-built workflow and customize it for your needs
        </p>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                "px-3 py-2 text-xs rounded-lg border transition-colors",
                category === cat.value
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No templates found</h3>
            <p className="text-sm text-gray-600">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={setPreviewTemplate}
                onUse={handleUseTemplate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={handleUseTemplate}
        />
      )}
    </div>
  );
}
