/**
 * FlowCube Premium - Progress Ring Component
 */
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ProgressRingProps {
  progress: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showPercentage?: boolean;
}

export function ProgressRing({
  progress,
  total,
  size = 120,
  strokeWidth = 8,
  color = '#a855f7',
  label,
  showPercentage = true
}: ProgressRingProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const percentage = Math.min((progress / total) * 100, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ 
            strokeDashoffset: mounted ? offset : circumference,
            strokeDasharray: circumference
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <div className="text-2xl font-bold text-white">{Math.round(percentage)}%</div>
        )}
        {label && <div className="text-xs text-gray-400 mt-1">{label}</div>}
      </div>
    </div>
  );
}
