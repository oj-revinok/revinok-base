// SendGrid email utility — server-side only (never import in client components)
// Uses the SendGrid v3 REST API directly (no extra package needed)

const FROM_EMAIL = 'ops@revinok.com'
const FROM_NAME = 'Revinok Portal'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY

  if (!apiKey) {
    console.error('[SendGrid] SENDGRID_API_KEY is not set')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          { type: 'text/html', value: html },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('[SendGrid] API error:', body)
      return { success: false, error: `Failed to send email (${response.status})` }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[SendGrid] Fetch error:', err)
    return { success: false, error: err.message || 'Unknown error' }
  }
}

// ── Email templates ──────────────────────────────────────────────────────────

export function passwordResetTemplate(resetLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Montserrat,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#080808;padding:32px 40px;text-align:center;">
              <img src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
                   alt="Revinok" height="36" style="display:block;margin:0 auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#080808;letter-spacing:-0.3px;">
                Reset your password
              </h2>
              <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
                We received a request to reset your Revinok Portal password. Click the button below to choose a new one. This link expires in 1 hour.
              </p>
              <a href="${resetLink}"
                 style="display:inline-block;padding:14px 32px;background:#080808;color:#ffffff;text-decoration:none;border-radius:10000px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                Reset Password
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.6;">
                If you didn't request this, you can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#bbb;">
                © ${new Date().getFullYear()} Revinok · ops@revinok.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export function adminPasswordResetTemplate(memberName: string, newPassword: string, loginUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Montserrat,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#080808;padding:32px 40px;text-align:center;">
              <img src="https://cdn.prod.website-files.com/6862752441a47ff6d8e0dab5/69c145e944d6cf8a1de59438_Logo%20(1).png"
                   alt="Revinok" height="36" style="display:block;margin:0 auto;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#080808;letter-spacing:-0.3px;">
                Hi ${memberName}, your password has been reset
              </h2>
              <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
                An admin has reset your Revinok Portal password. Here are your new login details:
              </p>
              <table style="background:#f8f8f8;border-radius:12px;padding:20px;width:100%;box-sizing:border-box;margin-bottom:24px;">
                <tr>
                  <td style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:4px;">
                    Temporary Password
                  </td>
                </tr>
                <tr>
                  <td style="font-size:18px;font-weight:700;color:#080808;letter-spacing:1px;">
                    ${newPassword}
                  </td>
                </tr>
              </table>
              <a href="${loginUrl}"
                 style="display:inline-block;padding:14px 32px;background:#080808;color:#ffffff;text-decoration:none;border-radius:10000px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
                Log In Now
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#999;line-height:1.6;">
                Please change your password after logging in. If you didn't expect this, contact your admin immediately.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f0f0f0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#bbb;">
                © ${new Date().getFullYear()} Revinok · ops@revinok.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
