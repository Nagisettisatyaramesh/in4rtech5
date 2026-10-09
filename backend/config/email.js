// Sends enquiry notifications through Resend (https://resend.com).
// Requires RESEND_API_KEY and CONTACT_TO; CONTACT_FROM must use a domain verified in Resend.
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.CONTACT_TO);
}

async function sendContactEmail(contact) {
  const name = `${contact.firstName} ${contact.lastName || ''}`.trim();
  const fields = [['Name', name], ['Email', contact.email], ['Phone', contact.phone], ['Company', contact.company], ['Service', contact.service]]
    .filter(([, value]) => value);
  const text = ['New enquiry from the In4rtech website', '', ...fields.map(([label, value]) => `${label}: ${value}`), '', contact.message].join('\n');
  const html = '<h2 style="font-family:Arial,sans-serif">New enquiry from the In4rtech website</h2>' +
    '<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">' +
    fields.map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#555">${label}</td><td style="padding:4px 0"><b>${esc(value)}</b></td></tr>`).join('') +
    `</table><p style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;margin-top:16px">${esc(contact.message)}</p>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || 'In4rtech Website <onboarding@resend.dev>',
      to: process.env.CONTACT_TO.split(',').map((address) => address.trim()).filter(Boolean),
      reply_to: contact.email,
      subject: `[Website enquiry] ${contact.subject}`.slice(0, 200),
      text,
      html
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    const error = new Error(`Resend responded with ${response.status}.`);
    error.code = 'EMAIL_SEND_FAILED';
    throw error;
  }
}

module.exports = { isEmailConfigured, sendContactEmail };
