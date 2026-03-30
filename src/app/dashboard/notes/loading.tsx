export default function NotesLoading() {
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ height: '36px', width: '160px', backgroundColor: 'var(--border)', marginBottom: '8px' }} />
        <div style={{ height: '14px', width: '280px', backgroundColor: 'var(--border)' }} />
      </div>

      {/* Notes grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', height: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ height: '18px', width: '80%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            <div style={{ height: '14px', width: '100%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            <div style={{ height: '14px', width: '95%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
            <div style={{ height: '14px', width: '70%', backgroundColor: 'var(--border)', borderRadius: '4px', marginTop: 'auto' }} />
            <div style={{ height: '12px', width: '60%', backgroundColor: 'var(--border)', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
