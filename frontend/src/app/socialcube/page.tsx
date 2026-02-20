"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Plus, CalendarDays, BarChart3, Users, Link2, FileText } from "lucide-react";
import { getPosts, getAccounts, type ScheduledPost, type SocialAccount } from "@/lib/socialcubeApi";

export default function SocialCubeDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPosts({ status: "scheduled" }).catch(() => ({ data: { results: [] } })),
      getAccounts().catch(() => ({ data: [] })),
    ]).then(([postsRes, accountsRes]) => {
      setPosts(Array.isArray(postsRes.data) ? postsRes.data : postsRes.data.results || []);
      setAccounts(Array.isArray(accountsRes.data) ? accountsRes.data : []);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: "Connected Accounts", value: accounts.filter(a => a.is_active).length, icon: Users, color: "text-blue-400" },
    { label: "Scheduled Posts", value: posts.length, icon: CalendarDays, color: "text-purple-400" },
    { label: "Total Platforms", value: [...new Set(accounts.map(a => a.platform))].length, icon: Send, color: "text-green-400" },
  ];

  const quickActions = [
    { label: "New Post", href: "/socialcube/posts/new", icon: Plus, color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Calendar", href: "/socialcube/calendar", icon: CalendarDays, color: "bg-purple-600 hover:bg-purple-700" },
    { label: "Analytics", href: "/socialcube/analytics", icon: BarChart3, color: "bg-green-600 hover:bg-green-700" },
    { label: "Accounts", href: "/socialcube/accounts", icon: Users, color: "bg-orange-600 hover:bg-orange-700" },
    { label: "SmartLinks", href: "/socialcube/smartlinks", icon: Link2, color: "bg-pink-600 hover:bg-pink-700" },
    { label: "Competitors", href: "/socialcube/competitors", icon: FileText, color: "bg-red-600 hover:bg-red-700" },
    { label: "Lead Ads", href: "/socialcube/leadads", icon: FileText, color: "bg-primary hover:bg-primary-hover" },
    { label: "Telegram", href: "/telegram", icon: Send, color: "bg-sky-600 hover:bg-sky-700" },
  ];

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <Send className="w-8 h-8 text-blue-500" />
              SocialCube
            </h1>
            <p className="text-text-secondary mt-1">Manage your social media from one place</p>
          </div>
          <button
            onClick={() => router.push("/socialcube/posts/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-text-primary rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-text-primary">{loading ? "..." : stat.value}</p>
                  <p className="text-sm text-text-secondary">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-text-primary transition-all ${action.color}`}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Posts */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Upcoming Scheduled Posts</h2>
          {loading ? (
            <div className="text-text-secondary text-center py-8">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CalendarDays className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No scheduled posts yet</p>
              <button
                onClick={() => router.push("/socialcube/posts/new")}
                className="mt-3 text-blue-500 hover:text-blue-400 text-sm font-medium"
              >
                Create your first post
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.slice(0, 5).map((post) => (
                <div key={post.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">{post.title || "Untitled"}</p>
                    <p className="text-sm text-text-secondary line-clamp-1">{post.caption}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {post.platforms?.map((pp) => (
                        <span key={pp.id} className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                          {pp.account_platform}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString("pt-BR") : "Draft"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
