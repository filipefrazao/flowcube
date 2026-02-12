"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, TrendingUp, Eye, Users, RefreshCw } from "lucide-react";
import { getAnalyticsOverview, pullAnalytics, type AnalyticsOverview } from "@/lib/socialcubeApi";

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = () => {
    setLoading(true);
    getAnalyticsOverview(days)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [days]);

  const handlePull = async (accountId: number) => {
    await pullAnalytics(accountId);
    alert("Analytics pull queued. Refresh in a moment.");
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/socialcube")} className="p-2 hover:bg-card rounded-lg"><ArrowLeft className="w-5 h-5 text-text-secondary" /></button>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2"><BarChart3 className="w-6 h-6" /> Analytics</h1>
          <div className="flex-1" />
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-card border border-border rounded-lg px-3 py-2 text-text-primary text-sm">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading analytics...</div>
        ) : !data ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <BarChart3 className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No analytics data yet</p>
            <p className="text-sm text-text-tertiary mt-1">Connect accounts and start posting to see insights</p>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{data.total_followers.toLocaleString()}</p>
                    <p className="text-sm text-text-secondary">Total Followers</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <Eye className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{data.total_impressions.toLocaleString()}</p>
                    <p className="text-sm text-text-secondary">Total Impressions</p>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{data.total_reach.toLocaleString()}</p>
                    <p className="text-sm text-text-secondary">Total Reach</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Per Platform */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">By Platform</h2>
              <div className="space-y-4">
                {data.platforms.map((p) => (
                  <div key={p.account_id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                          {p.platform[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">@{p.username}</p>
                          <p className="text-sm text-text-secondary capitalize">{p.platform}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-text-primary">{(p.followers || 0).toLocaleString()}</p>
                          <p className="text-xs text-text-tertiary">followers</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-text-primary">{(p.engagement_rate || 0).toFixed(2)}%</p>
                          <p className="text-xs text-text-tertiary">engagement</p>
                        </div>
                        <button onClick={() => handlePull(p.account_id)} className="p-2 hover:bg-background rounded-lg text-text-secondary" title="Pull latest">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
