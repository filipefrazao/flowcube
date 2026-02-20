/**
 * FRZ Platform Premium UI Components
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
    'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-primary text-gray-900 hover:bg-primary-hover shadow-lg shadow-primary/25',
    secondary:
      'bg-surface text-text-primary hover:bg-surface-hover border border-border',
    outline:
      'border-2 border-primary text-primary hover:bg-primary/10',
    ghost: 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
    gradient:
      'bg-gradient-to-r from-amber-500 via-primary to-yellow-500 text-gray-900 shadow-lg hover:shadow-primary/40 bg-[length:200%_auto] hover:bg-right-top',
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
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 blur-xl opacity-50"
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
  glow?: 'amber' | 'cyan' | 'blue' | 'none';
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
    amber: 'hover:shadow-primary/20',
    cyan: 'hover:shadow-cyan-500/20',
    blue: 'hover:shadow-blue-500/20',
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
        'bg-surface backdrop-blur-xl',
        'border border-border',
        'shadow-lg',
        hover && 'hover:border-border-light hover:shadow-xl',
        glowColors[glow],
        paddings[padding],
        className
      )}
    >
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
  const trendColors = { up: 'text-green-400', down: 'text-red-400', neutral: 'text-text-secondary' };

  return (
    <GlassCard className={className} padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary font-medium">{title}</p>
          <motion.p
            className="text-3xl font-bold text-text-primary mt-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {value}
          </motion.p>
          {change !== undefined && (
            <p className={cn('text-sm mt-1', trendColors[trend])}>
              {change > 0 ? '+' : ''}{change}%
              <span className="text-text-muted ml-1">vs last period</span>
            </p>
          )}
        </div>
        {icon && <div className="p-3 rounded-xl bg-primary/10 text-primary">{icon}</div>}
      </div>
    </GlassCard>
  );
}

export default { PremiumButton, GlassCard, BentoGrid, BentoItem, StatsCard };
