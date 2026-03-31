import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AddClientModal from '@/components/AddClientModal'
import ClientsTable from '@/components/ClientsTable'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Designers, developers, and viewers cannot access Clients (server-side enforcement — M-06)
  const RESTRICTED_ROLES = ['designer', 'developer', 'designer_dev', 'viewer']
  if (profile?.role && RESTRICTED_ROLES.includes(profile.role)) {
    redirect('/dashboard/projects')
  }

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
            color: 'var(--text-primary)',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
          }}
        >
          CLIENTS
        </h1>
        {canCreate && <AddClientModal />}
      </div>

      <ClientsTable clients={clients || []} canEdit={canCreate} />
    </div>
  )
}
