"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  Filter,
  User,
  Bot,
  Clock,
  CheckCheck,
  AlertCircle,
  Send,
  Paperclip,
  Smile,
  Phone,
  MoreVertical,
  ArrowLeft,
  Users,
  Inbox,
  Archive,
  Star,
  RefreshCw,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { GlassCard, PremiumButton } from "@/components/ui/premium";
import { GradientBlobs } from "@/components/effects";
import { cn } from "@/lib/utils";
import { chatApi, ChatSession, ChatSessionDetail, ChatMessage, ChatStats } from "@/lib/api";

type StatusFilter = "all" | "active" | "handoff" | "completed";

export default function ConversationsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSessionDetail | null>(null);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const params: { status?: string; search?: string } = {};
      if (filter !== "all") {
        params.status = filter === "handoff" ? "handoff" : filter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      const data = await chatApi.getSessions();
      setSessions(data);
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError("Erro ao carregar conversas");
    } finally {
      setIsLoading(false);
    }
  }, [filter, searchQuery]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await chatApi.getStats();
      setStats(data);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, []);

  // Load session details with messages
  const loadSessionDetails = useCallback(async (sessionId: string) => {
    try {
      setIsLoadingMessages(true);
      const data = await chatApi.getSession(sessionId);
      setSelectedSession(data);
    } catch (err) {
      console.error("Error loading session details:", err);
      setError("Erro ao carregar mensagens");
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadSessions();
    loadStats();
  }, [loadSessions, loadStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadSessions();
      loadStats();
      if (selectedSession) {
        loadSessionDetails(String(selectedSession.id));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [loadSessions, loadStats, loadSessionDetails, selectedSession]);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedSession?.messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSession) return;

    setIsSending(true);
    try {
      await chatApi.sendMessage(String(selectedSession.id), newMessage.trim());
      setNewMessage("");
      // Reload messages
      await loadSessionDetails(String(selectedSession.id));
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Erro ao enviar mensagem");
    } finally {
      setIsSending(false);
    }
  };

  // Assign session to current user
  const handleAssignSession = async () => {
    if (!selectedSession) return;
    try {
      // await chatApi.assignSession(selectedSession.id); // TODO: Implement assignSession API
      await loadSessionDetails(String(selectedSession.id));
      await loadSessions();
    } catch (err) {
      console.error("Error assigning session:", err);
    }
  };

  // Close session
  const handleCloseSession = async () => {
    if (!selectedSession) return;
    try {
      // await chatApi.closeSession(selectedSession.id); // TODO: Implement closeSession API
      setSelectedSession(null);
      await loadSessions();
    } catch (err) {
      console.error("Error closing session:", err);
    }
  };

  // Handle session selection
  const handleSelectSession = (session: ChatSession) => {
    loadSessionDetails(String(session.id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "waiting_input":
      case "waiting_ai":
        return "text-green-400 bg-green-500/20";
      case "handoff":
        return "text-red-400 bg-red-500/20";
      case "completed":
      case "expired":
        return "text-gray-400 bg-gray-500/20";
      default:
        return "text-yellow-400 bg-yellow-500/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "waiting_input": return "Aguardando";
      case "waiting_ai": return "Processando";
      case "handoff": return "Handoff";
      case "completed": return "Finalizado";
      case "expired": return "Expirado";
      default: return status;
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "agora";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex overflow-hidden relative">
        <GradientBlobs className="opacity-20" />

        {/* Conversations List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "w-80 border-r border-border/50 bg-background/80 backdrop-blur-sm flex flex-col z-10",
            selectedSession && "hidden md:flex"
          )}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                Conversas
                {stats && (stats.total || 0) > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                    {stats.total || 0}
                  </span>
                )}
              </h1>
              <button
                onClick={() => { loadSessions(); loadStats(); }}
                className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mt-3">
              {(["all", "active", "handoff", "completed"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    filter === f
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                >
                  {f === "all" ? "Todas" : f === "active" ? "Ativas" : f === "handoff" ? "Handoff" : "Finalizadas"}
                  {stats && f !== "all" && (
                    <span className="ml-1">
                      ({f === "active" ? (stats.by_status?.active || 0) : f === "handoff" ? (stats.by_status?.handoff || 0) : (stats.by_status?.completed || 0)})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-purple-400 mx-auto animate-spin" />
                <p className="text-gray-500 text-sm mt-2">Carregando...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 text-sm">{error}</p>
                <button
                  onClick={loadSessions}
                  className="mt-3 text-sm text-purple-400 hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nenhuma conversa encontrada</p>
                <p className="text-gray-600 text-xs mt-1">
                  As conversas aparecerao aqui quando usuarios iniciarem chats via WhatsApp
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {sessions.map((session, idx) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => handleSelectSession(session)}
                    className={cn(
                      "p-4 border-b border-gray-800/50 cursor-pointer transition-colors",
                      selectedSession?.id === session.id
                        ? "bg-purple-500/10 border-l-2 border-l-purple-500"
                        : "hover:bg-gray-800/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm">
                        {(session.contact_name || session.contact_phone).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white text-sm truncate">
                            {session.contact_name || session.contact_phone}
                          </span>
                          <span className="text-xs text-gray-500">{formatTime(session.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {session.contact_phone}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className={cn("text-xs px-1.5 py-0.5 rounded", getStatusColor(session.status))}>
                            {getStatusLabel(session.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {session.message_count} msgs
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col z-10",
          !selectedSession && "hidden md:flex"
        )}>
          {!selectedSession ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Selecione uma conversa para comecar</p>
                <p className="text-gray-500 text-sm mt-1">ou aguarde novas mensagens</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-medium">
                    {(selectedSession.contact_name || selectedSession.contact_phone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-medium text-white">{selectedSession.contact_name || "Contato"}</h2>
                    <p className="text-xs text-gray-400">{selectedSession.contact_phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-1 rounded", getStatusColor(selectedSession.status))}>
                    {getStatusLabel(selectedSession.status)}
                  </span>
                  {selectedSession.status === "handoff" && !selectedSession.assigned_to && (
                    <PremiumButton
                      variant="outline"
                      size="sm"
                      onClick={handleAssignSession}
                      icon={<UserPlus className="w-4 h-4" />}
                    >
                      Assumir
                    </PremiumButton>
                  )}
                  {selectedSession.status !== "completed" && (
                    <button
                      onClick={handleCloseSession}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-800/50"
                      title="Encerrar conversa"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                  </div>
                ) : selectedSession.messages?.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">Nenhuma mensagem ainda</p>
                    </div>
                  </div>
                ) : (
                  selectedSession.messages?.map((message, idx) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn(
                        "flex",
                        message.direction === "outbound" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5",
                          message.direction === "outbound"
                            ? message.is_ai_generated
                              ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white"
                              : "bg-gray-700 text-white"
                            : "bg-gray-800 text-gray-100"
                        )}
                      >
                        {message.is_ai_generated && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <Bot className="w-3 h-3 text-purple-300" />
                            <span className="text-xs text-purple-300">IA {message.ai_model || ""}</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-xs text-gray-400">{formatMessageTime(message.created_at)}</span>
                          {message.direction === "outbound" && (
                            <CheckCheck
                              className={cn(
                                "w-3.5 h-3.5",
                                message.read_at ? "text-blue-400" : message.delivered_at ? "text-gray-400" : "text-gray-600"
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              {selectedSession.status !== "completed" && selectedSession.status !== "expired" && (
                <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
                  <div className="flex items-end gap-3">
                    <button className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Digite sua mensagem..."
                        rows={1}
                        className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                      />
                    </div>
                    <button className="p-2.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50">
                      <Smile className="w-5 h-5" />
                    </button>
                    <PremiumButton
                      variant="gradient"
                      size="md"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      icon={isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    >
                      {isSending ? "" : "Enviar"}
                    </PremiumButton>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
