'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Zap, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useCelebration } from '@/hooks/useCelebration';

interface CelebrationFullscreenProps {
  show: boolean;
  title: string;
  message?: string;
  icon?: 'trophy' | 'star' | 'zap' | 'sparkles';
  onComplete?: () => void;
}

export function CelebrationFullscreen({ 
  show, 
  title, 
  message, 
  icon = 'trophy',
  onComplete 
}: CelebrationFullscreenProps) {
  const { celebrateWithSound } = useCelebration();

  useEffect(() => {
    if (show) {
      celebrateWithSound('epic');
      
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, celebrateWithSound, onComplete]);

  const IconComponent = {
    trophy: Trophy,
    star: Star,
    zap: Zap,
    sparkles: Sparkles
  }[icon];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ 
              scale: [0.5, 1.2, 1],
              opacity: 1
            }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20
            }}
          >
            {/* Animated Icon */}
            <motion.div
              className="mb-8 inline-flex"
              animate={{
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatDelay: 1
              }}
            >
              <div className="p-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 neon-glow-purple">
                <IconComponent className="w-24 h-24 text-white" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              className="text-6xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent"
              animate={{
                scale: [1, 1.05, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            >
              {title}
            </motion.h1>

            {/* Message */}
            {message && (
              <motion.p
                className="text-xl text-gray-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {message}
              </motion.p>
            )}

            {/* Animated Sparkles */}
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 20}%`
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
