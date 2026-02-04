/**
 * FlowCube - Email Template Editor
 * WYSIWYG editor with HTML view and live preview
 */
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Save,
  Eye,
  Code,
  Palette,
  Type,
  Image,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo,
  Redo,
  Copy,
  Trash2,
  Plus,
  Variable,
  Smartphone,
  Monitor,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore } from "@/stores/emailStore";
import { TemplateCategory } from "@/types/email.types";
import type {
  EmailTemplate,
  EmailTemplateCreateRequest,
  TemplateVariable,
} from "@/types/email.types";

interface EmailTemplateEditorProps {
  template?: EmailTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (template: EmailTemplate) => void;
}

const CATEGORIES = [
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

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .content { padding: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: #fff; text-decoration: none; border-radius: 4px; }
    .footer { text-align: center; padding: 20px 0; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hello {{first_name}}!</h1>
    </div>
    <div class="content">
      <p>This is your email content. Edit it to create your message.</p>
      <p style="text-align: center;">
        <a href="{{cta_url}}" class="button">Click Here</a>
      </p>
    </div>
    <div class="footer">
      <p>© {{company_name}}. All rights reserved.</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;

export function EmailTemplateEditor({
  template,
  isOpen,
  onClose,
  onSave,
}: EmailTemplateEditorProps) {
  const { createTemplate, updateTemplate, previewTemplate, setEditorTab, editorTab } =
    useEmailStore();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [htmlContent, setHtmlContent] = useState(DEFAULT_HTML);
  const [textContent, setTextContent] = useState("");
  const [category, setCategory] = useState<TemplateCategory>(TemplateCategory.CUSTOM);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [variables, setVariables] = useState<TemplateVariable[]>([
    { name: "first_name", default_value: "Friend", required: false },
    { name: "company_name", default_value: "Your Company", required: false },
    { name: "cta_url", default_value: "#", required: false },
    { name: "unsubscribe_url", default_value: "#", required: true },
  ]);

  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewHtml, setPreviewHtml] = useState("");
  const [showVariables, setShowVariables] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setPreviewText(template.preview_text || "");
      setHtmlContent(template.html_content);
      setTextContent(template.text_content || "");
      setCategory(template.category);
      setTags(template.tags);
      setVariables(template.variables.length > 0 ? template.variables : variables);
    } else {
      setName("");
      setSubject("");
      setPreviewText("");
      setHtmlContent(DEFAULT_HTML);
      setTextContent("");
      setCategory(TemplateCategory.CUSTOM);
      setTags([]);
    }
  }, [template]);

  useEffect(() => {
    let html = htmlContent;
    variables.forEach((v) => {
      const regex = new RegExp(`{{\\s*${v.name}\\s*}}`, "g");
      html = html.replace(regex, v.default_value || `[${v.name}]`);
    });
    setPreviewHtml(html);
  }, [htmlContent, variables]);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const addVariable = () => {
    setVariables([...variables, { name: "", default_value: "", required: false }]);
  };

  const updateVariable = (index: number, field: keyof TemplateVariable, value: string | boolean) => {
    const newVariables = [...variables];
    newVariables[index] = { ...newVariables[index], [field]: value };
    setVariables(newVariables);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !htmlContent.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const data: EmailTemplateCreateRequest = {
        name,
        subject,
        preview_text: previewText || undefined,
        html_content: htmlContent,
        text_content: textContent || undefined,
        category,
        tags,
        variables: variables.filter((v) => v.name.trim()),
      };

      let savedTemplate: EmailTemplate;
      if (template) {
        savedTemplate = await updateTemplate(template.id, data);
      } else {
        savedTemplate = await createTemplate(data);
      }

      onSave?.(savedTemplate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex-1 flex flex-col bg-[#1a1a2e] overflow-hidden m-4 rounded-xl border border-white/10"
      >
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">
              {template ? "Edit Template" : "New Template"}
            </h2>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setEditorTab("design")}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2", editorTab === "design" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white")}
            >
              <Palette className="w-4 h-4" />Design
            </button>
            <button
              onClick={() => setEditorTab("html")}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2", editorTab === "html" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white")}
            >
              <Code className="w-4 h-4" />HTML
            </button>
            <button
              onClick={() => setEditorTab("preview")}
              className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2", editorTab === "preview" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white")}
            >
              <Eye className="w-4 h-4" />Preview
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <button
            onClick={() => setShowVariables(!showVariables)}
            className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", showVariables ? "bg-purple-500/20 text-purple-400" : "bg-white/5 text-gray-400 hover:text-white")}
          >
            <Variable className="w-4 h-4" />Variables
            <ChevronDown className={cn("w-4 h-4 transition-transform", showVariables && "rotate-180")} />
          </button>

          {editorTab === "preview" && (
            <>
              <div className="h-6 w-px bg-white/10" />
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <button onClick={() => setPreviewDevice("desktop")} className={cn("p-1.5 rounded-md transition-colors", previewDevice === "desktop" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white")}>
                  <Monitor className="w-4 h-4" />
                </button>
                <button onClick={() => setPreviewDevice("mobile")} className={cn("p-1.5 rounded-md transition-colors", previewDevice === "mobile" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white")}>
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          <div className="flex-1" />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <AnimatePresence>
          {showVariables && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-white/5 overflow-hidden">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-300">Template Variables</h4>
                  <button onClick={addVariable} className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs flex items-center gap-1 transition-colors">
                    <Plus className="w-3 h-3" />Add
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3 max-h-32 overflow-y-auto">
                  {variables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                      <input type="text" value={variable.name} onChange={(e) => updateVariable(index, "name", e.target.value)} placeholder="name" className="flex-1 px-2 py-1 bg-transparent border-none text-white text-sm placeholder-gray-500 focus:outline-none min-w-0" />
                      <input type="text" value={variable.default_value || ""} onChange={(e) => updateVariable(index, "default_value", e.target.value)} placeholder="default" className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs placeholder-gray-500 focus:outline-none min-w-0" />
                      <button onClick={() => removeVariable(index)} className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-80 border-r border-white/10 flex flex-col">
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line *</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Your email subject" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Preview Text</label>
                <textarea value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Text shown in inbox preview" rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plain Text Version</label>
                <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Plain text fallback (optional)" rows={4} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-blue-300"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} placeholder="Add tag" className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                  <button onClick={addTag} className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm transition-colors">Add</button>
                </div>
              </div>
            </div>
            {error && (
              <div className="p-4 border-t border-white/10">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <span className="text-sm text-red-400">{error}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {editorTab === "html" && (
              <textarea name="htmlContent" value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} className="flex-1 w-full p-4 bg-[#0d0d1a] text-white font-mono text-sm resize-none focus:outline-none" spellCheck={false} />
            )}
            {editorTab === "design" && (
              <div className="flex-1 p-4 overflow-auto">
                <div className="bg-white/5 rounded-lg p-4 min-h-full">
                  <p className="text-gray-400 text-center py-8">Visual editor coming soon. Use HTML tab for now.</p>
                  <textarea name="htmlContent" value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} className="w-full h-96 p-4 bg-[#0d0d1a] text-white font-mono text-sm rounded-lg resize-none focus:outline-none" spellCheck={false} />
                </div>
              </div>
            )}
            {editorTab === "preview" && (
              <div className="flex-1 flex items-center justify-center bg-gray-100 p-8 overflow-auto">
                <div className={cn("bg-white shadow-xl rounded-lg overflow-hidden transition-all", previewDevice === "mobile" ? "w-[375px]" : "w-full max-w-[700px]")}>
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Subject:</span>
                      <span>{subject || "No subject"}</span>
                    </div>
                    {previewText && <div className="text-xs text-gray-400 mt-1 truncate">{previewText}</div>}
                  </div>
                  <iframe ref={iframeRef} srcDoc={previewHtml} className="w-full min-h-[500px] border-none" title="Email Preview" />
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default EmailTemplateEditor;
