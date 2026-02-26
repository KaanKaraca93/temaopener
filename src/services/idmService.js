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

  /**
   * PID ile tema özelliklerini özel formatta çek (ERP için)
   * @param {string} pidDocId - Item PID (örn: "Theme_Attributes-115-0-LATEST")
   * @returns {Promise<Object>} Özel formatlı tema verisi
   */
  async getThemeAttributesFormatted(pidDocId) {
    try {
      console.log(`\n📥 Theme Attributes (Formatted) isteği: ${pidDocId}`);
      
      // PID'yi parse et
      const parsedPid = this.parseThemeDescription(pidDocId);
      console.log(`📊 Parsed PID:`, JSON.stringify(parsedPid, null, 2));
      
      // IDM'den özellikleri çek
      const idmData = await this.getItemByPid(pidDocId);
      
      if (!idmData || !idmData.attributes) {
        throw new Error('IDM data not found or no attributes available');
      }
      
      // Entity değer listelerini çek
      const entityName = parsedPid.baseName; // Theme_Attributes
      console.log(`\n📚 Değer listeleri çekiliyor: ${entityName}`);
      const entityData = await this.getEntityValueLists(entityName);
      
      // Attribute'ları değer listeleri ile eşleştir
      let mappedAttributes = [];
      if (entityData && entityData.valueLists) {
        console.log(`\n🔗 Attribute'lar değer listeleri ile eşleştiriliyor...`);
        mappedAttributes = this.mapAttributesWithValueLists(idmData.attributes, entityData.valueLists);
        console.log(`✅ ${mappedAttributes.length} attribute eşleştirildi`);
      }
      
      // Özel formata çevir
      const themeData = this.formatThemeData(mappedAttributes);
      
      const result = {
        BatchId: `${pidDocId}_${Date.now()}`,
        ProcessedDate: new Date().toISOString(),
        ThemeData: [themeData]
      };
      
      console.log(`✅ Theme Attributes (Formatted) hazırlandı\n`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Theme attributes (formatted) hatası:', error.message);
      throw error;
    }
  }

  /**
   * Mapped attribute'ları özel formata çevir
   * @param {Array} mappedAttributes - Eşleştirilmiş attribute'lar
   * @returns {Object} Özel formatlı tema verisi
   */
  formatThemeData(mappedAttributes) {
    const result = {};
    
    // Attribute değerlerini bul
    const getAttrValue = (name) => {
      const attr = mappedAttributes.find(a => a.name === name);
      return attr ? attr.value : null;
    };
    
    const getAttrDescription = (name) => {
      const attr = mappedAttributes.find(a => a.name === name);
      return attr ? attr.codeDescription : null;
    };
    
    // InStore tarihini formatla (YYYY-MM-DD -> DD.MM.YYYY)
    const formatInStoreDate = (dateStr) => {
      if (!dateStr) return null;
      
      // Eğer zaten DD.MM.YYYY formatındaysa
      if (dateStr.includes('.')) return dateStr;
      
      // YYYY-MM-DD veya ISO formatı ise
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      }
      
      return dateStr;
    };
    
    // Helper: Sadece dolu alanları ekle
    const addIfNotEmpty = (key, value) => {
      if (value !== null && value !== undefined && value !== '' && value !== 0) {
        result[key] = value;
      }
    };
    
    // Helper: Kod-Desc çiftini ekle (sadece desc varsa)
    const addCodeDescPair = (codeKey, descKey, attrName) => {
      const code = getAttrValue(attrName);
      const desc = getAttrDescription(attrName);
      
      // Eğer description varsa, ikisini de ekle
      if (desc !== null && desc !== undefined && desc !== '') {
        if (code !== null && code !== undefined && code !== '' && code !== 0) {
          result[codeKey] = code;
        }
        result[descKey] = desc;
      }
    };
    
    // Temel bilgiler (text alanlar, value set değil)
    addIfNotEmpty('TemaName', getAttrValue('Tema_Ismi'));  // Text alan
    addIfNotEmpty('TemaKod', getAttrValue('Tema_Kodu'));   // Text alan
    
    const themeId = getAttrValue('ThemeId');
    if (themeId) {
      const parsedThemeId = parseInt(themeId);
      if (!isNaN(parsedThemeId) && parsedThemeId !== 0) {
        result.TemaId = parsedThemeId;
      }
    }
    
    // InStore tarihi (doğru alan adı: InStore_Tarihi)
    addIfNotEmpty('InStoreDate', formatInStoreDate(getAttrValue('InStore_Tarihi')));
    
    // Cluster (kod-desc çifti)
    addCodeDescPair('Cluster', 'ClusterDesc', 'Cluster');
    
    // LifeStyle (kod-desc çifti)
    addCodeDescPair('LifeStyle', 'LifeStyleDesc', 'LifeStyle');
    
    // Hibrit (kod-desc çifti)
    addCodeDescPair('Hibrit', 'HibritDesc', 'Hibrit');
    
    // Tema Kısa Kod (kod-desc çifti)
    addCodeDescPair('TemaKisaKod', 'TemaKisaKodDesc', 'Tema_Kisa_Kod');
    
    // Sezon (TERS BAĞLANMIŞ - Kod ve Desc yer değiştirmiş)
    const sezonCode = getAttrValue('Sezon');
    const sezonDesc = getAttrDescription('Sezon');
    // Eğer description varsa (bu kod olarak gidecek), ikisini de ekle
    if (sezonDesc !== null && sezonDesc !== undefined && sezonDesc !== '') {
      result.Sezon = sezonDesc; // Description kod olarak
      if (sezonCode !== null && sezonCode !== undefined && sezonCode !== '' && sezonCode !== 0) {
        result.SezonDesc = sezonCode; // Value desc olarak
      }
    }
    
    // Ana Tema (kod-desc çifti)
    addCodeDescPair('AnaTemaKod', 'AnaTemaKodDesc', 'Ana_Tema');
    
    // Ürün Sınıfı (kod-desc çifti)
    addCodeDescPair('UrunSinifi', 'UrunSinifiDesc', 'Urun_Sinifi');
    
    // Alt Sezon (kod-desc çifti)
    addCodeDescPair('AltSezon', 'AltSezonDesc', 'Alt_Sezon');
    
    // Marka (kod-desc çifti)
    addCodeDescPair('Marka', 'MarkaDesc', 'Marka');
    
    // Koleksiyon (kod-desc çifti)
    addCodeDescPair('Koleksiyon', 'KoleksiyonDesc', 'Koleksiyon');
    
    // Koleksiyon Tipi (kod-desc çifti)
    addCodeDescPair('KoleksiyonTipi', 'KoleksiyonTipiDesc', 'Koleksiyon_Tipi');
    
    return result;
  }
}

// Create singleton instance
const idmService = new IdmService();

module.exports = idmService;
