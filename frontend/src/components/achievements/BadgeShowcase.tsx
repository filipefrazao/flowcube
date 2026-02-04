/**
 * FlowCube Premium - Badge Showcase Component
 */
'use client';

import { motion } from 'framer-motion';
import { Trophy, Star, Award } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked_at: string;
}

interface BadgeShowcaseProps {
  badges: Badge[];
  maxDisplay?: number;
  onViewAll?: () => void;
}

const rarityColors = {
  common: 'from-gray-500 to-gray-700',
  rare: 'from-blue-500 to-blue-700',
  epic: 'from-purple-500 to-pink-500',
  legendary: 'from-yellow-500 to-orange-500'
};

export function BadgeShowcase({ badges, maxDisplay = 6, onViewAll }: BadgeShowcaseProps) {
  const displayedBadges = badges.slice(0, maxDisplay);
  const remainingCount = Math.max(0, badges.length - maxDisplay);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Badges Showcase
        </h3>
        {remainingCount > 0 && onViewAll && (
          <button onClick={onViewAll} className="text-sm text-purple-400 hover:text-purple-300">
            View All ({badges.length})
          </button>
        )}
      </div>

      {displayedBadges.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No badges earned yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {displayedBadges.map((badge, index) => (
            <motion.div
              key={badge.id}
              className="relative group"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, type: 'spring' }}
            >
              <motion.div
                className={`aspect-square rounded-xl bg-gradient-to-br ${rarityColors[badge.rarity]} shadow-lg p-4 flex items-center justify-center cursor-pointer`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <Trophy className="w-full h-full text-white" />
              </motion.div>
              <div className="absolute top-1 right-1">
                <Star className="w-4 h-4 text-yellow-400" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
