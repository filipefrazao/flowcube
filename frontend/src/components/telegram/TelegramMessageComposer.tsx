/**
 * FlowCube - Telegram Message Composer
 * Input field with buttons for sending messages
 */
'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Smile,
  Mic,
  X,
  Reply,
  Keyboard,
  Bot,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegramStore, useSelectedChat } from '@/stores/telegramStore';
import { ParseMode, InlineKeyboardMarkup } from '@/types/telegram.types';
import { InlineKeyboardBuilder } from './InlineKeyboardBuilder';

interface TelegramMessageComposerProps {
  className?: string;
}

const PARSE_MODES: { value: ParseMode; label: string }[] = [
  { value: ParseMode.HTML, label: 'HTML' },
  { value: ParseMode.MARKDOWN, label: 'MD' },
  { value: ParseMode.MARKDOWN_V2, label: 'MD2' },
];

export function TelegramMessageComposer({ className }: TelegramMessageComposerProps) {
  const {
    selectedBotId,
    isSendingMessage,
    draftMessage,
    draftKeyboard,
    messageReplyTo,
    sendMessage,
    sendPhoto,
    setDraftMessage,
    setDraftKeyboard,
    setMessageReplyTo,
  } = useTelegramStore();

  const selectedChat = useSelectedChat();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [parseMode, setParseMode] = useState<ParseMode>(ParseMode.HTML);
  const [showKeyboardBuilder, setShowKeyboardBuilder] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [error, setError] = useState('');

  // Auto-resize textarea
  const handleTextChange = useCallback((value: string) => {
    setDraftMessage(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [setDraftMessage]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!draftMessage.trim() || isSendingMessage || !selectedChat) return;

    setError('');
    try {
      await sendMessage(draftMessage, {
        parseMode,
        replyMarkup: draftKeyboard || undefined,
        replyToMessageId: messageReplyTo?.telegram_message_id,
      });

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [draftMessage, isSendingMessage, selectedChat, sendMessage, parseMode, draftKeyboard, messageReplyTo]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Cancel reply
  const handleCancelReply = useCallback(() => {
    setMessageReplyTo(null);
  }, [setMessageReplyTo]);

  // Handle keyboard update
  const handleKeyboardUpdate = useCallback((keyboard: InlineKeyboardMarkup | null) => {
    setDraftKeyboard(keyboard);
  }, [setDraftKeyboard]);

  // Handle file upload
  const handleFileSelect = useCallback(async (type: 'image' | 'document') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : '*/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // For now, just show a placeholder - actual upload would need API integration
      // In production, you'd upload to server and get URL back
      if (type === 'image') {
        // Create object URL for preview
        const url = URL.createObjectURL(file);
        try {
          await sendPhoto(url, draftMessage || undefined);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to send image');
        }
      }
    };

    input.click();
    setShowAttachMenu(false);
  }, [sendPhoto, draftMessage]);

  if (!selectedChat) {
    return null;
  }

  return (
    <div className={cn('bg-surface dark:bg-background-secondary border-t border-border', className)}>
      {/* Reply Preview */}
      <AnimatePresence>
        {messageReplyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-background-secondary dark:bg-surface/50 border-b border-border"
          >
            <div className="flex items-center gap-3">
              <Reply className="w-4 h-4 text-blue-500" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-500">
                  Replying to {messageReplyTo.from_user?.first_name || 'message'}
                </p>
                <p className="text-xs text-text-muted dark:text-text-secondary truncate">
                  {messageReplyTo.text || messageReplyTo.caption || 'Media'}
                </p>
              </div>
              <button
                onClick={handleCancelReply}
                className="p-1 text-text-secondary hover:text-text-muted dark:hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard Preview */}
      <AnimatePresence>
        {draftKeyboard && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Keyboard className="w-3 h-3" />
                Inline Keyboard ({draftKeyboard.inline_keyboard.length} rows)
              </span>
              <button
                onClick={() => setDraftKeyboard(null)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="space-y-1">
              {draftKeyboard.inline_keyboard.slice(0, 2).map((row, i) => (
                <div key={i} className="flex gap-1">
                  {row.map((btn, j) => (
                    <span
                      key={j}
                      className="flex-1 px-2 py-1 bg-surface border border-border rounded text-xs text-center truncate"
                    >
                      {btn.text}
                    </span>
                  ))}
                </div>
              ))}
              {draftKeyboard.inline_keyboard.length > 2 && (
                <p className="text-xs text-text-secondary text-center">
                  +{draftKeyboard.inline_keyboard.length - 2} more rows
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800"
          >
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Composer */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          {/* Attachment Button */}
          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2.5 text-text-secondary hover:text-text-muted dark:hover:text-text-primary rounded-full hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 w-40 py-1 bg-surface rounded-lg shadow-lg border border-border z-10"
                >
                  <button
                    onClick={() => handleFileSelect('image')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary dark:text-text-primary hover:bg-surface-hover dark:hover:bg-surface-hover"
                  >
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    Image
                  </button>
                  <button
                    onClick={() => handleFileSelect('document')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary dark:text-text-primary hover:bg-surface-hover dark:hover:bg-surface-hover"
                  >
                    <FileText className="w-4 h-4 text-green-500" />
                    Document
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={draftMessage}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 pr-20 border border-border rounded-2xl bg-surface text-text-primary placeholder-text-muted text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              style={{ minHeight: '44px', maxHeight: '150px' }}
            />

            {/* Parse Mode & Keyboard Buttons */}
            <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
              {/* Parse Mode Selector */}
              <select
                value={parseMode}
                onChange={(e) => setParseMode(e.target.value as ParseMode)}
                className="px-1.5 py-1 text-xs bg-surface-hover dark:bg-surface-hover border-0 rounded text-text-muted dark:text-text-secondary cursor-pointer focus:ring-0"
              >
                {PARSE_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>

              {/* Keyboard Builder Toggle */}
              <button
                onClick={() => setShowKeyboardBuilder(!showKeyboardBuilder)}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  showKeyboardBuilder || draftKeyboard
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-text-secondary hover:text-text-muted dark:hover:text-text-primary'
                )}
                title="Inline Keyboard"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!draftMessage.trim() || isSendingMessage}
            className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-surface-hover text-text-primary rounded-full transition-colors flex-shrink-0"
          >
            {isSendingMessage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="mt-2 text-xs text-text-secondary text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {/* Keyboard Builder Modal */}
      <AnimatePresence>
        {showKeyboardBuilder && (
          <InlineKeyboardBuilder
            keyboard={draftKeyboard}
            onUpdate={handleKeyboardUpdate}
            onClose={() => setShowKeyboardBuilder(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default TelegramMessageComposer;
