/**
 * FlowCube Premium UI Components
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

// =============================================================================
// PREMIUM BUTTON
// =============================================================================

interface PremiumButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  glow?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function PremiumButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  glow = false,
  children,
  className,
  disabled,
  onClick,
  type = 'button',
}: PremiumButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25',
    secondary:
      'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700',
    outline:
      'border-2 border-purple-500 text-purple-400 hover:bg-purple-500/10',
    ghost: 'text-gray-300 hover:bg-gray-800 hover:text-white',
    gradient:
      'bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 text-white shadow-lg hover:shadow-purple-500/40 bg-[length:200%_auto] hover:bg-right-top',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2 text-sm rounded-lg gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2.5',
  };

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      className="inline-block"
    >
      <button
        type={type}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        onClick={onClick}
      >
        {glow && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 blur-xl opacity-50"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <span className="relative flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              {icon && iconPosition === 'left' && icon}
              {children}
              {icon && iconPosition === 'right' && icon}
            </>
          )}
        </span>
      </button>
    </motion.div>
  );
}

// =============================================================================
// GLASSMORPHIC CARD
// =============================================================================

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: 'purple' | 'cyan' | 'pink' | 'none';
  padding?: 'sm' | 'md' | 'lg';
}

export function GlassCard({
  children,
  className,
  hover = true,
  glow = 'none',
  padding = 'md',
}: GlassCardProps) {
  const glowColors = {
    purple: 'hover:shadow-purple-500/20',
    cyan: 'hover:shadow-cyan-500/20',
    pink: 'hover:shadow-pink-500/20',
    none: '',
  };

  const paddings = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
  };

  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative rounded-xl',
        'bg-gray-900/60 backdrop-blur-xl',
        'border border-gray-700/50',
        'shadow-lg',
        hover && 'hover:border-gray-600/50 hover:shadow-xl',
        glowColors[glow],
        paddings[padding],
        className
      )}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// =============================================================================
// BENTO GRID
// =============================================================================

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {children}
    </div>
  );
}

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3;
  rowSpan?: 1 | 2;
}

export function BentoItem({ children, className, colSpan = 1, rowSpan = 1 }: BentoItemProps) {
  const colSpanClasses = { 1: 'col-span-1', 2: 'md:col-span-2', 3: 'lg:col-span-3' };
  const rowSpanClasses = { 1: 'row-span-1', 2: 'row-span-2' };

  return (
    <GlassCard className={cn(colSpanClasses[colSpan], rowSpanClasses[rowSpan], className)} hover>
      {children}
    </GlassCard>
  );
}

// =============================================================================
// STATS CARD
// =============================================================================

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatsCard({ title, value, change, icon, trend = 'neutral', className }: StatsCardProps) {
  const trendColors = { up: 'text-green-400', down: 'text-red-400', neutral: 'text-gray-400' };

  return (
    <GlassCard className={className} padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <motion.p
            className="text-3xl font-bold text-white mt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {value}
          </motion.p>
          {change !== undefined && (
            <p className={cn('text-sm mt-1', trendColors[trend])}>
              {change > 0 ? '+' : ''}{change}%
              <span className="text-gray-500 ml-1">vs last period</span>
            </p>
          )}
        </div>
        {icon && <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">{icon}</div>}
      </div>
    </GlassCard>
  );
}

export default { PremiumButton, GlassCard, BentoGrid, BentoItem, StatsCard };
