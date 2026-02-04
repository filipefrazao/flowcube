/**
 * FlowCube - Telegram Store
 * Zustand store for Telegram bot state management
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  TelegramBot,
  TelegramChat,
  TelegramMessage,
  TelegramBotCreateRequest,
  TelegramBotUpdateRequest,
  InlineKeyboardMarkup,
  ParseMode,
} from '@/types/telegram.types';
import { telegramApiClient } from '@/lib/api/telegram';

// ============ State Types ============

interface TelegramState {
  // Bot state
  bots: TelegramBot[];
  selectedBotId: string | null;
  botsLoading: boolean;
  botsError: string | null;

  // Chat state
  chats: TelegramChat[];
  selectedChatId: string | null;
  chatsLoading: boolean;
  chatsError: string | null;
  chatSearchQuery: string;
  chatFilter: 'all' | 'private' | 'group' | 'channel' | 'archived';

  // Message state
  messages: TelegramMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  hasMoreMessages: boolean;
  messageReplyTo: TelegramMessage | null;

  // UI state
  isSendingMessage: boolean;
  isSettingWebhook: boolean;
  showBotSetup: boolean;
  setupStep: number;
  draftMessage: string;
  draftKeyboard: InlineKeyboardMarkup | null;

  // Actions - Bots
  fetchBots: () => Promise<void>;
  createBot: (data: TelegramBotCreateRequest) => Promise<TelegramBot>;
  updateBot: (id: string, data: TelegramBotUpdateRequest) => Promise<TelegramBot>;
  deleteBot: (id: string) => Promise<void>;
  selectBot: (id: string | null) => void;
  verifyBotToken: (token: string) => Promise<{ valid: boolean; bot_info?: { id: number; username: string; first_name: string } }>;
  setWebhook: (botId: string, url: string, secretToken?: string) => Promise<void>;
  deleteWebhook: (botId: string) => Promise<void>;
  testBotConnection: (botId: string) => Promise<{ success: boolean; response_time_ms: number }>;

  // Actions - Chats
  fetchChats: (botId?: string) => Promise<void>;
  selectChat: (id: string | null) => void;
  updateChat: (chatId: string, data: { is_archived?: boolean; is_muted?: boolean; labels?: string[]; notes?: string }) => Promise<void>;
  archiveChat: (chatId: string) => Promise<void>;
  unarchiveChat: (chatId: string) => Promise<void>;
  setChatSearchQuery: (query: string) => void;
  setChatFilter: (filter: 'all' | 'private' | 'group' | 'channel' | 'archived') => void;

  // Actions - Messages
  fetchMessages: (chatId?: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (text: string, options?: { parseMode?: ParseMode; replyMarkup?: InlineKeyboardMarkup; replyToMessageId?: number }) => Promise<TelegramMessage | null>;
  sendPhoto: (photoUrl: string, caption?: string) => Promise<TelegramMessage | null>;
  deleteMessage: (messageId: string, telegramMessageId: number) => Promise<void>;
  setMessageReplyTo: (message: TelegramMessage | null) => void;

  // Actions - UI
  setShowBotSetup: (show: boolean) => void;
  setSetupStep: (step: number) => void;
  setDraftMessage: (text: string) => void;
  setDraftKeyboard: (keyboard: InlineKeyboardMarkup | null) => void;

  // Actions - Reset
  reset: () => void;
  resetMessages: () => void;
}

// ============ Initial State ============

const initialState = {
  bots: [] as TelegramBot[],
  selectedBotId: null as string | null,
  botsLoading: false,
  botsError: null as string | null,
  chats: [] as TelegramChat[],
  selectedChatId: null as string | null,
  chatsLoading: false,
  chatsError: null as string | null,
  chatSearchQuery: '',
  chatFilter: 'all' as const,
  messages: [] as TelegramMessage[],
  messagesLoading: false,
  messagesError: null as string | null,
  hasMoreMessages: true,
  messageReplyTo: null as TelegramMessage | null,
  isSendingMessage: false,
  isSettingWebhook: false,
  showBotSetup: false,
  setupStep: 0,
  draftMessage: '',
  draftKeyboard: null as InlineKeyboardMarkup | null,
};

// ============ Store ============

export const useTelegramStore = create<TelegramState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        fetchBots: async () => {
          set((state) => { state.botsLoading = true; state.botsError = null; });
          try {
            const bots = await telegramApiClient.bots.list();
            set((state) => { state.bots = bots; state.botsLoading = false; });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch bots';
            set((state) => { state.botsError = message; state.botsLoading = false; });
          }
        },

        createBot: async (data: TelegramBotCreateRequest) => {
          const bot = await telegramApiClient.bots.create(data);
          set((state) => { state.bots.push(bot); });
          return bot;
        },

        updateBot: async (id: string, data: TelegramBotUpdateRequest) => {
          const bot = await telegramApiClient.bots.update(id, data);
          set((state) => {
            const index = state.bots.findIndex((b: TelegramBot) => b.id === id);
            if (index !== -1) state.bots[index] = bot;
          });
          return bot;
        },

        deleteBot: async (id: string) => {
          await telegramApiClient.bots.delete(id);
          set((state) => {
            state.bots = state.bots.filter((b: TelegramBot) => b.id !== id);
            if (state.selectedBotId === id) {
              state.selectedBotId = null;
              state.chats = [];
              state.messages = [];
            }
          });
        },

        selectBot: (id: string | null) => {
          set((state) => {
            state.selectedBotId = id;
            state.chats = [];
            state.selectedChatId = null;
            state.messages = [];
          });
          if (id) get().fetchChats(id);
        },

        verifyBotToken: async (token: string) => {
          try {
            return await telegramApiClient.bots.verifyToken(token);
          } catch {
            return { valid: false };
          }
        },

        setWebhook: async (botId: string, url: string, secretToken?: string) => {
          set((state) => { state.isSettingWebhook = true; });
          try {
            await telegramApiClient.bots.setWebhook(botId, {
              url,
              secret_token: secretToken,
              allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'],
            });
            const bot = await telegramApiClient.bots.get(botId);
            set((state) => {
              const index = state.bots.findIndex((b: TelegramBot) => b.id === botId);
              if (index !== -1) state.bots[index] = bot;
              state.isSettingWebhook = false;
            });
          } catch (error) {
            set((state) => { state.isSettingWebhook = false; });
            throw error;
          }
        },

        deleteWebhook: async (botId: string) => {
          set((state) => { state.isSettingWebhook = true; });
          try {
            await telegramApiClient.bots.deleteWebhook(botId);
            const bot = await telegramApiClient.bots.get(botId);
            set((state) => {
              const index = state.bots.findIndex((b: TelegramBot) => b.id === botId);
              if (index !== -1) state.bots[index] = bot;
              state.isSettingWebhook = false;
            });
          } catch (error) {
            set((state) => { state.isSettingWebhook = false; });
            throw error;
          }
        },

        testBotConnection: async (botId: string) => {
          return await telegramApiClient.bots.testConnection(botId);
        },

        fetchChats: async (botId?: string) => {
          const id = botId || get().selectedBotId;
          if (!id) return;
          set((state) => { state.chatsLoading = true; state.chatsError = null; });
          try {
            const { chatFilter, chatSearchQuery } = get();
            const response = await telegramApiClient.chats.list(id, {
              type: chatFilter !== 'all' && chatFilter !== 'archived' ? chatFilter : undefined,
              is_archived: chatFilter === 'archived' ? true : undefined,
              search: chatSearchQuery || undefined,
            });
            set((state) => { state.chats = response.items; state.chatsLoading = false; });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch chats';
            set((state) => { state.chatsError = message; state.chatsLoading = false; });
          }
        },

        selectChat: (id: string | null) => {
          set((state) => {
            state.selectedChatId = id;
            state.messages = [];
            state.hasMoreMessages = true;
            state.messageReplyTo = null;
          });
          if (id) get().fetchMessages(id);
        },

        updateChat: async (chatId: string, data) => {
          const botId = get().selectedBotId;
          if (!botId) return;
          const chat = await telegramApiClient.chats.update(botId, chatId, data);
          set((state) => {
            const index = state.chats.findIndex((c: TelegramChat) => c.id === chatId);
            if (index !== -1) state.chats[index] = chat;
          });
        },

        archiveChat: async (chatId: string) => {
          const botId = get().selectedBotId;
          if (!botId) return;
          const chat = await telegramApiClient.chats.archive(botId, chatId);
          set((state) => {
            const index = state.chats.findIndex((c: TelegramChat) => c.id === chatId);
            if (index !== -1) state.chats[index] = chat;
          });
        },

        unarchiveChat: async (chatId: string) => {
          const botId = get().selectedBotId;
          if (!botId) return;
          const chat = await telegramApiClient.chats.unarchive(botId, chatId);
          set((state) => {
            const index = state.chats.findIndex((c: TelegramChat) => c.id === chatId);
            if (index !== -1) state.chats[index] = chat;
          });
        },

        setChatSearchQuery: (query: string) => {
          set((state) => { state.chatSearchQuery = query; });
          setTimeout(() => get().fetchChats(), 300);
        },

        setChatFilter: (filter: 'all' | 'private' | 'group' | 'channel' | 'archived') => {
          set((state) => { state.chatFilter = filter; });
          get().fetchChats();
        },

        fetchMessages: async (chatId?: string, loadMore?: boolean) => {
          const botId = get().selectedBotId;
          const id = chatId || get().selectedChatId;
          if (!botId || !id) return;
          set((state) => { state.messagesLoading = true; state.messagesError = null; });
          try {
            const { messages } = get();
            const beforeId = loadMore && messages.length > 0 ? messages[messages.length - 1].id : undefined;
            const response = await telegramApiClient.messages.list(botId, id, { page_size: 50, before_id: beforeId });
            set((state) => {
              state.messages = loadMore ? [...state.messages, ...response.items] : response.items;
              state.hasMoreMessages = response.has_more;
              state.messagesLoading = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch messages';
            set((state) => { state.messagesError = message; state.messagesLoading = false; });
          }
        },

        sendMessage: async (text: string, options) => {
          const botId = get().selectedBotId;
          const selectedChatId = get().selectedChatId;
          if (!botId || !selectedChatId) return null;
          const chat = get().chats.find((c: TelegramChat) => c.id === selectedChatId);
          if (!chat) return null;
          set((state) => { state.isSendingMessage = true; });
          try {
            const message = await telegramApiClient.messages.sendText(botId, {
              chat_id: chat.telegram_chat_id,
              text,
              parse_mode: options?.parseMode,
              reply_markup: options?.replyMarkup,
              reply_to_message_id: options?.replyToMessageId || get().messageReplyTo?.telegram_message_id,
            });
            set((state) => {
              state.messages = [message, ...state.messages];
              state.isSendingMessage = false;
              state.draftMessage = '';
              state.draftKeyboard = null;
              state.messageReplyTo = null;
            });
            return message;
          } catch (error) {
            set((state) => { state.isSendingMessage = false; });
            throw error;
          }
        },

        sendPhoto: async (photoUrl: string, caption?: string) => {
          const botId = get().selectedBotId;
          const selectedChatId = get().selectedChatId;
          if (!botId || !selectedChatId) return null;
          const chat = get().chats.find((c: TelegramChat) => c.id === selectedChatId);
          if (!chat) return null;
          set((state) => { state.isSendingMessage = true; });
          try {
            const message = await telegramApiClient.messages.sendPhoto(botId, {
              chat_id: chat.telegram_chat_id,
              photo: photoUrl,
              caption,
              reply_to_message_id: get().messageReplyTo?.telegram_message_id,
            });
            set((state) => {
              state.messages = [message, ...state.messages];
              state.isSendingMessage = false;
              state.messageReplyTo = null;
            });
            return message;
          } catch (error) {
            set((state) => { state.isSendingMessage = false; });
            throw error;
          }
        },

        deleteMessage: async (messageId: string, telegramMessageId: number) => {
          const botId = get().selectedBotId;
          const selectedChatId = get().selectedChatId;
          if (!botId || !selectedChatId) return;
          const chat = get().chats.find((c: TelegramChat) => c.id === selectedChatId);
          if (!chat) return;
          await telegramApiClient.messages.delete(botId, chat.telegram_chat_id, telegramMessageId);
          set((state) => { state.messages = state.messages.filter((m: TelegramMessage) => m.id !== messageId); });
        },

        setMessageReplyTo: (message: TelegramMessage | null) => {
          set((state) => { state.messageReplyTo = message; });
        },

        setShowBotSetup: (show: boolean) => {
          set((state) => { state.showBotSetup = show; if (!show) state.setupStep = 0; });
        },

        setSetupStep: (step: number) => {
          set((state) => { state.setupStep = step; });
        },

        setDraftMessage: (text: string) => {
          set((state) => { state.draftMessage = text; });
        },

        setDraftKeyboard: (keyboard: InlineKeyboardMarkup | null) => {
          set((state) => { state.draftKeyboard = keyboard; });
        },

        reset: () => set(initialState),
        resetMessages: () => set((state) => {
          state.messages = [];
          state.hasMoreMessages = true;
          state.messageReplyTo = null;
        }),
      })),
      {
        name: 'flowcube-telegram-store',
        partialize: (state) => ({
          selectedBotId: state.selectedBotId,
          chatFilter: state.chatFilter,
        }),
      }
    ),
    { name: 'TelegramStore' }
  )
);

// ============ Selector Hooks ============

export const useSelectedBot = () => {
  const bots = useTelegramStore((state) => state.bots);
  const selectedBotId = useTelegramStore((state) => state.selectedBotId);
  return bots.find((bot) => bot.id === selectedBotId) || null;
};

export const useSelectedChat = () => {
  const chats = useTelegramStore((state) => state.chats);
  const selectedChatId = useTelegramStore((state) => state.selectedChatId);
  return chats.find((chat: TelegramChat) => chat.id === selectedChatId) || null;
};

export const useFilteredChats = () => {
  const chats = useTelegramStore((state) => state.chats);
  const filter = useTelegramStore((state) => state.chatFilter);
  const searchQuery = useTelegramStore((state) => state.chatSearchQuery);

  return chats.filter((chat: TelegramChat) => {
    if (filter !== 'all' && filter !== 'archived' && chat.type !== filter) return false;
    if (filter === 'archived' && !chat.is_archived) return false;
    if (filter !== 'archived' && chat.is_archived) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (chat.title || chat.first_name || chat.username || '').toLowerCase();
      if (!name.includes(query)) return false;
    }
    return true;
  });
};

export default useTelegramStore;
