/**
 * FlowCube - Telegram Chat List
 * Displays list of chats with search and filtering
 */
'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  User,
  Users,
  Megaphone,
  Archive,
  MoreVertical,
  MessageSquare,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCheck,
  Check,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegramStore, useFilteredChats, useSelectedChat } from '@/stores/telegramStore';
import type { TelegramChat, ChatType } from '@/types/telegram.types';
import { formatDistanceToNow } from 'date-fns';

interface TelegramChatListProps {
  className?: string;
}

const CHAT_FILTERS = [
  { id: 'all', label: 'All', icon: MessageSquare },
  { id: 'private', label: 'Private', icon: User },
  { id: 'group', label: 'Groups', icon: Users },
  { id: 'channel', label: 'Channels', icon: Megaphone },
  { id: 'archived', label: 'Archived', icon: Archive },
] as const;

function getChatIcon(type: ChatType) {
  switch (type) {
    case 'private':
      return User;
    case 'group':
    case 'supergroup':
      return Users;
    case 'channel':
      return Megaphone;
    default:
      return MessageSquare;
  }
}

function getChatName(chat: TelegramChat): string {
  return chat.title || `${chat.first_name || ''} ${chat.last_name || ''}`.trim() || chat.username || 'Unknown';
}

function formatLastMessage(chat: TelegramChat): string {
  if (!chat.last_message_preview) return 'No messages yet';
  const preview = chat.last_message_preview;
  return preview.length > 40 ? `${preview.substring(0, 40)}...` : preview;
}

export function TelegramChatList({ className }: TelegramChatListProps) {
  const {
    selectedBotId,
    selectedChatId,
    chatsLoading,
    chatsError,
    chatFilter,
    chatSearchQuery,
    fetchChats,
    selectChat,
    setChatFilter,
    setChatSearchQuery,
  } = useTelegramStore();

  const filteredChats = useFilteredChats();
  const selectedChat = useSelectedChat();

  // Fetch chats when bot is selected
  useEffect(() => {
    if (selectedBotId) {
      fetchChats();
    }
  }, [selectedBotId, fetchChats]);

  // Sort chats by last message date
  const sortedChats = useMemo(() => {
    return [...filteredChats].sort((a, b) => {
      const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredChats]);

  if (!selectedBotId) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400', className)}>
        <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">Select a bot to view chats</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-white dark:bg-gray-900', className)}>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-2 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex gap-1">
          {CHAT_FILTERS.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => setChatFilter(filter.id as typeof chatFilter)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                  chatFilter === filter.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {sortedChats.length} chat{sortedChats.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => fetchChats()}
          disabled={chatsLoading}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={cn('w-4 h-4', chatsLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chatsLoading && sortedChats.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : chatsError ? (
          <div className="flex flex-col items-center justify-center h-32 text-red-500 px-4">
            <AlertCircle className="w-6 h-6 mb-2" />
            <p className="text-sm text-center">{chatsError}</p>
            <button
              onClick={() => fetchChats()}
              className="mt-2 text-sm text-blue-500 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400 px-4">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">
              {chatSearchQuery ? 'No chats match your search' : 'No chats yet'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedChats.map((chat, index) => {
              const Icon = getChatIcon(chat.type);
              const isSelected = chat.id === selectedChatId;

              return (
                <motion.button
                  key={chat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => selectChat(chat.id)}
                  className={cn(
                    'w-full flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left',
                    isSelected && 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0',
                    chat.type === 'private' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    chat.type === 'group' || chat.type === 'supergroup' ? 'bg-green-100 dark:bg-green-900/30' :
                    'bg-purple-100 dark:bg-purple-900/30'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5',
                      chat.type === 'private' ? 'text-blue-600 dark:text-blue-400' :
                      chat.type === 'group' || chat.type === 'supergroup' ? 'text-green-600 dark:text-green-400' :
                      'text-purple-600 dark:text-purple-400'
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {getChatName(chat)}
                      </span>
                      {chat.last_message_at && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(chat.last_message_at), { addSuffix: false })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {formatLastMessage(chat)}
                      </p>
                      {chat.unread_count > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full flex-shrink-0">
                          {chat.unread_count > 99 ? '99+' : chat.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Labels */}
                    {chat.labels && chat.labels.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {chat.labels.slice(0, 3).map((label, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                          >
                            {label}
                          </span>
                        ))}
                        {chat.labels.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{chat.labels.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status indicators */}
                  <div className="flex flex-col items-end gap-1">
                    {chat.is_muted && (
                      <span className="text-gray-400" title="Muted">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      </span>
                    )}
                    {chat.is_archived && (
                      <Archive className="w-4 h-4 text-gray-400"  />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default TelegramChatList;
