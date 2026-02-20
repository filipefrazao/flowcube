/**
 * FlowCube - Email Sequence Builder
 * Visual builder for email sequences with drag-drop steps
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Mail,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Copy,
  Settings,
  Clock,
  Users,
  BarChart3,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Check,
  X,
  AlertCircle,
  Zap,
  Tag,
  Webhook,
  Calendar,
  ArrowRight,
  MousePointerClick,
  MailOpen,
  Link,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore, useSelectedSequence, useSequenceSteps } from "@/stores/emailStore";
import { SequenceStatus, TriggerType, DelayUnit, StepCondition } from "@/types/email.types";
import type { EmailSequence, EmailStep, EmailSequenceCreateRequest } from "@/types/email.types";

interface EmailSequenceBuilderProps {
  sequence?: EmailSequence | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (sequence: EmailSequence) => void;
}

const TRIGGER_TYPES = [
  { value: TriggerType.NEW_SUBSCRIBER, label: "New Subscriber", icon: UserPlus, description: "When someone subscribes" },
  { value: TriggerType.TAG_ADDED, label: "Tag Added", icon: Tag, description: "When a tag is added" },
  { value: TriggerType.TAG_REMOVED, label: "Tag Removed", icon: Tag, description: "When a tag is removed" },
  { value: TriggerType.WEBHOOK, label: "Webhook", icon: Webhook, description: "External trigger via webhook" },
  { value: TriggerType.FORM_SUBMIT, label: "Form Submit", icon: MousePointerClick, description: "When a form is submitted" },
  { value: TriggerType.DATE_FIELD, label: "Date Field", icon: Calendar, description: "Based on a date field" },
  { value: TriggerType.MANUAL, label: "Manual", icon: Play, description: "Manual enrollment" },
];

const STATUS_COLORS: Record<SequenceStatus, string> = {
  [SequenceStatus.DRAFT]: "bg-gray-500/20 text-text-secondary",
  [SequenceStatus.ACTIVE]: "bg-green-500/20 text-green-400",
  [SequenceStatus.PAUSED]: "bg-yellow-500/20 text-yellow-400",
  [SequenceStatus.COMPLETED]: "bg-blue-500/20 text-blue-400",
  [SequenceStatus.ARCHIVED]: "bg-gray-500/20 text-text-secondary",
};

const DELAY_UNITS = [
  { value: DelayUnit.MINUTES, label: "Minutes" },
  { value: DelayUnit.HOURS, label: "Hours" },
  { value: DelayUnit.DAYS, label: "Days" },
  { value: DelayUnit.WEEKS, label: "Weeks" },
];

const CONDITIONS = [
  { value: StepCondition.NONE, label: "Always send" },
  { value: StepCondition.OPENED, label: "If opened previous" },
  { value: StepCondition.NOT_OPENED, label: "If not opened" },
  { value: StepCondition.CLICKED, label: "If clicked" },
  { value: StepCondition.NOT_CLICKED, label: "If not clicked" },
];

export function EmailSequenceBuilder({
  sequence: initialSequence,
  isOpen,
  onClose,
  onSave,
}: EmailSequenceBuilderProps) {
  const {
    createSequence,
    updateSequence,
    activateSequence,
    deactivateSequence,
    fetchSteps,
    createStep,
    updateStep,
    deleteStep,
    reorderSteps,
    templates,
    providers,
    fetchTemplates,
    fetchProviders,
  } = useEmailStore();

  const steps = useSequenceSteps();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [providerId, setProviderId] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>(TriggerType.NEW_SUBSCRIBER);
  const [triggerTagName, setTriggerTagName] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [exitOnUnsubscribe, setExitOnUnsubscribe] = useState(true);
  const [exitOnReply, setExitOnReply] = useState(false);
  const [trackOpens, setTrackOpens] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<"steps" | "settings" | "stats">("steps");
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [sequenceId, setSequenceId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<SequenceStatus>(SequenceStatus.DRAFT);

  // New step form
  const [newStepName, setNewStepName] = useState("");
  const [newStepTemplateId, setNewStepTemplateId] = useState("");
  const [newStepDelayValue, setNewStepDelayValue] = useState(1);
  const [newStepDelayUnit, setNewStepDelayUnit] = useState<DelayUnit>(DelayUnit.DAYS);
  const [newStepCondition, setNewStepCondition] = useState<StepCondition>(StepCondition.NONE);

  // Initialize
  useEffect(() => {
    fetchTemplates();
    fetchProviders();
  }, []);

  useEffect(() => {
    if (initialSequence) {
      setName(initialSequence.name);
      setDescription(initialSequence.description || "");
      setProviderId(initialSequence.provider_id);
      setTriggerType(initialSequence.trigger_type);
      setTriggerTagName(initialSequence.trigger_config.tag_name || "");
      setTimezone(initialSequence.settings.timezone);
      setSkipWeekends(initialSequence.settings.skip_weekends);
      setExitOnUnsubscribe(initialSequence.settings.exit_on_unsubscribe);
      setExitOnReply(initialSequence.settings.exit_on_reply);
      setTrackOpens(initialSequence.settings.track_opens);
      setTrackClicks(initialSequence.settings.track_clicks);
      setSequenceId(initialSequence.id);
      setCurrentStatus(initialSequence.status);
      fetchSteps(initialSequence.id);
    } else {
      // Reset to defaults
      setName("");
      setDescription("");
      setProviderId(providers[0]?.id || "");
      setTriggerType(TriggerType.NEW_SUBSCRIBER);
      setTriggerTagName("");
      setTimezone("America/Sao_Paulo");
      setSkipWeekends(false);
      setExitOnUnsubscribe(true);
      setExitOnReply(false);
      setTrackOpens(true);
      setTrackClicks(true);
      setSequenceId(null);
      setCurrentStatus(SequenceStatus.DRAFT);
    }
  }, [initialSequence, providers]);

  // Save sequence
  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a sequence name");
      return;
    }
    if (!providerId) {
      setError("Please select an email provider");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const data: EmailSequenceCreateRequest = {
        name,
        description: description || undefined,
        provider_id: providerId,
        trigger_type: triggerType,
        trigger_config: {
          tag_name: triggerTagName || undefined,
        },
        settings: {
          timezone,
          skip_weekends: skipWeekends,
          exit_on_unsubscribe: exitOnUnsubscribe,
          exit_on_reply: exitOnReply,
          track_opens: trackOpens,
          track_clicks: trackClicks,
        },
      };

      let savedSequence: EmailSequence;
      if (sequenceId) {
        savedSequence = await updateSequence(sequenceId, data);
      } else {
        savedSequence = await createSequence(data);
        setSequenceId(savedSequence.id);
      }

      onSave?.(savedSequence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save sequence");
    } finally {
      setIsSaving(false);
    }
  };

  // Add step
  const handleAddStep = async () => {
    if (!sequenceId || !newStepName.trim() || !newStepTemplateId) return;

    try {
      await createStep(sequenceId, {
        name: newStepName,
        template_id: newStepTemplateId,
        delay_value: newStepDelayValue,
        delay_unit: newStepDelayUnit,
        condition: newStepCondition,
      });

      // Reset form
      setNewStepName("");
      setNewStepTemplateId("");
      setNewStepDelayValue(1);
      setNewStepDelayUnit(DelayUnit.DAYS);
      setNewStepCondition(StepCondition.NONE);
      setIsAddingStep(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add step");
    }
  };

  // Delete step
  const handleDeleteStep = async (stepId: string) => {
    if (!sequenceId) return;
    if (confirm("Delete this step?")) {
      await deleteStep(sequenceId, stepId);
    }
  };

  // Reorder steps
  const handleReorder = async (newOrder: EmailStep[]) => {
    if (!sequenceId) return;
    const stepIds = newOrder.map((s) => s.id);
    await reorderSteps(sequenceId, stepIds);
  };

  // Toggle active
  const handleToggleActive = async () => {
    if (!sequenceId) return;

    try {
      if (currentStatus === SequenceStatus.ACTIVE) {
        const seq = await deactivateSequence(sequenceId);
        setCurrentStatus(seq.status);
      } else {
        const seq = await activateSequence(sequenceId);
        setCurrentStatus(seq.status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sequence name"
                className="bg-transparent text-lg font-semibold text-text-primary placeholder-text-muted focus:outline-none border-b border-transparent hover:border-white/20 focus:border-primary px-1 py-0.5"
              />
              {sequenceId && (
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium ml-2", STATUS_COLORS[currentStatus])}>
                  {currentStatus}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sequenceId && (
              <button
                onClick={handleToggleActive}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                  currentStatus === SequenceStatus.ACTIVE
                    ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
                    : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                )}
              >
                {currentStatus === SequenceStatus.ACTIVE ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Activate
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-text-primary rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface/5 text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-2 border-b border-white/5 flex items-center gap-1">
          <button
            onClick={() => setActiveTab("steps")}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "steps" ? "bg-blue-500/20 text-blue-400" : "text-text-secondary hover:text-text-primary")}
          >
            Steps
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "settings" ? "bg-blue-500/20 text-blue-400" : "text-text-secondary hover:text-text-primary")}
          >
            Settings
          </button>
          {sequenceId && (
            <button
              onClick={() => setActiveTab("stats")}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeTab === "stats" ? "bg-blue-500/20 text-blue-400" : "text-text-secondary hover:text-text-primary")}
            >
              Statistics
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {activeTab === "steps" && (
            <div className="space-y-6">
              {/* Trigger */}
              <div className="bg-surface/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-text-primary">Trigger</h3>
                    <p className="text-sm text-text-secondary">When should this sequence start?</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {TRIGGER_TYPES.slice(0, 6).map((trigger) => (
                    <button
                      key={trigger.value}
                      onClick={() => setTriggerType(trigger.value)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                        triggerType === trigger.value
                          ? "bg-yellow-500/10 border-yellow-500/50"
                          : "bg-surface/5 border-white/10 hover:bg-surface/10"
                      )}
                    >
                      <trigger.icon className={cn("w-5 h-5 mt-0.5", triggerType === trigger.value ? "text-yellow-400" : "text-text-secondary")} />
                      <div>
                        <div className="font-medium text-text-primary text-sm">{trigger.label}</div>
                        <div className="text-xs text-text-muted">{trigger.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
                {triggerType === TriggerType.TAG_ADDED && (
                  <div className="mt-4">
                    <label className="block text-sm text-text-secondary mb-2">Tag Name</label>
                    <input
                      type="text"
                      value={triggerTagName}
                      onChange={(e) => setTriggerTagName(e.target.value)}
                      placeholder="Enter tag name"
                      className="w-full max-w-xs px-3 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-text-primary">Email Steps</h3>
                  {sequenceId && (
                    <button
                      onClick={() => setIsAddingStep(true)}
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Step
                    </button>
                  )}
                </div>

                {!sequenceId ? (
                  <div className="p-8 bg-surface/5 border border-white/10 rounded-xl text-center">
                    <p className="text-text-secondary mb-4">Save the sequence first to add steps</p>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-text-primary rounded-lg font-medium transition-colors">
                      Save Sequence
                    </button>
                  </div>
                ) : steps.length === 0 && !isAddingStep ? (
                  <div className="p-8 bg-surface/5 border border-white/10 rounded-xl text-center">
                    <Mail className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <p className="text-text-secondary mb-4">No steps added yet</p>
                    <button
                      onClick={() => setIsAddingStep(true)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-text-primary rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add First Step
                    </button>
                  </div>
                ) : (
                  <Reorder.Group axis="y" values={steps} onReorder={handleReorder} className="space-y-2">
                    {steps.map((step, index) => (
                      <Reorder.Item key={step.id} value={step}>
                        <div className="bg-surface/5 border border-white/10 rounded-xl p-4 hover:border-blue-500/30 transition-all cursor-grab active:cursor-grabbing">
                          <div className="flex items-center gap-4">
                            <GripVertical className="w-5 h-5 text-text-muted" />
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-medium text-sm">
                              {index + 1}
                            </div>
                            {index > 0 && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-surface/5 rounded-lg">
                                <Clock className="w-4 h-4 text-text-secondary" />
                                <span className="text-sm text-text-primary">
                                  {step.delay_value} {step.delay_unit}
                                </span>
                              </div>
                            )}
                            <ArrowRight className="w-4 h-4 text-text-muted" />
                            <div className="flex-1">
                              <div className="font-medium text-text-primary">{step.name}</div>
                              <div className="text-sm text-text-secondary">
                                {templates.find((t) => t.id === step.template_id)?.name || "Unknown template"}
                              </div>
                            </div>
                            {step.condition !== StepCondition.NONE && (
                              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                                {step.condition.replace("_", " ")}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingStepId(step.id)}
                                className="p-2 hover:bg-surface/10 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStep(step.id)}
                                className="p-2 hover:bg-red-500/20 rounded-lg text-text-secondary hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          {step.stats && (
                            <div className="flex items-center gap-6 mt-3 pt-3 border-t border-white/5 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {step.stats.total_sent} sent
                              </span>
                              <span className="flex items-center gap-1">
                                <MailOpen className="w-3 h-3" />
                                {(step.stats.open_rate * 100).toFixed(1)}% opened
                              </span>
                              <span className="flex items-center gap-1">
                                <Link className="w-3 h-3" />
                                {(step.stats.click_rate * 100).toFixed(1)}% clicked
                              </span>
                            </div>
                          )}
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}

                {/* Add Step Form */}
                <AnimatePresence>
                  {isAddingStep && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-blue-500/5 border border-blue-500/30 rounded-xl p-4 overflow-hidden"
                    >
                      <h4 className="font-medium text-text-primary mb-4">Add New Step</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-text-secondary mb-2">Step Name</label>
                          <input
                            type="text"
                            value={newStepName}
                            onChange={(e) => setNewStepName(e.target.value)}
                            placeholder="e.g., Welcome Email"
                            className="w-full px-3 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-text-secondary mb-2">Template</label>
                          <select
                            value={newStepTemplateId}
                            onChange={(e) => setNewStepTemplateId(e.target.value)}
                            className="w-full px-3 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="">Select template</option>
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-sm text-text-secondary mb-2">Delay</label>
                            <input
                              type="number"
                              value={newStepDelayValue}
                              onChange={(e) => setNewStepDelayValue(parseInt(e.target.value) || 1)}
                              min={0}
                              className="w-full px-3 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-sm text-text-secondary mb-2">Unit</label>
                            <select
                              value={newStepDelayUnit}
                              onChange={(e) => setNewStepDelayUnit(e.target.value as DelayUnit)}
                              className="w-full px-3 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {DELAY_UNITS.map((u) => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-text-secondary mb-2">Condition</label>
                          <select
                            value={newStepCondition}
                            onChange={(e) => setNewStepCondition(e.target.value as StepCondition)}
                            className="w-full px-3 py-2 bg-surface/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {CONDITIONS.map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => setIsAddingStep(false)}
                          className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddStep}
                          disabled={!newStepName.trim() || !newStepTemplateId}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-text-primary rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          Add Step
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this sequence..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface/5 border border-white/10 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Email Provider</label>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select provider</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 bg-surface/5 border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="America/Sao_Paulo">America/Sao Paulo (BRT)</option>
                  <option value="America/New_York">America/New York (EST)</option>
                  <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-text-primary">Options</h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={skipWeekends} onChange={(e) => setSkipWeekends(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-surface/5 text-primary focus:ring-ring" />
                  <span className="text-text-primary">Skip weekends</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={exitOnUnsubscribe} onChange={(e) => setExitOnUnsubscribe(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-surface/5 text-primary focus:ring-ring" />
                  <span className="text-text-primary">Exit on unsubscribe</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={exitOnReply} onChange={(e) => setExitOnReply(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-surface/5 text-primary focus:ring-ring" />
                  <span className="text-text-primary">Exit on reply</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={trackOpens} onChange={(e) => setTrackOpens(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-surface/5 text-primary focus:ring-ring" />
                  <span className="text-text-primary">Track opens</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={trackClicks} onChange={(e) => setTrackClicks(e.target.checked)} className="w-4 h-4 rounded border-white/20 bg-surface/5 text-primary focus:ring-ring" />
                  <span className="text-text-primary">Track clicks</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "stats" && initialSequence?.stats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-surface/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-text-secondary">Enrolled</span>
                </div>
                <div className="text-2xl font-semibold text-text-primary">{initialSequence.stats.total_enrolled}</div>
                <div className="text-sm text-text-muted">{initialSequence.stats.active_enrollments} active</div>
              </div>
              <div className="bg-surface/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MailOpen className="w-5 h-5 text-green-400" />
                  <span className="text-text-secondary">Open Rate</span>
                </div>
                <div className="text-2xl font-semibold text-text-primary">{(initialSequence.stats.open_rate * 100).toFixed(1)}%</div>
                <div className="text-sm text-text-muted">{initialSequence.stats.total_opened} opened</div>
              </div>
              <div className="bg-surface/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Link className="w-5 h-5 text-purple-400" />
                  <span className="text-text-secondary">Click Rate</span>
                </div>
                <div className="text-2xl font-semibold text-text-primary">{(initialSequence.stats.click_rate * 100).toFixed(1)}%</div>
                <div className="text-sm text-text-muted">{initialSequence.stats.total_clicked} clicked</div>
              </div>
              <div className="bg-surface/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <BarChart3 className="w-5 h-5 text-orange-400" />
                  <span className="text-text-secondary">Completed</span>
                </div>
                <div className="text-2xl font-semibold text-text-primary">{initialSequence.stats.completed}</div>
                <div className="text-sm text-text-muted">{initialSequence.stats.total_bounced} bounced</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default EmailSequenceBuilder;
