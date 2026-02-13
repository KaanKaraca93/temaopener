const XLSX = require('xlsx');
const axios = require('axios');
const tokenService = require('../src/services/tokenService');
const PLM_CONFIG = require('../src/config/plm.config');

const IDM_API_URL = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api`;

async function testSecondRow() {
  try {
    console.log('🧪 İKİNCİ SATIR TEST\n');
    
    const workbook = XLSX.readFile('./TemaAktar.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    const secondRow = data[1]; // 2. satır (index 1)
    const pid = secondRow.pidDocId;
    
    console.log('📋 Test verisi:');
    console.log(JSON.stringify(secondRow, null, 2));
    
    const attributes = [];
    Object.keys(secondRow).forEach(key => {
      if (key === 'pidDocId') return;
      const value = secondRow[key];
      if (value === null || value === undefined || value === '') return;
      
      attributes.push({
        name: key,
        value: String(value)
      });
    });
    
    console.log(`\n📊 ${attributes.length} adet attribute gönderilecek`);
    
    const payload = {
      item: {
        attrs: {
          attr: attributes
        },
        acl: {
          name: "Public"
        },
        entityName: "Theme_Attributes",
        pid: pid
      }
    };
    
    console.log('\n📦 Payload (ilk 3 attribute):');
    console.log(JSON.stringify({
      ...payload,
      item: {
        ...payload.item,
        attrs: {
          attr: payload.item.attrs.attr.slice(0, 3)
        }
      }
    }, null, 2));
    
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
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSecondRow();
