const axios = require('axios');
const tokenService = require('../src/services/tokenService');
const PLM_CONFIG = require('../src/config/plm.config');

const IDM_API_URL = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api`;

async function testMinimal() {
  try {
    console.log('🧪 MİNİMAL TEST - Curl gibi sadece 2 attribute\n');
    
    const pid = 'Theme_Attributes-1-6-LATEST';
    
    // Curl'deki gibi sadece 2 attribute
    const payload = {
      item: {
        attrs: {
          attr: [
            {
              name: "Tema_Ismi",
              value: "TEST_UPDATE"
            },
            {
              name: "Cluster",
              value: "013"
            }
          ]
        },
        acl: {
          name: "Public"
        },
        entityName: "Theme_Attributes",
        pid: pid
      }
    };
    
    console.log('📦 Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    const authHeader = await tokenService.getAuthorizationHeader();
    const url = `${IDM_API_URL}/items/${pid}`;
    
    console.log(`\n📤 İstek gönderiliyor: ${url}\n`);
    
    const response = await axios.put(url, payload, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      params: {
        '$checkout': 'true',
        '$checkin': 'true',
        '$merge': 'true'
      }
    });
    
    console.log(`✅ Başarılı! Status: ${response.status}`);
    console.log('\n📋 Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testMinimal();
