# Ipekyol Tema API

PLM entegrasyonu ile tema işlemleri için API servisi.

## Özellikler

- ✅ OAuth2.0 Token Yönetimi (Test & Production)
- ✅ PLM STYLECOLORWAYS Entegrasyonu
- ✅ IDM Attributes & Value Lists
- ✅ Kod-Açıklama Eşleştirme
- ✅ Otomatik PATCH İşlemi (Style bazında)

## Kurulum

```bash
npm install
```

## Testler

```bash
npm run test:token      # Token alma testi
npm run test:theme      # PLM tema testi
npm run test:idm        # IDM attributes testi
npm run test:valuelist  # Value list testi
npm run test:update     # PATCH payload testi
```

## Çalıştırma

**Development:**
```bash
npm run dev
```

**Production:**
```bash
NODE_ENV=production PORT=3001 npm start
```

## API Endpoints

### 1. Health Check
```http
GET /
GET /api/theme/health
```

### 2. Tema Bilgisi (StyleColorways)
```http
POST /api/theme
Content-Type: application/json

{
  "ThemeId": 1174
}
```

**Response:** StyleColorways + Theme bilgileri

### 3. Tema Özellikleri (Attributes + Value Lists)
```http
POST /api/theme/attributes
Content-Type: application/json

{
  "ThemeId": 1174
}
```

**Response:** 
- StyleColorways
- Theme attributes (kod + açıklama eşleştirilmiş)
- Value lists

### 4. Tema Güncelleme (PATCH to PLM) ⭐
```http
POST /api/theme/update
Content-Type: application/json

{
  "ThemeId": 1174
}
```

**İşlem:**
1. ThemeId'ye ait StyleColorways'leri çek
2. Tema özelliklerini (attributes) IDM'den çek
3. Kod-Açıklama eşleştirmesi yap
4. StyleId bazında grupla
5. Her style için PATCH payload oluştur
6. PLM'e PATCH gönder

**PATCH Payload:**
```json
[
  {
    "StyleColorwayId": 12885,
    "FreeFieldOne": "Koleksiyon - B",      // Cluster
    "FreeFieldTwo": "SMART",                // LifeStyle
    "FreeFieldThree": "PLAN",               // Hibrit
    "FreeFieldFour": "ACTIVEWEAR",          // Tema Kısa Kod
    "FreeFieldFive": "BCT 1"                // Ana Tema
  }
]
```

**Not:** ColorwayUserField4 sadece 0 veya null değilse payload'a eklenir.

## Örnek Kullanım

```javascript
// 1. Tema bilgilerini çek
POST http://localhost:3001/api/theme/attributes
{ "ThemeId": 1174 }

// 2. Sonuçları incele
// 3. Güncelleme yap
POST http://localhost:3001/api/theme/update
{ "ThemeId": 1174 }
```

## Ortam Değişkenleri

- `NODE_ENV`: `production` veya `test` (default: test)
- `PORT`: Server portu (default: 3000)

## Heroku Deployment

### 1. Heroku'ya Bağla
```bash
# GitHub'dan Heroku'ya otomatik deploy
# Heroku Dashboard > New > Create new app
# Deploy tab > Deployment method > GitHub
# Connect to: KaanKaraca93/temaopener
```

### 2. Environment Variables (Config Vars)
Heroku Dashboard > Settings > Config Vars:
```
NODE_ENV=production
```

### 3. Deploy
```bash
# Automatic deploys from main branch
# Enable Automatic Deploys
```

### 4. Test
```bash
# Heroku app URL
https://your-app-name.herokuapp.com

# API Endpoints
POST https://your-app-name.herokuapp.com/api/theme/update
```

## GitHub Repository
```
https://github.com/KaanKaraca93/temaopener
```

## Yapı

```
IpekyolTema/
├── src/
│   ├── config/
│   │   └── plm.config.js          # Test & PRD credentials
│   ├── services/
│   │   ├── tokenService.js        # OAuth2.0 token
│   │   ├── plmThemeService.js     # PLM tema servisi
│   │   ├── idmService.js          # IDM attributes & value lists
│   │   └── plmUpdateService.js    # PLM PATCH işlemleri
│   ├── routes/
│   │   └── themeRoutes.js         # API endpoints
│   └── index.js                   # Express server
├── test/
│   ├── token.test.js
│   ├── plm-theme.test.js
│   ├── idm-theme.test.js
│   ├── idm-valuelist.test.js
│   ├── plm-update.test.js
│   └── api.test.http
└── package.json
```
