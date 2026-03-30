export default function ProjectsLoading() {
  return (
    <div style={{ padding: '20px 16px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ height: '36px', width: '200px', backgroundColor: 'var(--border)' }} />
        <div style={{ height: '32px', width: '120px', backgroundColor: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', padding: '20px', height: '180px' }}>
            <div style={{ height: '18px', width: '70%', backgroundColor: 'var(--border)', marginBottom: '12px' }} />
            <div style={{ height: '14px', width: '90%', backgroundColor: 'var(--border)', marginBottom: '8px' }} />
            <div style={{ height: '14px', width: '60%', backgroundColor: 'var(--border)', marginBottom: '24px' }} />
            <div style={{ height: '22px', width: '80px', backgroundColor: 'var(--border)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
