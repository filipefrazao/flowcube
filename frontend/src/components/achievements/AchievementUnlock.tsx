/**
 * FlowCube Premium - Achievement Unlock Animation
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Award, Star, Zap, Crown } from 'lucide-react';
import { useEffect } from 'react';
import { useCelebration } from '@/hooks/useCelebration';

interface Achievement {
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward: number;
}

interface AchievementUnlockProps {
  achievement: Achievement | null;
  onComplete?: () => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  trophy: Trophy,
  award: Award,
  star: Star,
  zap: Zap,
  crown: Crown,
};

export function AchievementUnlock({ achievement, onComplete }: AchievementUnlockProps) {
  const { celebrateWithSound } = useCelebration();

  useEffect(() => {
    if (achievement) {
      const celebrationType = {
        common: 'small',
        rare: 'medium',
        epic: 'big',
        legendary: 'epic'
      }[achievement.rarity] as any;
      
      celebrateWithSound(celebrationType);

      const timer = setTimeout(() => {
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [achievement, celebrateWithSound, onComplete]);

  const rarityColors = {
    common: 'from-gray-500 to-gray-700',
    rare: 'from-blue-500 to-blue-700',
    epic: 'from-purple-500 to-pink-500',
    legendary: 'from-yellow-500 to-orange-500'
  };

  const rarityGlow = {
    common: 'shadow-gray-500/50',
    rare: 'shadow-blue-500/50',
    epic: 'shadow-purple-500/50',
    legendary: 'shadow-yellow-500/50'
  };

  const rarityTextColor = {
    common: 'text-gray-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-yellow-400'
  };

  if (!achievement) return null;

  const Icon = iconMap[achievement.icon] || Trophy;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute w-96 h-96 rounded-full border-4 border-purple-500/20"
          animate={{
            scale: [1, 2, 3],
            opacity: [0.5, 0.2, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />

        <motion.div
          className="text-center max-w-md relative z-10"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: 1, 
            rotate: 0
          }}
        >
          <motion.div
            className={`mb-6 inline-flex p-8 rounded-full bg-gradient-to-br ${rarityColors[achievement.rarity]} shadow-2xl relative`}
            animate={{
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity
            }}
          >
            <Icon className="w-24 h-24 text-white relative z-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <p className={`text-sm uppercase tracking-wider mb-2 ${rarityTextColor[achievement.rarity]}`}>
              Achievement Unlocked!
            </p>
            <h2 className="text-4xl font-bold text-white mb-3">
              {achievement.name}
            </h2>
            <p className="text-lg text-gray-300 mb-4">
              {achievement.description}
            </p>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${rarityColors[achievement.rarity]} backdrop-blur`}>
              <Star className="w-4 h-4 text-white" />
              <span className="capitalize font-semibold text-white">{achievement.rarity}</span>
            </div>

            <motion.div
              className="mt-6 text-2xl font-bold text-cyan-400"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <span className="text-3xl">+{achievement.xp_reward}</span> XP
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
