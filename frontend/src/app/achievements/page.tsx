"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Trophy,
  Star,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { achievementsApi, type Achievement, type UserAchievement, type UserProgress } from "@/lib/achievementsApi";
import { cn } from "@/lib/utils";

type EnrichedAchievement = Achievement & {
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
};

function rarityBadge(rarity: string) {
  switch (rarity) {
    case "legendary":
      return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "epic":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "rare":
      return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    default:
      return "bg-gray-500/15 text-text-primary border-gray-500/30";
  }
}

export default function AchievementsPage() {
  const [all, setAll] = useState<Achievement[]>([]);
  const [user, setUser] = useState<UserAchievement[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(true);

  const userMap = useMemo(() => {
    const map = new Map<string, UserAchievement>();
    for (const ua of user) map.set(ua.achievement.id, ua);
    return map;
  }, [user]);

  const enriched: EnrichedAchievement[] = useMemo(() => {
    const list = all.map((a) => {
      const ua = userMap.get(a.id);
      return {
        ...a,
        unlocked: Boolean(ua),
        unlockedAt: ua?.unlocked_at,
        progress: ua?.progress,
      };
    });

    // Unlocked first, then by rarity/xp.
    list.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (a.rarity !== b.rarity) return String(b.rarity).localeCompare(String(a.rarity));
      return (b.xp_reward || 0) - (a.xp_reward || 0);
    });

    return list;
  }, [all, userMap]);

  const visible = useMemo(
    () => (showLocked ? enriched : enriched.filter((a) => a.unlocked)),
    [enriched, showLocked]
  );

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [allData, userData, progressData] = await Promise.all([
        achievementsApi.listAll(),
        achievementsApi.listUserAchievements(),
        achievementsApi.getMyProgress(),
      ]);
      setAll(allData);
      setUser(userData);
      setProgress(progressData);
    } catch (e) {
      console.error(e);
      setError("Falha ao carregar conquistas");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckUnlocks() {
    try {
      setChecking(true);
      await achievementsApi.checkUnlocks();
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Conquistas</h1>
            <p className="text-sm text-text-muted">Gamificacao e progresso</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckUnlocks}
              disabled={loading || checking}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-text-primary font-medium transition-colors"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              Verificar
            </button>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg text-text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Atualizar
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-error/10 border border-error/20 rounded-lg text-error flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <SummaryCard
                  icon={<Trophy className="w-5 h-5" />}
                  label="Desbloqueadas"
                  value={progress?.achievements_unlocked ?? user.length}
                />
                <SummaryCard
                  icon={<Star className="w-5 h-5" />}
                  label="XP Total"
                  value={progress?.total_xp ?? 0}
                />
                <SummaryCard
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  label="Nivel"
                  value={progress?.level ?? 1}
                />
                <SummaryCard
                  icon={<Star className="w-5 h-5" />}
                  label="Streak (dias)"
                  value={progress?.streak_days ?? 0}
                />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-text-secondary font-medium">Lista</h2>
                <label className="flex items-center gap-2 text-sm text-text-muted">
                  <input
                    type="checkbox"
                    checked={showLocked}
                    onChange={(e) => setShowLocked(e.target.checked)}
                    className="accent-primary"
                  />
                  Mostrar bloqueadas
                </label>
              </div>

              {/* List */}
              {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Trophy className="w-12 h-12 text-text-muted mb-4" />
                  <h3 className="text-text-secondary font-medium mb-1">Nada para mostrar</h3>
                  <p className="text-text-muted text-sm">Tente habilitar "Mostrar bloqueadas".</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        "bg-surface border border-border rounded-lg p-4",
                        a.unlocked ? "" : "opacity-80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-text-primary font-semibold truncate">{a.name}</h3>
                            {a.unlocked ? (
                              <CheckCircle2 className="w-4 h-4 text-accent-green" />
                            ) : (
                              <Lock className="w-4 h-4 text-text-muted" />
                            )}
                          </div>
                          <p className="text-sm text-text-muted mt-1 line-clamp-2">{a.description}</p>
                        </div>
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium border shrink-0",
                            rarityBadge(a.rarity)
                          )}
                        >
                          {String(a.rarity).toUpperCase()}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="text-text-muted">XP</span>
                        <span className="text-text-secondary font-medium">{a.xp_reward}</span>
                      </div>

                      {a.unlocked && a.unlockedAt ? (
                        <p className="mt-2 text-xs text-text-muted">
                          Desbloqueada em {new Date(a.unlockedAt).toLocaleString("pt-BR")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}
