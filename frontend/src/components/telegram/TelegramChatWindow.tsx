/**
 * FlowCube - Telegram Chat Window
 * Displays chat messages in a WhatsApp-style bubble interface
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  Megaphone,
  Bot,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  MapPin,
  Phone,
  Reply,
  MoreVertical,
  Trash2,
  Copy,
  Forward,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegramStore, useSelectedChat } from '@/stores/telegramStore';
import type { TelegramMessage, MessageType } from '@/types/telegram.types';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

interface TelegramChatWindowProps {
  className?: string;
}

function getMessageIcon(type: MessageType) {
  switch (type) {
    case 'photo':
      return ImageIcon;
    case 'video':
    case 'video_note':
      return Video;
    case 'document':
      return FileText;
    case 'audio':
    case 'voice':
      return Mic;
    case 'location':
      return MapPin;
    case 'contact':
      return Phone;
    default:
      return null;
  }
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'HH:mm');
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function MessageStatusIcon({ status }: { status: TelegramMessage['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock className="w-3 h-3 text-gray-400" />;
    case 'sent':
      return <Check className="w-3 h-3 text-gray-400" />;
    case 'delivered':
      return <CheckCheck className="w-3 h-3 text-gray-400" />;
    case 'read':
      return <CheckCheck className="w-3 h-3 text-blue-500" />;
    case 'failed':
      return <AlertCircle className="w-3 h-3 text-red-500" />;
    default:
      return null;
  }
}

interface MessageBubbleProps {
  message: TelegramMessage;
  onReply: () => void;
  onDelete: () => void;
}

function MessageBubble({ message, onReply, onDelete }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';
  const MediaIcon = message.message_type !== 'text' ? getMessageIcon(message.message_type) : null;

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={cn(
        'flex gap-2 group max-w-[85%]',
        isOutbound ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Message Bubble */}
      <div
        className={cn(
          'relative px-4 py-2 rounded-2xl shadow-sm',
          isOutbound
            ? 'bg-blue-500 text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-700'
        )}
      >
        {/* Reply preview if replying to a message */}
        {message.reply_to_message && (
          <div
            className={cn(
              'mb-2 px-3 py-1.5 rounded border-l-2 text-xs',
              isOutbound
                ? 'bg-blue-400/30 border-white/50'
                : 'bg-gray-100 dark:bg-gray-700 border-blue-500'
            )}
          >
            <p className="font-medium truncate">
              {message.reply_to_message.from_user?.first_name || 'Unknown'}
            </p>
            <p className="truncate opacity-75">
              {message.reply_to_message.text || message.reply_to_message.caption || 'Media'}
            </p>
          </div>
        )}

        {/* Media content */}
        {message.photo && message.photo.length > 0 && (
          <div className="mb-2 -mx-2 -mt-1">
            <img
              src={`/api/telegram/file/${message.photo[message.photo.length - 1].file_id}`}
              alt="Photo"
              className="rounded-lg max-w-full h-auto"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}

        {message.video && (
          <div className="mb-2 -mx-2 -mt-1">
            <video
              src={`/api/telegram/file/${message.video.file_id}`}
              controls
              className="rounded-lg max-w-full h-auto"
              style={{ maxHeight: '300px' }}
            />
          </div>
        )}

        {message.document && (
          <a
            href={`/api/telegram/file/${message.document.file_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg mb-2',
              isOutbound ? 'bg-blue-400/30' : 'bg-gray-100 dark:bg-gray-700'
            )}
          >
            <FileText className="w-8 h-8" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {message.document.file_name || 'Document'}
              </p>
              {message.document.file_size && (
                <p className="text-xs opacity-75">
                  {(message.document.file_size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </a>
        )}

        {message.voice && (
          <audio
            src={`/api/telegram/file/${message.voice.file_id}`}
            controls
            className="mb-2"
          />
        )}

        {message.location && (
          <a
            href={`https://www.google.com/maps?q=${message.location.latitude},${message.location.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg mb-2',
              isOutbound ? 'bg-blue-400/30' : 'bg-gray-100 dark:bg-gray-700'
            )}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-sm">View location</span>
          </a>
        )}

        {message.contact && (
          <div
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg mb-2',
              isOutbound ? 'bg-blue-400/30' : 'bg-gray-100 dark:bg-gray-700'
            )}
          >
            <Phone className="w-5 h-5" />
            <div>
              <p className="text-sm font-medium">{message.contact.first_name}</p>
              <p className="text-xs opacity-75">{message.contact.phone_number}</p>
            </div>
          </div>
        )}

        {/* Text content */}
        {(message.text || message.caption) && (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.text || message.caption}
          </p>
        )}

        {/* Inline keyboard */}
        {message.reply_markup && 'inline_keyboard' in message.reply_markup && (
          <div className="mt-2 space-y-1">
            {message.reply_markup.inline_keyboard.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1">
                {row.map((button, btnIndex) => (
                  <button
                    key={btnIndex}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                      isOutbound
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    )}
                  >
                    {button.text}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Time and status */}
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOutbound ? 'justify-end' : 'justify-start'
          )}
        >
          <span className={cn('text-[10px]', isOutbound ? 'text-blue-100' : 'text-gray-400')}>
            {formatMessageTime(message.date)}
          </span>
          {isOutbound && <MessageStatusIcon status={message.status} />}
          {message.is_ai_generated && (
            <Bot className={cn('w-3 h-3', isOutbound ? 'text-blue-100' : 'text-gray-400')}  />
          )}
        </div>

        {/* Context menu trigger */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              'p-1 rounded-full transition-colors',
              isOutbound ? 'hover:bg-blue-400' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Context menu */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'absolute top-full right-0 mt-1 w-36 py-1 rounded-lg shadow-lg border z-10',
                  'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                )}
              >
                <button
                  onClick={() => {
                    onReply();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Reply className="w-4 h-4" />
                  Reply
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.text || message.caption || '');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                {isOutbound && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Need to import useState
import { useState } from 'react';

export function TelegramChatWindow({ className }: TelegramChatWindowProps) {
  const {
    selectedBotId,
    messages,
    messagesLoading,
    messagesError,
    hasMoreMessages,
    fetchMessages,
    deleteMessage,
    setMessageReplyTo,
  } = useTelegramStore();

  const selectedChat = useSelectedChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Load more messages on scroll to top
  const handleScroll = useCallback(() => {
    if (!containerRef.current || messagesLoading || !hasMoreMessages) return;

    const { scrollTop } = containerRef.current;
    if (scrollTop < 100) {
      fetchMessages(undefined, true);
    }
  }, [messagesLoading, hasMoreMessages, fetchMessages]);

  // Handle reply
  const handleReply = useCallback((message: TelegramMessage) => {
    setMessageReplyTo(message);
  }, [setMessageReplyTo]);

  // Handle delete
  const handleDelete = useCallback(async (message: TelegramMessage) => {
    if (confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(message.id, message.telegram_message_id);
    }
  }, [deleteMessage]);

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.date).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, TelegramMessage[]>);

  if (!selectedChat) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50', className)}>
        <div className="p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <Bot className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select a chat
          </h3>
          <p className="text-sm">
            Choose a conversation from the list to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-100 dark:bg-gray-900/50', className)}>
      {/* Chat Header */}
      <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center',
          selectedChat.type === 'private' ? 'bg-blue-100 dark:bg-blue-900/30' :
          selectedChat.type === 'group' || selectedChat.type === 'supergroup' ? 'bg-green-100 dark:bg-green-900/30' :
          'bg-purple-100 dark:bg-purple-900/30'
        )}>
          {selectedChat.type === 'private' ? (
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : selectedChat.type === 'group' || selectedChat.type === 'supergroup' ? (
            <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white truncate">
            {selectedChat.title || `${selectedChat.first_name || ''} ${selectedChat.last_name || ''}`.trim() || selectedChat.username}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {selectedChat.type === 'private' ? (
              selectedChat.username ? `@${selectedChat.username}` : 'Private chat'
            ) : (
              `${selectedChat.member_count || 0} members`
            )}
          </p>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Loading more indicator */}
        {messagesLoading && hasMoreMessages && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}

        {/* Error state */}
        {messagesError && (
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm">{messagesError}</p>
            <button
              onClick={() => fetchMessages()}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Messages grouped by date */}
        {Object.entries(groupedMessages)
          .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
          .map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs text-gray-500 dark:text-gray-400 shadow-sm">
                  {formatDateSeparator(dateMessages[0].date)}
                </span>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {dateMessages
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onReply={() => handleReply(message)}
                      onDelete={() => handleDelete(message)}
                    />
                  ))}
              </div>
            </div>
          ))}

        {/* Empty state */}
        {!messagesLoading && messages.length === 0 && !messagesError && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default TelegramChatWindow;
