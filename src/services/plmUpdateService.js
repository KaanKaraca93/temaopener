const axios = require('axios');
const tokenService = require('./tokenService');
const plmStyleService = require('./plmStyleService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * PLM Update Service
 * PLM'de STYLECOLORWAYS verilerini günceller (PATCH)
 */
class PlmUpdateService {
  
  /**
   * STYLECOLORWAYS'e PATCH işlemi yap
   * @param {Array} styleColorways - Güncellenecek stylecolorway listesi
   * @returns {Promise<Object>} PATCH sonucu
   */
  async patchStyleColorways(styleColorways) {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/STYLECOLORWAYS`;
      
      console.log(`📤 PLM'e PATCH isteği gönderiliyor...`);
      console.log(`🔗 URL: ${url}`);
      console.log(`📊 ${styleColorways.length} adet StyleColorway güncellenecek`);
      
      const response = await axios.patch(url, styleColorways, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ PATCH işlemi başarılı`);
      console.log(`📋 Response status: ${response.status}`);
      
      return {
        success: true,
        statusCode: response.status,
        updatedCount: styleColorways.length,
        data: response.data
      };
      
    } catch (error) {
      console.error('❌ PLM PATCH hatası:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Theme attributes'dan açıklamaları al
   * @param {Array} mappedAttributes - Eşleştirilmiş attribute'lar
   * @returns {Object} Field açıklamaları
   */
  extractDescriptions(mappedAttributes) {
    const descriptions = {};
    
    mappedAttributes.forEach(attr => {
      switch(attr.name) {
        case 'Cluster':
          descriptions.cluster = attr.codeDescription || null;
          break;
        case 'LifeStyle':
          descriptions.lifeStyle = attr.codeDescription || null;
          break;
        case 'Hibrit':
          descriptions.hibrit = attr.codeDescription || null;
          break;
        case 'Tema_Kisa_Kod':
          descriptions.temaKisaKod = attr.codeDescription || null;
          break;
        case 'Ana_Tema':
          descriptions.anaTema = attr.codeDescription || null;
          break;
        case 'LifeStyleGrup':
          // LifeStyleGrup string'i integer'a çevir (örn: "003" -> 3)
          const lifeStyleGrupValue = attr.value ? parseInt(attr.value, 10) : null;
          descriptions.lifeStyleGrup = lifeStyleGrupValue;
          break;
      }
    });
    
    return descriptions;
  }

  /**
   * PATCH payload oluştur (tek bir StyleColorway için)
   * @param {number} styleColorwayId - StyleColorway ID
   * @param {Object} descriptions - Açıklamalar
   * @returns {Object} PATCH payload
   */
  buildPatchPayload(styleColorwayId, descriptions) {
    const payload = {
      StyleColorwayId: styleColorwayId,
      FreeFieldOne: descriptions.cluster,
      FreeFieldTwo: descriptions.lifeStyle,
      FreeFieldThree: descriptions.hibrit,
      FreeFieldFour: descriptions.temaKisaKod,
      FreeFieldFive: descriptions.anaTema
    };
    
    // ColorwayUserField4: LifeStyleGrup (integer)
    // Eğer 0 veya null değilse ekle
    if (descriptions.lifeStyleGrup !== null && descriptions.lifeStyleGrup !== 0) {
      payload.ColorwayUserField4 = descriptions.lifeStyleGrup;
    }
    
    return payload;
  }

  /**
   * StyleColorway listesi için PATCH payload listesi oluştur
   * @param {Array} styleColorways - StyleColorway listesi (grouped colorways)
   * @param {Object} descriptions - Açıklamalar
   * @returns {Array} PATCH payload listesi
   */
  buildBatchPatchPayload(styleColorways, descriptions) {
    return styleColorways.map(scw => {
      return this.buildPatchPayload(scw.styleColorwayId, descriptions);
    });
  }

  /**
   * StyleId bazında StyleColorway'leri grupla ve PATCH yap
   * @param {Object} groupedByStyle - Style bazında gruplandırılmış veri
   * @param {Array} mappedAttributes - Eşleştirilmiş attribute'lar
   * @returns {Promise<Array>} Her style için PATCH sonuçları
   */
  async patchByStyle(groupedByStyle, mappedAttributes) {
    const descriptions = this.extractDescriptions(mappedAttributes);
    
    console.log(`\n📝 Açıklamalar:`);
    console.log(JSON.stringify(descriptions, null, 2));
    
    const results = [];
    
    // Her style için ayrı PATCH
    for (const style of groupedByStyle) {
      console.log(`\n🎨 Style ${style.styleId} için PATCH hazırlanıyor...`);
      console.log(`   ${style.colorways.length} adet colorway`);
      
      // Bu style'ın tüm colorway'leri için payload oluştur
      const payload = this.buildBatchPatchPayload(style.colorways, descriptions);
      
      console.log(`\n📦 Payload (ilk kayıt):`);
      console.log(JSON.stringify(payload[0], null, 2));
      
      try {
        const result = await this.patchStyleColorways(payload);
        
        results.push({
          styleId: style.styleId,
          success: true,
          updatedCount: style.colorways.length,
          result: result
        });
        
        console.log(`✅ Style ${style.styleId} başarıyla güncellendi\n`);
        
      } catch (error) {
        console.error(`❌ Style ${style.styleId} güncellenirken hata:`, error.message);
        
        results.push({
          styleId: style.styleId,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * İş kuralı: Style'ın Status ve ThemeId'sini kontrol et ve güncelle
   * @param {number} styleId - Style ID
   * @param {Array} styleColorways - Bu style'a ait colorway'ler (raw data)
   * @param {number} currentThemeId - Güncelleme yapılan tema ID
   * @returns {Promise<Object>} Style güncelleme sonucu
   */
  async checkAndUpdateStyle(styleId, styleColorways, currentThemeId) {
    const IPTAL_THEME_ID = 1172;
    
    try {
      // 1. Style bilgisini çek
      const style = await plmStyleService.getStyle(styleId);
      if (!style) {
        console.log(`⚠️  Style ${styleId} bulunamadı, güncelleme yapılmayacak`);
        return { updated: false, reason: 'Style not found' };
      }
      
      console.log(`\n🔍 Style ${styleId} kontrol ediliyor...`);
      console.log(`   Mevcut Status: ${style.Status}`);
      console.log(`   Mevcut ThemeId: ${style.ThemeId}`);
      
      // 2. Status = 1 değilse, güncelleme yapma
      if (style.Status !== 1) {
        console.log(`   ℹ️  Status ${style.Status} (güncelleme gerekmez)`);
        return { updated: false, reason: 'Status is not 1' };
      }
      
      // 3. Aktif renkleri bul (ColorwayStatus = 1)
      const activeColorways = styleColorways.filter(scw => 
        scw.styleId === styleId && scw.ColorwayStatus === 1
      );
      
      console.log(`   🎨 ${activeColorways.length} aktif renk bulundu`);
      
      // 4. Aktif renklerin ThemeId'lerini topla (benzersiz)
      const activeThemes = [...new Set(activeColorways.map(scw => scw.themeId))];
      console.log(`   📋 Aktif renklerin temaları: [${activeThemes.join(', ')}]`);
      
      // 5. IPTAL (1172) dışında tema var mı?
      const nonIptalThemes = activeThemes.filter(tid => tid !== IPTAL_THEME_ID);
      
      const updates = {};
      let needsUpdate = false;
      
      // 6. İş kuralı kontrolü
      if (nonIptalThemes.length > 0) {
        // IPTAL dışında tema var
        console.log(`   ✓ IPTAL dışında temalar: [${nonIptalThemes.join(', ')}]`);
        
        // Status'ü 2'ye çek
        if (style.Status === 1) {
          updates.Status = 2;
          needsUpdate = true;
          console.log(`   → Status 1'den 2'ye güncellenecek`);
        }
        
        // ThemeId'yi güncelle (IPTAL dışındaki herhangi bir tema)
        const newThemeId = nonIptalThemes[0]; // İlk IPTAL olmayan temayı al
        if (style.ThemeId !== newThemeId) {
          updates.ThemeId = newThemeId;
          needsUpdate = true;
          console.log(`   → ThemeId ${style.ThemeId}'den ${newThemeId}'e güncellenecek`);
        }
      } else {
        // Sadece IPTAL temaları var
        console.log(`   ℹ️  Sadece IPTAL (1172) teması var`);
        
        // ThemeId'yi 1172 yap (eğer değilse)
        if (style.ThemeId !== IPTAL_THEME_ID) {
          updates.ThemeId = IPTAL_THEME_ID;
          needsUpdate = true;
          console.log(`   → ThemeId ${style.ThemeId}'den ${IPTAL_THEME_ID}'e güncellenecek`);
        }
      }
      
      // 7. Güncelleme gerekiyorsa yap
      if (needsUpdate) {
        console.log(`\n📝 Style ${styleId} güncelleniyor...`);
        const patchResult = await plmStyleService.patchStyle(styleId, updates);
        
        // 8. Sync işlemi
        console.log(`\n🔄 Sync işlemi başlatılıyor...`);
        const syncResult = await plmStyleService.syncStyle(styleId);
        
        return {
          updated: true,
          styleId: styleId,
          updates: updates,
          patchResult: patchResult,
          syncResult: syncResult
        };
      } else {
        console.log(`   ℹ️  Güncelleme gerekmez`);
        return { updated: false, reason: 'No updates needed', styleId: styleId };
      }
      
    } catch (error) {
      console.error(`❌ Style ${styleId} kontrol/güncelleme hatası:`, error.message);
      return { updated: false, error: error.message, styleId: styleId };
    }
  }

  /**
   * Tema için tüm StyleColorway'leri güncelle
   * @param {number} themeId - Theme ID
   * @param {Object} fullThemeData - Tam tema verisi (attributes + stylecolorways)
   * @returns {Promise<Object>} Güncelleme sonuçları
   */
  async updateThemeStyleColorways(themeId, fullThemeData) {
    try {
      console.log(`\n🔄 Theme ${themeId} için güncelleme başlatılıyor...`);
      
      // Eşleştirilmiş attribute'ları kontrol et
      if (!fullThemeData.mappedAttributes || fullThemeData.mappedAttributes.length === 0) {
        throw new Error('Mapped attributes bulunamadı');
      }
      
      // Gruplandırılmış style verilerini kontrol et
      const groupedData = fullThemeData.groupedByStyle;
      if (!groupedData || groupedData.length === 0) {
        throw new Error('Style verisi bulunamadı');
      }
      
      console.log(`📊 ${groupedData.length} adet style güncellenecek`);
      
      // Style bazında PATCH yap
      const styleColorwayResults = await this.patchByStyle(groupedData, fullThemeData.mappedAttributes);
      
      // StyleColorway güncelleme özeti
      const successCount = styleColorwayResults.filter(r => r.success).length;
      const failCount = styleColorwayResults.filter(r => !r.success).length;
      const totalUpdated = styleColorwayResults
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.updatedCount, 0);
      
      console.log(`\n✅ StyleColorway güncellemesi tamamlandı:`);
      console.log(`   Başarılı: ${successCount} style`);
      console.log(`   Hatalı: ${failCount} style`);
      console.log(`   Toplam güncellenen: ${totalUpdated} StyleColorway`);
      
      // İş kuralı: Style kontrol ve güncelleme
      console.log(`\n\n🔍 İş Kuralı - Style Status ve ThemeId Kontrolü`);
      console.log(`═`.repeat(70));
      
      const styleUpdateResults = [];
      const uniqueStyleIds = [...new Set(groupedData.map(g => g.styleId))];
      
      for (const styleId of uniqueStyleIds) {
        const result = await this.checkAndUpdateStyle(
          styleId,
          fullThemeData.rawStyleColorways,
          themeId
        );
        styleUpdateResults.push(result);
      }
      
      // Style güncelleme özeti
      const styleUpdatedCount = styleUpdateResults.filter(r => r.updated).length;
      console.log(`\n✅ Style kontrol/güncelleme tamamlandı:`);
      console.log(`   Kontrol edilen: ${uniqueStyleIds.length} style`);
      console.log(`   Güncellenen: ${styleUpdatedCount} style`);
      
      return {
        success: failCount === 0,
        themeId: themeId,
        totalStyles: groupedData.length,
        successfulStyles: successCount,
        failedStyles: failCount,
        totalUpdatedStyleColorways: totalUpdated,
        styleColorwayResults: styleColorwayResults,
        styleUpdateResults: styleUpdateResults,
        styleUpdatedCount: styleUpdatedCount
      };
      
    } catch (error) {
      console.error('❌ Tema güncelleme hatası:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const plmUpdateService = new PlmUpdateService();

module.exports = plmUpdateService;
