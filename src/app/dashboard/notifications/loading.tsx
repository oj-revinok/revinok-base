export default function NotificationsLoading() {
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ height: '36px', width: '200px', backgroundColor: 'var(--border)', marginBottom: '8px' }} />
        <div style={{ height: '14px', width: '320px', backgroundColor: 'var(--border)' }} />
      </div>

      {/* Notifications list */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', marginBottom: '12px', overflow: 'hidden', borderRadius: '12px' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--border)', flexShrink: 0, marginTop: '6px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '14px', width: '70%', backgroundColor: 'var(--border)', marginBottom: '8px', borderRadius: '4px' }} />
              <div style={{ height: '12px', width: '90%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            </div>
            <div style={{ height: '12px', width: '60px', backgroundColor: 'var(--border)', borderRadius: '4px', flexShrink: 0 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
