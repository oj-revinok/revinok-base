import { createClient } from '@/lib/supabase/server'
import AddClientModal from '@/components/AddClientModal'

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
    <div style={{ padding: '20px 16px 40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(22px, 5vw, 32px)',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
          }}
        >
          CLIENTS
        </h1>
        {canCreate && <AddClientModal />}
      </div>

      {clients && clients.length > 0 ? (
        <>
          {/* Desktop table — hidden on mobile */}
          <div className="clients-table-wrap" style={{ backgroundColor: '#0e0e0e', border: '1px solid #1a1a1a', overflowX: 'auto' }}>
            <table
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
                {clients.map((client, index) => (
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
                          <p style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            {client.brand_name || client.name}
                          </p>
                          {client.website && (
                            <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#666666' }}>
                              {client.website.replace('https://', '').replace('http://', '')}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — shown only on mobile */}
          <div className="clients-mobile-list">
            {clients.map((client) => (
              <div
                key={client.id}
                style={{
                  backgroundColor: '#0e0e0e',
                  border: '1px solid #1a1a1a',
                  padding: '16px',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div
                    className="avatar"
                    style={{
                      width: '44px',
                      height: '44px',
                      backgroundColor: client.avatar_color || '#BDD630',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#080808',
                      fontWeight: 700,
                      fontSize: '15px',
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 800, color: '#ffffff', fontSize: '16px', lineHeight: 1.2, wordBreak: 'break-word', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {client.brand_name || client.name}
                    </p>
                    {client.website && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#666666' }}>
                        {client.website.replace('https://', '').replace('http://', '')}
                      </p>
                    )}
                  </div>
                  <span
                    className="tag"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1a1a1a',
                      color: '#BDD630',
                      fontWeight: 700,
                      fontSize: '13px',
                      flexShrink: 0,
                    }}
                  >
                    {(client as { projects?: { id: string }[] }).projects?.length ?? 0}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  {client.industry && (
                    <div>
                      <p style={{ margin: 0, fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Industry</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#999999' }}>{client.industry}</p>
                    </div>
                  )}
                  {client.email && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Email</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#999999', wordBreak: 'break-all' }}>{client.email}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 40px',
            backgroundColor: '#0e0e0e',
            border: '1px solid #1a1a1a',
            color: '#555555',
            fontSize: '14px',
          }}
        >
          No clients yet
        </div>
      )}
    </div>
  )
}
