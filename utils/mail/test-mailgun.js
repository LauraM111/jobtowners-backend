const mailgun = require('mailgun-js');
require('dotenv').config();

// Load .env.local file if it exists
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local', override: true });
}

const apiKey = process.env.MAILGUN_API_KEY;
const domain = process.env.MAILGUN_DOMAIN;
const fromEmail = process.env.MAIL_FROM_ADDRESS;
const fromName = process.env.MAIL_FROM_NAME;

// Check if API key starts with "key-"
if (!apiKey.startsWith('key-')) {
  console.error('ERROR: Mailgun API key must start with "key-"');
  console.error(`Your API key: ${apiKey}`);
  console.error('Please update your .env file with the correct API key format');
  process.exit(1);
}

console.log(`Testing Mailgun with:
  Domain: ${domain}
  From: ${fromEmail}
  Name: ${fromName}
  API Key: ${apiKey.substring(0, 8)}...
`);

const mg = mailgun({ apiKey, domain });

const data = {
  from: `${fromName} <${fromEmail}>`,
  to: 'your-email@example.com', // Replace with your email
  subject: 'Test Email from Mailgun API',
  text: 'This is a test email from Mailgun API'
};

mg.messages().send(data, (error, body) => {
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', body);
  }
}); 