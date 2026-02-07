"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Wifi,
  WifiOff,
  Trash2,
  RefreshCw,
  MessageSquare,
  Users,
  Hash,
  Settings,
  BarChart3,
  Signal,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
} from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import type {
  WhatsAppInstance,
  WhatsAppMessage,
  WhatsAppContact,
  WhatsAppGroup,
  InstanceStats,
} from "@/types/chatcube.types";
import { InstanceStatusBadge } from "@/components/chatcube/InstanceStatusBadge";
import { QRCodeDisplay } from "@/components/chatcube/QRCodeDisplay";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { cn } from "@/lib/utils";

type Tab = "messages" | "contacts" | "groups" | "settings";

export default function InstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const instanceId = params.id as string;

  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [stats, setStats] = useState<InstanceStats | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("messages");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadInstance = useCallback(async () => {
    try {
      setLoading(true);
      const [instanceData, statsData] = await Promise.all([
        chatcubeApi.getInstance(instanceId),
        chatcubeApi.getInstanceStats(instanceId).catch(() => null),
      ]);
      setInstance(instanceData);
      setStats(statsData);
    } catch (err) {
      setError("Failed to load instance");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    loadInstance();
  }, [loadInstance]);

  // Load tab data when tab changes
  useEffect(() => {
    if (!instance) return;

    if (activeTab === "messages" && messages.length === 0) {
      chatcubeApi.getMessages(instanceId, { limit: 50 }).then((data) => {
        setMessages(data.results || []);
      }).catch(() => {});
    } else if (activeTab === "contacts" && contacts.length === 0) {
      chatcubeApi.getContacts(instanceId, { limit: 50 }).then((data) => {
        setContacts(data.results || []);
      }).catch(() => {});
    } else if (activeTab === "groups" && groups.length === 0) {
      chatcubeApi.getGroups(instanceId, { limit: 50 }).then((data) => {
        setGroups(data.results || []);
      }).catch(() => {});
    }
  }, [activeTab, instance, instanceId, messages.length, contacts.length, groups.length]);

  async function handleDisconnect() {
    if (!confirm("Disconnect this WhatsApp instance?")) return;
    setActionLoading("disconnect");
    try {
      await chatcubeApi.disconnect(instanceId);
      await loadInstance();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReconnect() {
    setActionLoading("reconnect");
    try {
      await chatcubeApi.reconnect(instanceId);
      await loadInstance();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this instance? This action cannot be undone.")) return;
    setActionLoading("delete");
    try {
      await chatcubeApi.deleteInstance(instanceId);
      router.push("/chatcube");
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  function handleConnected() {
    loadInstance();
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-text-secondary text-sm">Loading instance...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-error" />
            <span className="text-text-secondary text-sm">{error || "Instance not found"}</span>
            <Link href="/chatcube" className="text-sm text-primary hover:text-primary-hover">
              Back to ChatCube
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "messages", label: "Messages", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "contacts", label: "Contacts", icon: <Users className="w-4 h-4" /> },
    { key: "groups", label: "Groups", icon: <Hash className="w-4 h-4" /> },
    { key: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/chatcube"
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-text-primary">{instance.name}</h1>
              <InstanceStatusBadge status={instance.status} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {instance.status === "connected" ? (
              <button
                onClick={handleDisconnect}
                disabled={actionLoading === "disconnect"}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors"
              >
                {actionLoading === "disconnect" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleReconnect}
                disabled={actionLoading === "reconnect"}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors"
              >
                {actionLoading === "reconnect" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Reconnect
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-error/10 border border-error/20 rounded-lg transition-colors"
            >
              {actionLoading === "delete" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* QR Code Section for disconnected instances */}
          {instance.status !== "connected" && instance.engine === "baileys" && (
            <div className="mb-6 max-w-md mx-auto">
              <QRCodeDisplay instanceId={instanceId} onConnected={handleConnected} />
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-accent-blue" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {stats?.total_messages_sent ?? instance.messages_sent_today}
              </p>
              <p className="text-sm text-text-muted">Messages Sent</p>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 text-accent-green" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {stats?.total_messages_received ?? instance.messages_received_today}
              </p>
              <p className="text-sm text-text-muted">Messages Received</p>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-accent-purple" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {stats?.total_contacts ?? 0}
              </p>
              <p className="text-sm text-text-muted">Contacts</p>
            </div>

            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent-orange/10 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-accent-orange" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {stats?.total_groups ?? 0}
              </p>
              <p className="text-sm text-text-muted">Groups</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border mb-6">
            <nav className="flex gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.key
                      ? "border-primary text-text-primary"
                      : "border-transparent text-text-muted hover:text-text-secondary"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "messages" && (
            <div className="space-y-2">
              {messages.length === 0 ? (
                <EmptyTab
                  icon={<MessageSquare className="w-10 h-10 text-text-muted" />}
                  title="No messages yet"
                  description="Messages will appear here once the instance starts sending and receiving."
                />
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-surface border border-border rounded-lg p-4 flex items-start gap-3"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        msg.from_me ? "bg-accent-blue/10" : "bg-accent-green/10"
                      )}
                    >
                      {msg.from_me ? (
                        <ArrowUpRight className="w-4 h-4 text-accent-blue" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-accent-green" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary">
                          {msg.from_me ? "You" : formatJid(msg.remote_jid)}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatTime(msg.timestamp)}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-medium",
                            msg.message_type === "text"
                              ? "bg-surface-hover text-text-muted"
                              : "bg-accent-purple/10 text-accent-purple"
                          )}
                        >
                          {msg.message_type}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary truncate">{msg.content}</p>
                    </div>
                    <span
                      className={cn(
                        "text-xs shrink-0",
                        msg.status === "read" ? "text-accent-blue" :
                        msg.status === "delivered" ? "text-accent-green" :
                        msg.status === "failed" ? "text-error" :
                        "text-text-muted"
                      )}
                    >
                      {msg.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "contacts" && (
            <div className="space-y-2">
              {contacts.length === 0 ? (
                <EmptyTab
                  icon={<Users className="w-10 h-10 text-text-muted" />}
                  title="No contacts yet"
                  description="Contacts will be synced automatically when the instance is connected."
                />
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center">
                      {contact.profile_picture ? (
                        <img
                          src={contact.profile_picture}
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{contact.name}</p>
                      <p className="text-xs text-text-muted truncate">{contact.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {contact.is_business && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-blue/10 text-accent-blue">
                          Business
                        </span>
                      )}
                      {contact.last_message_at && (
                        <span className="text-xs text-text-muted">
                          {formatRelativeTime(contact.last_message_at)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "groups" && (
            <div className="space-y-2">
              {groups.length === 0 ? (
                <EmptyTab
                  icon={<Hash className="w-10 h-10 text-text-muted" />}
                  title="No groups yet"
                  description="Groups will be synced automatically when the instance is connected."
                />
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent-orange/10 flex items-center justify-center">
                      <Hash className="w-5 h-5 text-accent-orange" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{group.name}</p>
                      <p className="text-xs text-text-muted truncate">{group.description || "No description"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {group.participants_count} members
                      </span>
                      {group.is_admin && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-green/10 text-accent-green">
                          Admin
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-2xl space-y-6">
              <div className="bg-surface border border-border rounded-lg divide-y divide-border">
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Instance ID</span>
                  <span className="text-sm text-text-primary font-mono">{instance.id}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Engine</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    instance.engine === "cloud_api"
                      ? "bg-accent-blue/10 text-accent-blue"
                      : "bg-accent-purple/10 text-accent-purple"
                  )}>
                    {instance.engine === "cloud_api" ? "Cloud API" : "Baileys"}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Phone Number</span>
                  <span className="text-sm text-text-primary">{instance.phone_number || "Not connected"}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Daily Limit</span>
                  <span className="text-sm text-text-primary">{instance.daily_limit}</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Warm-up Day</span>
                  <span className="text-sm text-text-primary">{instance.warmup_day}/30</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Webhook URL</span>
                  <span className="text-sm text-text-primary font-mono truncate max-w-xs">
                    {instance.webhook_url || "Not configured"}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-text-muted">Created</span>
                  <span className="text-sm text-text-primary">
                    {new Date(instance.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ============ Helper Components ============

interface EmptyTabProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyTab({ icon, title, description }: EmptyTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 mb-4 rounded-2xl bg-surface flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary text-center max-w-sm">{description}</p>
    </div>
  );
}

// ============ Helpers ============

function formatJid(jid: string): string {
  // Convert WhatsApp JID to readable format
  const phone = jid.split("@")[0];
  if (phone.length > 10) {
    return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4)}`;
  }
  return phone;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
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
