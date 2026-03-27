import { createClient } from '@/lib/supabase/server'

interface Client {
  id: string
  name: string
  email: string
  company: string
  project_count: number
  status: string
}

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
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: '40px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
          }}
        >
          CLIENTS
        </h1>
        {(profile?.role === 'admin' || profile?.role === 'pm') && (
          <button
            style={{
              padding: '12px 24px',
              backgroundColor: '#BDD630',
              color: '#080808',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              fontFamily: 'Montserrat, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#d4e650'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#BDD630'
            }}
          >
            + ADD CLIENT
          </button>
        )}
      </div>

      <div style={{ backgroundColor: '#0e0e0e', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
              <th
                style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#BDD630',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                CLIENT
              </th>
              <th
                style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#BDD630',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                EMAIL
              </th>
              <th
                style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#BDD630',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                PROJECTS
              </th>
              <th
                style={{
                  padding: '16px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#BDD630',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                STATUS
              </th>
            </tr>
          </thead>
          <tbody>
            {clients && clients.length > 0 ? (
              clients.map((client: Client, index: number) => (
                <tr
                  key={client.id}
                  style={{
                    borderBottom: index < clients.length - 1 ? '1px solid #1a1a1a' : 'none',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#151515'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <td
                    style={{
                      padding: '16px 24px',
                      fontSize: '14px',
                      color: '#ffffff',
                      fontWeight: 500,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#BDD630',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#080808',
                          fontWeight: 700,
                          fontSize: '13px',
                        }}
                      >
                        {client.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>{client.name}</p>
                        {client.company && (
                          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666666' }}>
                            {client.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '16px 24px',
                      fontSize: '13px',
                      color: '#999999',
                    }}
                  >
                    {client.email}
                  </td>
                  <td
                    style={{
                      padding: '16px 24px',
                      fontSize: '13px',
                      color: '#999999',
                    }}
                  >
                    {client.project_count || 0}
                  </td>
                  <td
                    style={{
                      padding: '16px 24px',
                      fontSize: '12px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        backgroundColor: client.status === 'active' ? '#4ade80' : '#666666',
                        color: '#080808',
                        borderRadius: '4px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        fontSize: '10px',
                      }}
                    >
                      {client.status || 'ACTIVE'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: '60px 24px',
                    textAlign: 'center',
                    color: '#666666',
                    fontSize: '14px',
                  }}
                >
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
