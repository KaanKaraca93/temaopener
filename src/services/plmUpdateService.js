const axios = require('axios');
const tokenService = require('./tokenService');
const plmStyleService = require('./plmStyleService');
const idmService = require('./idmService');
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
      
      const updates = {};
      let needsUpdate = false;
      
      // 2. Status Güncellemesi (Bağımsız Kontrol #1)
      console.log(`\n📌 STATUS KONTROLÜ:`);
      if (style.Status === 1) {
        // Aktif renkleri bul (ColorwayStatus = 1)
        const activeColorways = styleColorways.filter(scw => {
          const scwStyleId = scw.StyleId || scw.styleId;
          const scwStatus = scw.ColorwayStatus || scw.colorwayStatus;
          return scwStyleId === styleId && scwStatus === 1;
        });
        
        console.log(`   🎨 ${activeColorways.length} aktif renk bulundu`);
        
        // Aktif renklerin ThemeId'lerini topla (benzersiz, null/undefined hariç)
        const activeThemes = [...new Set(
          activeColorways
            .map(scw => scw.ThemeId || scw.themeId)
            .filter(tid => tid != null)
        )];
        console.log(`   📋 Aktif renklerin temaları: [${activeThemes.join(', ')}]`);
        
        // IPTAL (1172) dışında tema var mı?
        const nonIptalActiveThemes = activeThemes.filter(tid => tid !== IPTAL_THEME_ID);
        
        if (nonIptalActiveThemes.length > 0) {
          console.log(`   ✓ IPTAL dışında aktif temalar var: [${nonIptalActiveThemes.join(', ')}]`);
          updates.Status = 2;
          needsUpdate = true;
          console.log(`   → Status 1'den 2'ye güncellenecek`);
        } else {
          console.log(`   ℹ️  IPTAL dışında aktif tema yok, Status değişmeyecek`);
        }
      } else {
        console.log(`   ℹ️  Status ${style.Status} (1 değil, güncelleme gerekmez)`);
      }
      
      // 3. ThemeId Güncellemesi (Bağımsız Kontrol #2)
      console.log(`\n📌 THEMEID KONTROLÜ:`);
      
      // Aktif ve pasif renkleri ayır
      const thisStyleColorways = styleColorways.filter(scw => (scw.StyleId || scw.styleId) === styleId);
      const activeColorways = thisStyleColorways.filter(scw => (scw.ColorwayStatus || scw.colorwayStatus) === 1);
      const passiveColorways = thisStyleColorways.filter(scw => (scw.ColorwayStatus || scw.colorwayStatus) !== 1);
      
      // Aktif renklerin ThemeId'leri (null/undefined hariç)
      const activeThemeIds = [...new Set(
        activeColorways
          .map(scw => scw.ThemeId || scw.themeId)
          .filter(tid => tid != null)
      )];
      
      console.log(`   🎨 Aktif renk sayısı: ${activeColorways.length}, Temaları: [${activeThemeIds.join(', ') || 'Boş'}]`);
      console.log(`   💤 Pasif renk sayısı: ${passiveColorways.length}`);
      console.log(`   📋 Style ThemeId: ${style.ThemeId || 'Boş'}`);
      
      // Style ThemeId aktif renklerin hiçbirinde var mı?
      const styleThemeInActiveColorways = style.ThemeId != null && activeThemeIds.includes(style.ThemeId);
      
      if (styleThemeInActiveColorways) {
        console.log(`   ✓ Style ThemeId (${style.ThemeId}) aktif renklerde mevcut, güncelleme gerekmez`);
      } else {
        console.log(`   ⚠️  Style ThemeId (${style.ThemeId || 'Boş'}) aktif renklerde YOK, güncelleme gerekiyor...`);
        
        // Öncelik 1: Aktif renklerdeki 1172 dışı temalar
        const activeNonIptalThemes = activeThemeIds.filter(tid => tid !== IPTAL_THEME_ID);
        
        if (activeNonIptalThemes.length > 0) {
          const newThemeId = activeNonIptalThemes[0];
          console.log(`   ✓ Öncelik 1: Aktif renklerde IPTAL dışı tema bulundu: ${newThemeId}`);
          updates.ThemeId = newThemeId;
          needsUpdate = true;
          console.log(`   → ThemeId ${style.ThemeId || 'Boş'}'den ${newThemeId}'e güncellenecek`);
        } else if (activeThemeIds.includes(IPTAL_THEME_ID)) {
          // Öncelik 2: Aktif renklerde sadece 1172 var
          console.log(`   ✓ Öncelik 2: Aktif renklerde sadece IPTAL (1172) var`);
          updates.ThemeId = IPTAL_THEME_ID;
          needsUpdate = true;
          console.log(`   → ThemeId ${style.ThemeId || 'Boş'}'den ${IPTAL_THEME_ID}'e güncellenecek`);
        } else {
          // Öncelik 3 ve 4: Pasif renklere bak
          const passiveThemeIds = [...new Set(
            passiveColorways
              .map(scw => scw.ThemeId || scw.themeId)
              .filter(tid => tid != null)
          )];
          
          console.log(`   ℹ️  Aktif renklerde tema yok, pasif renklere bakılıyor: [${passiveThemeIds.join(', ') || 'Boş'}]`);
          
          // Öncelik 3: Pasif renklerdeki 1172 dışı temalar
          const passiveNonIptalThemes = passiveThemeIds.filter(tid => tid !== IPTAL_THEME_ID);
          
          if (passiveNonIptalThemes.length > 0) {
            const newThemeId = passiveNonIptalThemes[0];
            console.log(`   ✓ Öncelik 3: Pasif renklerde IPTAL dışı tema bulundu: ${newThemeId}`);
            updates.ThemeId = newThemeId;
            needsUpdate = true;
            console.log(`   → ThemeId ${style.ThemeId || 'Boş'}'den ${newThemeId}'e güncellenecek`);
          } else if (passiveThemeIds.includes(IPTAL_THEME_ID)) {
            // Öncelik 4: Pasif renklerde sadece 1172 var
            console.log(`   ✓ Öncelik 4: Pasif renklerde sadece IPTAL (1172) var`);
            updates.ThemeId = IPTAL_THEME_ID;
            needsUpdate = true;
            console.log(`   → ThemeId ${style.ThemeId || 'Boş'}'den ${IPTAL_THEME_ID}'e güncellenecek`);
          } else {
            console.log(`   ℹ️  Hiçbir colorway'de tema bulunamadı, güncelleme yapılmayacak`);
          }
        }
      }
      
      // 4. Güncelleme gerekiyorsa yap
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
   * Tek bir Style için ColorwayColorway'leri güncelle
   * @param {number} styleId - Style ID
   * @param {Object} styleData - Style ve colorway verisi
   * @returns {Promise<Object>} Güncelleme sonuçları
   */
  async updateStyleColorways(styleId, styleData) {
    try {
      console.log(`\n🔄 Style ${styleId} için güncelleme başlatılıyor...`);
      
      const { styleInfo, colorways } = styleData;
      
      if (!colorways || colorways.length === 0) {
        throw new Error('Colorway verisi bulunamadı');
      }
      
      console.log(`📊 ${colorways.length} adet colorway bulundu`);
      
      // Benzersiz ThemeId'leri bul
      const uniqueThemeIds = [...new Set(colorways.map(c => c.ThemeId))];
      console.log(`🎨 ${uniqueThemeIds.length} benzersiz tema bulundu: [${uniqueThemeIds.join(', ')}]`);
      
      // Her tema için IDM'den özellik çek
      const themeAttributesMap = {};
      
      for (const themeId of uniqueThemeIds) {
        console.log(`\n📥 Theme ${themeId} için IDM özellikleri çekiliyor...`);
        
        // Bu temayı kullanan herhangi bir colorway'i bul (Theme.Description için)
        const colorwayWithTheme = colorways.find(c => c.ThemeId === themeId);
        if (!colorwayWithTheme || !colorwayWithTheme.Theme || !colorwayWithTheme.Theme.Description) {
          console.log(`⚠️  Theme ${themeId} için Description bulunamadı, atlanıyor`);
          continue;
        }
        
        try {
          // IDM'den tema özelliklerini çek
          const themeAttributes = await idmService.getThemeWithAttributes(themeId, {
            themeInfo: colorwayWithTheme.Theme,
            styleColorways: [colorwayWithTheme]
          });
          
          themeAttributesMap[themeId] = themeAttributes.mappedAttributes;
          console.log(`✅ Theme ${themeId} özellikleri alındı`);
          
        } catch (error) {
          console.error(`❌ Theme ${themeId} özellikleri alınırken hata:`, error.message);
          // Hata olsa bile devam et
        }
      }
      
      // Her colorway için patch payload oluştur
      console.log(`\n📦 Colorway'ler için PATCH payload oluşturuluyor...`);
      const patchPayloads = [];
      
      for (const colorway of colorways) {
        const themeAttributes = themeAttributesMap[colorway.ThemeId];
        
        if (!themeAttributes) {
          console.log(`⚠️  ColorwayId ${colorway.StyleColorwayId}: Theme ${colorway.ThemeId} özellikleri yok, atlanıyor`);
          continue;
        }
        
        // Açıklamaları çıkar
        const descriptions = this.extractDescriptions(themeAttributes);
        
        // Payload oluştur
        const payload = this.buildPatchPayload(colorway.StyleColorwayId, descriptions);
        patchPayloads.push(payload);
      }
      
      if (patchPayloads.length === 0) {
        throw new Error('Güncellenecek colorway bulunamadı');
      }
      
      console.log(`\n📋 ${patchPayloads.length} adet colorway güncellenecek`);
      console.log(`\n📦 İlk payload örneği:`);
      console.log(JSON.stringify(patchPayloads[0], null, 2));
      
      // PATCH yap
      const patchResult = await this.patchStyleColorways(patchPayloads);
      
      console.log(`\n✅ StyleColorway güncellemesi tamamlandı`);
      
      // İş kuralı: Style Status ve ThemeId kontrolü
      console.log(`\n\n🔍 İş Kuralı - Style Status ve ThemeId Kontrolü`);
      console.log(`═`.repeat(70));
      
      const styleUpdateResult = await this.checkAndUpdateStyle(
        styleId,
        colorways,
        styleInfo.ThemeId
      );
      
      console.log(`\n✅ Style kontrol/güncelleme tamamlandı`);
      
      return {
        success: true,
        styleId: styleId,
        totalColorways: colorways.length,
        updatedColorways: patchPayloads.length,
        uniqueThemes: uniqueThemeIds.length,
        patchResult: patchResult,
        styleUpdateResult: styleUpdateResult
      };
      
    } catch (error) {
      console.error(`❌ Style ${styleId} güncelleme hatası:`, error.message);
      throw error;
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
