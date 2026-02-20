"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, RefreshCw, Unplug, ExternalLink } from "lucide-react";
import { getAccounts, getOAuthUrl, disconnectAccount, refreshAccount, type SocialAccount } from "@/lib/socialcubeApi";

const platformColors: Record<string, string> = {
  instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
  facebook: "bg-blue-600",
  threads: "bg-surface",
  youtube: "bg-red-600",
  tiktok: "bg-black",
  linkedin: "bg-blue-700",
  twitter: "bg-sky-500",
};

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getAccounts()
      .then((res) => setAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConnect = async (platform: string) => {
    try {
      const res = await getOAuthUrl(platform);
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      alert("Failed to get OAuth URL");
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm("Disconnect this account?")) return;
    await disconnectAccount(id);
    load();
  };

  const handleRefresh = async (id: number) => {
    try {
      await refreshAccount(id);
      alert("Token refreshed");
      load();
    } catch (err) {
      alert("Failed to refresh token");
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/socialcube")} className="p-2 hover:bg-card rounded-lg"><ArrowLeft className="w-5 h-5 text-text-secondary" /></button>
          <h1 className="text-2xl font-bold text-text-primary">Connected Accounts</h1>
        </div>

        {/* Connect New */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Connect a Platform</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { platform: "instagram", label: "Instagram" },
              { platform: "facebook", label: "Facebook" },
            ].map(({ platform, label }) => (
              <button
                key={platform}
                onClick={() => handleConnect(platform)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-text-primary font-medium transition-opacity hover:opacity-90 ${platformColors[platform] || "bg-gray-600"}`}
              >
                <Plus className="w-4 h-4" />
                {label}
              </button>
            ))}
            {["Threads", "YouTube", "TikTok", "LinkedIn"].map((label) => (
              <button key={label} disabled className="flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border text-text-tertiary font-medium cursor-not-allowed">
                {label}
                <span className="text-xs ml-auto">Soon</span>
              </button>
            ))}
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-text-secondary">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <p className="text-text-secondary">No accounts connected yet</p>
            </div>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                {acc.profile_image_url ? (
                  <img src={acc.profile_image_url} className="w-12 h-12 rounded-full" alt="" />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-text-primary font-bold ${platformColors[acc.platform] || "bg-gray-600"}`}>
                    {acc.platform[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{acc.display_name || acc.username}</p>
                  <p className="text-sm text-text-secondary">@{acc.username} · <span className="capitalize">{acc.platform}</span></p>
                  <p className="text-xs text-text-tertiary">Connected {new Date(acc.connected_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${acc.is_active ? "bg-green-500" : "bg-red-500"}`} />
                  <button onClick={() => handleRefresh(acc.id)} className="p-2 hover:bg-background rounded-lg text-text-secondary" title="Refresh token">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDisconnect(acc.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400" title="Disconnect">
                    <Unplug className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
