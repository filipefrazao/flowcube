"use client";

import { useEffect, useState } from "react";
import {
  Palette,
  Bell,
  Settings2,
  User,
  Moon,
  Sun,
  Monitor,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  LayoutGrid,
  Magnet,
  Eye,
  EyeOff,
  Mail,
  AlertTriangle,
  FileText,
  Timer,
  ZoomIn,
  Map,
  BarChart3,
} from "lucide-react";
import { settingsApi, type UserPreferences } from "@/lib/api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

type Tab = "appearance" | "notifications" | "editor" | "account";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("appearance");
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      setLoading(true);
      const data = await settingsApi.get();
      setPreferences(data);
      setError(null);
    } catch (err) {
      setError("Failed to load preferences");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!preferences) return;

    try {
      setSaving(true);
      setSaved(false);
      await settingsApi.update(preferences);
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Failed to save preferences");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function updatePreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    setHasChanges(true);
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { id: "editor", label: "Editor", icon: <Settings2 className="w-4 h-4" /> },
    { id: "account", label: "Account", icon: <User className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-text-secondary text-sm">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Settings</h1>
            <p className="text-sm text-text-muted">Manage your preferences</p>
          </div>
          <button
            onClick={savePreferences}
            disabled={saving || !hasChanges}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
              hasChanges
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-surface text-text-muted cursor-not-allowed"
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </header>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-surface p-1 rounded-lg mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 justify-center",
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {preferences && (
              <div className="bg-surface border border-border rounded-lg">
                {activeTab === "appearance" && (
                  <AppearanceTab preferences={preferences} updatePreference={updatePreference} />
                )}
                {activeTab === "notifications" && (
                  <NotificationsTab preferences={preferences} updatePreference={updatePreference} />
                )}
                {activeTab === "editor" && (
                  <EditorTab preferences={preferences} updatePreference={updatePreference} />
                )}
                {activeTab === "account" && <AccountTab />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Tab Components ============

interface TabProps {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

function AppearanceTab({ preferences, updatePreference }: TabProps) {
  const themes: { id: "dark" | "light" | "system"; label: string; icon: React.ReactNode }[] = [
    { id: "dark", label: "Dark", icon: <Moon className="w-5 h-5" /> },
    { id: "light", label: "Light", icon: <Sun className="w-5 h-5" /> },
    { id: "system", label: "System", icon: <Monitor className="w-5 h-5" /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Theme</h3>
        <p className="text-xs text-text-muted mb-4">Choose your preferred color scheme</p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => updatePreference("theme", theme.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors",
                preferences.theme === theme.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-text-secondary hover:border-primary/50"
              )}
            >
              {theme.icon}
              <span className="text-sm font-medium">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-sm font-medium text-text-primary mb-1">Sidebar</h3>
        <p className="text-xs text-text-muted mb-4">Configure sidebar behavior</p>
        <ToggleSetting
          label="Collapsed by default"
          description="Start with sidebar collapsed"
          checked={preferences.sidebar_collapsed}
          onChange={(checked) => updatePreference("sidebar_collapsed", checked)}
        />
      </div>
    </div>
  );
}

function NotificationsTab({ preferences, updatePreference }: TabProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Email Notifications</h3>
        <p className="text-xs text-text-muted mb-4">Configure how you receive notifications</p>

        <div className="space-y-4">
          <ToggleSetting
            icon={<Mail className="w-4 h-4" />}
            label="Email notifications"
            description="Receive email notifications for important events"
            checked={preferences.email_notifications}
            onChange={(checked) => updatePreference("email_notifications", checked)}
          />

          <ToggleSetting
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Execution failure alerts"
            description="Get notified when a workflow execution fails"
            checked={preferences.execution_failure_alerts}
            onChange={(checked) => updatePreference("execution_failure_alerts", checked)}
          />

          <ToggleSetting
            icon={<FileText className="w-4 h-4" />}
            label="Weekly digest"
            description="Receive a weekly summary of your workflow activity"
            checked={preferences.weekly_digest}
            onChange={(checked) => updatePreference("weekly_digest", checked)}
          />
        </div>
      </div>
    </div>
  );
}

function EditorTab({ preferences, updatePreference }: TabProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Auto Save */}
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Auto Save</h3>
        <p className="text-xs text-text-muted mb-4">Automatically save your work</p>

        <div className="space-y-4">
          <ToggleSetting
            icon={<Timer className="w-4 h-4" />}
            label="Enable auto-save"
            description="Automatically save changes as you edit"
            checked={preferences.auto_save}
            onChange={(checked) => updatePreference("auto_save", checked)}
          />

          {preferences.auto_save && (
            <div className="ml-8">
              <label className="text-sm text-text-secondary mb-2 block">
                Auto-save interval (seconds)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={preferences.auto_save_interval_seconds}
                onChange={(e) =>
                  updatePreference("auto_save_interval_seconds", parseInt(e.target.value) || 30)
                }
                className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Grid Settings */}
      <div className="pt-6 border-t border-border">
        <h3 className="text-sm font-medium text-text-primary mb-1">Grid & Snapping</h3>
        <p className="text-xs text-text-muted mb-4">Configure canvas grid behavior</p>

        <div className="space-y-4">
          <ToggleSetting
            icon={<Magnet className="w-4 h-4" />}
            label="Snap to grid"
            description="Automatically align nodes to the grid"
            checked={preferences.snap_to_grid}
            onChange={(checked) => updatePreference("snap_to_grid", checked)}
          />

          {preferences.snap_to_grid && (
            <div className="ml-8">
              <label className="text-sm text-text-secondary mb-2 block">Grid size (pixels)</label>
              <select
                value={preferences.grid_size}
                onChange={(e) => updatePreference("grid_size", parseInt(e.target.value))}
                className="w-32 px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary"
              >
                <option value={10}>10px</option>
                <option value={15}>15px</option>
                <option value={20}>20px</option>
                <option value={25}>25px</option>
                <option value={30}>30px</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Canvas Settings */}
      <div className="pt-6 border-t border-border">
        <h3 className="text-sm font-medium text-text-primary mb-1">Canvas Display</h3>
        <p className="text-xs text-text-muted mb-4">Configure canvas visualization</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-2 flex items-center gap-2">
              <ZoomIn className="w-4 h-4" />
              Default zoom level
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={25}
                max={200}
                step={5}
                value={preferences.default_zoom}
                onChange={(e) => updatePreference("default_zoom", parseInt(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm text-text-primary w-12">{preferences.default_zoom}%</span>
            </div>
          </div>

          <ToggleSetting
            icon={<Map className="w-4 h-4" />}
            label="Show minimap"
            description="Display navigation minimap in the corner"
            checked={preferences.show_minimap}
            onChange={(checked) => updatePreference("show_minimap", checked)}
          />

          <ToggleSetting
            icon={<BarChart3 className="w-4 h-4" />}
            label="Show node stats"
            description="Display execution statistics on nodes"
            checked={preferences.show_node_stats}
            onChange={(checked) => updatePreference("show_node_stats", checked)}
          />
        </div>
      </div>
    </div>
  );
}

function AccountTab() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Profile Information</h3>
        <p className="text-xs text-text-muted mb-4">Your account details</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-2 block">Email</label>
            <input
              type="email"
              disabled
              value="filipefrazao@frzgroup.com.br"
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-2 block">Username</label>
            <input
              type="text"
              disabled
              value="admin"
              className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-muted cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-sm font-medium text-text-primary mb-1">Password</h3>
        <p className="text-xs text-text-muted mb-4">Update your password</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-2 block">Current Password</label>
            <input
              type="password"
              placeholder="Enter current password"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-2 block">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary mb-2 block">Confirm New Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
            />
          </div>

          <button className="px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors">
            Update Password
          </button>
        </div>
      </div>

      <div className="pt-6 border-t border-border">
        <h3 className="text-sm font-medium text-error mb-1">Danger Zone</h3>
        <p className="text-xs text-text-muted mb-4">Irreversible actions</p>

        <button className="px-4 py-2 bg-error/10 hover:bg-error/20 border border-error/30 rounded-lg text-error font-medium transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}

// ============ Toggle Setting Component ============

interface ToggleSettingProps {
  icon?: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSetting({ icon, label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div className="flex items-start gap-3">
        {icon && <span className="text-text-muted mt-0.5">{icon}</span>}
        <div>
          <span className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
            {label}
          </span>
          <p className="text-xs text-text-muted">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors flex-shrink-0",
          checked ? "bg-primary" : "bg-surface-hover"
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </label>
  );
}
