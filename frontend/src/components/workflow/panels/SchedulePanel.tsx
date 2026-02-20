/**
 * FlowCube - Schedule Configuration Panel
 *
 * Supports 9 schedule types (Make-style):
 * immediately, interval, cron, daily, weekly, monthly, once, on_demand, event
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Clock, X, Calendar, Play, Save, ToggleLeft, ToggleRight,
  RefreshCw, AlertCircle
} from "lucide-react";
import { workflowApi } from "@/lib/api";

interface ScheduleData {
  id?: string;
  schedule_type: string;
  schedule_type_display?: string;
  is_active: boolean;
  interval_minutes?: number;
  cron_expression?: string;
  time_of_day?: string;
  day_of_week?: number;
  day_of_month?: number;
  run_at?: string;
  last_run?: string;
  next_run?: string;
  run_count?: number;
}

interface SchedulePanelProps {
  workflowId: string;
  className?: string;
  onClose?: () => void;
}

const SCHEDULE_TYPES = [
  { value: "on_demand", label: "On Demand", description: "Triggered manually or via API" },
  { value: "immediately", label: "Immediately", description: "Runs once right now" },
  { value: "interval", label: "Interval", description: "Repeat every N minutes" },
  { value: "daily", label: "Daily", description: "Once per day at a specific time" },
  { value: "weekly", label: "Weekly", description: "Once per week on a specific day" },
  { value: "monthly", label: "Monthly", description: "Once per month on a specific day" },
  { value: "cron", label: "Cron", description: "Custom cron expression" },
  { value: "once", label: "Once", description: "Run once at a specific date/time" },
  { value: "event", label: "Event", description: "Triggered by external event/webhook" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function SchedulePanel({ workflowId, className, onClose }: SchedulePanelProps) {
  const [schedule, setSchedule] = useState<ScheduleData>({
    schedule_type: "on_demand",
    is_active: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, [workflowId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await workflowApi.getSchedule(workflowId);
      setSchedule(response);
    } catch {
      // No schedule yet, use defaults
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      await workflowApi.updateSchedule(workflowId, schedule);
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }, [workflowId, schedule]);

  const updateField = (key: string, value: unknown) => {
    setSchedule((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className={cn("w-80 bg-surface border-l border-border flex items-center justify-center", className)}>
        <RefreshCw className="w-5 h-5 text-text-secondary animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("w-80 bg-surface border-l border-border flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-text-primary">Schedule</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-primary">Active</span>
          <button
            onClick={() => updateField("is_active", !schedule.is_active)}
            className="flex items-center gap-1"
          >
            {schedule.is_active ? (
              <ToggleRight className="w-8 h-5 text-green-500" />
            ) : (
              <ToggleLeft className="w-8 h-5 text-text-muted" />
            )}
          </button>
        </div>

        {/* Schedule Type */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-2">Type</label>
          <select
            value={schedule.schedule_type}
            onChange={(e) => updateField("schedule_type", e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {SCHEDULE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">
            {SCHEDULE_TYPES.find((t) => t.value === schedule.schedule_type)?.description}
          </p>
        </div>

        {/* Type-specific fields */}
        {schedule.schedule_type === "interval" && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Interval (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={schedule.interval_minutes || 5}
              onChange={(e) => updateField("interval_minutes", parseInt(e.target.value) || 5)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {schedule.schedule_type === "cron" && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Cron Expression
            </label>
            <input
              type="text"
              value={schedule.cron_expression || ""}
              onChange={(e) => updateField("cron_expression", e.target.value)}
              placeholder="*/5 * * * *"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-text-muted mt-1">min hour dom month dow</p>
          </div>
        )}

        {["daily", "weekly", "monthly"].includes(schedule.schedule_type) && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Time of Day
            </label>
            <input
              type="time"
              value={schedule.time_of_day || "09:00"}
              onChange={(e) => updateField("time_of_day", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {schedule.schedule_type === "weekly" && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Day of Week
            </label>
            <select
              value={schedule.day_of_week ?? 1}
              onChange={(e) => updateField("day_of_week", parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {schedule.schedule_type === "monthly" && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Day of Month
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={schedule.day_of_month || 1}
              onChange={(e) => updateField("day_of_month", parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {schedule.schedule_type === "once" && (
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              Run At
            </label>
            <input
              type="datetime-local"
              value={schedule.run_at?.slice(0, 16) || ""}
              onChange={(e) => updateField("run_at", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Stats */}
        {(schedule.last_run || schedule.run_count) && (
          <div className="pt-2 border-t border-border space-y-2">
            <h3 className="text-xs font-medium text-text-secondary">Stats</h3>
            {schedule.run_count !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Total Runs</span>
                <span className="text-text-primary">{schedule.run_count}</span>
              </div>
            )}
            {schedule.last_run && (
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Last Run</span>
                <span className="text-text-primary">
                  {new Date(schedule.last_run).toLocaleString()}
                </span>
              </div>
            )}
            {schedule.next_run && (
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Next Run</span>
                <span className="text-text-primary">
                  {new Date(schedule.next_run).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-800 rounded text-xs text-red-400">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex gap-2">
        <button
          onClick={saveSchedule}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-gray-900 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
