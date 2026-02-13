"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Send, ArrowLeft, MessageSquare } from "lucide-react";
import { chatApi, type ChatSession, type ChatSessionDetail, type ChatMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ChatCubeConversationsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<ChatSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) fetchDetail(selectedSession);
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessionDetail?.messages]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await chatApi.getSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await chatApi.getSession(id);
      setSessionDetail(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSend = async () => {
    if (!messageText.trim() || !selectedSession) return;
    setSending(true);
    try {
      await chatApi.sendMessage(selectedSession, messageText);
      setMessageText("");
      await fetchDetail(selectedSession);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const filtered = sessions.filter((s) => {
    if (!searchQuery) return true;
    return s.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.contact_phone?.includes(searchQuery);
  });

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar - Conversations List */}
      <div className={cn(
        "w-80 border-r border-gray-800 flex flex-col bg-gray-900 flex-shrink-0",
        selectedSession ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">Nenhuma conversa</div>
          ) : (
            filtered.map((session) => (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800 transition-colors",
                  selectedSession === session.id && "bg-gray-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-gray-100 truncate">{session.contact_name || session.contact_phone}</h4>
                    <p className="text-xs text-gray-500">
                      {session.message_count} msgs
                      {session.last_message_at && ` | ${new Date(session.last_message_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {selectedSession && sessionDetail ? (
          <>
            {/* Chat Header */}
            <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-800">
              <button onClick={() => setSelectedSession(null)} className="md:hidden text-gray-400 hover:text-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-100">{sessionDetail.contact_name || sessionDetail.contact_phone}</h3>
                <p className="text-xs text-gray-500">{sessionDetail.contact_phone}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detailLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                (sessionDetail.messages || []).map((msg: ChatMessage) => (
                  <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] rounded-xl px-3 py-2",
                      msg.direction === "outbound"
                        ? "bg-indigo-600 text-white rounded-br-sm"
                        : "bg-gray-800 text-gray-100 rounded-bl-sm"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={cn(
                        "text-[10px] mt-1",
                        msg.direction === "outbound" ? "text-indigo-200" : "text-gray-500"
                      )}>
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {msg.is_ai_generated && " (IA)"}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Digite uma mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
