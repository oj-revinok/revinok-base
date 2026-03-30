export default function MessagesLoading() {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg, #080808)', overflow: 'hidden' }}>
      {/* Left panel skeleton */}
      <div style={{
        width: '300px',
        flexShrink: 0,
        borderRight: '1px solid var(--border, rgba(255,255,255,0.08))',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '24px 20px',
        gap: '16px',
      }}>
        {/* Header */}
        <div style={{ height: '30px', backgroundColor: 'var(--bgTertiary, #1a1a1a)', borderRadius: 12, opacity: 0.5 }} />

        {/* Search */}
        <div style={{ height: '36px', backgroundColor: 'var(--bgTertiary, #1a1a1a)', borderRadius: 12, opacity: 0.5 }} />

        {/* Conversations */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: '60px',
            backgroundColor: 'var(--bgTertiary, #1a1a1a)',
            borderRadius: 8,
            opacity: 0.5,
            marginBottom: '4px',
          }} />
        ))}
      </div>

      {/* Right panel skeleton */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg, #080808)',
      }}>
        {/* Header */}
        <div style={{
          height: '60px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
          backgroundColor: 'var(--surface, #111111)',
          opacity: 0.5,
        }} />

        {/* Messages area - just a blank space */}
        <div style={{ flex: 1, padding: '24px' }} />

        {/* Input bar */}
        <div style={{
          height: '80px',
          borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
          padding: '16px',
          backgroundColor: 'var(--bgSecondary, #111111)',
          opacity: 0.5,
        }} />
      </div>
    </div>
  )
}
