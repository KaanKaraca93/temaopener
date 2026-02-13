const XLSX = require('xlsx');
const axios = require('axios');
const tokenService = require('../src/services/tokenService');
const PLM_CONFIG = require('../src/config/plm.config');

/**
 * Tek satır test script'i
 */

const IDM_API_URL = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api`;

async function testSingleUpdate() {
  try {
    console.log('🧪 TEK SATIR TEST\n');
    
    // Excel'den ilk satırı oku
    const workbook = XLSX.readFile('./TemaAktar.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const firstRow = data[0];
    const pid = firstRow.pidDocId;
    
    console.log('📋 Test verisi:');
    console.log(JSON.stringify(firstRow, null, 2));
    
    // Sadece pidDocId'yi atla
    const SKIP_FIELDS = ['pidDocId'];
    
    // Attribute'ları oluştur - SADECE name ve value
    const attributes = [];
    Object.keys(firstRow).forEach(key => {
      if (SKIP_FIELDS.includes(key)) return;
      const value = firstRow[key];
      if (value === null || value === undefined || value === '') return;
      
      attributes.push({
        name: key,
        value: String(value)
      });
    });
    
    console.log(`\n📊 ${attributes.length} adet attribute gönderilecek`);
    
    // Payload
    // PID field'ini KALDIRDIK, colls ve resrs ekledik
    const payload = {
      item: {
        acl: {
          name: "Public"
        },
        attrs: {
          attr: attributes
        },
        colls: [],
        entityName: "Theme_Attributes",
        resrs: {
          res: []
        }
      }
    };
    
    console.log('\n📦 Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Token al
    const authHeader = await tokenService.getAuthorizationHeader();
    
    // İstek gönder
    const url = `${IDM_API_URL}/items/${pid}`;
    
    console.log(`\n📤 İstek gönderiliyor: ${url}`);
    console.log('   Parameters: $checkout=true, $checkin=true, $merge=true\n');
    
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

testSingleUpdate();
