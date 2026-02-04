/**
 * FlowCube Premium - Achievements List Modal
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Star, Lock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
  unlocked: boolean;
  progress?: number;
  total?: number;
  unlocked_at?: string;
}

interface AchievementsListProps {
  achievements: Achievement[];
  isOpen: boolean;
  onClose: () => void;
}

const rarityColors = {
  common: 'from-gray-500 to-gray-700',
  rare: 'from-blue-500 to-blue-700',
  epic: 'from-purple-500 to-pink-500',
  legendary: 'from-yellow-500 to-orange-500'
};

export function AchievementsList({ achievements, isOpen, onClose }: AchievementsListProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'unlocked' && !achievement.unlocked) return false;
    if (filter === 'locked' && achievement.unlocked) return false;
    return true;
  });

  const stats = {
    total: achievements.length,
    unlocked: achievements.filter(a => a.unlocked).length,
    totalXP: achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp_reward, 0)
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            className="fixed inset-4 md:w-[800px] md:max-h-[80vh] bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  Achievements
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{stats.unlocked}/{stats.total}</div>
                  <div className="text-sm text-gray-400">Unlocked</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{stats.totalXP}</div>
                  <div className="text-sm text-gray-400">Total XP</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{Math.round((stats.unlocked / stats.total) * 100)}%</div>
                  <div className="text-sm text-gray-400">Completion</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-purple-600' : 'bg-gray-700'}`}>All</button>
                <button onClick={() => setFilter('unlocked')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'unlocked' ? 'bg-green-600' : 'bg-gray-700'}`}>Unlocked</button>
                <button onClick={() => setFilter('locked')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'locked' ? 'bg-gray-600' : 'bg-gray-700'}`}>Locked</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAchievements.map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    className={`p-4 rounded-lg border-2 ${achievement.unlocked ? 'border-purple-500' : 'border-gray-700'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex gap-4">
                      <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${achievement.unlocked ? 'bg-gradient-to-br ' + rarityColors[achievement.rarity] : 'bg-gray-700'}`}>
                        {achievement.unlocked ? <Trophy className="w-8 h-8 text-white" /> : <Lock className="w-8 h-8 text-gray-500" />}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-bold text-lg mb-1 ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`}>{achievement.name}</h3>
                        <p className={`text-sm mb-2 ${achievement.unlocked ? 'text-gray-300' : 'text-gray-600'}`}>{achievement.description}</p>
                        {achievement.unlocked ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-cyan-400 font-bold">+{achievement.xp_reward} XP</span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-sm">Locked</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
