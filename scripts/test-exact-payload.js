const axios = require('axios');

// TST Config
const TST_CONFIG = {
  tenantId: 'ATJZAMEWEF5P4SNV_TST',
  clientId: 'ATJZAMEWEF5P4SNV_TST~vlWkwz2P74KAmRFfihVsdK5yjnHvnfPUrcOt4nl6gkI',
  clientSecret: 'HU1TUcBOX1rkp-uuYKUQ3simFEYzPKNM-XIyf4ewIxe-TYUZOK7RAlXUPd_FwSZMAslt8I9RZmv23xItVKY8EQ',
  serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_TST#5d3TLFCMqK_CR9wmWsLbIn1UnLv2d8S0ohtIX4TZ4PUBXyvtx-RjHjscLzfB9NBAGZfdWMgzFt3DCpWoJMOHEg',
  serviceAccountSecretKey: 'g0oBJ4ubPxJwgJZjAxAfguExlH3V5-cFF0zove_9Fb_7h4C67eXko45T9Ltjw-DYzfYUbU_iQbCZuTW6wYeX5Q',
  ionApiUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
  providerUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_TST/as/'
};

let accessToken = null;

// Token alma fonksiyonu
async function getAccessToken() {
  if (accessToken) return accessToken;

  try {
    const tokenUrl = `${TST_CONFIG.providerUrl}token.oauth2`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', TST_CONFIG.serviceAccountAccessKey);
    params.append('password', TST_CONFIG.serviceAccountSecretKey);
    
    const auth = Buffer.from(`${TST_CONFIG.clientId}:${TST_CONFIG.clientSecret}`).toString('base64');

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    console.log('✅ Token alındı (TST)');
    return accessToken;
  } catch (error) {
    console.error('❌ Token alınamadı:', error.response?.data || error.message);
    throw error;
  }
}

// Ana fonksiyon
async function main() {
  try {
    const token = await getAccessToken();
    
    // Senin verdiğin tam payload
    const payload = {
      "item": {
        "acl": {
          "name": "Public"
        },
        "attrs": {
          "attr": [
            {
              "name": "Tema_Kodu",
              "type": "1",
              "value": "0"
            },
            {
              "name": "ThemeId",
              "type": "3",
              "value": "0"
            },
            {
              "name": "InStore_Tarihi",
              "type": "7",
              "value": "2026-02-26"
            },
            {
              "name": "Ana_Tema",
              "type": "1",
              "value": "029"
            },
            {
              "name": "Cluster",
              "type": "1",
              "value": "017"
            },
            {
              "name": "Urun_Sinifi",
              "type": "1",
              "value": "001"
            },
            {
              "name": "LifeStyle",
              "type": "1",
              "value": "007"
            },
            {
              "name": "Alt_Sezon",
              "type": "1",
              "value": "SS4"
            },
            {
              "name": "Hibrit",
              "type": "1",
              "value": "005"
            },
            {
              "name": "Marka",
              "type": "1",
              "value": "004"
            },
            {
              "name": "Tema_Kisa_Kod",
              "type": "1",
              "value": "958"
            },
            {
              "name": "Sezon",
              "type": "1",
              "value": "2026-27 KIS"
            },
            {
              "name": "LifeStyleGrup",
              "type": "1",
              "value": "001"
            },
            {
              "name": "Tema_Ismi",
              "type": "1",
              "value": "OtoYarat"
            },
            {
              "name": "Koleksiyon_Tipi",
              "type": "1",
              "value": "009"
            }
          ]
        },
        "colls": [],
        "entityName": "Theme_Attributes",
        "resrs": {
          "res": []
        }
      }
    };
    
    console.log('📝 Senin verdiğin payload ile test ediliyor...');
    console.log('Tema_Ismi: OtoYarat');
    
    const idmApiUrl = `${TST_CONFIG.ionApiUrl}/${TST_CONFIG.tenantId}/IDM/api`;
    
    const response = await axios.post(
      `${idmApiUrl}/items`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ BAŞARILI!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
  }
}

main();
