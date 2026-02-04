/**
 * FlowCube - Email Step Editor
 * Editor for individual sequence steps with delay and conditions
 */
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Save,
  Clock,
  Mail,
  Filter,
  AlertCircle,
  Loader2,
  ChevronDown,
  MailOpen,
  MousePointerClick,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore } from "@/stores/emailStore";
import { DelayUnit, StepCondition } from "@/types/email.types";
import type { EmailStep, EmailStepUpdateRequest, EmailTemplate } from "@/types/email.types";

interface EmailStepEditorProps {
  step: EmailStep;
  sequenceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (step: EmailStep) => void;
}

const DELAY_UNITS = [
  { value: DelayUnit.MINUTES, label: "Minutes", short: "min" },
  { value: DelayUnit.HOURS, label: "Hours", short: "hr" },
  { value: DelayUnit.DAYS, label: "Days", short: "d" },
  { value: DelayUnit.WEEKS, label: "Weeks", short: "wk" },
];

const CONDITIONS = [
  { value: StepCondition.NONE, label: "Always send", icon: Mail, description: "Send to all recipients" },
  { value: StepCondition.OPENED, label: "If opened", icon: MailOpen, description: "Only if they opened previous email" },
  { value: StepCondition.NOT_OPENED, label: "If not opened", icon: MailOpen, description: "Only if they did NOT open previous email" },
  { value: StepCondition.CLICKED, label: "If clicked", icon: MousePointerClick, description: "Only if they clicked a link" },
  { value: StepCondition.NOT_CLICKED, label: "If not clicked", icon: Link, description: "Only if they did NOT click" },
];

export function EmailStepEditor({
  step,
  sequenceId,
  isOpen,
  onClose,
  onSave,
}: EmailStepEditorProps) {
  const { updateStep, templates, fetchTemplates } = useEmailStore();

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [delayValue, setDelayValue] = useState(1);
  const [delayUnit, setDelayUnit] = useState<DelayUnit>(DelayUnit.DAYS);
  const [sendAtTime, setSendAtTime] = useState("");
  const [condition, setCondition] = useState<StepCondition>(StepCondition.NONE);
  const [isActive, setIsActive] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (step) {
      setName(step.name);
      setTemplateId(step.template_id);
      setDelayValue(step.delay_value);
      setDelayUnit(step.delay_unit);
      setSendAtTime(step.delay_config?.send_at_time || "");
      setCondition(step.condition);
      setIsActive(step.is_active);
    }
  }, [step]);

  const handleSave = async () => {
    if (!name.trim() || !templateId) {
      setError("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const data: EmailStepUpdateRequest = {
        name,
        template_id: templateId,
        delay_value: delayValue,
        delay_unit: delayUnit,
        delay_config: sendAtTime ? { send_at_time: sendAtTime } : undefined,
        condition,
        is_active: isActive,
      };

      const updatedStep = await updateStep(sequenceId, step.id, data);
      onSave?.(updatedStep);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save step");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === templateId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#1a1a2e] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Edit Step</h2>
              <p className="text-sm text-gray-400">Configure email step settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Step Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Step Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome Email"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Template *</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Select a template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="mt-2 p-3 bg-white/5 rounded-lg">
                <div className="text-sm text-gray-400">Subject: {selectedTemplate.subject}</div>
              </div>
            )}
          </div>

          {/* Delay */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Delay after previous step
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={delayValue}
                onChange={(e) => setDelayValue(parseInt(e.target.value) || 0)}
                min={0}
                className="w-24 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <select
                value={delayUnit}
                onChange={(e) => setDelayUnit(e.target.value as DelayUnit)}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {DELAY_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Send at specific time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Send at specific time (optional)
            </label>
            <input
              type="time"
              value={sendAtTime}
              onChange={(e) => setSendAtTime(e.target.value)}
              className="w-48 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <p className="mt-1 text-xs text-gray-500">
              If set, email will be sent at this time after the delay
            </p>
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              <Filter className="w-4 h-4 inline mr-2" />
              Send Condition
            </label>
            <div className="space-y-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCondition(c.value)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                    condition === c.value
                      ? "bg-blue-500/10 border-blue-500/50"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  <c.icon className={cn("w-5 h-5", condition === c.value ? "text-blue-400" : "text-gray-400")} />
                  <div>
                    <div className={cn("font-medium", condition === c.value ? "text-blue-400" : "text-white")}>
                      {c.label}
                    </div>
                    <div className="text-sm text-gray-500">{c.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <div className="font-medium text-white">Step Active</div>
              <div className="text-sm text-gray-400">Inactive steps will be skipped</div>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                isActive ? "bg-green-500" : "bg-gray-600"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                  isActive ? "translate-x-6" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Stats */}
          {step.stats && (
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Step Statistics</h4>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-white">{step.stats.total_sent}</div>
                  <div className="text-xs text-gray-500">Sent</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-green-400">{(step.stats.open_rate * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Open Rate</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-blue-400">{(step.stats.click_rate * 100).toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Click Rate</div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-red-400">{step.stats.total_bounced}</div>
                  <div className="text-xs text-gray-500">Bounced</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default EmailStepEditor;
