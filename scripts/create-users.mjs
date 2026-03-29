/**
 * Creates 4 new team members in Supabase
 * Run: node scripts/create-users.mjs
 */

const SUPABASE_URL = 'https://kukfjeyazncmqrynbkyg.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1a2ZqZXlhem5jbXFyeW5ia3lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDU3NzEzMiwiZXhwIjoyMDYwMTUzMTMyfQ.vC6enucosLNGtAXNow3ovqhBxGTaOk4YKMZsP8_RvIo'

const users = [
  { email: 'ux@revinok.com',      full_name: 'Abishek',  role: 'designer',  password: 'Abishek2026!' },
  { email: 'dp@revinok.com',      full_name: 'Danula',   role: 'designer',  password: 'Danula2026!' },
  { email: 'sdushan@revinok.com', full_name: 'Sadeepa',  role: 'developer', password: 'Sadeepa2026!' },
  { email: 'kg@revinok.com',      full_name: 'Kalhara',  role: 'developer', password: 'Kalhara2026!' },
]

async function createUser({ email, full_name, role, password }) {
  // 1. Create auth user
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error(`❌ Failed to create ${email}:`, data)
    return null
  }

  const userId = data.id
  console.log(`✅ Auth user created: ${email} (${userId})`)

  // 2. Upsert profile
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ full_name, role, email, updated_at: new Date().toISOString() }),
  })

  if (!profileRes.ok) {
    const profileData = await profileRes.text()
    console.warn(`⚠️  Profile update failed for ${email} (may need migration):`, profileData)
  } else {
    console.log(`✅ Profile updated: ${full_name} → ${role}`)
  }

  return { email, full_name, role, password, userId }
}

async function run() {
  console.log('🚀 Creating team members...\n')
  const results = []
  for (const user of users) {
    const result = await createUser(user)
    if (result) results.push(result)
  }

  console.log('\n📋 Login credentials to share with OJ:\n')
  console.log('╔══════════════════════════════════════════════════════════╗')
  results.forEach(u => {
    console.log(`║  ${u.full_name.padEnd(10)} ${u.email.padEnd(24)} ${u.password.padEnd(16)} ${u.role}`)
  })
  console.log('╚══════════════════════════════════════════════════════════╝')
}

run().catch(console.error)
