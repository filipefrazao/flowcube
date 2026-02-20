"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Key,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  MoreVertical,
  AlertCircle,
  Bot,
  MessageSquare,
  Database,
  Webhook,
  Mail,
  Settings,
} from "lucide-react";
import { credentialApi, type Credential, type CredentialCreateRequest } from "@/lib/api";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

const CREDENTIAL_TYPES = [
  { value: "evolution_api", label: "Evolution API", icon: MessageSquare, color: "text-accent-green" },
  { value: "salescube", label: "SalesCube", icon: Database, color: "text-accent-blue" },
  { value: "openai", label: "OpenAI", icon: Bot, color: "text-accent-green" },
  { value: "anthropic", label: "Anthropic (Claude)", icon: Bot, color: "text-accent-orange" },
  { value: "meta_ads", label: "Meta Ads", icon: Database, color: "text-accent-blue" },
  { value: "google_sheets", label: "Google Sheets", icon: Database, color: "text-accent-green" },
  { value: "google_drive", label: "Google Drive", icon: Database, color: "text-accent-blue" },
  { value: "notion", label: "Notion", icon: Database, color: "text-text-primary" },
  { value: "slack", label: "Slack", icon: MessageSquare, color: "text-accent-purple" },
  { value: "discord", label: "Discord", icon: MessageSquare, color: "text-accent-purple" },
  { value: "webhook", label: "Webhook", icon: Webhook, color: "text-accent-pink" },
  { value: "smtp", label: "SMTP Email", icon: Mail, color: "text-warning" },
  { value: "postgresql", label: "PostgreSQL", icon: Database, color: "text-accent-blue" },
  { value: "mysql", label: "MySQL", icon: Database, color: "text-accent-orange" },
  { value: "mongodb", label: "MongoDB", icon: Database, color: "text-accent-green" },
  { value: "redis", label: "Redis", icon: Database, color: "text-error" },
  { value: "custom", label: "Custom", icon: Settings, color: "text-text-secondary" },
  { value: "groq", label: "Groq", icon: Bot, color: "text-accent-orange" },
  { value: "deepseek", label: "DeepSeek", icon: Bot, color: "text-accent-blue" },
  { value: "grok", label: "Grok (X.AI)", icon: Bot, color: "text-text-primary" },
  { value: "google_ai", label: "Google AI (Gemini)", icon: Bot, color: "text-accent-blue" },
  { value: "n8n", label: "N8N", icon: Webhook, color: "text-accent-orange" },
  { value: "whatsapp_cloud", label: "WhatsApp Cloud API", icon: MessageSquare, color: "text-accent-green" },
  { value: "meta_lead_ads", label: "Meta Lead Ads", icon: Database, color: "text-accent-blue" },
  { value: "supabase", label: "Supabase", icon: Database, color: "text-accent-green" },
  { value: "make", label: "Make (Integromat)", icon: Webhook, color: "text-accent-purple" },
  { value: "google_ads", label: "Google Ads", icon: Database, color: "text-accent-green" },
  { value: "openrouter", label: "OpenRouter", icon: Bot, color: "text-accent-purple" },
  { value: "elevenlabs", label: "ElevenLabs", icon: Bot, color: "text-accent-pink" },
  { value: "mistral", label: "Mistral", icon: Bot, color: "text-accent-orange" },
];

