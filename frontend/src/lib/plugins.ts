import apiClient from './api';

export interface Plugin {
  slug: string;
  label: string;
  icon: string;
  menu_position: number;
  frontend_route: string;
  version: string;
  url_prefix: string;
}

let pluginCache: Plugin[] | null = null;
let pluginFetchPromise: Promise<Plugin[]> | null = null;

export async function fetchPlugins(): Promise<Plugin[]> {
  if (pluginCache) return pluginCache;
  if (pluginFetchPromise) return pluginFetchPromise;

  pluginFetchPromise = apiClient
    .get('/plugins/')
    .then((res) => {
      const data = res.data;
      pluginCache = Array.isArray(data) ? data : (data.plugins || []);
      return pluginCache as Plugin[];
    })
    .catch((err) => {
      console.warn('[Plugins] Failed to fetch plugins:', err.message);
      return [] as Plugin[];
    })
    .finally(() => {
      pluginFetchPromise = null;
    });

  return pluginFetchPromise;
}

export function invalidatePluginCache() {
  pluginCache = null;
}
