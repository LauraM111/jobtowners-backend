const MailSender = require('./mailSender');

// Create a new instance of MailSender
const mailer = new MailSender();

// Test email recipient
const testEmail = 'your-email@example.com'; // Replace with your email

// Function to test sending a simple email
async function testSimpleEmail() {
  console.log('Testing simple email...');
  const result = await mailer.sendTestEmail(testEmail);
  console.log('Result:', result);
  return result;
}

// Function to test sending a welcome email
async function testWelcomeEmail() {
  console.log('Testing welcome email...');
  const result = await mailer.sendWelcomeEmail(testEmail, 'John Doe');
  console.log('Result:', result);
  return result;
}

// Function to test sending a password reset email
async function testPasswordResetEmail() {
  console.log('Testing password reset email...');
  const result = await mailer.sendPasswordResetEmail(
    testEmail, 
    'John Doe', 
    'reset-token-123456'
  );
  console.log('Result:', result);
  return result;
}

// Function to test sending a notification email
async function testNotificationEmail() {
  console.log('Testing notification email...');
  const result = await mailer.sendNotificationEmail(
    testEmail,
    'John Doe',
    'You have a new message from a potential employer.',
    'http://localhost:3000/messages'
  );
  console.log('Result:', result);
  return result;
}

// Run all tests
async function runAllTests() {
  try {
    await testSimpleEmail();
    console.log('-----------------------------------');
    await testWelcomeEmail();
    console.log('-----------------------------------');
    await testPasswordResetEmail();
    console.log('-----------------------------------');
    await testNotificationEmail();
    console.log('-----------------------------------');
    console.log('All tests completed!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run a specific test or all tests
const testType = process.argv[2];

switch (testType) {
  case 'simple':
    testSimpleEmail();
    break;
  case 'welcome':
    testWelcomeEmail();
    break;
  case 'reset':
    testPasswordResetEmail();
    break;
  case 'notification':
    testNotificationEmail();
    break;
  default:
    runAllTests();
} 