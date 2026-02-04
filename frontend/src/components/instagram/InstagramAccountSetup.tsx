/**
 * FlowCube - Instagram Account Setup Wizard
 * 3-step wizard: Connect > Select Page > Configure
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Instagram,
  Key,
  Settings,
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Link as LinkIcon,
  Building2,
  User,
  Users,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInstagramStore } from '@/stores/instagramStore';

interface InstagramAccountSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 0, title: 'Connect', icon: LinkIcon, description: 'Authorize FlowCube with Facebook' },
  { id: 1, title: 'Select Page', icon: Building2, description: 'Choose the Instagram Business account' },
  { id: 2, title: 'Configure', icon: Settings, description: 'Set up messaging preferences' },
];

const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/api/instagram/callback` : '';

export function InstagramAccountSetup({ isOpen, onClose, onSuccess }: InstagramAccountSetupProps) {
  const {
    oauthState,
    isConnecting,
    startOAuth,
    completeOAuth,
    selectPage,
    resetOAuthState,
    setupStep,
    setSetupStep,
    updateAccount,
  } = useInstagramStore();

  // Step 2: Page selection
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedInstagramId, setSelectedInstagramId] = useState<string | null>(null);

  // Step 3: Settings
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState('');
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [notifyNewMessages, setNotifyNewMessages] = useState(true);
  const [notifyStoryMentions, setNotifyStoryMentions] = useState(true);

  // General
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedPageId(null);
      setSelectedInstagramId(null);
      setAutoReplyEnabled(false);
      setAutoReplyMessage('');
      setBusinessHoursEnabled(false);
      setError('');
      resetOAuthState();
    }
  }, [isOpen, resetOAuthState]);

  // Listen for OAuth callback
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'instagram_oauth_callback' && event.data?.code) {
        completeOAuth(event.data.code, REDIRECT_URI);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [completeOAuth]);

  // Auto-advance to step 2 when pages are loaded
  useEffect(() => {
    if (oauthState.step === 'select_page' && oauthState.pages && setupStep === 0) {
      setSetupStep(1);
    }
  }, [oauthState.step, oauthState.pages, setupStep, setSetupStep]);

  // Handle OAuth start
  const handleStartOAuth = async () => {
    setError('');
    try {
      await startOAuth(REDIRECT_URI);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authorization');
    }
  };

  // Handle page selection
  const handlePageSelect = (pageId: string, instagramAccountId: string) => {
    setSelectedPageId(pageId);
    setSelectedInstagramId(instagramAccountId);
  };

  // Handle step navigation
  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return oauthState.step === 'select_page' && !!oauthState.pages?.length;
      case 1:
        return !!selectedPageId && !!selectedInstagramId;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (setupStep === 1 && selectedPageId && selectedInstagramId) {
      setIsSubmitting(true);
      try {
        await selectPage(selectedPageId, selectedInstagramId);
        setSetupStep(2);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect account');
      } finally {
        setIsSubmitting(false);
      }
    } else if (canProceedFromStep(setupStep) && setupStep < STEPS.length - 1) {
      setSetupStep(setupStep + 1);
    }
  };

  const handleBack = () => {
    if (setupStep > 0) {
      setSetupStep(setupStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const accounts = useInstagramStore.getState().accounts;
      const newAccount = accounts[accounts.length - 1];

      if (newAccount) {
        await updateAccount(newAccount.id, {
          settings: {
            auto_reply_enabled: autoReplyEnabled,
            auto_reply_message: autoReplyMessage || undefined,
            business_hours_enabled: businessHoursEnabled,
            notify_new_messages: notifyNewMessages,
            notify_story_mentions: notifyStoryMentions,
            quick_replies_enabled: true,
            ice_breakers_enabled: true,
          },
        });
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetOAuthState();
    setSetupStep(0);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Connect Instagram Account
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

          <div className="flex items-center gap-2 mt-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                    index < setupStep
                      ? 'bg-green-500 text-white'
                      : index === setupStep
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
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

        <div className="p-6 max-h-96 overflow-y-auto">
          <AnimatePresence mode="wait">
            {setupStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
                    <Instagram className="w-10 h-10 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Connect Your Instagram Business Account
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    You will need to authorize FlowCube to access your Facebook Page connected to your Instagram Business account.
                  </p>
                </div>

                {oauthState.step === 'error' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {oauthState.error || 'Authorization failed. Please try again.'}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleStartOAuth}
                  disabled={isConnecting}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Instagram className="w-5 h-5" />
                      Connect with Facebook
                    </>
                  )}
                </button>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Requirements:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                    <li>An Instagram Business or Creator account</li>
                    <li>A Facebook Page connected to your Instagram account</li>
                    <li>Admin access to the Facebook Page</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {setupStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Select Instagram Account
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose which Instagram account to connect
                  </p>
                </div>

                {oauthState.pages && oauthState.pages.length > 0 ? (
                  <div className="space-y-3">
                    {oauthState.pages.map((page) => (
                      <button
                        key={page.id}
                        onClick={() => page.instagram_account && handlePageSelect(page.id, page.instagram_account.id)}
                        disabled={!page.instagram_account}
                        className={cn(
                          'w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left',
                          selectedPageId === page.id
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                            : page.instagram_account
                            ? 'border-gray-200 dark:border-gray-700 hover:border-pink-300'
                            : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                        )}
                      >
                        {page.instagram_account ? (
                          <>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                              <Instagram className="w-6 h-6 text-pink-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                @{page.instagram_account.username}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {page.name}
                              </p>
                            </div>
                            {selectedPageId === page.id && (
                              <Check className="w-5 h-5 text-pink-500" />
                            )}
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {page.name}
                              </p>
                              <p className="text-sm text-red-500">
                                No Instagram account linked
                              </p>
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No pages with Instagram accounts found</p>
                  </div>
                )}
              </motion.div>
            )}

            {setupStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Instagram account connected successfully!
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Messaging Settings
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Enable auto-reply
                      </span>
                      <input
                        type="checkbox"
                        checked={autoReplyEnabled}
                        onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      />
                    </label>

                    {autoReplyEnabled && (
                      <textarea
                        value={autoReplyMessage}
                        onChange={(e) => setAutoReplyMessage(e.target.value)}
                        placeholder="Enter your auto-reply message..."
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                      />
                    )}

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Enable business hours
                      </span>
                      <input
                        type="checkbox"
                        checked={businessHoursEnabled}
                        onChange={(e) => setBusinessHoursEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Notifications
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Notify on new messages
                      </span>
                      <input
                        type="checkbox"
                        checked={notifyNewMessages}
                        onChange={(e) => setNotifyNewMessages(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Notify on story mentions
                      </span>
                      <input
                        type="checkbox"
                        checked={notifyStoryMentions}
                        onChange={(e) => setNotifyStoryMentions(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    <strong>24-Hour Window:</strong> Instagram allows sending messages only within 24 hours of the last user message.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={setupStep === 0}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>

            {setupStep < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceedFromStep(setupStep) || isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Complete Setup
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

export default InstagramAccountSetup;
