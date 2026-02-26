const xlsx = require('xlsx');
const axios = require('axios');

// TST Config
const TST_CONFIG = {
  tenantId: 'ATJZAMEWEF5P4SNV_TST',
  clientId: 'ATJZAMEWEF5P4SNV_TST~vlWkwz2P74KAmRFfihVsdK5yjnHvnfPUrcOt4nl6gkI',
  clientSecret: 'HU1TUcBOX1rkp-uuYKUQ3simFEYzPKNM-XIyf4ewIxe-TYUZOK7RAlXUPd_FwSZMAslt8I9RZmv23xItVKY8EQ',
  serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_TST#5d3TLFCMqK_CR9wmWsLbIn1UnLv2d8S0ohtIX4TZ4PUBXyvtx-RjHjscLzfB9NBAGZfdWMgzFt3DCpWoJMOHEg',
  serviceAccountSecretKey: 'g0oBJ4ubPxJwgJZjAxAfguExlH3V5-cFF0zove_9Fb_7h4C67eXko45T9Ltjw-DYzfYUbU_iQbCZuTW6wYeX5Q',
  ionApiUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
  providerUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_TST/as/',
  idmBaseUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com/ATJZAMEWEF5P4SNV_TST/CustomerApi/TemaOpener'
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

// Excel serial date'i YYYY-MM-DD formatına çevirme
function excelDateToYMD(serial) {
  // Eğer zaten string formatındaysa ve YYYY-MM-DD gibi görünüyorsa
  if (typeof serial === 'string' && serial.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return serial;
  }
  
  // Eğer boş veya 1 ise (tarihsiz), 1900-01-01 döndür
  if (!serial || serial === 1 || serial === '1') {
    return '1900-01-01';
  }
  
  // Eğer zaten geçerli bir sayı değilse, 1900-01-01 döndür
  const num = Number(serial);
  if (isNaN(num)) {
    return '1900-01-01';
  }
  
  // Excel serial date: 1900-01-01'den bu yana geçen gün sayısı
  const excelEpoch = new Date(1899, 11, 30); // Excel'in başlangıç tarihi
  const date = new Date(excelEpoch.getTime() + num * 86400000);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Tema oluşturma fonksiyonu
async function createTheme(themeData) {
  const token = await getAccessToken();
  
  const payload = {
    item: {
      acl: {
        name: "Public"
      },
      attrs: {
        attr: [
          {
            name: "Tema_Kodu",
            type: "1",
            value: String(themeData.Tema_Kodu || "0")
          },
          {
            name: "ThemeId",
            type: "3",
            value: String(themeData.ThemeId || "0")
          },
          {
            name: "InStore_Tarihi",
            type: "7",
            value: typeof themeData.InStore_Tarihi === 'string' ? themeData.InStore_Tarihi : (excelDateToYMD(themeData.InStore_Tarihi) || "2026-01-01")
          },
          {
            name: "Ana_Tema",
            type: "1",
            value: String(themeData.Ana_Tema || "")
          },
          {
            name: "Cluster",
            type: "1",
            value: String(themeData.Cluster || "")
          },
          {
            name: "Urun_Sinifi",
            type: "1",
            value: String(themeData.Urun_Sinifi || "")
          },
          {
            name: "LifeStyle",
            type: "1",
            value: String(themeData.LifeStyle || "")
          },
          {
            name: "Alt_Sezon",
            type: "1",
            value: String(themeData.Alt_Sezon || "")
          },
          {
            name: "Hibrit",
            type: "1",
            value: String(themeData.Hibrit || "")
          },
          {
            name: "Marka",
            type: "1",
            value: String(themeData.Marka || "")
          },
          {
            name: "Tema_Kisa_Kod",
            type: "1",
            value: String(themeData.Tema_Kisa_Kod || "")
          },
          {
            name: "Sezon",
            type: "1",
            value: String(themeData.Sezon || "")
          },
          {
            name: "LifeStyleGrup",
            type: "1",
            value: String(themeData.LifeStyleGrup || "")
          },
          {
            name: "Tema_Ismi",
            type: "1",
            value: String(themeData.Tema_Ismi || "")
          },
          {
            name: "Koleksiyon_Tipi",
            type: "1",
            value: String(themeData.Koleksiyon_Tipi || "")
          }
        ]
      },
      colls: [],
      entityName: "Theme_Attributes",
      resrs: {
        res: []
      }
    }
  };

  try {
    const idmApiUrl = `${TST_CONFIG.ionApiUrl}/${TST_CONFIG.tenantId}/IDM/api`;
    
    // Payload'u log'a yazdır
    console.log('\n📦 Payload:');
    console.log(JSON.stringify(payload, null, 2));
    
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

    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Ana fonksiyon
async function main() {
  try {
    // Excel dosyasını oku
    const workbook = xlsx.readFile('TemaAktar2.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    console.log(`📊 Toplam ${data.length} satır bulundu`);
    
    // Başlıkları kontrol et
    if (data.length > 0) {
      console.log('\n📋 Excel başlıkları:');
      console.log(Object.keys(data[0]).join(', '));
      console.log('\n📝 İlk satır örneği:');
      console.log(JSON.stringify(data[0], null, 2));
    }

    // TEST: İlk 20 satırı işle
    const TEST_LIMIT = 20;
    console.log(`\n🧪 TEST MODU: İlk ${TEST_LIMIT} tema oluşturuluyor...\n`);
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (let i = 0; i < Math.min(TEST_LIMIT, data.length); i++) {
      const themeData = data[i];
      
      console.log(`[${i + 1}/${data.length}] ${themeData.Tema_Ismi}`);
      
      const result = await createTheme(themeData);
      
      if (result.success) {
        successCount++;
        const pid = result.data?.item?.pid || 'N/A';
        console.log(`  ✅ Başarılı (${pid})`);
      } else {
        failCount++;
        console.log(`  ❌ Hata:`, result.error?.error?.message || result.error);
        errors.push({
          tema: themeData.Tema_Ismi,
          error: result.error
        });
      }
      
      // PLM iş kuralları için 10 saniye bekle
      if (i < data.length - 1) { // Son satır için beklemeye gerek yok
        console.log('  ⏳ 10 saniye bekleniyor...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log('\n📊 ÖZET:');
    console.log(`✅ Başarılı: ${successCount}/${data.length}`);
    console.log(`❌ Başarısız: ${failCount}/${data.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Hatalar:');
      errors.forEach(err => {
        console.log(`  - ${err.tema}: ${err.error?.error?.message || JSON.stringify(err.error)}`);
      });
    }

  } catch (error) {
    console.error('❌ Script hatası:', error.message);
  }
}

main();
