export default function TeamLoading() {
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ height: '36px', width: '180px', backgroundColor: 'var(--border)' }} />
        <div style={{ height: '32px', width: '140px', backgroundColor: 'var(--border)' }} />
      </div>

      {/* Team members grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--border)', borderRadius: '50%' }} />
            <div style={{ height: '16px', width: '70%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            <div style={{ height: '12px', width: '60%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            <div style={{ height: '28px', width: '100%', backgroundColor: 'var(--border)', borderRadius: '6px', marginTop: '8px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
