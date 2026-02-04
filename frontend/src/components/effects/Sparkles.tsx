/**
 * FlowCube Premium - Sparkles Background Effect
 */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SparklesProps {
  className?: string;
  particleCount?: number;
  particleColor?: string;
  minSize?: number;
  maxSize?: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
}

export function Sparkles({
  className = '',
  particleCount = 50,
  particleColor = '#8b5cf6',
  minSize = 1,
  maxSize = 3,
}: SparklesProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: minSize + Math.random() * (maxSize - minSize),
        opacity: 0.3 + Math.random() * 0.7,
        duration: 2 + Math.random() * 4,
      });
    }
    setParticles(newParticles);
  }, [particleCount, minSize, maxSize]);

  return (
    <div className={"absolute inset-0 overflow-hidden pointer-events-none " + className}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x + '%',
            top: particle.y + '%',
            width: particle.size,
            height: particle.size,
            backgroundColor: particleColor,
          }}
          animate={{
            opacity: [0, particle.opacity, 0],
            scale: [0, 1, 0],
            y: [0, -20, -40],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            repeatDelay: Math.random() * 2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function AuroraBackground({ className = '' }: { className?: string }) {
  return (
    <div className={"absolute inset-0 overflow-hidden pointer-events-none " + className}>
      <motion.div
        className="absolute -inset-[100%] opacity-50"
        style={{
          background:
            'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.3) 0%, transparent 50%), ' +
            'radial-gradient(circle at 80% 50%, rgba(6, 182, 212, 0.3) 0%, transparent 50%), ' +
            'radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.2) 0%, transparent 50%)',
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export function GradientBlobs({ className = '' }: { className?: string }) {
  return (
    <div className={"absolute inset-0 overflow-hidden pointer-events-none " + className}>
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl"
        animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        style={{ left: '10%', top: '20%' }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl"
        animate={{ x: [0, -80, 0], y: [0, 80, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        style={{ right: '10%', bottom: '20%' }}
      />
    </div>
  );
}

export default Sparkles;
