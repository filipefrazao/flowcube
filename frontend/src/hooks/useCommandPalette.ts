import { useCallback, useEffect, useState } from 'react';

interface RecentCommand {
  id: string;
  label: string;
  timestamp: number;
}

export function useCommandPalette() {
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('flowcube_recent_commands');
    if (stored) {
      setRecentCommands(JSON.parse(stored));
    }
  }, []);

  const addToHistory = useCallback((id: string, label: string) => {
    const newCommand: RecentCommand = {
      id,
      label,
      timestamp: Date.now()
    };

    setRecentCommands(prev => {
      const filtered = prev.filter(cmd => cmd.id \!== id);
      const updated = [newCommand, ...filtered].slice(0, 10);
      localStorage.setItem('flowcube_recent_commands', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    recentCommands,
    addToHistory
  };
}
