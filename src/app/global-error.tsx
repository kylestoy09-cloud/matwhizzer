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
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <img
          src="/apple-touch-icon.png"
          alt=""
          width={160}
          height={160}
          style={{ marginBottom: '40px' }}
        />

        <p
          style={{
            fontSize: '20px',
            color: '#374151',
            maxWidth: '480px',
            lineHeight: '1.6',
            margin: '0 0 32px 0',
          }}
        >
          Dog must have unplugged the old Compaq Presario someone email me
          and i&apos;ll plug her back in when I get home.
        </p>

        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            border: 'none',
            borderRadius: '999px',
            fontSize: '14px',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          Try Again
        </button>

        <a
          href="/feedback"
          style={{
            fontSize: '14px',
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          Submit Feedback
        </a>

        {error.digest && (
          <p
            style={{
              marginTop: '40px',
              fontSize: '11px',
              color: '#d1d5db',
            }}
          >
            ref: {error.digest}
          </p>
        )}
      </body>
    </html>
  )
}
