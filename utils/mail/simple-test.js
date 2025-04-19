require('dotenv').config();

// Load .env.local file if it exists
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local', override: true });
}

// Get API key and ensure it starts with "key-"
let apiKey = process.env.MAILGUN_API_KEY;
if (!apiKey.startsWith('key-')) {
  apiKey = `key-${apiKey}`;
  console.log('Added "key-" prefix to API key');
}

const domain = process.env.MAILGUN_DOMAIN;
const fromEmail = process.env.MAIL_FROM_ADDRESS;
const fromName = process.env.MAIL_FROM_NAME;

console.log(`Testing Mailgun with:
  Domain: ${domain}
  From: ${fromEmail}
  Name: ${fromName}
  API Key: ${apiKey.substring(0, 8)}...
`);

// Use fetch to send a request directly to the Mailgun API
const sendEmail = async () => {
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  const auth = Buffer.from(`api:${apiKey}`).toString('base64');
  
  const formData = new URLSearchParams();
  formData.append('from', `${fromName} <${fromEmail}>`);
  formData.append('to', 'your-email@example.com'); // Replace with your email
  formData.append('subject', 'Test Email from Mailgun API (Direct)');
  formData.append('text', 'This is a test email from Mailgun API using fetch');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Success:', data);
    } else {
      console.error('Error:', data);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
};

sendEmail(); 