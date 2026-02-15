"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Save, Copy, Check, ExternalLink } from "lucide-react";
import { getConfig, saveConfig, type LeadAdsAppConfig } from "@/lib/leadadsApi";

export default function LeadAdsConfigPage() {
  const router = useRouter();
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    getConfig()
      .then((res) => {
        const c = res.data;
        setAppId(c.app_id || "");
        setVerifyToken(c.verify_token || "");
        setWebhookUrl(c.webhook_url || "");
        setHasSecret(c.has_secret || false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const data: Record<string, string> = { app_id: appId, verify_token: verifyToken, webhook_url: webhookUrl };
      if (appSecret) data.app_secret = appSecret;
      await saveConfig(data);
      setHasSecret(true);
      setAppSecret("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const generatedWebhookUrl =
    (typeof window !== "undefined" ? window.location.origin : "https://platform.frzgroup.com.br") +
    "/api/v1/socialcube/leadads/webhook/";

  if (loading) {
    return <div className="p-6 h-full flex items-center justify-center text-text-secondary">Loading...</div>;
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/socialcube/leadads")} className="text-text-secondary hover:text-text-primary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <Settings className="w-7 h-7 text-blue-500" />
              Lead Ads Configuration
            </h1>
            <p className="text-text-secondary text-sm">Configure your Facebook App credentials for Lead Ads</p>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">Setup Instructions</h3>
          <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://developers.facebook.com" target="_blank" className="text-blue-400 hover:underline">Meta Developer Console <ExternalLink className="w-3 h-3 inline" /></a></li>
            <li>Create a new app (Type: Business) or use an existing one</li>
            <li>Add the "Webhooks" product to your app</li>
            <li>Configure webhook: paste the Callback URL and Verify Token below</li>
            <li>Subscribe to: <strong>Page</strong> → <strong>leadgen</strong></li>
            <li>Copy App ID and App Secret from your app settings, paste below</li>
            <li>Request <strong>leads_retrieval</strong> permission via App Review</li>
          </ol>
        </div>

        {/* Webhook Info */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-text-primary">Webhook Details</h3>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Callback URL (copy this to Meta)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={generatedWebhookUrl}
                readOnly
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono"
              />
              <button
                onClick={() => handleCopy(generatedWebhookUrl, "url")}
                className="p-2 text-text-secondary hover:text-text-primary bg-surface border border-border rounded-lg"
              >
                {copied === "url" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary block mb-1">Verify Token (copy this to Meta)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={verifyToken || "Set a verify token below first"}
                readOnly
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-mono"
              />
              {verifyToken && (
                <button
                  onClick={() => handleCopy(verifyToken, "token")}
                  className="p-2 text-text-secondary hover:text-text-primary bg-surface border border-border rounded-lg"
                >
                  {copied === "token" ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* App Credentials Form */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-text-primary">App Credentials</h3>

          <div>
            <label className="text-sm text-text-secondary block mb-1">App ID</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="e.g. 656846287422494"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">
              App Secret {hasSecret && <span className="text-green-400 text-xs ml-1">(saved, encrypted)</span>}
            </label>
            <input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder={hasSecret ? "Leave blank to keep current secret" : "Enter app secret"}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Verify Token</label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="e.g. flowcube_leadads_2026"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary"
            />
            <p className="text-xs text-text-tertiary mt-1">Choose any string. Must match what you enter in Meta Developer Console.</p>
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Webhook URL (optional override)</label>
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder={generatedWebhookUrl}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-text-primary"
            />
            <p className="text-xs text-text-tertiary mt-1">Leave blank to use the default URL above.</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !appId || !verifyToken}
            className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : (
              <><Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Configuration"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
