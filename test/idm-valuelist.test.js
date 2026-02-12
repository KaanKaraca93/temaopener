/**
 * IDM Value List Test
 * Theme_Attributes entity'sinden değer listelerini çekme testi
 */

const idmService = require('../src/services/idmService');

async function testIdmValueList() {
  console.log('🧪 Testing IDM Value List Service...\n');
  
  try {
    const entityName = 'Theme_Attributes';
    
    // Test: Entity değer listelerini çek
    console.log('Test: Get Entity Value Lists');
    console.log('─'.repeat(70));
    console.log(`Entity Name: ${entityName}\n`);
    
    const entityData = await idmService.getEntityValueLists(entityName);
    
    if (entityData) {
      console.log(`\n📊 Entity Data Summary:`);
      console.log(`Entity Name: ${entityData.entityName}`);
      console.log(`Value List Count: ${entityData.valueListCount}`);
      
      // Raw entity data'yı göster
      console.log(`\n📄 Raw Entity Data:`);
      console.log('─'.repeat(70));
      console.log(JSON.stringify(entityData.entityData, null, 2));
      
      console.log(`\n📋 Value Lists:`);
      console.log('─'.repeat(70));
      
      if (Object.keys(entityData.valueLists).length > 0) {
        Object.keys(entityData.valueLists).forEach(key => {
          const vl = entityData.valueLists[key];
          console.log(`\n${vl.name} (${vl.displayName}):`);
          console.log(`  ${vl.values.length} değer`);
          
          // İlk 5 değeri göster
          vl.values.slice(0, 5).forEach(v => {
            console.log(`  - ${v.code}: ${v.description}`);
          });
          
          if (vl.values.length > 5) {
            console.log(`  ... ve ${vl.values.length - 5} tane daha`);
          }
        });
      } else {
        console.log('⚠️  Hiç value list bulunamadı. Entity yapısı incelenmeli.');
      }
    }
    
    console.log('\n✅ Test passed!');
    
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
testIdmValueList();
