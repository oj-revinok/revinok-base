'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'

export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://base.revinok.com'

  try {
    const admin = createAdminClient()

    // Generate a Supabase recovery link (does NOT send email — we send via SendGrid)
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: `${siteUrl}/reset-password`,
      },
    })

    if (error) {
      // Don't reveal whether the email exists — always return success to prevent enumeration
      console.error('[Password Reset] generateLink error:', error.message)
      return { success: true }
    }

    const resetLink = data?.properties?.action_link
    if (!resetLink) {
      console.error('[Password Reset] No action_link returned')
      return { success: true }
    }

    // Send email via SendGrid dynamic template
    await sendEmail({
      to: email.trim().toLowerCase(),
      subject: 'Reset your Revinok Portal password',
      templateData: {
        email_heading: 'Reset your password',
        email_body: 'We received a request to reset your Revinok Portal password. Click the button below to choose a new one. This link expires in 1 hour.',
        cta_url: resetLink,
        cta_text: 'Reset Password',
        extra_note: "If you didn't request this, you can safely ignore this email — your password won't change.",
      },
    })

    return { success: true }
  } catch (err: any) {
    console.error('[Password Reset] Unexpected error:', err)
    // Still return success to prevent enumeration
    return { success: true }
  }
}
