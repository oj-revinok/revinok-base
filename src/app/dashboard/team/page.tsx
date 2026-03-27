import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  project_count: number
}

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

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: team_members } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

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
        {team_members && team_members.length > 0 ? (
          team_members.map((member: TeamMember) => (
            <div
              key={member.id}
              style={{
                backgroundColor: '#0e0e0e',
                border: '1px solid #1a1a1a',
                borderRadius: '8px',
                padding: '24px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = '#333333'
                el.style.backgroundColor = '#151515'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = '#1a1a1a'
                el.style.backgroundColor = '#0e0e0e'
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
                  }}
                >
                  {member.full_name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#ffffff',
                    }}
                  >
                    {member.full_name}
                  </h3>
                  <p
                    style={{
                      margin: '4px 0 0 0',
                      fontSize: '12px',
                      color: '#BDD630',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {member.role}
                  </p>
                </div>
              </div>

              <p
                style={{
                  margin: '0 0 16px 0',
                  fontSize: '12px',
                  color: '#999999',
                  wordBreak: 'break-all',
                }}
              >
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
                  <p
                    style={{
                      fontSize: '10px',
                      color: '#666666',
                      margin: 0,
                      textTransform: 'uppercase',
                    }}
                  >
                    PROJECTS
                  </p>
                  <p
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#BDD630',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {member.project_count || 0}
                  </p>
                </div>
                <button
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
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = '#BDD630'
                    ;(e.target as HTMLButtonElement).style.color = '#BDD630'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.borderColor = '#1a1a1a'
                    ;(e.target as HTMLButtonElement).style.color = '#999999'
                  }}
                >
                  MANAGE
                </button>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '60px 40px',
              color: '#666666',
            }}
          >
            <p style={{ fontSize: '14px', margin: 0 }}>No team members yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
