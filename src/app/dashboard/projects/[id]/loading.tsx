export default function ProjectDetailLoading() {
  return (
    <div style={{ padding: '20px 16px 80px', maxWidth: '100%' }}>
      {/* Back link skeleton */}
      <div style={{ width: '140px', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 6, marginBottom: '20px' }} />

      {/* Title skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ width: '260px', height: '36px', backgroundColor: '#1a1a1a', borderRadius: 8, marginBottom: '8px' }} />
          <div style={{ width: '120px', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: '80px', height: '28px', backgroundColor: '#1a1a1a', borderRadius: 10000 }} />
          <div style={{ width: '100px', height: '28px', backgroundColor: '#1a1a1a', borderRadius: 10000 }} />
          <div style={{ width: '60px', height: '28px', backgroundColor: '#1a1a1a', borderRadius: 10000 }} />
        </div>
      </div>

      {/* Stats skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ backgroundColor: '#111', padding: '16px 20px', border: '1px solid #1a1a1a', borderRadius: 16, height: '80px' }}>
            <div style={{ width: '80px', height: '10px', backgroundColor: '#1a1a1a', borderRadius: 4, marginBottom: '12px' }} />
            <div style={{ width: '40px', height: '28px', backgroundColor: '#1a1a1a', borderRadius: 6 }} />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #1a1a1a', paddingBottom: '10px' }}>
        {[100, 80, 70].map((w, i) => (
          <div key={i} style={{ width: `${w}px`, height: '14px', backgroundColor: '#1a1a1a', borderRadius: 4 }} />
        ))}
      </div>

      {/* Content skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {[200, 160].map((h, i) => (
            <div key={i} style={{ backgroundColor: '#111', border: '1px solid #1a1a1a', borderRadius: 16, height: `${h}px`, padding: '20px' }}>
              <div style={{ width: '80px', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 4, marginBottom: '16px' }} />
              <div style={{ width: '100%', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 4, marginBottom: '8px' }} />
              <div style={{ width: '80%', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: '#111', border: '1px solid #1a1a1a', borderRadius: 16, height: '140px', padding: '20px' }}>
          <div style={{ width: '60px', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 4, marginBottom: '16px' }} />
          <div style={{ width: '100%', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 4, marginBottom: '12px' }} />
          <div style={{ width: '100%', height: '12px', backgroundColor: '#1a1a1a', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  )
}
