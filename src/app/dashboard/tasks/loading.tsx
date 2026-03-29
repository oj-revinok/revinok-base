export default function TasksLoading() {
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ height: '36px', width: '160px', backgroundColor: '#1a1a1a', marginBottom: '8px' }} />
        <div style={{ height: '14px', width: '240px', backgroundColor: '#111111' }} />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', marginBottom: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1a1a1a' }} />
            <div style={{ height: '12px', width: '100px', backgroundColor: '#1a1a1a' }} />
          </div>
          {[1, 2, 3, 4].map(j => (
            <div key={j} style={{ padding: '12px 16px', borderBottom: '1px solid #111', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ height: '14px', flex: 1, backgroundColor: '#111111', maxWidth: '400px' }} />
              <div style={{ height: '12px', width: '60px', backgroundColor: '#111111' }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
