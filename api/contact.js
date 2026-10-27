const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Verified smartkteam.com sender, set in Vercel env. Falls back to the Resend sandbox sender until the domain is verified.
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const TO = 'smart.kteam.us@gmail.com';

const SERVICES = [
  'Website Design',
  'SEO Ranking',
  'Booking & Payment System',
  'Google Ads',
  'Insurance Claims',
  'Full Package',
];

const MAX_LEN = { firstName: 80, lastName: 80, businessName: 120, email: 254, service: 60, message: 3000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort per-instance limit (5 per 10 min per IP). Serverless instances don't share memory,
// so this only slows down simple floods; add Vercel Firewall rate limiting for a hard cap.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) {
    for (const [key, times] of hits) {
      if (!times.some(t => now - t < WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_HITS;
}

// Collapse line breaks so user input can't inject extra headers or lines into the subject
const oneLine = s => s.replace(/[\r\n]+/g, ' ').trim();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};

    // Honeypot: real visitors never see or fill this field. Pretend success so bots don't retry.
    if (body.website) {
      return res.status(200).json({ success: true });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (rateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later' });
    }

    const data = {};
    for (const key of Object.keys(MAX_LEN)) {
      const value = body[key];
      if (typeof value !== 'string' || !value.trim()) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (value.length > MAX_LEN[key]) {
        return res.status(400).json({ error: 'One of the fields is too long' });
      }
      data[key] = value.trim();
    }

    if (!EMAIL_RE.test(data.email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (!SERVICES.includes(data.service)) {
      return res.status(400).json({ error: 'Invalid service selected' });
    }

    const { firstName, lastName, businessName, email, service, message } = data;

    // Format subject: "Web contact" + Business name + Service
    const subject = oneLine(`Web contact - ${businessName} - ${service}`);

    // Format email body
    const emailBody = `
New Contact Form Submission

NAME: ${firstName} ${lastName}
BUSINESS: ${businessName}
EMAIL: ${email}
SERVICE INTERESTED: ${service}

MESSAGE:
${message}

---
This email was sent from smartkteam.com contact form
`;

    // Send email via Resend. reply_to lets you answer the visitor directly.
    const result = await resend.emails.send({
      from: FROM,
      to: TO,
      reply_to: email,
      subject: subject,
      text: emailBody,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return res.status(500).json({ error: 'Failed to send message' });
    }

    return res.status(200).json({ success: true, message: 'Email sent successfully!' });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
