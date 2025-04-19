require('dotenv').config();
const nodemailer = require('nodemailer');

// Load .env.local file if it exists
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local', override: true });
}

const username = process.env.MAILGUN_SMTP_USERNAME;
const password = process.env.MAILGUN_SMTP_PASSWORD;
const fromEmail = process.env.MAIL_FROM_ADDRESS;
const fromName = process.env.MAIL_FROM_NAME;

console.log(`Testing SMTP with:
  Host: smtp.mailgun.org
  Port: 587
  Username: ${username}
  From: ${fromEmail}
  Name: ${fromName}
`);

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.mailgun.org',
  port: 587,
  secure: false,
  auth: {
    user: username,
    pass: password
  }
});

// Send test email
const sendEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: 'your-email@example.com', // Replace with your email
      subject: 'Test Email from SMTP',
      text: 'This is a test email from SMTP',
      html: '<p>This is a test email from <b>SMTP</b>.</p>'
    });
    
    console.log('Email sent:', info.messageId);
    console.log('Response:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

sendEmail(); 