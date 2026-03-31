// SendGrid email utility — server-side only (never import in client components)
// Uses the SendGrid v3 REST API with the Revinok dynamic template.
// Template ID: d-4ac0b964ddbc424d9aa26450a5b8f3ec
// Edit the template design at: https://mc.sendgrid.com/dynamic-templates
// All email content is passed as dynamic_template_data from the app — no need to touch this file.

const FROM_EMAIL = 'ops@revinok.com'
const FROM_NAME = 'Revinok Portal'
const TEMPLATE_ID = 'd-4ac0b964ddbc424d9aa26450a5b8f3ec'

// ── Template variable interface ───────────────────────────────────────────────
// These map to the Handlebars variables in the SendGrid template:
//   {{email_heading}} — main heading line
//   {{email_body}}    — body paragraph
//   {{cta_url}}       — button link (optional — button hidden if omitted)
//   {{cta_text}}      — button label (optional)
//   {{extra_note}}    — small footnote (optional)

export interface TemplateData {
  email_heading: string
  email_body: string
  cta_url?: string
  cta_text?: string
  extra_note?: string
}

export interface SendEmailOptions {
  to: string
  subject: string
  templateData: TemplateData
}

export async function sendEmail({
  to,
  subject,
  templateData,
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
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
        personalizations: [
          {
            to: [{ email: to }],
            dynamic_template_data: templateData,
          },
        ],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        template_id: TEMPLATE_ID,
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
