/**
 * FlowCube - Agent Chat Component
 * Real-time chat interface with streaming support
 */
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Loader2,
  StopCircle,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  MessageSquare,
  Wrench,
  Brain,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  DollarSign,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAIAgentStore } from "@/stores/aiAgentStore";
import {
  AgentMessage,
  MessageRole,
  MessageStatus,
  MessageToolCall,
  ToolExecutionStatus,
} from "@/types/aiAgents.types";
import TokenUsageDisplay from "./TokenUsageDisplay";

interface AgentChatProps {
  agentId: string;
  conversationId?: string | null;
  showHeader?: boolean;
  onConversationCreated?: (conversationId: string) => void;
}

export default function AgentChat({
  agentId,
  conversationId,
  showHeader = true,
  onConversationCreated,
}: AgentChatProps) {
  const {
    agents,
    messages,
    messagesLoading,
    streaming,
    activeToolCalls,
    chatInput,
    setChatInput,
    sendMessage,
    sendMessageStream,
    cancelStreaming,
    createConversation,
    selectConversation,
    clearMessages,
    fetchMessages,
    selectedConversationId,
  } = useAIAgentStore();

  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const [expandedToolCalls, setExpandedToolCalls] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<{ abort: () => void } | null>(null);

  const agent = useMemo(
    () => agents.find((a) => a.id === agentId),
    [agents, agentId]
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming.accumulatedContent]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      selectConversation(conversationId);
    }
  }, [conversationId, selectConversation]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    setChatInput(textarea.value);
  }, [setChatInput]);

  const handleSend = useCallback(async () => {
    if (!chatInput.trim() || streaming.isStreaming) return;

    const message = chatInput.trim();
    setChatInput("");
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      // Create conversation if needed
      if (!selectedConversationId) {
        const conv = await createConversation(agentId);
        onConversationCreated?.(conv.id);
      }

      // Send with streaming
      abortRef.current = sendMessageStream(message);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [chatInput, streaming.isStreaming, selectedConversationId, agentId, setChatInput, createConversation, onConversationCreated, sendMessageStream]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    cancelStreaming();
  }, [cancelStreaming]);

  const handleCopy = useCallback(async (messageId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const toggleThinking = useCallback((messageId: string) => {
    setExpandedThinking((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const toggleToolCalls = useCallback((messageId: string) => {
    setExpandedToolCalls((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const renderToolCall = (toolCall: MessageToolCall, isActive: boolean = false) => {
    const statusColors: Record<ToolExecutionStatus, string> = {
      pending: "text-gray-500 bg-gray-100",
      running: "text-blue-500 bg-blue-100",
      success: "text-green-500 bg-green-100",
      error: "text-red-500 bg-red-100",
      timeout: "text-orange-500 bg-orange-100",
    };

    const statusIcons: Record<ToolExecutionStatus, React.ReactNode> = {
      pending: <Clock className="w-3 h-3" />,
      running: <Loader2 className="w-3 h-3 animate-spin" />,
      success: <Check className="w-3 h-3" />,
      error: <AlertCircle className="w-3 h-3" />,
      timeout: <Clock className="w-3 h-3" />,
    };

    return (
      <div
        key={toolCall.id}
        className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-sm font-medium">{toolCall.name}</span>
            <span className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
              statusColors[toolCall.status]
            )}>
              {statusIcons[toolCall.status]}
              {toolCall.status}
            </span>
          </div>
        </div>
        {toolCall.arguments && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Arguments:</div>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {typeof toolCall.arguments === "string" 
                ? toolCall.arguments 
                : JSON.stringify(JSON.parse(toolCall.arguments), null, 2)}
            </pre>
          </div>
        )}
        {toolCall.result && (
          <div className="mt-2">
            <div className="text-xs text-gray-500 mb-1">Result:</div>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto max-h-40">
              {toolCall.result}
            </pre>
          </div>
        )}
        {toolCall.error && (
          <div className="mt-2 text-xs text-red-500">
            Error: {toolCall.error}
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (message: AgentMessage, index: number) => {
    const isUser = message.role === MessageRole.USER;
    const isStreaming = message.status === MessageStatus.STREAMING;
    const hasThinking = !!message.thinking;
    const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;
    const isThinkingExpanded = expandedThinking.has(message.id);
    const isToolCallsExpanded = expandedToolCalls.has(message.id);

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex gap-3 p-4",
          isUser ? "bg-transparent" : "bg-gray-50"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            isUser
              ? "bg-blue-500"
              : "bg-gradient-to-br from-pink-500 to-purple-600"
          )}
        >
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {isUser ? "You" : agent?.name || "Assistant"}
            </span>
            {message.latency_ms && (
              <span className="text-xs text-gray-400">
                {message.latency_ms}ms
              </span>
            )}
            {isStreaming && (
              <span className="flex items-center gap-1 text-xs text-pink-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating...
              </span>
            )}
          </div>

          {/* Thinking section */}
          {hasThinking && (
            <div className="mb-3">
              <button
                onClick={() => toggleThinking(message.id)}
                className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-700"
              >
                <Brain className="w-4 h-4" />
                <span>Thinking</span>
                {isThinkingExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              <AnimatePresence>
                {isThinkingExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 p-3 rounded-lg bg-purple-50 border border-purple-200 overflow-hidden"
                  >
                    <pre className="text-sm text-purple-800 whitespace-pre-wrap font-mono">
                      {message.thinking}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Message content */}
          <div className="prose prose-sm max-w-none text-gray-700">
            {message.content || (isStreaming && streaming.accumulatedContent) || (
              <span className="text-gray-400 italic">
                {isStreaming ? "Thinking..." : "No content"}
              </span>
            )}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-pink-500 animate-pulse ml-0.5" />
            )}
          </div>

          {/* Tool calls */}
          {hasToolCalls && (
            <div className="mt-3">
              <button
                onClick={() => toggleToolCalls(message.id)}
                className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-700"
              >
                <Wrench className="w-4 h-4" />
                <span>{message.tool_calls?.length} tool call(s)</span>
                {isToolCallsExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
              <AnimatePresence>
                {isToolCallsExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {message.tool_calls?.map((tc) => renderToolCall(tc))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Usage stats */}
          {message.usage && (
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {message.usage.total_tokens.toLocaleString()} tokens
              </span>
              {message.usage.cost_usd > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${message.usage.cost_usd.toFixed(4)}
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {!isUser && !isStreaming && message.content && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => handleCopy(message.id, message.content)}
                className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy to clipboard"
              >
                {copiedMessageId === message.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Render active tool calls during streaming
  const renderActiveToolCalls = () => {
    if (activeToolCalls.size === 0) return null;

    return (
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
          <Wrench className="w-4 h-4" />
          <span>Executing tools...</span>
        </div>
        {Array.from(activeToolCalls.values()).map((tc) =>
          renderToolCall({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            status: tc.status,
            result: tc.result,
            error: tc.error,
          } as MessageToolCall)
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      {showHeader && agent && (
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              {agent.avatar_url ? (
                <img
                  src={agent.avatar_url}
                  alt={agent.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-xs text-gray-500">{agent.model_config.model}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedConversationId && (
              <button
                onClick={clearMessages}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 && !streaming.isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-500 max-w-sm">
              Ask {agent?.name || "the assistant"} anything to begin.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => renderMessage(message, index))}
            {streaming.isStreaming && activeToolCalls.size > 0 && renderActiveToolCalls()}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              disabled={streaming.isStreaming}
              className={cn(
                "w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white resize-none",
                "focus:ring-2 focus:ring-pink-500 focus:border-transparent",
                "disabled:bg-gray-50 disabled:text-gray-500"
              )}
              style={{ maxHeight: "200px" }}
            />
          </div>
          {streaming.isStreaming ? (
            <button
              onClick={handleStop}
              className="p-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
              title="Stop generating"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!chatInput.trim()}
              className={cn(
                "p-3 rounded-xl transition-colors",
                chatInput.trim()
                  ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
