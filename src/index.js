const express = require('express');
const bodyParser = require('body-parser');
const themeRoutes = require('./routes/themeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable trust proxy for Heroku
app.set('trust proxy', 1);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api', themeRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Ipekyol Tema API is running',
    endpoints: {
      health: 'GET /',
      themeHealth: 'GET /api/theme/health',
      getTheme: 'POST /api/theme (Body: { "ThemeId": 1174 })',
      getThemeAttributes: 'POST /api/theme/attributes (Body: { "ThemeId": 1174 })',
      updateTheme: 'POST /api/theme/update (Body: { "ThemeId": 1174 })'
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /`);
  console.log(`   GET  /api/theme/health`);
  console.log(`   POST /api/theme`);
  console.log(`   POST /api/theme/attributes`);
  console.log(`   POST /api/theme/update`);
});

module.exports = app;
