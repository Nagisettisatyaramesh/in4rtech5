// Sends enquiry notifications to CONTACT_TO.
// Uses Gmail SMTP when EMAIL_USER and EMAIL_PASS (a Google app password) are set, copying EMAIL_USER;
// otherwise uses Resend (https://resend.com) when RESEND_API_KEY is set.
const nodemailer = require('nodemailer');

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const usesGmail = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      connectionTimeout: 10000,
      socketTimeout: 10000
    });
  }
  return transporter;
}

function isEmailConfigured() {
  return Boolean(process.env.CONTACT_TO && (usesGmail() || process.env.RESEND_API_KEY));
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
  const to = process.env.CONTACT_TO.split(',').map((address) => address.trim()).filter(Boolean);
  const subject = `[Website enquiry] ${contact.subject}`.slice(0, 200);

  if (usesGmail()) {
    try {
      // Gmail sends as the signed-in account, so the sender is EMAIL_USER.
      await getTransporter().sendMail({
        from: `In4rtech Website <${process.env.EMAIL_USER}>`,
        to,
        cc: process.env.EMAIL_USER,
        replyTo: contact.email,
        subject,
        text,
        html
      });
    } catch (cause) {
      const error = new Error(`Gmail SMTP failed: ${cause.message}`);
      error.code = 'EMAIL_SEND_FAILED';
      throw error;
    }
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM || 'In4rtech Website <onboarding@resend.dev>',
      to,
      reply_to: contact.email,
      subject,
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
