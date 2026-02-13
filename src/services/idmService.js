const axios = require('axios');
const tokenService = require('./tokenService');
const PLM_CONFIG = require('../config/plm.config');

/**
 * IDM Service
 * Infor Data Management API - Tema özellikleri için
 */
class IdmService {
  
  /**
   * IDM'den item bilgisi çek (pid ile)
   * @param {string} pid - Item PID (örn: "Theme_Attributes-115-0-LATEST")
   * @returns {Promise<Object>} Item bilgisi
   */
  async getItemByPid(pid) {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api/items/${pid}`;
      
      console.log(`📞 IDM'e istek atılıyor: pid=${pid}`);
      console.log(`🔗 URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        console.log(`✅ Item bilgisi alındı: ${pid}`);
        
        // Özellikleri parse et
        const attributes = this.parseAttributes(response.data);
        
        return {
          pid: pid,
          itemData: response.data,
          attributes: attributes,
          attributeCount: attributes.length
        };
      }
      
      console.log('ℹ️  Item bulunamadı');
      return null;
      
    } catch (error) {
      console.error('❌ IDM isteği hatası:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * IDM response'undan özellikleri parse et
   * @param {Object} itemData - IDM'den gelen item verisi
   * @returns {Array} Özellik listesi
   */
  parseAttributes(itemData) {
    // IDM'den gelen yapı: itemData.item.attrs.attr
    if (itemData && itemData.item && itemData.item.attrs && itemData.item.attrs.attr) {
      const attrs = itemData.item.attrs.attr;
      
      // Array'i parse et ve daha kullanışlı hale getir
      return attrs.map(attr => ({
        name: attr.name,
        type: attr.type,
        qualifier: attr.qual,
        value: attr.value,
        // Type'a göre parse et
        parsedValue: this.parseAttributeValue(attr.value, attr.type)
      }));
    }
    
    // Diğer olası yapılar
    if (itemData.attributes) {
      return itemData.attributes;
    }
    
    if (itemData.properties) {
      return itemData.properties;
    }
    
    // Eğer data direkt liste ise
    if (Array.isArray(itemData)) {
      return itemData;
    }
    
    return [];
  }

  /**
   * Attribute değerini type'ına göre parse et
   * @param {string} value - Değer
   * @param {string} type - Type (1=string, 3=integer, 7=date, 21=uuid, vb.)
   * @returns {any} Parse edilmiş değer
   */
  parseAttributeValue(value, type) {
    if (!value) return value;
    
    switch (type) {
      case '3': // Integer
        return parseInt(value, 10);
      case '7': // Date
        return new Date(value);
      case '10': // Float
        return parseFloat(value);
      default: // String veya diğerleri
        return value;
    }
  }

  /**
   * IDM'den entity değer listesini çek
   * @param {string} entityName - Entity adı (örn: "Theme_Attributes")
   * @returns {Promise<Object>} Entity değer listeleri
   */
  async getEntityValueLists(entityName) {
    try {
      const authHeader = await tokenService.getAuthorizationHeader();
      
      const url = `${PLM_CONFIG.ionApiUrl}/${PLM_CONFIG.tenantId}/IDM/api/datamodel/entities/${entityName}`;
      
      console.log(`📞 IDM Entity değer listesi çekiliyor: ${entityName}`);
      console.log(`🔗 URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        console.log(`✅ Entity bilgisi alındı: ${entityName}`);
        
        // Değer listelerini parse et
        const valueLists = this.parseValueLists(response.data);
        
        return {
          entityName: entityName,
          entityData: response.data,
          valueLists: valueLists,
          valueListCount: Object.keys(valueLists).length
        };
      }
      
      console.log('ℹ️  Entity bulunamadı');
      return null;
      
    } catch (error) {
      console.error('❌ IDM entity isteği hatası:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Entity response'undan değer listelerini parse et
   * @param {Object} entityData - IDM'den gelen entity verisi
   * @returns {Object} Attribute adına göre değer listeleri
   */
  parseValueLists(entityData) {
    const valueLists = {};
    
    // IDM entity yapısı: entity.attrs.attr
    if (entityData && entityData.entity && entityData.entity.attrs && entityData.entity.attrs.attr) {
      const attributes = entityData.entity.attrs.attr;
      
      attributes.forEach(attr => {
        // Eğer attribute'un valueset'i varsa
        if (attr.valueset && attr.valueset.value && Array.isArray(attr.valueset.value)) {
          valueLists[attr.name] = {
            name: attr.name,
            displayName: attr.desc || attr.name,
            type: attr.type,
            qualifier: attr.qual,
            values: attr.valueset.value.map(vl => ({
              code: vl.name,
              description: vl.desc
            }))
          };
        }
      });
    }
    
    return valueLists;
  }

  /**
   * Attribute değerini value list ile eşleştir
   * @param {string} attributeName - Attribute adı
   * @param {string} code - Kod değeri
   * @param {Object} valueLists - Tüm değer listeleri
   * @returns {Object} Eşleştirilmiş değer
   */
  mapValueWithList(attributeName, code, valueLists) {
    if (!valueLists || !valueLists[attributeName]) {
      return {
        code: code,
        description: null,
        mapped: false
      };
    }
    
    const valueList = valueLists[attributeName];
    const matchedValue = valueList.values.find(v => v.code === code);
    
    return {
      code: code,
      description: matchedValue ? matchedValue.description : null,
      mapped: !!matchedValue,
      attributeDisplayName: valueList.displayName
    };
  }

  /**
   * Tüm attribute'ları value list ile eşleştir
   * @param {Array} attributes - Attribute listesi
   * @param {Object} valueLists - Değer listeleri
   * @returns {Array} Eşleştirilmiş attribute'lar
   */
  mapAttributesWithValueLists(attributes, valueLists) {
    return attributes.map(attr => {
      const mapped = this.mapValueWithList(attr.name, attr.value, valueLists);
      
      return {
        ...attr,
        codeDescription: mapped.description,
        mapped: mapped.mapped
      };
    });
  }

  /**
   * Theme Description'dan PID'yi parse et
   * @param {string} description - Theme description (örn: "Theme_Attributes-115-0-LATEST")
   * @returns {Object} Parse edilmiş PID bilgisi
   */
  parseThemeDescription(description) {
    if (!description) {
      return null;
    }
    
    // Format: Theme_Attributes-115-0-LATEST
    const parts = description.split('-');
    
    return {
      fullPid: description,
      baseName: parts[0], // Theme_Attributes
      id: parts[1] ? parseInt(parts[1]) : null, // 115
      version: parts[2] ? parseInt(parts[2]) : null, // 0
      tag: parts[3] || null // LATEST
    };
  }

  /**
   * Theme için tüm bilgileri topla (StyleColorways + IDM Attributes + Value Lists)
   * @param {number} themeId - Theme ID
   * @param {Object} themeData - PlmThemeService'den gelen tema verisi
   * @returns {Promise<Object>} Birleştirilmiş tema bilgisi
   */
  async getThemeWithAttributes(themeId, themeData) {
    try {
      // Theme description'ı al (hem eski hem yeni API formatını destekle)
      const themeInfo = themeData.themeInfo;
      const themeDescription = themeInfo?.themeDescription || themeInfo?.Description;
      
      if (!themeDescription) {
        console.log('⚠️  Theme description bulunamadı');
        return {
          themeId: themeId,
          themeData: themeData,
          attributes: null,
          mappedAttributes: [],
          error: 'No theme description found'
        };
      }
      
      const pid = themeDescription;
      console.log(`\n📋 Theme Description: ${pid}`);
      
      // PID'yi parse et
      const parsedPid = this.parseThemeDescription(pid);
      console.log(`📊 Parsed PID:`, JSON.stringify(parsedPid, null, 2));
      
      // IDM'den özellikleri çek
      const idmData = await this.getItemByPid(pid);
      
      // Entity değer listelerini çek
      const entityName = parsedPid.baseName; // Theme_Attributes
      console.log(`\n📚 Değer listeleri çekiliyor: ${entityName}`);
      const entityData = await this.getEntityValueLists(entityName);
      
      // Attribute'ları değer listeleri ile eşleştir
      let mappedAttributes = null;
      if (idmData && idmData.attributes && entityData && entityData.valueLists) {
        console.log(`\n🔗 Attribute'lar değer listeleri ile eşleştiriliyor...`);
        mappedAttributes = this.mapAttributesWithValueLists(idmData.attributes, entityData.valueLists);
        console.log(`✅ ${mappedAttributes.length} attribute eşleştirildi`);
      }
      
      return {
        themeId: themeId,
        themeData: themeData,
        parsedPid: parsedPid,
        idmData: idmData,
        entityData: entityData,
        attributes: idmData ? idmData.attributes : null,
        mappedAttributes: mappedAttributes
      };
      
    } catch (error) {
      console.error('❌ Theme attributes hatası:', error.message);
      return {
        themeId: themeId,
        themeData: themeData,
        attributes: null,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const idmService = new IdmService();

module.exports = idmService;
