// Test script to verify API connection between Vercel and Render
// Run this in browser console on your Vercel site to test the connection

async function testApiConnection() {
  console.log('🔍 Testing API connection...');
  
  try {
    // Test 1: Basic API endpoint
    console.log('1. Testing basic API endpoint...');
    const response = await fetch('/api/health');
    const data = await response.json();
    console.log('✅ API Health Check:', data);
    
    // Test 2: Root endpoint
    console.log('2. Testing root endpoint...');
    const rootResponse = await fetch('/api');
    const rootData = await rootResponse.json();
    console.log('✅ Root API:', rootData);
    
    // Test 3: Test with full URL (if needed)
    console.log('3. Testing with full Render URL...');
    const fullUrlResponse = await fetch('https://soteros-backend.onrender.com/api/health');
    const fullUrlData = await fullUrlResponse.json();
    console.log('✅ Full URL Test:', fullUrlData);
    
    console.log('🎉 All API tests passed! Frontend is successfully connected to Render backend.');
    
  } catch (error) {
    console.error('❌ API connection test failed:', error);
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Check if VITE_API_URL is set correctly in Vercel environment variables');
    console.log('2. Verify Render backend is running at https://soteros-backend.onrender.com/');
    console.log('3. Check CORS configuration in backend server.js');
    console.log('4. Ensure the frontend is deployed with the latest changes');
  }
}

// Run the test
testApiConnection();
