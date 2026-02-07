'use client';

import { useState, useEffect } from 'react';
import { fetchPlugins, type Plugin } from '@/lib/plugins';

export function usePlugins() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchPlugins()
      .then((data) => {
        if (mounted) setPlugins(data);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return { plugins, loading };
}
