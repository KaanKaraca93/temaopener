const XLSX = require('xlsx');

/**
 * Excel dosyasının yapısını kontrol et
 */
function checkExcel(filePath) {
  console.log(`📖 Excel kontrol ediliyor: ${filePath}\n`);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // JSON'a çevir
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`📊 Toplam satır: ${data.length}`);
  
  if (data.length > 0) {
    console.log(`\n📋 Sütunlar:`);
    const columns = Object.keys(data[0]);
    columns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col}`);
    });
    
    console.log(`\n📝 İlk satır örneği:`);
    console.log(JSON.stringify(data[0], null, 2));
    
    // Sezon ve Alt_Sezon değerlerini kontrol et
    console.log(`\n🔍 Sezon ve Alt_Sezon değerleri (ilk 5 satır):`);
    data.slice(0, 5).forEach((row, idx) => {
      console.log(`   ${idx + 1}. Sezon: "${row.Sezon}", Alt_Sezon: "${row.Alt_Sezon}"`);
    });
    
    // Boş değer kontrolü
    console.log(`\n🔍 İlk satırdaki boş alanlar:`);
    Object.entries(data[0]).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        console.log(`   - ${key}: BOŞ`);
      }
    });
  }
}

// TemaAktar.xlsx'i kontrol et
try {
  checkExcel('./TemaAktar.xlsx');
} catch (error) {
  console.error('❌ Hata:', error.message);
}
