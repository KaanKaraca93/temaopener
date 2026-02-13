const XLSX = require('xlsx');
const axios = require('axios');
const tokenService = require('../src/services/tokenService');
const PLM_CONFIG = require('../src/config/plm.config');

console.log(`🔧 PLM Config loaded for: ${process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST'} (${PLM_CONFIG.tenantId})`);
console.log('🚀 Tema_Kodu güncelleme script\'i başlatılıyor...\n');

async function updateTemaKodu() {
  try {
    // Excel dosyasını oku
    console.log('📖 Excel dosyası okunuyor: ./TemaAktar.xlsx');
    const workbook = XLSX.readFile('./TemaAktar.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`✅ ${data.length} satır okundu\n`);
    console.log(`📊 ${data.length} adet tema için Tema_Kodu güncellenecek\n`);
    
    console.log('═'.repeat(80));
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    // Her satır için işlem yap
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      console.log(`[${i+1}/${data.length}] İşleniyor...`);

      try {
        // Token al
        const authHeader = await tokenService.getAuthorizationHeader();

        const pid = row.pidDocId;
        const temaKodu = row.Tema_Kodu;

        // Boş değerleri kontrol et
        if (!temaKodu) {
          console.log(`⚠️  Atlandı: Tema_Kodu boş (PID=${pid})\n`);
          continue;
        }

        // Payload oluştur - SADECE Tema_Kodu
        const payload = {
          item: {
            acl: {
              name: 'Public'
            },
            attrs: {
              attr: [
                {
                  name: 'Tema_Kodu',
                  value: temaKodu.toString()
                }
              ]
            },
            colls: [],
            entityName: 'Theme_Attributes',
            resrs: {
              res: []
            }
          }
        };

        // IDM'e PUT isteği gönder
        const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api/items/${pid}`;
        
        console.log(`📤 Güncelleme gönderiliyor: PID=${pid}`);
        console.log(`   Tema_Kodu: ${temaKodu}`);

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

        console.log(`✅ Başarılı: ${response.status}\n`);
        successCount++;

      } catch (error) {
        console.error(`❌ Hata (PID=${row.pidDocId}):`);
        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data: ${JSON.stringify(error.response.data)}`);
        } else {
          console.error(`   ${error.message}`);
        }
        console.log('');
        errorCount++;
      }
    }

    // Özet
    console.log('');
    console.log('═'.repeat(80));
    console.log('📊 GÜNCELLEME ÖZETİ');
    console.log('═'.repeat(80));
    console.log(`✅ Başarılı: ${successCount}`);
    console.log(`❌ Hatalı: ${errorCount}`);
    console.log(`📋 Toplam: ${data.length}`);
    console.log('');
    console.log('✅ Script tamamlandı!\n');

  } catch (error) {
    console.error('💥 Kritik hata:', error.message);
    process.exit(1);
  }
}

// Script'i çalıştır
updateTemaKodu();
