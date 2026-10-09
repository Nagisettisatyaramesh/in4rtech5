const { contactRecord, getRealtimeDatabase } = require('../config/realtimeDatabase');

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
    const created = await getRealtimeDatabase().ref('contacts').push(contactRecord({
      firstName, lastName, email, phone, company, subject: subject || service || 'Website enquiry', service, message
    }));
    return res.status(201).json({ success: true, id: created.id, message: 'Thanks for reaching out. Your enquiry is with our team. We’ll reply using the email address you provided.' });
  } catch (error) { return next(error); }
}

module.exports = { createContact };
