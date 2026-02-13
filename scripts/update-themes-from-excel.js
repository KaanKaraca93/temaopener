const XLSX = require('xlsx');
const axios = require('axios');
const tokenService = require('../src/services/tokenService');
const PLM_CONFIG = require('../src/config/plm.config');

/**
 * Excel'den Theme verilerini okuyup IDM'e güncelleme yapan script
 * NOT: Bu script git'e push edilmeyecek, tek seferlik çalıştırılacak
 */

// IDM API URL
const IDM_API_URL = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api`;

/**
 * Excel dosyasını oku
 */
function readExcelFile(filePath) {
  console.log(`📖 Excel dosyası okunuyor: ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // JSON'a çevir
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`✅ ${data.length} satır okundu`);
  return data;
}

/**
 * Attribute payload'ı oluştur
 * SADECE name ve value gönderilmeli (type ve qual EKLEME!)
 */
function buildAttributesPayload(row) {
  const attributes = [];
  
  // Sadece pidDocId'yi atla
  const SKIP_FIELDS = ['pidDocId'];
  
  // Excel'deki her sütun için attribute ekle
  Object.keys(row).forEach(key => {
    if (SKIP_FIELDS.includes(key)) return;
    
    const value = row[key];
    
    // Boş değerleri atla (null, undefined, empty string)
    if (value === null || value === undefined || value === '') {
      return;
    }
    
    attributes.push({
      name: key,
      value: String(value) // Değeri string'e çevir
    });
  });
  
  return attributes;
}

/**
 * IDM API'ye güncelleme isteği gönder
 */
async function updateThemeItem(pid, attributes) {
  try {
    const authHeader = await tokenService.getAuthorizationHeader();
    
    const url = `${IDM_API_URL}/items/${pid}`;
    
    // PID field'ini payload'dan KALDIRDIK (URL'de kullanılıyor)
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
    
    console.log(`\n📤 Güncelleme gönderiliyor: PID=${pid}`);
    console.log(`   ${attributes.length} adet attribute güncelleniyor`);
    
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
    
    console.log(`✅ Başarılı: ${response.status}`);
    
    return {
      success: true,
      pid: pid,
      status: response.status
    };
    
  } catch (error) {
    console.error(`❌ Hata: PID=${pid}`);
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    
    return {
      success: false,
      pid: pid,
      error: error.message
    };
  }
}

/**
 * Ana işlem
 */
async function main() {
  try {
    console.log('🚀 Theme güncelleme script\'i başlatılıyor...\n');
    
    // Excel dosyasını belirt
    const excelFilePath = './TemaAktar.xlsx';
    
    // Excel'i oku
    const rows = readExcelFile(excelFilePath);
    
    if (rows.length === 0) {
      console.log('⚠️  Excel dosyası boş!');
      return;
    }
    
    console.log(`\n📊 ${rows.length} adet tema güncellenecek\n`);
    console.log('═'.repeat(80));
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    // Her satır için güncelleme yap
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      console.log(`\n[${i + 1}/${rows.length}] İşleniyor...`);
      
      // PID kontrolü
      if (!row.pidDocId) {
        console.log('⚠️  pidDocId bulunamadı, atlanıyor');
        failCount++;
        results.push({ success: false, row: i + 1, error: 'pidDocId missing' });
        continue;
      }
      
      // Attribute'ları oluştur
      const attributes = buildAttributesPayload(row);
      
      if (attributes.length === 0) {
        console.log('⚠️  Güncellenecek attribute yok, atlanıyor');
        continue;
      }
      
      // IDM'e gönder
      const result = await updateThemeItem(row.pidDocId, attributes);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Rate limiting için kısa bekle
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Özet
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 GÜNCELLEME ÖZETİ');
    console.log('═'.repeat(80));
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Hatalı: ${failCount}`);
    console.log(`📋 Toplam: ${rows.length}`);
    
    // Hatalı olanları listele
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\n❌ Hatalı güncellemeler:');
      failures.forEach(f => {
        console.log(`   - PID: ${f.pid}, Hata: ${f.error}`);
      });
    }
    
    console.log('\n✅ Script tamamlandı!\n');
    
  } catch (error) {
    console.error('❌ Script hatası:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
main();
