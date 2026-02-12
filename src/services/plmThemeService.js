const axios = require('axios');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * PLM Theme Service
 * ThemeId ile PLM'den STYLECOLORWAYS bilgilerini çeker
 */
class PlmThemeService {
  
  /**
   * PLM'den tema bilgisi çek (ThemeId ile)
   * @param {number} themeId - Theme ID
   * @returns {Promise<Object>} Tema bilgisi ve kullanıldığı stylecolorways
   */
  async getThemeStyleColorways(themeId) {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/FASHIONPLM/odata2/api/odata2/STYLECOLORWAYS`;
      const params = {
        '$filter': `ThemeId eq ${themeId}`,
        '$expand': 'Theme'
      };
      
      console.log(`📞 PLM'e istek atılıyor: ThemeId=${themeId}`);
      console.log(`🔗 URL: ${url}`);
      console.log(`🔍 Filter: ${params.$filter}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        params: params
      });
      
      if (response.data && response.data.value) {
        const results = response.data.value;
        console.log(`✅ ${results.length} adet StyleColorway bulundu`);
        
        // Tema bilgisini al (ilk kayıttan)
        const themeInfo = results.length > 0 && results[0].Theme ? {
          themeId: results[0].Theme.ThemeId,
          themeName: results[0].Theme.Name,
          themeDescription: results[0].Theme.Description,
          themeCode: results[0].Theme.Code
        } : null;
        
        // Sonuçları özetle
        const summary = {
          themeId: themeId,
          themeInfo: themeInfo,
          totalCount: results.length,
          styleColorways: results.map(item => ({
            styleColorwayId: item.StyleColorwayId,
            styleId: item.StyleId,
            colorrngId: item.ColorrngId,
            colorwayCode: item.Code,
            colorwayName: item.Name,
            themeId: item.ThemeId,
            hexValue: item.HexValue,
            createDate: item.CreateDate,
            modifyDate: item.ModifyDate,
            colorwayUserField4: item.ColorwayUserField4 || null,
            ColorwayStatus: item.ColorwayStatus, // İş kuralı için gerekli
            theme: item.Theme ? {
              themeId: item.Theme.ThemeId,
              themeName: item.Theme.Name,
              themeCode: item.Theme.Code,
              themeDescription: item.Theme.Description
            } : null
          })),
          rawData: results
        };
        
        return summary;
      }
      
      console.log('ℹ️  Hiç StyleColorway bulunamadı');
      return {
        themeId: themeId,
        totalCount: 0,
        styleColorways: [],
        rawData: []
      };
      
    } catch (error) {
      console.error('❌ PLM isteği hatası:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Birden fazla ThemeId için toplu sorgu
   * @param {Array<number>} themeIds - Theme ID listesi
   * @returns {Promise<Object>} Tüm temaların birleşik sonucu
   */
  async getMultipleThemes(themeIds) {
    try {
      const results = await Promise.all(
        themeIds.map(id => this.getThemeStyleColorways(id))
      );
      
      return {
        totalThemes: themeIds.length,
        themes: results,
        totalStyleColorways: results.reduce((sum, theme) => sum + theme.totalCount, 0)
      };
      
    } catch (error) {
      console.error('❌ Toplu tema sorgusu hatası:', error.message);
      throw error;
    }
  }

  /**
   * StyleColorway'leri StyleId'ye göre grupla
   * @param {Array} styleColorways - StyleColorway listesi
   * @returns {Object} StyleId'ye göre gruplanmış sonuç
   */
  groupByStyle(styleColorways) {
    const grouped = {};
    
    styleColorways.forEach(item => {
      if (!grouped[item.styleId]) {
        grouped[item.styleId] = {
          styleId: item.styleId,
          colorways: []
        };
      }
      
      grouped[item.styleId].colorways.push({
        styleColorwayId: item.styleColorwayId,
        colorrngId: item.colorrngId,
        colorwayCode: item.colorwayCode,
        colorwayName: item.colorwayName,
        hexValue: item.hexValue,
        themeId: item.themeId
      });
    });
    
    return {
      totalStyles: Object.keys(grouped).length,
      styles: Object.values(grouped)
    };
  }
}

// Create singleton instance
const plmThemeService = new PlmThemeService();

module.exports = plmThemeService;
