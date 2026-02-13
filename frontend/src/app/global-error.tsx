'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Algo deu errado</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>{error.message || 'Erro interno do servidor'}</p>
          <button
            onClick={() => reset()}
            style={{ padding: '8px 24px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  )
}
