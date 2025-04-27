import axios from 'axios';

async function testLoginApi() {
  try {
    console.log('Testing login API...');
    
    const response = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'employer@jobtowners.com',
      password: 'Employer@123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login successful!');
    console.log('Status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Login failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Response headers:', error.response.headers);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLoginApi(); 