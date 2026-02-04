/**
 * FlowCube - Telegram Bot Setup Wizard
 * 3-step wizard: Token > Settings > Webhook
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Key,
  Settings,
  Webhook,
  Check,
  X,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTelegramStore } from '@/stores/telegramStore';
import { TelegramBotSettings, ParseMode, BotCommand } from '@/types/telegram.types';

interface TelegramBotSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 0, title: 'Bot Token', icon: Key, description: 'Enter your bot token from @BotFather' },
  { id: 1, title: 'Settings', icon: Settings, description: 'Configure bot behavior' },
  { id: 2, title: 'Webhook', icon: Webhook, description: 'Set up webhook endpoint' },
];

export function TelegramBotSetup({ isOpen, onClose, onSuccess }: TelegramBotSetupProps) {
  const { createBot, verifyBotToken, setWebhook, setupStep, setSetupStep } = useTelegramStore();

  // Step 1: Token
  const [token, setToken] = useState('');
  const [botName, setBotName] = useState('');
  const [description, setDescription] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    bot_info?: { id: number; username: string; first_name: string };
  } | null>(null);
  const [tokenError, setTokenError] = useState('');

  // Step 2: Settings
  const [parseMode, setParseMode] = useState<ParseMode>(ParseMode.HTML);
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);
  const [disableNotification, setDisableNotification] = useState(false);
  const [protectContent, setProtectContent] = useState(false);
  const [commands, setCommands] = useState<BotCommand[]>([
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Get help' },
  ]);

  // Step 3: Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [useAutoWebhook, setUseAutoWebhook] = useState(true);

  // General
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdBotId, setCreatedBotId] = useState<string | null>(null);

  // Generate default webhook URL
  const defaultWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/telegram/webhook`
    : '';

  useEffect(() => {
    if (useAutoWebhook) {
      setWebhookUrl(defaultWebhookUrl);
    }
  }, [useAutoWebhook, defaultWebhookUrl]);

  // Generate random secret
  const generateSecret = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setWebhookSecret(result);
  }, []);

  useEffect(() => {
    generateSecret();
  }, [generateSecret]);

  // Verify token
  const handleVerifyToken = async () => {
    if (!token.trim()) {
      setTokenError('Please enter a bot token');
      return;
    }

    setIsVerifying(true);
    setTokenError('');
    setVerificationResult(null);

    try {
      const result = await verifyBotToken(token);
      setVerificationResult(result);

      if (result.valid && result.bot_info) {
        setBotName(result.bot_info.first_name);
      } else {
        setTokenError('Invalid token. Please check and try again.');
      }
    } catch (err) {
      setTokenError('Failed to verify token. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Add command
  const addCommand = () => {
    setCommands([...commands, { command: '', description: '' }]);
  };

  // Remove command
  const removeCommand = (index: number) => {
    setCommands(commands.filter((_, i) => i !== index));
  };

  // Update command
  const updateCommand = (index: number, field: 'command' | 'description', value: string) => {
    const newCommands = [...commands];
    newCommands[index] = { ...newCommands[index], [field]: value };
    setCommands(newCommands);
  };

  // Handle step navigation
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!verificationResult?.valid && !!botName.trim();
      case 1:
        return true; // Settings are optional
      case 2:
        return !!webhookUrl.trim();
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedFromStep(setupStep) && setupStep < STEPS.length - 1) {
      setSetupStep(setupStep + 1);
    }
  };

  const handleBack = () => {
    if (setupStep > 0) {
      setSetupStep(setupStep - 1);
    }
  };

  // Handle final submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Create bot
      const settings: TelegramBotSettings = {
        parse_mode: parseMode,
        disable_web_page_preview: disableWebPagePreview,
        disable_notification: disableNotification,
        protect_content: protectContent,
        allow_sending_without_reply: true,
        commands: commands.filter((c) => c.command && c.description),
      };

      const bot = await createBot({
        name: botName,
        token,
        description,
        settings,
      });

      setCreatedBotId(bot.id);

      // Set webhook
      if (webhookUrl) {
        await setWebhook(bot.id, webhookUrl, webhookSecret || undefined);
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setToken('');
    setBotName('');
    setDescription('');
    setVerificationResult(null);
    setTokenError('');
    setSetupStep(0);
    setError('');
    setCreatedBotId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add Telegram Bot
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {STEPS[setupStep].description}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                    index < setupStep
                      ? 'bg-green-500 text-white'
                      : index === setupStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  )}
                >
                  {index < setupStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-12 h-1 mx-2 rounded-full transition-colors',
                      index < setupStep
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Step 1: Token */}
            {setupStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bot Token
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => {
                        setToken(e.target.value);
                        setVerificationResult(null);
                        setTokenError('');
                      }}
                      placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleVerifyToken}
                      disabled={isVerifying || !token.trim()}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {isVerifying ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Verify
                    </button>
                  </div>
                  {tokenError && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {tokenError}
                    </p>
                  )}
                  {verificationResult?.valid && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Bot verified: @{verificationResult.bot_info?.username}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    How to get a bot token:
                  </h4>
                  <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                    <li>Open Telegram and search for @BotFather</li>
                    <li>Send /newbot and follow the instructions</li>
                    <li>Copy the token provided by BotFather</li>
                  </ol>
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Open BotFather
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {verificationResult?.valid && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bot Name
                      </label>
                      <input
                        type="text"
                        value={botName}
                        onChange={(e) => setBotName(e.target.value)}
                        placeholder="My Awesome Bot"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What does this bot do?"
                        rows={2}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Settings */}
            {setupStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Parse Mode
                  </label>
                  <select
                    value={parseMode}
                    onChange={(e) => setParseMode(e.target.value as ParseMode)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="HTML">HTML</option>
                    <option value="Markdown">Markdown</option>
                    <option value="MarkdownV2">MarkdownV2</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disableWebPagePreview}
                      onChange={(e) => setDisableWebPagePreview(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Disable web page previews
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={disableNotification}
                      onChange={(e) => setDisableNotification(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Send messages silently (no notification)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={protectContent}
                      onChange={(e) => setProtectContent(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Protect content from forwarding and saving
                    </span>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bot Commands
                    </label>
                    <button
                      onClick={addCommand}
                      className="text-sm text-blue-500 hover:text-blue-600"
                    >
                      + Add command
                    </button>
                  </div>
                  <div className="space-y-2">
                    {commands.map((cmd, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={cmd.command}
                          onChange={(e) => updateCommand(index, 'command', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="command"
                          className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={cmd.description}
                          onChange={(e) => updateCommand(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {commands.length > 1 && (
                          <button
                            onClick={() => removeCommand(index)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Webhook */}
            {setupStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAutoWebhook}
                    onChange={(e) => setUseAutoWebhook(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Use automatic FlowCube webhook
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      disabled={useAutoWebhook}
                      placeholder="https://your-domain.com/webhook"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(webhookUrl)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Copy URL"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Webhook Secret (optional but recommended)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      placeholder="Random secret for validation"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <button
                      onClick={generateSecret}
                      className="px-4 py-2 text-sm text-blue-500 hover:text-blue-600 border border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>Note:</strong> The webhook URL must be HTTPS with a valid SSL certificate.
                    FlowCube will automatically handle incoming updates from Telegram.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={setupStep === 0}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>

            {setupStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceedFromStep(setupStep)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceedFromStep(setupStep)}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Bot
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default TelegramBotSetup;
