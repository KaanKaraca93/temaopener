const XLSX = require('xlsx');
const axios = require('axios');

// PRD Configuration
const CONFIG = {
  tenantId: 'ATJZAMEWEF5P4SNV_PRD',
  clientId: 'ATJZAMEWEF5P4SNV_PRD~zWbsEgkMBlqdSXoSAXBiM8V1POA0-2Mkn1qkORhxma0',
  clientSecret: 'Ll2ehfOJ14uXzyLwR-6BIUmnQNFfhSFRadOzhfzIgK8DBs0x8_AQ3vqbiNrCVOfTyN3_v_Vyf1Yq4WMA7F68hg',
  serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_PRD#fAzHs-Kdtut0xOXsRx1rnc4kB9icdTJ25HPE65-3-Q0G477cLbXRgPOsL0JjhQCA2VlgbJvK400_9ZaezhMKIQ',
  serviceAccountSecretKey: 'Bd7aqwQd7K8Xw8uMLffxlNrM8oROajrY18EVpPalakqECxXs5HzFzZoT45JBKtUGZvfacr8bCrgCmgscu71rTA',
  ionApiUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
  providerUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_PRD/as/'
};

// Token cache
let cachedToken = null;
let tokenExpiry = null;

/**
 * OAuth token al
 */
async function getToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const tokenUrl = `${CONFIG.providerUrl}token.oauth2`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', CONFIG.serviceAccountAccessKey);
    params.append('password', CONFIG.serviceAccountSecretKey);
    
    const auth = Buffer.from(`${CONFIG.clientId}:${CONFIG.clientSecret}`).toString('base64');

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    cachedToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;
    
    return cachedToken;
  } catch (error) {
    console.error('Token alınamadı:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Tarihi formatla: DD.MM.YYYY -> YYYY-MM-DD
 */
function formatDateForAPI(dateStr) {
  if (!dateStr) return null;
  
  // Excel'den gelen tarih string olabilir veya number (serial date)
  if (typeof dateStr === 'number') {
    // Excel serial date to JS date
    const date = XLSX.SSF.parse_date_code(dateStr);
    const month = String(date.m).padStart(2, '0');
    const day = String(date.d).padStart(2, '0');
    return `${date.y}-${month}-${day}`;
  }
  
  // String ise DD.MM.YYYY formatında varsayalım
  const parts = dateStr.toString().split('.');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  
  // Başka format ise olduğu gibi döndür
  return dateStr;
}

/**
 * IDM'de tema tarihini güncelle
 */
async function updateThemeDate(pidDocId, instoreDate) {
  try {
    console.log(`\n📝 Güncelleniyor: ${pidDocId}`);
    console.log(`   InStore Tarihi: ${instoreDate}`);
    
    const token = await getToken();
    const formattedDate = formatDateForAPI(instoreDate);
    
    console.log(`   API Formatı: ${formattedDate}`);
    
    const payload = {
      item: {
        acl: { name: 'Public' },
        attrs: {
          attr: [
            {
              name: 'InStore_Tarihi',
              value: formattedDate
            }
          ]
        },
        colls: [],
        entityName: 'Theme_Attributes',
        resrs: { res: [] }
      }
    };

    console.log('\n📦 Payload:');
    console.log(JSON.stringify(payload, null, 2));

    const response = await axios.put(
      `${CONFIG.ionApiUrl}/${CONFIG.tenantId}/IDM/api/items/${pidDocId}`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          '$checkout': 'true',
          '$checkin': 'true',
          '$merge': 'true'
        }
      }
    );

    console.log('✅ Başarılı!');
    return { success: true, pidDocId };
    
  } catch (error) {
    console.error(`❌ Hata (${pidDocId}):`, error.response?.data || error.message);
    return { success: false, pidDocId, error: error.response?.data || error.message };
  }
}

/**
 * Excel'i oku ve işle
 */
async function processExcel(testOnly = false) {
  try {
    const workbook = XLSX.readFile('tematarih.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Toplam ${data.length} satır bulundu`);
    console.log('\n📋 İlk satır örneği:');
    console.log(JSON.stringify(data[0], null, 2));

    if (testOnly) {
      console.log('\n🧪 TEST MODU: Sadece ilk satır işlenecek\n');
      const firstRow = data[0];
      
      if (!firstRow.pidDocId || !firstRow.InStore_Tarihi) {
        console.error('❌ Excel\'de pidDocId veya InStore_Tarihi sütunu bulunamadı!');
        return;
      }
      
      await updateThemeDate(firstRow.pidDocId, firstRow.InStore_Tarihi);
    } else {
      console.log('\n🚀 TÜM SATIRLAR işlenecek\n');
      
      const results = {
        success: [],
        failed: []
      };

      for (const row of data) {
        if (!row.pidDocId || !row.InStore_Tarihi) {
          console.log(`⚠️ Atlandı: pidDocId veya InStore_Tarihi boş`);
          continue;
        }

        const result = await updateThemeDate(row.pidDocId, row.InStore_Tarihi);
        
        if (result.success) {
          results.success.push(result.pidDocId);
        } else {
          results.failed.push(result.pidDocId);
        }

        // Rate limiting için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('\n\n📊 ÖZET:');
      console.log(`✅ Başarılı: ${results.success.length}`);
      console.log(`❌ Başarısız: ${results.failed.length}`);
      
      if (results.failed.length > 0) {
        console.log('\n❌ Başarısız olanlar:');
        results.failed.forEach(pid => console.log(`   - ${pid}`));
      }
    }

  } catch (error) {
    console.error('❌ Excel okuma hatası:', error.message);
  }
}

// Script başlat
const testMode = process.argv.includes('--test');
processExcel(testMode);
