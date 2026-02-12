/**
 * FlowCube Premium - Achievements Hook
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  category: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
  unlocked_at?: string;
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      const response = await axios.get(`${API_URL}/api/v1/achievements/`, {
        headers: { Authorization: token ? `Token ${token}` : '' },
      });
      setAchievements(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  return {
    achievements,
    loading,
    error,
    refresh: fetchAchievements,
    unlockedCount: achievements.filter(a => a.unlocked).length,
    totalXP: achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp_reward, 0),
  };
}
