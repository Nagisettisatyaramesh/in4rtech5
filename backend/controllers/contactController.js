const { query } = require('../config/database');
const { isEmailConfigured, sendContactEmail } = require('../config/email');

const clean = (value, max) => String(value || '').trim().replace(/[<>]/g, '').slice(0, max);

async function createContact(req, res, next) {
  const body = req.body || {};
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 40);
  const company = clean(body.company, 160);
  const subject = clean(body.subject, 180);
  const service = clean(body.service, 100);
  const message = clean(body.message, 5000);

  if (!firstName || message.length < 10 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please check the required fields and use a valid email address.' });
  }

  try {
    const record = {
      firstName, lastName, email, phone: phone || null, company: company || null,
      subject: subject || service || 'Website enquiry', service: service || null, message
    };
    const { rows: [created] } = await query(
      `insert into contacts (first_name, last_name, email, phone, company, subject, service, message)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [record.firstName, record.lastName || null, record.email, record.phone, record.company, record.subject, record.service, record.message]
    );
    // The enquiry is already saved, so an email failure is logged rather than shown to the visitor.
    if (isEmailConfigured()) {
      await sendContactEmail(record).catch((error) => console.error(`Enquiry email failed (${error.code || error.name || 'unknown'}): ${error.message}`));
    }
    return res.status(201).json({ success: true, id: created.id, message: 'Thanks for reaching out. Your enquiry is with our team. We’ll reply to the email address you entered.' });
  } catch (error) { return next(error); }
}

module.exports = { createContact };
