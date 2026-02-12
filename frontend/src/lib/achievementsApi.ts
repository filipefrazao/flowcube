import apiClient from "./api";

export type AchievementRarity = "common" | "rare" | "epic" | "legendary";

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  xp_reward: number;
  is_hidden: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  achievement: Achievement;
  unlocked_at: string;
  progress: number;
}

export interface UserProgress {
  id: string;
  username: string;
  total_xp: number;
  level: number;
  achievements_unlocked: number;
  success_rate: number;
  workflows_created: number;
  workflows_published: number;
  executions_count: number;
  successful_executions: number;
  failed_executions: number;
  streak_days: number;
  days_active: number;
  updated_at: string;
}

export const achievementsApi = {
  listAll: async (): Promise<Achievement[]> => {
    const res = await apiClient.get("/achievements/achievements/");
    return res.data.results || res.data;
  },

  listUserAchievements: async (): Promise<UserAchievement[]> => {
    const res = await apiClient.get("/achievements/achievements/user_achievements/");
    return Array.isArray(res.data) ? res.data : res.data.results || [];
  },

  getMyProgress: async (): Promise<UserProgress> => {
    const res = await apiClient.get("/achievements/progress/me/");
    return res.data;
  },

  checkUnlocks: async (): Promise<{ message: string; achievements?: Achievement[] }> => {
    const res = await apiClient.post("/achievements/achievements/check_unlocks/");
    return res.data;
  },
};
