const axios = require('axios');
const tokenService = require('../src/services/tokenService');
const PLM_CONFIG = require('../src/config/plm.config');

/**
 * IDM'den item'ı GET ile çek
 */

const IDM_API_URL = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api`;

async function getItem() {
  try {
    const pid = 'Theme_Attributes-1-6-LATEST';
    const authHeader = await tokenService.getAuthorizationHeader();
    
    const url = `${IDM_API_URL}/items/${pid}`;
    
    console.log(`📥 Item çekiliyor: ${url}\n`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Başarılı!\n');
    console.log('📋 Item yapısı:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

getItem();
