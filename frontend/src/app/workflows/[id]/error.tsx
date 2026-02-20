'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort client-side logging for quick debugging.
    // If you add Sentry later, forward this there.
    // eslint-disable-next-line no-console
    console.error('[FlowCube] Editor error boundary:', error);
  }, [error]);

  return (
    <div className='mx-auto max-w-3xl px-6 py-10'>
      <h2 className='text-lg font-semibold text-red-600'>O editor encontrou um erro</h2>
      <p className='mt-2 text-sm text-text-muted'>
        Se isso aconteceu ao adicionar um node (principalmente premium), recarregar normalmente resolve.
      </p>

      {error?.digest && (
        <p className='mt-2 text-xs text-text-muted'>Digest: {error.digest}</p>
      )}

      <div className='mt-6 flex flex-wrap gap-3'>
        <button
          className='rounded bg-black px-4 py-2 text-sm text-text-primary hover:opacity-90'
          onClick={() => window.location.reload()}
        >
          Recarregar a pagina
        </button>
        <button
          className='rounded border border-border px-4 py-2 text-sm hover:bg-background-secondary'
          onClick={() => reset()}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
