/**
 * IDM Theme Service Test
 * Theme özellikleri çekme testi
 */

const plmThemeService = require('../src/services/plmThemeService');
const idmService = require('../src/services/idmService');

async function testIdmThemeService() {
  console.log('🧪 Testing IDM Theme Service...\n');
  
  try {
    const themeId = 1174;
    
    // Test 1: PLM'den tema bilgilerini çek
    console.log('Test 1: Get Theme from PLM');
    console.log('─'.repeat(70));
    const themeData = await plmThemeService.getThemeStyleColorways(themeId);
    
    console.log(`Theme ID: ${themeData.themeId}`);
    console.log(`Theme Info:`, JSON.stringify(themeData.themeInfo, null, 2));
    console.log('✅ Test 1 passed\n');
    
    // Test 2: Theme Description'ı parse et
    console.log('Test 2: Parse Theme Description');
    console.log('─'.repeat(70));
    const description = themeData.themeInfo.themeDescription;
    const parsedPid = idmService.parseThemeDescription(description);
    console.log(`Original: ${description}`);
    console.log(`Parsed:`, JSON.stringify(parsedPid, null, 2));
    console.log('✅ Test 2 passed\n');
    
    // Test 3: IDM'den özellikleri çek
    console.log('Test 3: Get Attributes from IDM');
    console.log('─'.repeat(70));
    const idmData = await idmService.getItemByPid(description);
    
    if (idmData) {
      console.log(`\n📊 IDM Data Summary:`);
      console.log(`PID: ${idmData.pid}`);
      console.log(`Attribute Count: ${idmData.attributeCount}`);
      console.log(`\n📄 Raw IDM Response (first 500 chars):`);
      const jsonStr = JSON.stringify(idmData.itemData, null, 2);
      console.log(jsonStr.substring(0, 500) + '...\n');
      console.log(`\n📋 Full IDM Data:`);
      console.log(JSON.stringify(idmData, null, 2));
    }
    console.log('✅ Test 3 passed\n');
    
    // Test 4: Tüm bilgileri birleştir
    console.log('Test 4: Get Full Theme with Attributes');
    console.log('─'.repeat(70));
    const fullThemeData = await idmService.getThemeWithAttributes(themeId, themeData);
    
    console.log(`\n📊 Full Theme Summary:`);
    console.log(`Theme ID: ${fullThemeData.themeId}`);
    console.log(`StyleColorways: ${fullThemeData.themeData.totalCount}`);
    console.log(`Attributes: ${fullThemeData.idmData ? fullThemeData.idmData.attributeCount : 0}`);
    console.log(`Value Lists: ${fullThemeData.entityData ? fullThemeData.entityData.valueListCount : 0}`);
    
    // Eşleştirilmiş attribute'ları göster
    if (fullThemeData.mappedAttributes && fullThemeData.mappedAttributes.length > 0) {
      console.log(`\n📋 Eşleştirilmiş Attribute'lar (Kod → Açıklama):`);
      console.log('─'.repeat(70));
      fullThemeData.mappedAttributes.forEach(attr => {
        if (attr.codeDescription) {
          console.log(`\n${attr.name}:`);
          console.log(`  Kod: ${attr.value}`);
          console.log(`  Açıklama: ${attr.codeDescription}`);
          console.log(`  ✓ Eşleşti`);
        } else {
          console.log(`\n${attr.name}: ${attr.value} (değer listesi yok)`);
        }
      });
    }
    
    console.log('\n✅ Test 4 passed\n');
    
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run tests
testIdmThemeService();
