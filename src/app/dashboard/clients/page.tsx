import { createClient } from '@/lib/supabase/server'

export default async function ClientsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const { data: clients } = await supabase
    .from('clients')
    .select('*, projects ( id )')
    .order('name')

  const canCreate = profile?.role === 'admin' || profile?.role === 'project_manager'

  return (
    <div style={{ padding: '24px 20px 40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          gap: '12px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
          }}
        >
          CLIENTS
        </h1>
        {canCreate && (
          <button
            className="btn-primary"
            style={{
              padding: '12px 20px',
              backgroundColor: '#BDD630',
              color: '#080808',
              border: 'none',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              minHeight: '44px',
              whiteSpace: 'nowrap',
            }}
          >
            + ADD CLIENT
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', overflowX: 'auto' }}>
        <table
          className="responsive-table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Montserrat, sans-serif',
            minWidth: '500px',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              {['CLIENT', 'INDUSTRY', 'EMAIL', 'PROJECTS'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '16px 20px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#BDD630',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients && clients.length > 0 ? (
              clients.map((client, index) => (
                <tr
                  key={client.id}
                  className="nav-link"
                  style={{
                    borderBottom: index < clients.length - 1 ? '1px solid #1a1a1a' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        className="avatar"
                        style={{
                          width: '36px',
                          height: '36px',
                          backgroundColor: client.avatar_color || '#BDD630',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#080808',
                          fontWeight: 700,
                          fontSize: '13px',
                          flexShrink: 0,
                        }}
                      >
                        {(client.brand_name || client.name)
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: '#ffffff', fontSize: '14px' }}>
                          {client.brand_name || client.name}
                        </p>
                        {client.website && (
                          <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#666666' }}>
                            {client.website.replace('https://', '')}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#999999' }}>
                    {client.industry || '—'}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#999999' }}>
                    {client.email || '—'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      className="tag"
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: '#1a1a1a',
                        color: '#BDD630',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {(client as { projects?: { id: string }[] }).projects?.length ?? 0}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '60px 20px', textAlign: 'center', color: '#666666', fontSize: '14px' }}>
                  No clients yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
