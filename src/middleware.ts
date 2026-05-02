import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Paths a `client` role is allowed to access. Everything under /dashboard
// that isn't in this list redirects to /dashboard/projects. Defence in
// depth: each page also does its own server-side role check, but the
// middleware ensures a client can never even hit those pages by URL.
const CLIENT_ALLOWED_PREFIXES = [
  '/dashboard/projects',       // their own projects (RLS scopes the rows)
  '/dashboard/notifications',  // their own notifications (RLS scopes)
  '/dashboard/settings',       // password / Notion ID etc (server filters fields)
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isPublic =
    path.startsWith('/login') ||
    path.startsWith('/auth') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Role-based path gating for clients. We only do the profile lookup for
  // /dashboard/* routes (not for API calls or other paths) so the cost
  // stays focused. Skip if not authed (already redirected above).
  if (user && path.startsWith('/dashboard') && path !== '/dashboard') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'client') {
      const isAllowed = CLIENT_ALLOWED_PREFIXES.some(p => path.startsWith(p))
      if (!isAllowed) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard/projects'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
