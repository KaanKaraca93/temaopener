const express = require('express');
const router = express.Router();
const plmThemeService = require('../services/plmThemeService');
const plmStyleService = require('../services/plmStyleService');
const idmService = require('../services/idmService');
const plmUpdateService = require('../services/plmUpdateService');

/**
 * POST /api/theme
 * ThemeId ile tema bilgilerini çeker (StyleColorways only)
 * Body: { "ThemeId": 1174 }
 */
router.post('/theme', async (req, res) => {
  try {
    const { ThemeId } = req.body;
    
    // Validation
    if (!ThemeId) {
      return res.status(400).json({
        success: false,
        error: 'ThemeId is required',
        message: 'Please provide ThemeId in request body'
      });
    }
    
    if (typeof ThemeId !== 'number' || ThemeId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ThemeId',
        message: 'ThemeId must be a positive number'
      });
    }
    
    console.log(`\n📥 Incoming request for ThemeId: ${ThemeId}`);
    
    // Fetch theme data from PLM
    const themeData = await plmThemeService.getThemeStyleColorways(ThemeId);
    
    // Group by style
    const groupedData = plmThemeService.groupByStyle(themeData.styleColorways);
    
    // Response
    const response = {
      success: true,
      themeId: ThemeId,
      themeInfo: themeData.themeInfo,
      summary: {
        totalStyleColorways: themeData.totalCount,
        totalStyles: groupedData.totalStyles
      },
      styleColorways: themeData.styleColorways,
      groupedByStyle: groupedData.styles,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Response: ${themeData.totalCount} StyleColorways found in ${groupedData.totalStyles} styles\n`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error processing theme request:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/theme/attributes
 * ThemeId ile tema bilgilerini ve özelliklerini çeker (IDM dahil)
 * Body: { "ThemeId": 1174 }
 */
router.post('/theme/attributes', async (req, res) => {
  try {
    const { ThemeId } = req.body;
    
    // Validation
    if (!ThemeId) {
      return res.status(400).json({
        success: false,
        error: 'ThemeId is required',
        message: 'Please provide ThemeId in request body'
      });
    }
    
    if (typeof ThemeId !== 'number' || ThemeId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ThemeId',
        message: 'ThemeId must be a positive number'
      });
    }
    
    console.log(`\n📥 Incoming request for ThemeId with attributes: ${ThemeId}`);
    
    // Fetch theme data from PLM
    const themeData = await plmThemeService.getThemeStyleColorways(ThemeId);
    
    // Group by style
    const groupedData = plmThemeService.groupByStyle(themeData.styleColorways);
    
    // Fetch theme attributes from IDM
    const fullThemeData = await idmService.getThemeWithAttributes(ThemeId, themeData);
    
    // Response
    const response = {
      success: true,
      themeId: ThemeId,
      themeInfo: themeData.themeInfo,
      summary: {
        totalStyleColorways: themeData.totalCount,
        totalStyles: groupedData.totalStyles,
        attributeCount: fullThemeData.idmData ? fullThemeData.idmData.attributeCount : 0,
        valueListCount: fullThemeData.entityData ? fullThemeData.entityData.valueListCount : 0
      },
      styleColorways: themeData.styleColorways,
      groupedByStyle: groupedData.styles,
      parsedPid: fullThemeData.parsedPid,
      themeAttributes: fullThemeData.mappedAttributes || [],
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Response: ${themeData.totalCount} StyleColorways, ${response.summary.attributeCount} attributes (${response.summary.valueListCount} value lists)\n`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error processing theme attributes request:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/theme/update
 * ThemeId ile tema bilgilerini çeker ve PLM'deki StyleColorways'leri günceller
 * Body: { "ThemeId": 1174 }
 */
router.post('/theme/update', async (req, res) => {
  try {
    const { ThemeId } = req.body;
    
    // Validation
    if (!ThemeId) {
      return res.status(400).json({
        success: false,
        error: 'ThemeId is required',
        message: 'Please provide ThemeId in request body'
      });
    }
    
    if (typeof ThemeId !== 'number' || ThemeId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ThemeId',
        message: 'ThemeId must be a positive number'
      });
    }
    
    console.log(`\n📥 Incoming update request for ThemeId: ${ThemeId}`);
    
    // 1. Fetch theme data from PLM
    const themeData = await plmThemeService.getThemeStyleColorways(ThemeId);
    
    // 2. Group by style
    const groupedData = plmThemeService.groupByStyle(themeData.styleColorways);
    
    // 3. Fetch theme attributes from IDM
    const fullThemeData = await idmService.getThemeWithAttributes(ThemeId, themeData);
    
    // 4. Prepare full data with grouped styles
    const dataForUpdate = {
      themeId: ThemeId,
      themeInfo: themeData.themeInfo,
      groupedByStyle: groupedData.styles,
      mappedAttributes: fullThemeData.mappedAttributes,
      rawStyleColorways: themeData.styleColorways
    };
    
    // 5. Update StyleColorways in PLM
    const updateResult = await plmUpdateService.updateThemeStyleColorways(ThemeId, dataForUpdate);
    
    // Response
    const response = {
      success: updateResult.success,
      themeId: ThemeId,
      themeInfo: themeData.themeInfo,
      updateSummary: {
        totalStyles: updateResult.totalStyles,
        successfulStyles: updateResult.successfulStyles,
        failedStyles: updateResult.failedStyles,
        totalUpdatedStyleColorways: updateResult.totalUpdatedStyleColorways,
        styleUpdatedCount: updateResult.styleUpdatedCount
      },
      styleColorwayResults: updateResult.styleColorwayResults,
      styleUpdateResults: updateResult.styleUpdateResults,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Update completed: ${updateResult.successfulStyles}/${updateResult.totalStyles} styles updated\n`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error processing theme update request:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/style/update
 * StyleId ile style'ın tüm colorway'lerini günceller
 * Body: { "StyleId": 123 }
 */
router.post('/style/update', async (req, res) => {
  try {
    const { StyleId } = req.body;
    
    // Validation
    if (!StyleId) {
      return res.status(400).json({
        success: false,
        error: 'StyleId is required',
        message: 'Please provide StyleId in request body'
      });
    }
    
    if (typeof StyleId !== 'number' || StyleId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid StyleId',
        message: 'StyleId must be a positive number'
      });
    }
    
    console.log(`\n📥 Incoming update request for StyleId: ${StyleId}`);
    
    // 1. Fetch style with colorways from PLM
    const styleData = await plmStyleService.getStyleWithColorways(StyleId);
    
    if (!styleData) {
      return res.status(404).json({
        success: false,
        error: 'Style not found',
        message: `Style with ID ${StyleId} not found`,
        timestamp: new Date().toISOString()
      });
    }
    
    // 2. Update colorways in PLM
    const updateResult = await plmUpdateService.updateStyleColorways(StyleId, styleData);
    
    // Response
    const response = {
      success: updateResult.success,
      styleId: StyleId,
      styleInfo: styleData.styleInfo,
      updateSummary: {
        totalColorways: updateResult.totalColorways,
        updatedColorways: updateResult.updatedColorways,
        uniqueThemes: updateResult.uniqueThemes,
        styleUpdated: updateResult.styleUpdateResult.updated || false
      },
      patchResult: updateResult.patchResult,
      styleUpdateResult: updateResult.styleUpdateResult,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Update completed: ${updateResult.updatedColorways}/${updateResult.totalColorways} colorways updated\n`);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error processing style update request:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/theme/health
 * Health check for theme service
 */
router.get('/theme/health', (req, res) => {
  res.json({
    success: true,
    service: 'Theme Service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