const CREDENTIAL_FIELDS: Record<string, Array<{ key: string; label: string; type: string; placeholder: string }>> = {
  evolution_api: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "Your Evolution API key" },
    { key: "instance", label: "Instance Name", type: "text", placeholder: "your-instance" },
  ],
  salescube: [
    { key: "token", label: "Auth Token", type: "password", placeholder: "Your SalesCube token" },
  ],
  openai: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "sk-..." },
    { key: "organization", label: "Organization ID (optional)", type: "text", placeholder: "org-..." },
  ],
  anthropic: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "sk-ant-..." },
  ],
  meta_ads: [
    { key: "access_token", label: "Access Token", type: "password", placeholder: "Your Meta access token" },
    { key: "ad_account_id", label: "Ad Account ID", type: "text", placeholder: "act_..." },
  ],
  google_sheets: [
    { key: "credentials_json", label: "Service Account JSON", type: "textarea", placeholder: '{"type": "service_account", ...}' },
  ],
  webhook: [
    { key: "secret", label: "Secret Key (optional)", type: "password", placeholder: "Webhook secret" },
    { key: "auth_header", label: "Auth Header (optional)", type: "text", placeholder: "Authorization" },
    { key: "auth_value", label: "Auth Value (optional)", type: "password", placeholder: "Bearer token" },
  ],
  smtp: [
    { key: "host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
    { key: "port", label: "Port", type: "text", placeholder: "587" },
    { key: "username", label: "Username", type: "text", placeholder: "your@email.com" },
    { key: "password", label: "Password", type: "password", placeholder: "App password" },
  ],
  postgresql: [
    { key: "host", label: "Host", type: "text", placeholder: "localhost" },
    { key: "port", label: "Port", type: "text", placeholder: "5432" },
    { key: "database", label: "Database", type: "text", placeholder: "mydb" },
    { key: "username", label: "Username", type: "text", placeholder: "postgres" },
    { key: "password", label: "Password", type: "password", placeholder: "password" },
  ],
  custom: [
    { key: "key1", label: "Key 1", type: "text", placeholder: "Value 1" },
    { key: "key2", label: "Key 2", type: "text", placeholder: "Value 2" },
  ],
  groq: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "gsk_..." },
  ],
  deepseek: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "sk-..." },
  ],
  grok: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "xai-..." },
  ],
  google_ai: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "AIza..." },
  ],
  n8n: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "eyJ..." },
  ],
  whatsapp_cloud: [
    { key: "access_token", label: "Access Token", type: "password", placeholder: "EAA..." },
    { key: "phone_number_id", label: "Phone Number ID", type: "text", placeholder: "933152683214452" },
    { key: "waba_id", label: "WABA ID", type: "text", placeholder: "1420212763006169" },
  ],
  meta_lead_ads: [
    { key: "access_token", label: "System User Token", type: "password", placeholder: "EAA..." },
    { key: "app_id", label: "App ID", type: "text", placeholder: "1527291528327529" },
  ],
  supabase: [
    { key: "access_token", label: "Access Token (PAT)", type: "password", placeholder: "sbp_..." },
  ],
  make: [
    { key: "api_token", label: "API Token", type: "password", placeholder: "44efa5a9-..." },
    { key: "organization_id", label: "Organization ID", type: "text", placeholder: "493266" },
  ],
  google_ads: [
    { key: "developer_token", label: "Developer Token", type: "password", placeholder: "LIhDx-..." },
    { key: "mcc_account_id", label: "MCC Account ID", type: "text", placeholder: "323-286-6419" },
    { key: "client_id", label: "OAuth Client ID", type: "text", placeholder: "716084310222-..." },
    { key: "client_secret", label: "OAuth Client Secret", type: "password", placeholder: "GOCSPX-..." },
  ],
  openrouter: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "sk-or-..." },
  ],
  elevenlabs: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "sk_..." },
  ],
  mistral: [
    { key: "api_key", label: "API Key", type: "password", placeholder: "0wmQ..." },
  ],
  google_drive: [
    { key: "credentials_json", label: "Service Account JSON", type: "textarea", placeholder: '{"type": "service_account", ...}' },
  ],
  notion: [
    { key: "api_key", label: "API Key (Internal Integration)", type: "password", placeholder: "ntn_..." },
  ],
  slack: [
    { key: "bot_token", label: "Bot Token", type: "password", placeholder: "xoxb-..." },
    { key: "signing_secret", label: "Signing Secret", type: "password", placeholder: "..." },
  ],
  discord: [
    { key: "bot_token", label: "Bot Token", type: "password", placeholder: "..." },
  ],
  mongodb: [
    { key: "connection_string", label: "Connection String", type: "password", placeholder: "mongodb://user:pass@host:27017/db" },
  ],
  redis: [
    { key: "host", label: "Host", type: "text", placeholder: "localhost" },
    { key: "port", label: "Port", type: "text", placeholder: "6379" },
    { key: "password", label: "Password", type: "password", placeholder: "..." },
    { key: "database", label: "Database Number", type: "text", placeholder: "0" },
  ],
  mysql: [
    { key: "host", label: "Host", type: "text", placeholder: "localhost" },
    { key: "port", label: "Port", type: "text", placeholder: "3306" },
    { key: "database", label: "Database", type: "text", placeholder: "mydb" },
    { key: "username", label: "Username", type: "text", placeholder: "root" },
    { key: "password", label: "Password", type: "password", placeholder: "..." },
  ],
};

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    credential_type: "evolution_api",
    description: "",
    base_url: "",
    data: {} as Record<string, string>,
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCredentials();
  }, []);

  async function loadCredentials() {
    try {
      setLoading(true);
      const data = await credentialApi.list();
      setCredentials(data.results || []);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCredential(null);
    setFormData({
      name: "",
      credential_type: "evolution_api",
      description: "",
      base_url: "",
      data: {},
    });
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(credential: Credential) {
    setEditingCredential(credential);
    setFormData({
      name: credential.name,
      credential_type: credential.credential_type,
      description: credential.description,
      base_url: credential.base_url,
      data: {}, // Don't prefill - user must enter new values
    });
    setFormError("");
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setFormError("Name is required");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingCredential) {
        // Update
        await credentialApi.update(editingCredential.id, {
          name: formData.name,
          description: formData.description,
          base_url: formData.base_url,
          data: Object.keys(formData.data).length > 0 ? formData.data : undefined,
        });
      } else {
        // Create
        await credentialApi.create({
          name: formData.name,
          credential_type: formData.credential_type,
          description: formData.description,
          base_url: formData.base_url,
          data: formData.data,
        });
      }
      setShowModal(false);
      loadCredentials();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Failed to save credential");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this credential?")) return;

    try {
      await credentialApi.delete(id);
      setCredentials(credentials.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete credential:", err);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    setTestResult(null);

    try {
      const result = await credentialApi.test(id);
      setTestResult({ id, ...result });
    } catch (err) {
      setTestResult({ id, success: false, message: "Test failed" });
    } finally {
      setTestingId(null);
    }
  }

  function getTypeConfig(type: string) {
    return CREDENTIAL_TYPES.find((t) => t.value === type) || CREDENTIAL_TYPES[CREDENTIAL_TYPES.length - 1];
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-text-secondary text-sm">Loading credentials...</span>
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
            <h1 className="text-lg font-semibold text-text-primary">Credentials</h1>
            <p className="text-sm text-text-muted">{credentials.length} credentials stored</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover rounded-lg text-text-primary font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Credential
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {credentials.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 mb-6 rounded-2xl bg-surface flex items-center justify-center">
                <Key className="w-10 h-10 text-text-muted" />
              </div>
              <h2 className="text-xl font-semibold text-text-primary mb-2">No credentials yet</h2>
              <p className="text-text-secondary mb-6 text-center max-w-md">
                Add API keys and integration credentials to use in your workflows.
              </p>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg text-text-primary font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add your first credential
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {credentials.map((credential) => {
                const typeConfig = getTypeConfig(credential.credential_type);
                const Icon = typeConfig.icon;
                const isTestSuccess = testResult?.id === credential.id && testResult.success;
                const isTestFailed = testResult?.id === credential.id && !testResult.success;

                return (
                  <div
                    key={credential.id}
                    className="bg-surface border border-border rounded-lg p-4 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center", typeConfig.color)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-text-primary">{credential.name}</h3>
                          <p className="text-xs text-text-muted">{credential.credential_type_display}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === credential.id ? null : credential.id)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-surface-hover transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-text-muted" />
                        </button>
                        {menuOpenId === credential.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpenId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-lg shadow-lg z-20 py-1">
                              <button
                                onClick={() => {
                                  openEditModal(credential);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  handleTest(credential.id);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Test
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(credential.id);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {credential.description && (
                      <p className="text-sm text-text-muted mb-3 line-clamp-2">{credential.description}</p>
                    )}

                    {/* Masked preview */}
                    <div className="bg-background rounded-lg p-2 mb-3 overflow-hidden">
                      {Object.entries(credential.masked_preview).slice(0, 2).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-xs py-0.5 min-w-0">
                          <span className="text-text-muted shrink-0">{key}:</span>
                          <span className="text-text-secondary font-mono truncate">{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        {testingId === credential.id ? (
                          <span className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Testing...
                          </span>
                        ) : isTestSuccess ? (
                          <span className="flex items-center gap-1.5 text-xs text-accent-green">
                            <CheckCircle className="w-3 h-3" />
                            Connected
                          </span>
                        ) : isTestFailed ? (
                          <span className="flex items-center gap-1.5 text-xs text-error">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : credential.is_active ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-green/20 text-accent-green">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-surface-hover text-text-muted">
                            Inactive
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-muted">
                        {credential.last_used_at
                          ? `Used ${formatRelativeTime(credential.last_used_at)}`
                          : "Never used"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-surface border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {editingCredential ? "Edit Credential" : "Add Credential"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}

              {/* Credential Type */}
              {!editingCredential && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Type
                  </label>
                  <select
                    value={formData.credential_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        credential_type: e.target.value,
                        data: {},
                      })
                    }
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {CREDENTIAL_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="My API Key"
                />
              </div>

              {/* Base URL (optional) */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Base URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="https://api.example.com"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                  placeholder="What is this credential used for?"
                />
              </div>

              {/* Dynamic fields based on type */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-text-secondary mb-3">
                  Credentials {editingCredential && "(leave empty to keep current)"}
                </h3>
                {(CREDENTIAL_FIELDS[formData.credential_type] || CREDENTIAL_FIELDS.custom).map((field) => (
                  <div key={field.key} className="mb-3">
                    <label className="block text-sm font-medium text-text-muted mb-1.5">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <textarea
                        value={formData.data[field.key] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            data: { ...formData.data, [field.key]: e.target.value },
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none font-mono text-sm"
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={formData.data[field.key] || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            data: { ...formData.data, [field.key]: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
