const XLSX = require('xlsx');

console.log('📖 Excel dosyası okunuyor...\n');

const workbook = XLSX.readFile('./TemaAktar.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(`✅ ${data.length} satır okundu\n`);

console.log('🔍 İlk 5 satır için Tema_Kodu kontrolü:\n');

data.slice(0, 5).forEach((row, i) => {
  console.log(`[${i+1}] PID: ${row.pidDocId}`);
  console.log(`    Tema_Kodu: ${row.Tema_Kodu || 'BOŞ'}`);
  console.log('');
});

// Tüm sütunları göster
console.log('\n📋 Birinci satırdaki tüm sütunlar:');
console.log(Object.keys(data[0]).join(', '));
