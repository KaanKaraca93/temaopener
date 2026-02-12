/**
 * PLM Update Service Test
 * PATCH payload'u oluşturma testi (gerçek PATCH yapmadan)
 */

const plmThemeService = require('../src/services/plmThemeService');
const idmService = require('../src/services/idmService');
const plmUpdateService = require('../src/services/plmUpdateService');

async function testPlmUpdate() {
  console.log('🧪 Testing PLM Update Service...\n');
  
  try {
    const themeId = 1174;
    
    // 1. PLM'den tema bilgilerini çek
    console.log('Step 1: Fetching theme data from PLM');
    console.log('─'.repeat(70));
    const themeData = await plmThemeService.getThemeStyleColorways(themeId);
    console.log(`✅ ${themeData.totalCount} StyleColorway bulundu\n`);
    
    // 2. Style bazında grupla
    console.log('Step 2: Grouping by Style');
    console.log('─'.repeat(70));
    const groupedData = plmThemeService.groupByStyle(themeData.styleColorways);
    console.log(`✅ ${groupedData.totalStyles} Style grubu oluşturuldu\n`);
    
    // 3. IDM'den attribute'ları çek
    console.log('Step 3: Fetching attributes from IDM');
    console.log('─'.repeat(70));
    const fullThemeData = await idmService.getThemeWithAttributes(themeId, themeData);
    console.log(`✅ ${fullThemeData.mappedAttributes.length} attribute eşleştirildi\n`);
    
    // 4. Açıklamaları çıkar
    console.log('Step 4: Extracting descriptions');
    console.log('─'.repeat(70));
    const descriptions = plmUpdateService.extractDescriptions(fullThemeData.mappedAttributes);
    console.log(JSON.stringify(descriptions, null, 2));
    console.log('');
    
    // 5. Payload oluştur (test - gerçek PATCH yapmadan)
    console.log('Step 5: Building PATCH payload');
    console.log('─'.repeat(70));
    
    for (const style of groupedData.styles) {
      console.log(`\n🎨 Style ${style.styleId}:`);
      console.log(`   ${style.colorways.length} adet colorway`);
      
      const payload = plmUpdateService.buildBatchPatchPayload(
        style.colorways,
        descriptions
      );
      
      console.log(`\n📦 Payload (tümü):`);
      console.log(JSON.stringify(payload, null, 2));
    }
    
    console.log('\n✅ Payload başarıyla oluşturuldu!');
    console.log('\n⚠️  Not: Gerçek PATCH işlemi yapılmadı (sadece payload testi)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
testPlmUpdate();
