export default function ClientsLoading() {
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ height: '36px', width: '200px', backgroundColor: 'var(--border)' }} />
        <div style={{ height: '32px', width: '120px', backgroundColor: 'var(--border)' }} />
      </div>

      {/* Clients list/table skeleton */}
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', marginBottom: '12px', overflow: 'hidden', borderRadius: '12px' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: '16px', width: '40%', backgroundColor: 'var(--border)', marginBottom: '8px', borderRadius: '4px' }} />
              <div style={{ height: '12px', width: '30%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            </div>
            <div style={{ height: '14px', width: '100px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            <div style={{ height: '14px', width: '80px', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
