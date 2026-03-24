import { Resend } from 'resend'

const NOTIFY = 'tracybailey5150@icloud.com'

function from(appName: string) {
  return `${appName} <noreply@hookvault.app>`
}

export async function notifyNewSignup(appName: string, email: string, name?: string) {
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: from(appName),
      to: NOTIFY,
      subject: `[${appName}] New signup — ${email}`,
      html: `
        <div style="font-family:sans-serif;padding:24px;max-width:560px">
          <h2 style="margin:0 0 12px">New signup on ${appName}</h2>
          <p><strong>Email:</strong> ${email}</p>
          ${name ? `<p><strong>Name:</strong> ${name}</p>` : ''}
          <p style="color:#64748B;font-size:12px;margin-top:24px">${new Date().toUTCString()}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error(`[Email] notifyNewSignup failed:`, err)
  }
}

export async function notifyNewSubscription(appName: string, email: string, plan: string, amount: string) {
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: from(appName),
      to: NOTIFY,
      subject: `[${appName}] New subscription — ${plan} — ${email}`,
      html: `
        <div style="font-family:sans-serif;padding:24px;max-width:560px">
          <h2 style="margin:0 0 12px">New subscription on ${appName}</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Plan:</strong> ${plan}</p>
          <p><strong>Amount:</strong> ${amount}</p>
          <p style="color:#64748B;font-size:12px;margin-top:24px">${new Date().toUTCString()}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error(`[Email] notifyNewSubscription failed:`, err)
  }
}

export async function notifyContactForm(appName: string, senderEmail: string, senderName: string, message: string) {
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: from(appName),
      to: NOTIFY,
      replyTo: senderEmail,
      subject: `[${appName}] Contact form — ${senderName}`,
      html: `
        <div style="font-family:sans-serif;padding:24px;max-width:560px">
          <h2 style="margin:0 0 12px">Contact form submission on ${appName}</h2>
          <p><strong>From:</strong> ${senderName} &lt;${senderEmail}&gt;</p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">
          <p style="white-space:pre-wrap">${message}</p>
          <p style="color:#64748B;font-size:12px;margin-top:24px">${new Date().toUTCString()}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error(`[Email] notifyContactForm failed:`, err)
  }
}

export async function notifyNewLead(appName: string, email: string, details?: string) {
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: from(appName),
      to: NOTIFY,
      subject: `[${appName}] New lead — ${email}`,
      html: `
        <div style="font-family:sans-serif;padding:24px;max-width:560px">
          <h2 style="margin:0 0 12px">New lead on ${appName}</h2>
          <p><strong>Email:</strong> ${email}</p>
          ${details ? `<p><strong>Details:</strong> ${details}</p>` : ''}
          <p style="color:#64748B;font-size:12px;margin-top:24px">${new Date().toUTCString()}</p>
        </div>
      `,
    })
  } catch (err) {
    console.error(`[Email] notifyNewLead failed:`, err)
  }
}
