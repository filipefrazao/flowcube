/**
 * FlowCube - Instagram Store
 * Zustand store for Instagram DM state management
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  InstagramAccount,
  InstagramAccountConnectRequest,
  InstagramAccountUpdateRequest,
  InstagramConversation,
  InstagramMessage,
  InstagramQuickReply,
  InstagramIceBreaker,
  InstagramQuickReplyButton,
  MessagingWindowStatus,
  UpdateConversationRequest,
} from '@/types/instagram.types';
import { instagramApiClient } from '@/lib/api/instagram';

// ============ State Types ============

interface InstagramState {
  // Account state
  accounts: InstagramAccount[];
  selectedAccountId: string | null;
  accountsLoading: boolean;
  accountsError: string | null;

  // Conversation state
  conversations: InstagramConversation[];
  selectedConversationId: string | null;
  conversationsLoading: boolean;
  conversationsError: string | null;
  conversationSearchQuery: string;
  conversationFilter: 'all' | 'starred' | 'unread' | 'archived' | 'spam';

  // Message state
  messages: InstagramMessage[];
  messagesLoading: boolean;
  messagesError: string | null;
  hasMoreMessages: boolean;
  messageReplyTo: InstagramMessage | null;

  // Quick replies state
  quickReplies: InstagramQuickReply[];
  quickRepliesLoading: boolean;

  // Ice breakers state
  iceBreakers: InstagramIceBreaker[];
  iceBreakersLoading: boolean;

  // Messaging window state
  windowStatus: MessagingWindowStatus | null;

  // UI state
  isSendingMessage: boolean;
  isConnecting: boolean;
  showAccountSetup: boolean;
  setupStep: number;
  draftMessage: string;
  draftQuickReplies: InstagramQuickReplyButton[];

  // OAuth state
  oauthState: {
    step: 'start' | 'authorize' | 'select_page' | 'complete' | 'error';
    authUrl?: string;
    pages?: Array<{ id: string; name: string; instagram_account?: { id: string; username: string; name: string } }>;
    error?: string;
  };

  // Actions - Accounts
  fetchAccounts: () => Promise<void>;
  connectAccount: (data: InstagramAccountConnectRequest) => Promise<void>;
  updateAccount: (id: string, data: InstagramAccountUpdateRequest) => Promise<InstagramAccount>;
  deleteAccount: (id: string) => Promise<void>;
  selectAccount: (id: string | null) => void;
  refreshAccountToken: (id: string) => Promise<void>;
  testAccountConnection: (id: string) => Promise<{ success: boolean; response_time_ms: number }>;
  startOAuth: (redirectUri: string) => Promise<void>;
  completeOAuth: (code: string, redirectUri: string) => Promise<void>;
  selectPage: (pageId: string, instagramAccountId: string) => Promise<void>;

  // Actions - Conversations
  fetchConversations: (accountId?: string) => Promise<void>;
  selectConversation: (id: string | null) => void;
  updateConversation: (conversationId: string, data: UpdateConversationRequest) => Promise<void>;
  toggleStarConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  unarchiveConversation: (conversationId: string) => Promise<void>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  setConversationSearchQuery: (query: string) => void;
  setConversationFilter: (filter: 'all' | 'starred' | 'unread' | 'archived' | 'spam') => void;
  fetchWindowStatus: (conversationId?: string) => Promise<void>;

  // Actions - Messages
  fetchMessages: (conversationId?: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (text: string, quickReplies?: InstagramQuickReplyButton[]) => Promise<InstagramMessage | null>;
  sendImage: (imageUrl: string, caption?: string) => Promise<InstagramMessage | null>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  setMessageReplyTo: (message: InstagramMessage | null) => void;

  // Actions - Quick Replies
  fetchQuickReplies: (accountId?: string) => Promise<void>;
  createQuickReply: (data: { title: string; payload: string; image_url?: string }) => Promise<InstagramQuickReply>;
  updateQuickReply: (quickReplyId: string, data: Partial<InstagramQuickReply>) => Promise<void>;
  deleteQuickReply: (quickReplyId: string) => Promise<void>;
  reorderQuickReplies: (quickReplyIds: string[]) => Promise<void>;

  // Actions - Ice Breakers
  fetchIceBreakers: (accountId?: string) => Promise<void>;
  createIceBreaker: (data: { question: string; payload: string }) => Promise<InstagramIceBreaker>;
  updateIceBreaker: (iceBreakerId: string, data: Partial<InstagramIceBreaker>) => Promise<void>;
  deleteIceBreaker: (iceBreakerId: string) => Promise<void>;
  syncIceBreakers: () => Promise<void>;

  // Actions - UI
  setShowAccountSetup: (show: boolean) => void;
  setSetupStep: (step: number) => void;
  setDraftMessage: (text: string) => void;
  setDraftQuickReplies: (quickReplies: InstagramQuickReplyButton[]) => void;
  addNewMessage: (message: InstagramMessage) => void;
  updateMessageStatus: (messageId: string, status: InstagramMessage['status']) => void;

  // Actions - Reset
  reset: () => void;
  resetMessages: () => void;
  resetOAuthState: () => void;
}

// ============ Initial State ============

const initialState = {
  accounts: [] as InstagramAccount[],
  selectedAccountId: null as string | null,
  accountsLoading: false,
  accountsError: null as string | null,
  conversations: [] as InstagramConversation[],
  selectedConversationId: null as string | null,
  conversationsLoading: false,
  conversationsError: null as string | null,
  conversationSearchQuery: '',
  conversationFilter: 'all' as const,
  messages: [] as InstagramMessage[],
  messagesLoading: false,
  messagesError: null as string | null,
  hasMoreMessages: true,
  messageReplyTo: null as InstagramMessage | null,
  quickReplies: [] as InstagramQuickReply[],
  quickRepliesLoading: false,
  iceBreakers: [] as InstagramIceBreaker[],
  iceBreakersLoading: false,
  windowStatus: null as MessagingWindowStatus | null,
  isSendingMessage: false,
  isConnecting: false,
  showAccountSetup: false,
  setupStep: 0,
  draftMessage: '',
  draftQuickReplies: [] as InstagramQuickReplyButton[],
  oauthState: {
    step: 'start' as const,
  },
};

// ============ Store ============

export const useInstagramStore = create<InstagramState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ============ Account Actions ============

        fetchAccounts: async () => {
          set((state) => { state.accountsLoading = true; state.accountsError = null; });
          try {
            const accounts = await instagramApiClient.accounts.list();
            set((state) => { state.accounts = accounts; state.accountsLoading = false; });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch accounts';
            set((state) => { state.accountsError = message; state.accountsLoading = false; });
          }
        },

        connectAccount: async (data: InstagramAccountConnectRequest) => {
          set((state) => { state.isConnecting = true; });
          try {
            const response = await instagramApiClient.accounts.connect(data);
            if (response.pages && response.pages.length > 0) {
              set((state) => {
                state.oauthState = {
                  step: 'select_page',
                  pages: response.pages,
                };
              });
            } else if (response.account) {
              set((state) => {
                state.accounts.push(response.account);
                state.oauthState = { step: 'complete' };
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to connect account';
            set((state) => {
              state.oauthState = { step: 'error', error: message };
            });
          } finally {
            set((state) => { state.isConnecting = false; });
          }
        },

        updateAccount: async (id: string, data: InstagramAccountUpdateRequest) => {
          const account = await instagramApiClient.accounts.update(id, data);
          set((state) => {
            const index = state.accounts.findIndex((a: InstagramAccount) => a.id === id);
            if (index !== -1) state.accounts[index] = account;
          });
          return account;
        },

        deleteAccount: async (id: string) => {
          await instagramApiClient.accounts.delete(id);
          set((state) => {
            state.accounts = state.accounts.filter((a: InstagramAccount) => a.id !== id);
            if (state.selectedAccountId === id) {
              state.selectedAccountId = null;
              state.conversations = [];
              state.messages = [];
            }
          });
        },

        selectAccount: (id: string | null) => {
          set((state) => {
            state.selectedAccountId = id;
            state.conversations = [];
            state.selectedConversationId = null;
            state.messages = [];
            state.quickReplies = [];
            state.iceBreakers = [];
          });
          if (id) {
            get().fetchConversations(id);
            get().fetchQuickReplies(id);
            get().fetchIceBreakers(id);
          }
        },

        refreshAccountToken: async (id: string) => {
          const result = await instagramApiClient.accounts.refreshToken(id);
          if (result.success) {
            const account = await instagramApiClient.accounts.get(id);
            set((state) => {
              const index = state.accounts.findIndex((a: InstagramAccount) => a.id === id);
              if (index !== -1) state.accounts[index] = account;
            });
          }
        },

        testAccountConnection: async (id: string) => {
          return await instagramApiClient.accounts.testConnection(id);
        },

        startOAuth: async (redirectUri: string) => {
          set((state) => { state.isConnecting = true; });
          try {
            const { auth_url } = await instagramApiClient.accounts.getOAuthUrl(redirectUri);
            set((state) => {
              state.oauthState = { step: 'authorize', authUrl: auth_url };
            });
            // Open OAuth window
            window.open(auth_url, 'instagram_oauth', 'width=600,height=700');
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to start OAuth';
            set((state) => {
              state.oauthState = { step: 'error', error: message };
              state.isConnecting = false;
            });
          }
        },

        completeOAuth: async (code: string, redirectUri: string) => {
          try {
            const response = await instagramApiClient.accounts.exchangeCode(code, redirectUri);
            if (response.pages && response.pages.length > 0) {
              set((state) => {
                state.oauthState = {
                  step: 'select_page',
                  pages: response.pages,
                };
              });
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to complete OAuth';
            set((state) => {
              state.oauthState = { step: 'error', error: message };
            });
          } finally {
            set((state) => { state.isConnecting = false; });
          }
        },

        selectPage: async (pageId: string, instagramAccountId: string) => {
          set((state) => { state.isConnecting = true; });
          try {
            const account = await instagramApiClient.accounts.completeConnection(pageId, instagramAccountId);
            set((state) => {
              state.accounts.push(account);
              state.oauthState = { step: 'complete' };
              state.isConnecting = false;
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to select page';
            set((state) => {
              state.oauthState = { step: 'error', error: message };
              state.isConnecting = false;
            });
          }
        },

        // ============ Conversation Actions ============

        fetchConversations: async (accountId?: string) => {
          const id = accountId || get().selectedAccountId;
          if (!id) return;
          set((state) => { state.conversationsLoading = true; state.conversationsError = null; });
          try {
            const { conversationFilter, conversationSearchQuery } = get();
            const response = await instagramApiClient.conversations.list(id, {
              status: conversationFilter === 'archived' ? 'archived' : conversationFilter === 'spam' ? 'spam' : undefined,
              is_starred: conversationFilter === 'starred' ? true : undefined,
              has_unread: conversationFilter === 'unread' ? true : undefined,
              search: conversationSearchQuery || undefined,
            });
            set((state) => { state.conversations = response.items; state.conversationsLoading = false; });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch conversations';
            set((state) => { state.conversationsError = message; state.conversationsLoading = false; });
          }
        },

        selectConversation: (id: string | null) => {
          set((state) => {
            state.selectedConversationId = id;
            state.messages = [];
            state.hasMoreMessages = true;
            state.messageReplyTo = null;
            state.windowStatus = null;
          });
          if (id) {
            get().fetchMessages(id);
            get().fetchWindowStatus(id);
          }
        },

        updateConversation: async (conversationId: string, data: UpdateConversationRequest) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          const conversation = await instagramApiClient.conversations.update(accountId, conversationId, data);
          set((state) => {
            const index = state.conversations.findIndex((c: InstagramConversation) => c.id === conversationId);
            if (index !== -1) state.conversations[index] = conversation;
          });
        },

        toggleStarConversation: async (conversationId: string) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          const conversation = await instagramApiClient.conversations.toggleStar(accountId, conversationId);
          set((state) => {
            const index = state.conversations.findIndex((c: InstagramConversation) => c.id === conversationId);
            if (index !== -1) state.conversations[index] = conversation;
          });
        },

        archiveConversation: async (conversationId: string) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          const conversation = await instagramApiClient.conversations.archive(accountId, conversationId);
          set((state) => {
            const index = state.conversations.findIndex((c: InstagramConversation) => c.id === conversationId);
            if (index !== -1) state.conversations[index] = conversation;
          });
        },

        unarchiveConversation: async (conversationId: string) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          const conversation = await instagramApiClient.conversations.unarchive(accountId, conversationId);
          set((state) => {
            const index = state.conversations.findIndex((c: InstagramConversation) => c.id === conversationId);
            if (index !== -1) state.conversations[index] = conversation;
          });
        },

        markConversationAsRead: async (conversationId: string) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          await instagramApiClient.conversations.markAsRead(accountId, conversationId);
          set((state) => {
            const index = state.conversations.findIndex((c: InstagramConversation) => c.id === conversationId);
            if (index !== -1) {
              state.conversations[index].unread_count = 0;
            }
          });
        },

        setConversationSearchQuery: (query: string) => {
          set((state) => { state.conversationSearchQuery = query; });
          setTimeout(() => get().fetchConversations(), 300);
        },

        setConversationFilter: (filter: 'all' | 'starred' | 'unread' | 'archived' | 'spam') => {
          set((state) => { state.conversationFilter = filter; });
          get().fetchConversations();
        },

        fetchWindowStatus: async (conversationId?: string) => {
          const accountId = get().selectedAccountId;
          const id = conversationId || get().selectedConversationId;
          if (!accountId || !id) return;
          try {
            const status = await instagramApiClient.conversations.getWindowStatus(accountId, id);
            set((state) => { state.windowStatus = status; });
          } catch {
            set((state) => { state.windowStatus = null; });
          }
        },

        // ============ Message Actions ============

        fetchMessages: async (conversationId?: string, loadMore?: boolean) => {
          const accountId = get().selectedAccountId;
          const id = conversationId || get().selectedConversationId;
          if (!accountId || !id) return;
          set((state) => { state.messagesLoading = true; state.messagesError = null; });
          try {
            const { messages } = get();
            const beforeId = loadMore && messages.length > 0 ? messages[messages.length - 1].id : undefined;
            const response = await instagramApiClient.messages.list(accountId, id, { page_size: 50, before_id: beforeId });
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

        sendMessage: async (text: string, quickReplies?: InstagramQuickReplyButton[]) => {
          const accountId = get().selectedAccountId;
          const selectedConversationId = get().selectedConversationId;
          if (!accountId || !selectedConversationId) return null;
          const conversation = get().conversations.find((c: InstagramConversation) => c.id === selectedConversationId);
          if (!conversation) return null;
          set((state) => { state.isSendingMessage = true; });
          try {
            let response;
            if (quickReplies && quickReplies.length > 0) {
              response = await instagramApiClient.messages.sendWithQuickReplies(
                accountId,
                conversation.participant_id,
                text,
                quickReplies
              );
            } else {
              response = await instagramApiClient.messages.sendText(accountId, conversation.participant_id, text);
            }
            set((state) => {
              state.messages = [response.message, ...state.messages];
              state.isSendingMessage = false;
              state.draftMessage = '';
              state.draftQuickReplies = [];
              state.messageReplyTo = null;
            });
            // Refresh window status after sending
            get().fetchWindowStatus();
            return response.message;
          } catch (error) {
            set((state) => { state.isSendingMessage = false; });
            throw error;
          }
        },

        sendImage: async (imageUrl: string, caption?: string) => {
          const accountId = get().selectedAccountId;
          const selectedConversationId = get().selectedConversationId;
          if (!accountId || !selectedConversationId) return null;
          const conversation = get().conversations.find((c: InstagramConversation) => c.id === selectedConversationId);
          if (!conversation) return null;
          set((state) => { state.isSendingMessage = true; });
          try {
            const response = await instagramApiClient.messages.sendImage(
              accountId,
              conversation.participant_id,
              imageUrl,
              caption
            );
            set((state) => {
              state.messages = [response.message, ...state.messages];
              state.isSendingMessage = false;
            });
            return response.message;
          } catch (error) {
            set((state) => { state.isSendingMessage = false; });
            throw error;
          }
        },

        reactToMessage: async (messageId: string, emoji: string) => {
          const accountId = get().selectedAccountId;
          const conversationId = get().selectedConversationId;
          if (!accountId || !conversationId) return;
          await instagramApiClient.messages.react(accountId, conversationId, messageId, emoji);
        },

        setMessageReplyTo: (message: InstagramMessage | null) => {
          set((state) => { state.messageReplyTo = message; });
        },

        // ============ Quick Reply Actions ============

        fetchQuickReplies: async (accountId?: string) => {
          const id = accountId || get().selectedAccountId;
          if (!id) return;
          set((state) => { state.quickRepliesLoading = true; });
          try {
            const quickReplies = await instagramApiClient.quickReplies.list(id);
            set((state) => { state.quickReplies = quickReplies; state.quickRepliesLoading = false; });
          } catch {
            set((state) => { state.quickRepliesLoading = false; });
          }
        },

        createQuickReply: async (data: { title: string; payload: string; image_url?: string }) => {
          const accountId = get().selectedAccountId;
          if (!accountId) throw new Error('No account selected');
          const quickReply = await instagramApiClient.quickReplies.create(accountId, data);
          set((state) => { state.quickReplies.push(quickReply); });
          return quickReply;
        },

        updateQuickReply: async (quickReplyId: string, data: Partial<InstagramQuickReply>) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          const quickReply = await instagramApiClient.quickReplies.update(accountId, quickReplyId, data);
          set((state) => {
            const index = state.quickReplies.findIndex((qr: InstagramQuickReply) => qr.id === quickReplyId);
            if (index !== -1) state.quickReplies[index] = quickReply;
          });
        },

        deleteQuickReply: async (quickReplyId: string) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          await instagramApiClient.quickReplies.delete(accountId, quickReplyId);
          set((state) => { state.quickReplies = state.quickReplies.filter((qr: InstagramQuickReply) => qr.id !== quickReplyId); });
        },

        reorderQuickReplies: async (quickReplyIds: string[]) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          const quickReplies = await instagramApiClient.quickReplies.reorder(accountId, quickReplyIds);
          set((state) => { state.quickReplies = quickReplies; });
        },

        // ============ Ice Breaker Actions ============

        fetchIceBreakers: async (accountId?: string) => {
          const id = accountId || get().selectedAccountId;
          if (!id) return;
          set((state) => { state.iceBreakersLoading = true; });
          try {
            const iceBreakers = await instagramApiClient.iceBreakers.list(id);
            set((state) => { state.iceBreakers = iceBreakers; state.iceBreakersLoading = false; });
          } catch {
            set((state) => { state.iceBreakersLoading = false; });
          }
        },

        createIceBreaker: async (data: { question: string; payload: string }) => {
          const accountId = get().selectedAccountId;
          if (!accountId) throw new Error('No account selected');
          // Check max limit
          if (get().iceBreakers.length >= 4) {
            throw new Error('Maximum 4 ice breakers allowed');
          }
          const iceBreaker = await instagramApiClient.iceBreakers.create(accountId, data);
          set((state) => { state.iceBreakers.push(iceBreaker); });
          return iceBreaker;
        },

        updateIceBreaker: async (iceBreakerId: string, data: Partial<InstagramIceBreaker>) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          const iceBreaker = await instagramApiClient.iceBreakers.update(accountId, iceBreakerId, data);
          set((state) => {
            const index = state.iceBreakers.findIndex((ib: InstagramIceBreaker) => ib.id === iceBreakerId);
            if (index !== -1) state.iceBreakers[index] = iceBreaker;
          });
        },

        deleteIceBreaker: async (iceBreakerId: string) => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          await instagramApiClient.iceBreakers.delete(accountId, iceBreakerId);
          set((state) => { state.iceBreakers = state.iceBreakers.filter((ib: InstagramIceBreaker) => ib.id !== iceBreakerId); });
        },

        syncIceBreakers: async () => {
          const accountId = get().selectedAccountId;
          if (!accountId) return;
          await instagramApiClient.iceBreakers.sync(accountId);
          get().fetchIceBreakers(accountId);
        },

        // ============ UI Actions ============

        setShowAccountSetup: (show: boolean) => {
          set((state) => {
            state.showAccountSetup = show;
            if (!show) {
              state.setupStep = 0;
              state.oauthState = { step: 'start' };
            }
          });
        },

        setSetupStep: (step: number) => {
          set((state) => { state.setupStep = step; });
        },

        setDraftMessage: (text: string) => {
          set((state) => { state.draftMessage = text; });
        },

        setDraftQuickReplies: (quickReplies: InstagramQuickReplyButton[]) => {
          set((state) => { state.draftQuickReplies = quickReplies; });
        },

        addNewMessage: (message: InstagramMessage) => {
          set((state) => {
            // Add to messages if in selected conversation
            if (message.conversation_id === state.selectedConversationId) {
              state.messages = [message, ...state.messages];
            }
            // Update conversation preview
            const convIndex = state.conversations.findIndex((c: InstagramConversation) => c.id === message.conversation_id);
            if (convIndex !== -1) {
              state.conversations[convIndex].last_message_preview = message.text || '[Media]';
              state.conversations[convIndex].last_message_at = message.sent_at;
              state.conversations[convIndex].last_message_direction = message.direction;
              if (message.direction === 'inbound') {
                state.conversations[convIndex].unread_count += 1;
              }
            }
          });
        },

        updateMessageStatus: (messageId: string, status: InstagramMessage['status']) => {
          set((state) => {
            const index = state.messages.findIndex((m: InstagramMessage) => m.id === messageId);
            if (index !== -1) {
              state.messages[index].status = status;
            }
          });
        },

        // ============ Reset Actions ============

        reset: () => set(initialState),

        resetMessages: () => set((state) => {
          state.messages = [];
          state.hasMoreMessages = true;
          state.messageReplyTo = null;
        }),

        resetOAuthState: () => set((state) => {
          state.oauthState = { step: 'start' };
          state.isConnecting = false;
        }),
      })),
      {
        name: 'flowcube-instagram-store',
        partialize: (state) => ({
          selectedAccountId: state.selectedAccountId,
          conversationFilter: state.conversationFilter,
        }),
      }
    ),
    { name: 'InstagramStore' }
  )
);

// ============ Selector Hooks ============

export const useSelectedAccount = () => {
  const accounts = useInstagramStore((state) => state.accounts);
  const selectedAccountId = useInstagramStore((state) => state.selectedAccountId);
  return accounts.find((account) => account.id === selectedAccountId) || null;
};

export const useSelectedConversation = () => {
  const conversations = useInstagramStore((state) => state.conversations);
  const selectedConversationId = useInstagramStore((state) => state.selectedConversationId);
  return conversations.find((conv: InstagramConversation) => conv.id === selectedConversationId) || null;
};

export const useFilteredConversations = () => {
  const conversations = useInstagramStore((state) => state.conversations);
  const filter = useInstagramStore((state) => state.conversationFilter);
  const searchQuery = useInstagramStore((state) => state.conversationSearchQuery);

  return conversations.filter((conv: InstagramConversation) => {
    if (filter === 'starred' && !conv.is_starred) return false;
    if (filter === 'unread' && conv.unread_count === 0) return false;
    if (filter === 'archived' && conv.status !== 'archived') return false;
    if (filter === 'spam' && conv.status !== 'spam') return false;
    if (filter === 'all' && (conv.status === 'archived' || conv.status === 'spam')) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (conv.participant_name || conv.participant_username || '').toLowerCase();
      if (!name.includes(query)) return false;
    }
    return true;
  });
};

export const useCanSendMessage = () => {
  const windowStatus = useInstagramStore((state) => state.windowStatus);
  const selectedConversation = useSelectedConversation();
  
  if (!selectedConversation) return false;
  if (windowStatus) return windowStatus.is_open;
  return selectedConversation.can_send_message;
};

export const useWindowTimeRemaining = () => {
  const windowStatus = useInstagramStore((state) => state.windowStatus);
  if (!windowStatus || !windowStatus.is_open || !windowStatus.expires_at) return null;
  
  const expiresAt = new Date(windowStatus.expires_at);
  const now = new Date();
  const remaining = expiresAt.getTime() - now.getTime();
  
  if (remaining <= 0) return null;
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  
  return { hours, minutes, total_ms: remaining };
};

export default useInstagramStore;
