# 🔒 Sistem de Mascare Date Sensibile

Acest sistem detectează și mascează automat datele sensibile din URI-uri și alte texte pentru a preveni expunerea accidentală a:

- **API Keys** și token-uri
- **GitHub Personal Access Tokens**
- **JWT Tokens**
- **Credențiale din database connection strings**
- **AWS Access Keys**
- **Parole și secrete din URL-uri**

## 🚀 Cum funcționează

### 1. Detectare automată
Sistemul folosește pattern-uri regex pentru a detecta următoarele tipuri de date sensibile:

- `api_key=`, `token=`, `access_token=` în URL-uri
- GitHub tokens (`ghp_`)
- JWT tokens (format standard)
- AWS Access Keys (`AKIA...`)
- Database connection strings cu credențiale
- Git URLs cu username/password

### 2. Mascare automată
Când sunt detectate date sensibile, acestea sunt înlocuite cu:
- `***MASKED***` pentru token-uri și chei
- `***MASKED_JWT***` pentru JWT tokens
- `***MASKED_AWS_KEY***` pentru AWS keys

### 3. Integrare automată
Sistemul este integrat în:
- **Modelele Mongoose** (Repository, File) - mascare automată la salvare
- **API Routes** - middleware de sanitizare
- **Validări** - avertismente când sunt detectate date sensibile

## 📋 Testare

### Rulează testele complete:
```bash
npm run test-security-ts
```

### Rulează testul rapid:
```bash
npm run test-security
```

### Testare manuală:
```bash
cd backend
node tests/testSecurity.js
```

## 🔧 Exemple de folosire

### Detectare date sensibile:
```javascript
import { containsSensitiveData, getDetectedPatterns } from './utils/uriSanitizer';

const text = "https://api.example.com/data?api_key=sk_12345";
const hasSensitive = containsSensitiveData(text); // true
const patterns = getDetectedPatterns(text); // ['API Key']
```

### Mascare automată:
```javascript
import { maskSensitiveData } from './utils/uriSanitizer';

const original = "https://api.example.com/data?api_key=sk_12345";
const masked = maskSensitiveData(original);
// Result: "https://api.example.com/data?api_key=***MASKED***"
```

### Sanitizare obiect:
```javascript
import { sanitizeObject } from './utils/uriSanitizer';

const data = {
  name: "repo-with-key-sk_12345",
  config: { token: "ghp_abc123" }
};
const clean = sanitizeObject(data);
// Toate datele sensibile vor fi mascate automat
```

## 🛡️ Protecție aplicată

### 1. La crearea repository-urilor:
- Nume și descriere sunt verificate și mascate
- Utilizatorul primește avertisment dacă sunt detectate date sensibile

### 2. La upload-ul fișierelor:
- Numele fișierului și conținutul sunt verificate
- Mascare automată și logging pentru audit

### 3. La commit-uri:
- Toate fișierele din commit sunt verificate
- Raportare pattern-urilor detectate

### 4. API endpoint pentru verificare:
```
POST /api/repository/security/check
{
  "text": "string to check"
}
```

## 📊 Pattern-uri detectate

| Tip | Pattern | Exemplu |
|-----|---------|---------|
| API Key | `api_key=` | `?api_key=sk_123` |
| Access Token | `access_token=` | `?access_token=abc` |
| GitHub Token | `ghp_` | `ghp_abc123...` |
| JWT | `eyJ...` | `eyJhbGci...` |
| AWS Key | `AKIA...` | `AKIAIOSFODNN7...` |
| Database | `user:pass@` | `mongodb://user:pass@host` |
| Git URL | `https://user:pass@` | `https://user:pass@github.com` |

## 🔍 Logging și Monitoring

Sistemul loghează automat:
- Când sunt detectate date sensibile
- Ce tipuri de pattern-uri au fost găsite
- În ce fișiere/repository-uri

Exemplu log:
```
[Security] Sensitive data detected and masked in repository 507f1f77... fields: name: API Key, description: GitHub Token
```

## ⚙️ Configurare

Pattern-urile sunt configurabile în `src/utils/uriSanitizer.ts`. Poți adăuga noi pattern-uri sau modifica cele existente.

## 🚨 Important

- **Mascarea este ireversibilă** - datele originale nu pot fi recuperate
- **Sistemul funcționează automat** - nu necesită intervenție manuală
- **Toate tipurile de input sunt protejate** - API, UI, CLI
- **Performanța este optimizată** - verificarea se face doar la salvare/actualizare
