import { useCallback } from 'react';
import confetti from 'canvas-confetti';

type CelebrationType = 'small' | 'medium' | 'big' | 'epic';

export function useCelebration() {
  const celebrate = useCallback((type: CelebrationType = 'medium') => {
    // Haptic feedback (mobile)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      const pattern = {
        small: [50],
        medium: [50, 100, 50],
        big: [100, 50, 100, 50, 100],
        epic: [200, 100, 200, 100, 200, 100, 200]
      }[type];
      navigator.vibrate(pattern);
    }

    // Confetti configuration
    const configs = {
      small: {
        particleCount: 50,
        spread: 40,
        origin: { y: 0.7 }
      },
      medium: {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      },
      big: {
        particleCount: 200,
        spread: 90,
        origin: { y: 0.6 }
      },
      epic: {
        particleCount: 300,
        spread: 120,
        startVelocity: 60,
        origin: { y: 0.5 }
      }
    }[type];

    // Neon colors
    confetti({
      ...configs,
      colors: ['#A855F7', '#00ffff', '#c8eb2d', '#EC4899', '#3B82F6'],
      shapes: ['circle', 'square'],
      gravity: 1.2,
      drift: 0,
      ticks: 300
    });

    // For epic, add extra bursts
    if (type === 'epic') {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#A855F7', '#00ffff']
        });
      }, 100);

      setTimeout(() => {
        confetti({
          particleCount: 150,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#c8eb2d', '#EC4899']
        });
      }, 200);
    }
  }, []);

  const celebrateWithSound = useCallback(async (type: CelebrationType = 'medium') => {
    celebrate(type);
    
    // Play sound effect (Web Audio API)
    if (typeof window !== 'undefined') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Success sound (C major chord)
      const frequencies = [261.63, 329.63, 392.00]; // C, E, G
      frequencies.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc.frequency.value = freq;
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioContext.destination);
        
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        osc.start(audioContext.currentTime + i * 0.05);
        osc.stop(audioContext.currentTime + 0.5);
      });
    }
  }, [celebrate]);

  return {
    celebrate,
    celebrateWithSound
  };
}
