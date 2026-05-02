// Dashboard-level loading screen. Triggered when navigating between dashboard
// routes (or on a route's first server render). Use the Revinok logo with a
// soft pulse — same treatment as the root loader — so the transition feels
// like the brand, not a broken page.

export default function DashboardLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <img
        src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
        alt="Revinok"
        style={{
          height: '40px',
          width: 'auto',
          animation: 'revinok-pulse 1.4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes revinok-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
