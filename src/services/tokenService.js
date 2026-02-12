const axios = require('axios');
const PLM_CONFIG = require('../config/plm.config');

/**
 * Token Service
 * Handles OAuth2.0 token acquisition, caching, and refresh
 */
class TokenService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.tokenType = null;
  }

  /**
   * Get access token (from cache or fetch new one)
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Check if token exists and is still valid
    if (this.accessToken && this.isTokenValid()) {
      console.log('✅ Using cached access token');
      return this.accessToken;
    }

    console.log('🔄 Fetching new access token...');
    return await this.fetchNewToken();
  }

  /**
   * Check if current token is still valid
   * @returns {boolean}
   */
  isTokenValid() {
    if (!this.tokenExpiry) {
      return false;
    }

    // Check if token expires in less than 5 minutes (buffer time)
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const currentTime = Date.now();
    
    return currentTime < (this.tokenExpiry - bufferTime);
  }

  /**
   * Fetch new access token from OAuth2.0 provider
   * @returns {Promise<string>} Access token
   */
  async fetchNewToken() {
    try {
      const tokenUrl = `${PLM_CONFIG.providerUrl}${PLM_CONFIG.endpoints.token}`;
      
      // OAuth2.0 Password Grant Type (Resource Owner Password Credentials)
      // Infor ION API uses service account keys as username/password
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', PLM_CONFIG.serviceAccountAccessKey);
      params.append('password', PLM_CONFIG.serviceAccountSecretKey);
      
      const auth = Buffer.from(
        `${PLM_CONFIG.clientId}:${PLM_CONFIG.clientSecret}`
      ).toString('base64');

      console.log('🔐 Token Request URL:', tokenUrl);
      
      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenType = response.data.token_type || 'Bearer';
        
        // Calculate token expiry time
        const expiresIn = response.data.expires_in || 3600; // Default 1 hour
        this.tokenExpiry = Date.now() + (expiresIn * 1000);

        const expiryDate = new Date(this.tokenExpiry);
        console.log('✅ Access token acquired successfully');
        console.log(`⏰ Token expires at: ${expiryDate.toISOString()}`);
        console.log(`📝 Token type: ${this.tokenType}`);

        return this.accessToken;
      } else {
        throw new Error('Invalid token response: access_token not found');
      }

    } catch (error) {
      console.error('❌ Error fetching access token:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      throw new Error(`Failed to acquire access token: ${error.message}`);
    }
  }

  /**
   * Get full authorization header value
   * @returns {Promise<string>} Authorization header value (e.g., "Bearer token...")
   */
  async getAuthorizationHeader() {
    const token = await this.getAccessToken();
    return `${this.tokenType} ${token}`;
  }

  /**
   * Revoke current access token
   * @returns {Promise<void>}
   */
  async revokeToken() {
    if (!this.accessToken) {
      console.log('ℹ️  No token to revoke');
      return;
    }

    try {
      const revokeUrl = `${PLM_CONFIG.providerUrl}${PLM_CONFIG.endpoints.revoke}`;
      
      const params = new URLSearchParams();
      params.append('token', this.accessToken);
      
      const auth = Buffer.from(
        `${PLM_CONFIG.clientId}:${PLM_CONFIG.clientSecret}`
      ).toString('base64');

      await axios.post(revokeUrl, params, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('✅ Token revoked successfully');
      
      // Clear cached token
      this.accessToken = null;
      this.tokenExpiry = null;
      this.tokenType = null;

    } catch (error) {
      console.error('❌ Error revoking token:', error.message);
      throw new Error(`Failed to revoke token: ${error.message}`);
    }
  }

  /**
   * Get token information
   * @returns {Object} Token info
   */
  getTokenInfo() {
    return {
      hasToken: !!this.accessToken,
      isValid: this.isTokenValid(),
      expiryTime: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      tokenType: this.tokenType
    };
  }
}

// Create singleton instance
const tokenService = new TokenService();

module.exports = tokenService;
