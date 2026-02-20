'use client';

import { useEffect, useRef, useState } from 'react';

type VersionResponse = { version?: string };

const DISMISSED_KEY = 'flowcube.dismissed_version';

export function AppUpdateNotifier() {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION;
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const checkingRef = useRef(false);

  async function checkForUpdate() {
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      const res = await fetch('/version', { cache: 'no-store' });
      if (!res.ok) return;

      const data = (await res.json()) as VersionResponse;
      const serverVersion = data?.version;

      // If the tab already has the latest version, clear any previous warning.
      if (serverVersion && currentVersion && serverVersion === currentVersion) {
        setNewVersion(null);
        try {
          sessionStorage.removeItem(DISMISSED_KEY);
        } catch {
          // ignore
        }
        return;
      }

      const dismissed = (() => {
        try {
          return sessionStorage.getItem(DISMISSED_KEY);
        } catch {
          return null;
        }
      })();

      if (serverVersion && currentVersion && serverVersion !== currentVersion && dismissed !== serverVersion) {
        setNewVersion(serverVersion);
      }
    } catch {
      // Best-effort: do nothing.
    } finally {
      checkingRef.current = false;
    }
  }

  useEffect(() => {
    checkForUpdate();

    const onFocus = () => void checkForUpdate();
    window.addEventListener('focus', onFocus);

    // Periodic check to catch long-lived tabs.
    const id = window.setInterval(() => void checkForUpdate(), 5 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!newVersion) return null;

  async function handleReload() {
    try {
      sessionStorage.removeItem(DISMISSED_KEY);
    } catch {
      // ignore
    }

    // If the browser has a Cache Storage (PWA/SW), clear it so stale bundles don't stick.
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    }

    // Force a new URL to bypass overly aggressive intermediary caches.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('__flowcube', newVersion);
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }

  function handleDismiss() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, newVersion);
    } catch {
      // ignore
    }
    setNewVersion(null);
  }

  return (
    <div className={'fixed inset-x-0 top-0 z-50 bg-yellow-400 text-black'}>
      <div className={'mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-sm'}>
        <div className={'font-medium'}>Nova versao disponivel. Recarregue para evitar bugs de bundle/cache.</div>
        <div className={'flex items-center gap-2'}>
          <button className={'rounded bg-black px-3 py-1 text-text-primary hover:opacity-90'} onClick={handleReload}>
            Recarregar
          </button>
          <button className={'rounded border border-black/20 px-3 py-1 hover:bg-black/10'} onClick={handleDismiss}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
