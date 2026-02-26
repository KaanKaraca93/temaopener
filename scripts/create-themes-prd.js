const xlsx = require('xlsx');
const axios = require('axios');

// PRD Config
const PRD_CONFIG = {
  tenantId: 'ATJZAMEWEF5P4SNV_PRD',
  clientId: 'ATJZAMEWEF5P4SNV_PRD~zWbsEgkMBlqdSXoSAXBiM8V1POA0-2Mkn1qkORhxma0',
  clientSecret: 'Ll2ehfOJ14uXzyLwR-6BIUmnQNFfhSFRadOzhfzIgK8DBs0x8_AQ3vqbiNrCVOfTyN3_v_Vyf1Yq4WMA7F68hg',
  serviceAccountAccessKey: 'ATJZAMEWEF5P4SNV_PRD#fAzHs-Kdtut0xOXsRx1rnc4kB9icdTJ25HPE65-3-Q0G477cLbXRgPOsL0JjhQCA2VlgbJvK400_9ZaezhMKIQ',
  serviceAccountSecretKey: 'Bd7aqwQd7K8Xw8uMLffxlNrM8oROajrY18EVpPalakqECxXs5HzFzZoT45JBKtUGZvfacr8bCrgCmgscu71rTA',
  ionApiUrl: 'https://mingle-ionapi.eu1.inforcloudsuite.com',
  providerUrl: 'https://mingle-sso.eu1.inforcloudsuite.com:443/ATJZAMEWEF5P4SNV_PRD/as/'
};

let accessToken = null;

// Token alma fonksiyonu
async function getAccessToken() {
  if (accessToken) return accessToken;

  try {
    const tokenUrl = `${PRD_CONFIG.providerUrl}token.oauth2`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', PRD_CONFIG.serviceAccountAccessKey);
    params.append('password', PRD_CONFIG.serviceAccountSecretKey);
    
    const auth = Buffer.from(`${PRD_CONFIG.clientId}:${PRD_CONFIG.clientSecret}`).toString('base64');

    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    console.log('✅ Token alındı (PRD)');
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
    const idmApiUrl = `${PRD_CONFIG.ionApiUrl}/${PRD_CONFIG.tenantId}/IDM/api`;
    
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
    console.log(`⚠️  PRD ORTAMI - Her tema arasında 30 saniye bekleniyor`);
    console.log(`⏱️  Tahmini süre: ${Math.floor(data.length * 30 / 60)} dakika\n`);
    
    // Tüm satırları işle
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
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
      
      // PLM iş kuralları için 30 saniye bekle
      if (i < data.length - 1) { // Son satır için beklemeye gerek yok
        console.log(`  ⏳ 30 saniye bekleniyor... (Kalan: ${data.length - i - 1})\n`);
        await new Promise(resolve => setTimeout(resolve, 30000));
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
