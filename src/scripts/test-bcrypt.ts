import * as bcrypt from 'bcrypt';

async function testBcrypt() {
  // Create a password hash
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Verify the password
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Password matches hash:', isMatch);
  
  // Verify with the hardcoded hash
  const hardcodedHash = '$2b$10$XtMTHZpfxzgNqIj4eCZQAeqIjzWv1s6q9RCgBZHmCsY6qFNxHSfeK';
  const isMatchHardcoded = await bcrypt.compare(password, hardcodedHash);
  console.log('Password matches hardcoded hash:', isMatchHardcoded);
}

testBcrypt(); 