/**
 * FlowCube Premium - Toast Notification Component
 */
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Trophy } from 'lucide-react';

interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'achievement';
  onDismiss: (id: string) => void;
}

const toastColors = {
  success: 'from-green-500 to-emerald-500',
  error: 'from-red-500 to-rose-500',
  info: 'from-blue-500 to-cyan-500',
  warning: 'from-yellow-500 to-orange-500',
  achievement: 'from-purple-500 to-pink-500',
};

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
  achievement: Trophy,
};

export function ToastNotification({ id, message, type, onDismiss }: ToastProps) {
  const Icon = toastIcons[type];

  return (
    <motion.div
      className={`flex items-center gap-3 min-w-[300px] p-4 rounded-lg shadow-lg bg-gradient-to-r ${toastColors[type]} text-text-primary`}
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Icon className="w-5 h-5" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={() => onDismiss(id)} className="p-1 hover:bg-surface/20 rounded">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function ToastContainer({ toasts, onDismiss }: any) {
  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast: any) => (
          <ToastNotification key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
