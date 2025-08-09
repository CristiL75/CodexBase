# 🔄 Sistem de Refresh Tokens - Documentație

## Problema rezolvată

Înainte, JWT tokens expirau în 7 zile și utilizatorii trebuiau să se reconecteze manual. Acum avem un sistem securizat cu:

- **Access tokens** care expiră în 15 minute
- **Refresh tokens** care expiră în 7 zile
- **Auto-refresh automat** pentru o experiență seamless

## 🔧 Cum funcționează

### 1. Login/Register
La autentificare, utilizatorul primește:
```json
{
  "user": { ... },
  "accessToken": "eyJ...",
  "refreshToken": "abc123...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

### 2. Request-uri normale
Folosește access token-ul în header:
```
Authorization: Bearer eyJ...
```

### 3. Când access token-ul expiră
Frontend-ul detectează răspunsul 401 și apelează automat:
```
POST /api/auth/refresh
{
  "refreshToken": "abc123..."
}
```

### 4. Response refresh
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "def456...",
  "expiresIn": 900
}
```

## 📡 API Endpoints

### Refresh Token
```
POST /api/auth/refresh
Body: { "refreshToken": "string" }
Response: TokenPair
```

### Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer token
Response: { "message": "Successfully logged out" }
```

### Login (actualizat)
```
POST /api/auth/login
Response: TokenPair + user info
```

## 🔒 Securitate îmbunătățită

### Access Tokens (15 minute)
- Sunt JWT-uri signed
- Conțin: `id`, `email`, `is2FAEnabled`, `type: 'access'`
- Expiră rapid pentru securitate maximă

### Refresh Tokens (7 zile)
- Sunt random strings (64 bytes hex)
- Stocate în baza de date cu expiry date
- Pot fi revoke prin logout
- Un refresh token nou este generat la fiecare refresh

## 🖥️ Implementare Frontend

### Stocarea tokens
```javascript
localStorage.setItem('accessToken', response.accessToken);
localStorage.setItem('refreshToken', response.refreshToken);
```

### Interceptor pentru auto-refresh
```javascript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          
          // Retry original request
          error.config.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return axios.request(error.config);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

## 🛠️ Migrarea de la sistem vechi

### Backend ✅ Completat
- [x] Modelul User actualizat cu refresh tokens
- [x] Token manager cu funcții utilitare
- [x] Middleware authenticateJWT actualizat
- [x] Endpoints pentru refresh și logout
- [x] Toate rutele de auth actualizate

### Frontend 🔄 Necesită actualizare
- [ ] AuthContext actualizat pentru refresh tokens
- [ ] Axios interceptor pentru auto-refresh
- [ ] LocalStorage management
- [ ] Error handling pentru token expiry

## 🔍 Testing

### Test manual
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Folosește access token
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  http://localhost:5000/api/repository/my

# Refresh token când expiră
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}'

# Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## 🚨 Beneficii securitate

1. **Expirare rapidă**: Access tokens expiră în 15 minute
2. **Refresh controlat**: Refresh tokens pot fi revoke
3. **Audit trail**: Toate refresh-urile sunt logate
4. **No session replay**: Tokens vechi nu mai pot fi folosite
5. **Graceful degradation**: Utilizatorii nu sunt forțați să se reconecteze

## 📊 Monitoring

Logs pentru urmărire:
```
[Auth] Token expired for request to /api/repository/my
[Auth] Refresh token used for user 507f1f77...
[Auth] User logged out, tokens invalidated
```

## 🔄 Workflow complet

1. **Login** → Primești access + refresh token
2. **API calls** → Folosești access token
3. **Token expiră** → Auto-refresh în background
4. **Continuă lucrul** → Fără întrerupere pentru user
5. **Logout** → Invalidează toate tokens
6. **Refresh expiră** → Redirect la login după 7 zile

Acest sistem oferă securitate maximă cu experiență utilizator optimă!
