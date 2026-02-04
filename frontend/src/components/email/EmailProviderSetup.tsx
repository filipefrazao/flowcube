/**
 * FlowCube - Email Provider Setup Wizard
 * 4-step wizard: Provider > Config > Sender > Test
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Server,
  Key,
  Settings,
  Send,
  Check,
  X,
  Loader2,
  AlertCircle,
  Copy,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Shield,
  Globe,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEmailStore } from "@/stores/emailStore";
import { ProviderType } from "@/types/email.types";
import type {
  EmailProviderCreateRequest,
  SMTPConfig,
  SendGridConfig,
  MailgunConfig,
  SESConfig,
} from "@/types/email.types";

interface EmailProviderSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  {
    id: 0,
    title: "Provider",
    icon: Mail,
    description: "Choose your email service provider",
  },
  {
    id: 1,
    title: "Configuration",
    icon: Key,
    description: "Enter your API credentials",
  },
  {
    id: 2,
    title: "Sender Info",
    icon: Settings,
    description: "Configure sender details",
  },
  {
    id: 3,
    title: "Test",
    icon: Send,
    description: "Verify your configuration",
  },
];

const PROVIDERS = [
  {
    type: ProviderType.SMTP,
    name: "SMTP Server",
    description: "Connect to any SMTP server",
    icon: Server,
    color: "bg-gray-500",
  },
  {
    type: ProviderType.SENDGRID,
    name: "SendGrid",
    description: "Transactional & marketing emails",
    icon: Zap,
    color: "bg-blue-500",
  },
  {
    type: ProviderType.MAILGUN,
    name: "Mailgun",
    description: "Developer-friendly email API",
    icon: Mail,
    color: "bg-red-500",
  },
  {
    type: ProviderType.SES,
    name: "Amazon SES",
    description: "AWS Simple Email Service",
    icon: Globe,
    color: "bg-orange-500",
  },
  {
    type: ProviderType.POSTMARK,
    name: "Postmark",
    description: "Fast transactional emails",
    icon: Shield,
    color: "bg-yellow-500",
  },
];

export function EmailProviderSetup({
  isOpen,
  onClose,
  onSuccess,
}: EmailProviderSetupProps) {
  const { createProvider, testProviderConnection, sendTestEmail } =
    useEmailStore();

  // Step state
  const [step, setStep] = useState(0);

  // Step 1: Provider selection
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(
    null
  );
  const [providerName, setProviderName] = useState("");

  // Step 2: Configuration
  // SMTP
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  // SendGrid / Mailgun / SES
  const [apiKey, setApiKey] = useState("");
  const [mailgunDomain, setMailgunDomain] = useState("");
  const [mailgunRegion, setMailgunRegion] = useState<"us" | "eu">("us");
  const [sesAccessKeyId, setSesAccessKeyId] = useState("");
  const [sesSecretKey, setSesSecretKey] = useState("");
  const [sesRegion, setSesRegion] = useState("us-east-1");

  // Step 3: Sender Info
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [isDefault, setIsDefault] = useState(true);
  const [dailyLimit, setDailyLimit] = useState<number | undefined>(undefined);
  const [hourlyLimit, setHourlyLimit] = useState<number | undefined>(undefined);

  // Step 4: Test
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // General state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdProviderId, setCreatedProviderId] = useState<string | null>(
    null
  );

  // Reset form
  const resetForm = useCallback(() => {
    setStep(0);
    setSelectedProvider(null);
    setProviderName("");
    setSmtpHost("");
    setSmtpPort(587);
    setSmtpSecure(false);
    setSmtpUsername("");
    setSmtpPassword("");
    setApiKey("");
    setMailgunDomain("");
    setMailgunRegion("us");
    setSesAccessKeyId("");
    setSesSecretKey("");
    setSesRegion("us-east-1");
    setFromEmail("");
    setFromName("");
    setReplyTo("");
    setIsDefault(true);
    setDailyLimit(undefined);
    setHourlyLimit(undefined);
    setTestEmail("");
    setTestResult(null);
    setError("");
    setCreatedProviderId(null);
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Build config based on provider
  const buildConfig = (): SMTPConfig | SendGridConfig | MailgunConfig | SESConfig => {
    switch (selectedProvider) {
      case ProviderType.SMTP:
        return {
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          username: smtpUsername,
          password: smtpPassword,
        };
      case ProviderType.SENDGRID:
      case ProviderType.POSTMARK:
        return { api_key: apiKey };
      case ProviderType.MAILGUN:
        return {
          api_key: apiKey,
          domain: mailgunDomain,
          region: mailgunRegion,
        };
      case ProviderType.SES:
        return {
          access_key_id: sesAccessKeyId,
          secret_access_key: sesSecretKey,
          region: sesRegion,
        };
      default:
        return { api_key: apiKey };
    }
  };

  // Validation
  const canProceedFromStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 0:
        return !!selectedProvider && !!providerName.trim();
      case 1:
        if (selectedProvider === ProviderType.SMTP) {
          return (
            !!smtpHost.trim() &&
            smtpPort > 0 &&
            !!smtpUsername.trim() &&
            !!smtpPassword.trim()
          );
        }
        if (selectedProvider === ProviderType.MAILGUN) {
          return !!apiKey.trim() && !!mailgunDomain.trim();
        }
        if (selectedProvider === ProviderType.SES) {
          return (
            !!sesAccessKeyId.trim() &&
            !!sesSecretKey.trim() &&
            !!sesRegion.trim()
          );
        }
        return !!apiKey.trim();
      case 2:
        return !!fromEmail.trim() && !!fromName.trim();
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedFromStep(step) && step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  // Create provider and test
  const handleCreateAndTest = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const data: EmailProviderCreateRequest = {
        name: providerName,
        type: selectedProvider!,
        config: buildConfig(),
        from_email: fromEmail,
        from_name: fromName,
        reply_to: replyTo || undefined,
        is_default: isDefault,
        daily_limit: dailyLimit,
        hourly_limit: hourlyLimit,
      };

      const provider = await createProvider(data);
      setCreatedProviderId(provider.id);

      // Test connection
      const result = await testProviderConnection(provider.id);
      setTestResult({
        success: result.success,
        message: result.message,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create provider");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send test email
  const handleSendTestEmail = async () => {
    if (!createdProviderId || !testEmail.trim()) return;

    setIsTesting(true);
    setError("");

    try {
      await sendTestEmail(createdProviderId, testEmail);
      setTestResult({
        success: true,
        message: `Test email sent to ${testEmail}`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to send test email",
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Complete setup
  const handleComplete = () => {
    onSuccess?.();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#1a1a2e] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Email Provider Setup
              </h2>
              <p className="text-sm text-gray-400">
                {STEPS[step].description}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full transition-all",
                    step > i
                      ? "bg-green-500/20 text-green-400"
                      : step === i
                      ? "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50"
                      : "bg-white/5 text-gray-500"
                  )}
                >
                  {step > i ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <s.icon className="w-5 h-5" />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-16 h-0.5 mx-2 transition-colors",
                      step > i ? "bg-green-500/50" : "bg-white/10"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* Step 0: Provider Selection */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    placeholder="My Email Provider"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Select Provider
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {PROVIDERS.map((provider) => (
                      <button
                        key={provider.type}
                        onClick={() => setSelectedProvider(provider.type)}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border transition-all text-left",
                          selectedProvider === provider.type
                            ? "bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/30"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg",
                            provider.color + "/20"
                          )}
                        >
                          <provider.icon
                            className={cn(
                              "w-5 h-5",
                              provider.color.replace("bg-", "text-").replace("-500", "-400")
                            )}
                          />
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {provider.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            {provider.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Configuration */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {selectedProvider === ProviderType.SMTP && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.example.com"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Port
                        </label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="smtpSecure"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
                      />
                      <label htmlFor="smtpSecure" className="text-sm text-gray-300">
                        Use SSL/TLS
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={smtpUsername}
                        onChange={(e) => setSmtpUsername(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                      </label>
                      <input
                        type="password"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </>
                )}

                {(selectedProvider === ProviderType.SENDGRID ||
                  selectedProvider === ProviderType.POSTMARK) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your API key"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Get your API key from the{" "}
                      {selectedProvider === ProviderType.SENDGRID
                        ? "SendGrid"
                        : "Postmark"}{" "}
                      dashboard
                    </p>
                  </div>
                )}

                {selectedProvider === ProviderType.MAILGUN && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Mailgun API key"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Domain
                      </label>
                      <input
                        type="text"
                        value={mailgunDomain}
                        onChange={(e) => setMailgunDomain(e.target.value)}
                        placeholder="mg.yourdomain.com"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Region
                      </label>
                      <select
                        value={mailgunRegion}
                        onChange={(e) =>
                          setMailgunRegion(e.target.value as "us" | "eu")
                        }
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="us">US</option>
                        <option value="eu">EU</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedProvider === ProviderType.SES && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Access Key ID
                      </label>
                      <input
                        type="text"
                        value={sesAccessKeyId}
                        onChange={(e) => setSesAccessKeyId(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Secret Access Key
                      </label>
                      <input
                        type="password"
                        value={sesSecretKey}
                        onChange={(e) => setSesSecretKey(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Region
                      </label>
                      <select
                        value={sesRegion}
                        onChange={(e) => setSesRegion(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="eu-central-1">EU (Frankfurt)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                      </select>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Step 2: Sender Info */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    From Email *
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    placeholder="noreply@yourdomain.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    From Name *
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="Your Company"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reply-To Email (optional)
                  </label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="support@yourdomain.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">
                    Rate Limits (optional)
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Daily Limit
                      </label>
                      <input
                        type="number"
                        value={dailyLimit || ""}
                        onChange={(e) =>
                          setDailyLimit(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Hourly Limit
                      </label>
                      <input
                        type="number"
                        value={hourlyLimit || ""}
                        onChange={(e) =>
                          setHourlyLimit(
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        placeholder="Unlimited"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
                  />
                  <label htmlFor="isDefault" className="text-sm text-gray-300">
                    Set as default provider
                  </label>
                </div>
              </motion.div>
            )}

            {/* Step 3: Test */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {!createdProviderId ? (
                  <div className="text-center py-8">
                    <button
                      onClick={handleCreateAndTest}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating & Testing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Create & Test Connection
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    {testResult && (
                      <div
                        className={cn(
                          "p-4 rounded-lg flex items-start gap-3",
                          testResult.success
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-red-500/10 border border-red-500/30"
                        )}
                      >
                        {testResult.success ? (
                          <Check className="w-5 h-5 text-green-400 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                        )}
                        <div>
                          <div
                            className={cn(
                              "font-medium",
                              testResult.success ? "text-green-400" : "text-red-400"
                            )}
                          >
                            {testResult.success
                              ? "Connection Successful"
                              : "Connection Failed"}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {testResult.message}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/10">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Send Test Email
                      </h4>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="test@example.com"
                          className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                        <button
                          onClick={handleSendTestEmail}
                          disabled={isTesting || !testEmail.trim()}
                          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isTesting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="text-sm text-red-400">{error}</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={step === 0 ? handleClose : handleBack}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceedFromStep(step)}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!createdProviderId || !testResult?.success}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Complete Setup
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default EmailProviderSetup;
