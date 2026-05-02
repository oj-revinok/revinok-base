// Root-level loading screen. Without this, Next.js falls back to a blank
// white/black screen during the very first paint of any route — which on a
// dark theme looks like a broken page. Show the Revinok logo with a soft
// pulse so the user has a reassuring "loading" cue.
//
// The dark variant of the logo is used unconditionally because we can't read
// the user's theme preference before client-side hydration. In the rare
// light-mode case the logo still renders fine on the page background.

export default function RootLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        zIndex: 9999,
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
