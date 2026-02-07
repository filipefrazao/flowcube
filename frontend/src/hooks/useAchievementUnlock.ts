/**
 * FlowCube Premium - Achievement Unlock Hook
 */
'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Achievement {
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
}

export function useAchievementUnlock() {
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);

  const checkForUnlocks = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const response = await axios.get(`${API_URL}/api/v1/achievements/recent-unlocks/`, {
        headers: { Authorization: token ? `Token ${token}` : '' },
      });
      if (response.data && response.data.length > 0) {
        setUnlockedAchievement(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to check achievements:', err);
    }
  }, []);

  const clearUnlock = useCallback(() => {
    setUnlockedAchievement(null);
  }, []);

  return { unlockedAchievement, clearUnlock, checkForUnlocks };
}
