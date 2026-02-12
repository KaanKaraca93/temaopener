/**
 * Token Service Test
 * Test the token acquisition and management
 */

const tokenService = require('../src/services/tokenService');

async function testTokenService() {
  console.log('🧪 Testing Token Service...\n');
  
  try {
    // Test 1: Get Access Token
    console.log('Test 1: Get Access Token');
    console.log('─'.repeat(50));
    const token1 = await tokenService.getAccessToken();
    console.log('Token (first 50 chars):', token1.substring(0, 50) + '...');
    console.log('✅ Test 1 passed\n');
    
    // Test 2: Get Token Info
    console.log('Test 2: Get Token Info');
    console.log('─'.repeat(50));
    const tokenInfo = tokenService.getTokenInfo();
    console.log('Token Info:', JSON.stringify(tokenInfo, null, 2));
    console.log('✅ Test 2 passed\n');
    
    // Test 3: Get Cached Token
    console.log('Test 3: Get Cached Token');
    console.log('─'.repeat(50));
    const token2 = await tokenService.getAccessToken();
    console.log('Tokens match:', token1 === token2);
    console.log('✅ Test 3 passed\n');
    
    // Test 4: Get Authorization Header
    console.log('Test 4: Get Authorization Header');
    console.log('─'.repeat(50));
    const authHeader = await tokenService.getAuthorizationHeader();
    console.log('Auth Header (first 70 chars):', authHeader.substring(0, 70) + '...');
    console.log('✅ Test 4 passed\n');
    
    // Test 5: Token Validation
    console.log('Test 5: Token Validation');
    console.log('─'.repeat(50));
    const isValid = tokenService.isTokenValid();
    console.log('Is token valid:', isValid);
    console.log('✅ Test 5 passed\n');
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testTokenService();
