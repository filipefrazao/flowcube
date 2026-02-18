"use client";

import { useEffect, useState, useRef } from "react";
import { Users, Loader2, MessageSquare, ArrowLeft, Send } from "lucide-react";
import { chatcubeApi } from "@/lib/chatcubeApi";
import { AppSidebar } from "@/components/layout/AppSidebar";
import type { WhatsAppGroup, WhatsAppMessage } from "@/types/chatcube.types";
import { cn } from "@/lib/utils";

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ============================================================================
// Page
// ============================================================================

export default function GroupsPage() {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstance, setSelectedInstance] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadInstances(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadInstances() {
    try {
      const d = await chatcubeApi.listInstances();
      setInstances(d.results || []);
      if (d.results?.length > 0) {
        setSelectedInstance(d.results[0].id);
        loadGroups(d.results[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  async function loadGroups(instanceId: string) {
    try {
      setLoading(true);
      const d = await chatcubeApi.getGroups(instanceId);
      setGroups(d.results || []);
      setSelectedGroup(null);
      setMessages([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupMessages(group: WhatsAppGroup) {
    if (!selectedInstance) return;
    setMessagesLoading(true);
    setMessages([]);
    try {
      const d = await chatcubeApi.getMessages(selectedInstance, { remote_jid: group.jid, limit: 100 });
      setMessages(d.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  }

  async function handleSend() {
    if (!messageText.trim() || !selectedGroup || !selectedInstance) return;
    setSending(true);
    try {
      await chatcubeApi.sendMessage(selectedInstance, {
        to: selectedGroup.jid,
        content: messageText,
      });
      setMessageText("");
      // Reload messages to show the sent message
      await loadGroupMessages(selectedGroup);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (selectedInstance) loadGroups(selectedInstance);
  }, [selectedInstance]);

  const handleSelectGroup = (group: WhatsAppGroup) => {
    setSelectedGroup(group);
    loadGroupMessages(group);
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-background flex items-center px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            <Users className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">Grupos</h1>
            <span className="text-sm text-text-muted">
              {groups.length} grupo{groups.length !== 1 ? "s" : ""}
            </span>
          </div>
          {instances.length > 1 && (
            <select
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
            >
              {instances.map((inst: any) => (
                <option key={inst.id} value={inst.id}>{inst.name || inst.id}</option>
              ))}
            </select>
          )}
        </header>

        {/* Main Content - 2 Panel Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT PANEL - Groups List */}
          <div className={cn(
            "w-[300px] border-r border-border flex flex-col bg-surface flex-shrink-0",
            selectedGroup ? "hidden md:flex" : "flex"
          )}>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-20 text-text-muted">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhum grupo encontrado</p>
                </div>
              ) : (
                groups.map((g) => {
                  const isActive = selectedGroup?.id === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleSelectGroup(g)}
                      className={cn(
                        "w-full text-left px-3 py-3 border-b border-border/30 hover:bg-surface-hover transition-colors",
                        isActive && "bg-primary/10 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                          isActive ? "bg-primary text-white" : "bg-primary/15 text-primary"
                        )}>
                          {getInitials(g.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-sm font-medium text-text-primary truncate">{g.name}</h4>
                            {g.is_admin && (
                              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">Admin</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted">
                            {g.participants_count} participante{g.participants_count !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL - Message History + Send */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            {selectedGroup ? (
              <>
                {/* Chat Header */}
                <div className="h-14 flex items-center gap-3 px-4 border-b border-border flex-shrink-0">
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="md:hidden text-text-muted hover:text-text-primary"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary">{getInitials(selectedGroup.name)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{selectedGroup.name}</h3>
                    <p className="text-xs text-text-muted">{selectedGroup.participants_count} participantes</p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto px-4 py-4"
                  style={{
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                >
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="text-center">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 text-text-muted opacity-30" />
                        <p className="text-sm text-text-muted">Nenhuma mensagem neste grupo</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-w-3xl mx-auto">
                      {messages.map((msg, idx) => {
                        const isOutbound = msg.from_me;
                        const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const msgDate = new Date(msg.timestamp).toLocaleDateString("pt-BR");
                        const prevDate = prevMsg ? new Date(prevMsg.timestamp).toLocaleDateString("pt-BR") : null;
                        const showDateSep = idx === 0 || msgDate !== prevDate;

                        return (
                          <div key={msg.id}>
                            {showDateSep && (
                              <div className="flex items-center justify-center my-4">
                                <span className="bg-surface px-3 py-1 rounded-full text-[11px] text-text-muted font-medium">
                                  {msgDate}
                                </span>
                              </div>
                            )}
                            <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[65%] rounded-2xl px-3.5 py-2 shadow-sm",
                                  isOutbound
                                    ? "bg-primary text-white rounded-br-md"
                                    : "bg-surface text-text-primary border border-border/50 rounded-bl-md"
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                                <div className={cn(
                                  "flex items-center justify-end gap-1 mt-1",
                                  isOutbound ? "text-white/60" : "text-text-muted"
                                )}>
                                  <span className="text-[10px]">{time}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="px-4 py-3 border-t border-border bg-background flex-shrink-0">
                  <div className="flex items-center gap-2 max-w-3xl mx-auto">
                    <input
                      type="text"
                      placeholder="Digite uma mensagem para o grupo..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!messageText.trim() || sending}
                      className={cn(
                        "p-2.5 rounded-xl transition-all",
                        messageText.trim()
                          ? "bg-primary hover:bg-primary-hover text-white shadow-sm"
                          : "bg-surface text-text-muted"
                      )}
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
                    <Users className="w-10 h-10 text-text-muted opacity-50" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">Selecione um grupo</h3>
                  <p className="text-sm text-text-muted max-w-xs">
                    Escolha um grupo na lista ao lado para visualizar o histórico e enviar mensagens.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
