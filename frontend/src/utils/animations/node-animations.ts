import { Variants } from 'framer-motion';

export const nodeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20
    }
  },
  hover: {
    scale: 1.05,
    y: -5,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 10
    }
  },
  tap: {
    scale: 0.95
  },
  drag: {
    scale: 1.1,
    rotate: [0, 2, -2, 0],
    transition: {
      rotate: {
        repeat: Infinity,
        duration: 0.3
      }
    }
  }
};

export const glowAnimation = {
  boxShadow: [
    '0 0 20px rgba(168, 85, 247, 0.4)',
    '0 0 40px rgba(168, 85, 247, 0.6)',
    '0 0 20px rgba(168, 85, 247, 0.4)',
  ],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export const glowAnimationCyan = {
  boxShadow: [
    '0 0 20px rgba(0, 255, 255, 0.4)',
    '0 0 40px rgba(0, 255, 255, 0.6)',
    '0 0 20px rgba(0, 255, 255, 0.4)',
  ],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export const glowAnimationGreen = {
  boxShadow: [
    '0 0 20px rgba(200, 235, 45, 0.4)',
    '0 0 40px rgba(200, 235, 45, 0.6)',
    '0 0 20px rgba(200, 235, 45, 0.4)',
  ],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export const glowAnimationBlue = {
  boxShadow: [
    '0 0 20px rgba(59, 130, 246, 0.4)',
    '0 0 40px rgba(59, 130, 246, 0.6)',
    '0 0 20px rgba(59, 130, 246, 0.4)',
  ],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export const pulseAnimation: Variants = {
  pulse: {
    scale: [1, 1.2, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const progressBarAnimation = {
  initial: { width: 0 },
  animate: { width: '100%' },
  transition: { duration: 0.5, delay: 0.2 }
};
