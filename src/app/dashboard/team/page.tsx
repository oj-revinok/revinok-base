import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TeamPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'project_manager') {
    redirect('/dashboard')
  }

  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')

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
          TEAM
        </h1>
        <button
          className="btn-primary"
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
          }}
        >
          + INVITE MEMBER
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '24px',
        }}
      >
        {teamMembers && teamMembers.length > 0 ? (
          teamMembers.map((member) => (
            <div
              key={member.id}
              className="card-hover"
              style={{
                backgroundColor: '#0e0e0e',
                border: '1px solid #1a1a1a',
                borderRadius: '8px',
                padding: '24px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#BDD630',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#080808',
                    fontWeight: 700,
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  {(member.full_name || member.email || 'U')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                    {member.full_name || member.email}
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      color: '#BDD630',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {member.role}
                  </p>
                </div>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#999999', wordBreak: 'break-all' }}>
                {member.email}
              </p>

              <div
                style={{
                  paddingTop: '16px',
                  borderTop: '1px solid #1a1a1a',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ fontSize: '10px', color: '#666666', margin: 0, textTransform: 'uppercase' }}>
                    JOINED
                  </p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', margin: '4px 0 0 0' }}>
                    {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  className="btn-ghost"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #1a1a1a',
                    borderRadius: '4px',
                    color: '#999999',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                  }}
                >
                  MANAGE
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 40px', color: '#666666' }}>
            <p style={{ fontSize: '14px', margin: 0 }}>No team members yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
