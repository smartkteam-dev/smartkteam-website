const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, lastName, businessName, email, service, message } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !businessName || !email || !service || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Format subject: "Web contact" + Business name + Service
    const subject = `Web contact - ${businessName} - ${service}`;

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

    // Send email via Resend
    const result = await resend.emails.send({
      from: 'onboarding@resend.dev', // Resend sandbox email (you can change this later)
      to: 'smart.kteam.us@gmail.com',
      subject: subject,
      text: emailBody,
    });

    if (result.error) {
      return res.status(500).json({ error: 'Failed to send email', details: result.error });
    }

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully!',
      id: result.data.id
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
}
