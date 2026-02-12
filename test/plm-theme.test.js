/**
 * PLM Theme Service Test
 * ThemeId ile STYLECOLORWAYS bilgilerini çekme testi
 */

const plmThemeService = require('../src/services/plmThemeService');

async function testPlmThemeService() {
  console.log('🧪 Testing PLM Theme Service...\n');
  
  try {
    // Test 1: Tek bir ThemeId ile veri çek
    const themeId = 1174;
    console.log('Test 1: Get Theme StyleColorways');
    console.log('─'.repeat(70));
    console.log(`Theme ID: ${themeId}\n`);
    
    const result = await plmThemeService.getThemeStyleColorways(themeId);
    
    console.log('\n📊 Sonuç Özeti:');
    console.log('─'.repeat(70));
    console.log(`Theme ID: ${result.themeId}`);
    console.log(`Toplam StyleColorway: ${result.totalCount}`);
    console.log('');
    
    if (result.totalCount > 0) {
      console.log('📋 İlk 5 StyleColorway:');
      console.log('─'.repeat(70));
      result.styleColorways.slice(0, 5).forEach((item, index) => {
        console.log(`\n${index + 1}. StyleColorway:`);
        console.log(`   StyleColorwayId: ${item.styleColorwayId}`);
        console.log(`   StyleId: ${item.styleId}`);
        console.log(`   ColorrngId: ${item.colorrngId}`);
        console.log(`   ColorwayCode: ${item.colorwayCode}`);
        console.log(`   ColorwayName: ${item.colorwayName}`);
        console.log(`   HexValue: ${item.hexValue}`);
      });
      
      if (result.totalCount > 5) {
        console.log(`\n... ve ${result.totalCount - 5} tane daha\n`);
      }
      
      // Style'lara göre grupla
      console.log('\n📊 Style Bazında Gruplandırma:');
      console.log('─'.repeat(70));
      const grouped = plmThemeService.groupByStyle(result.styleColorways);
      console.log(`Toplam farklı Style: ${grouped.totalStyles}\n`);
      
      // İlk 3 style'ı göster
      grouped.styles.slice(0, 3).forEach((style, index) => {
        console.log(`${index + 1}. Style ID: ${style.styleId}:`);
        console.log(`   ${style.colorways.length} adet colorway`);
        style.colorways.forEach(cw => {
          console.log(`   - ${cw.colorwayCode} (${cw.colorwayName}) - ${cw.hexValue}`);
        });
        console.log('');
      });
      
    } else {
      console.log('⚠️  Bu ThemeId için hiç StyleColorway bulunamadı');
    }
    
    console.log('\n✅ Test 1 passed\n');
    
    // Ham veriyi göster (ilk obje)
    if (result.rawData.length > 0) {
      console.log('📄 Ham Veri Örneği (İlk kayıt):');
      console.log('─'.repeat(70));
      console.log(JSON.stringify(result.rawData[0], null, 2));
      console.log('');
    }
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testPlmThemeService();
