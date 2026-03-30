export default function SettingsLoading() {
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ height: '36px', width: '160px', backgroundColor: 'var(--border)', marginBottom: '8px' }} />
        <div style={{ height: '14px', width: '240px', backgroundColor: 'var(--border)' }} />
      </div>

      {/* Settings sections */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{ marginBottom: '32px' }}>
          {/* Section title */}
          <div style={{ height: '20px', width: '150px', backgroundColor: 'var(--border)', marginBottom: '16px', borderRadius: '4px' }} />

          {/* Settings items */}
          {[1, 2].map(j => (
            <div key={j} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', marginBottom: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: '14px', width: '40%', backgroundColor: 'var(--border)', marginBottom: '6px', borderRadius: '4px' }} />
                <div style={{ height: '12px', width: '60%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
              </div>
              <div style={{ height: '20px', width: '40px', backgroundColor: 'var(--border)', borderRadius: '10px', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
