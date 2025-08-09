"use strict";
/**
 * Utilitar pentru detectarea și mascarea informațiilor sensibile din URI-uri
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsSensitiveData = containsSensitiveData;
exports.maskSensitiveData = maskSensitiveData;
exports.sanitizeObject = sanitizeObject;
exports.sanitizeRepositoryData = sanitizeRepositoryData;
exports.getDetectedPatterns = getDetectedPatterns;
exports.createSanitizationMiddleware = createSanitizationMiddleware;
// Patterns pentru detectarea informațiilor sensibile în URI-uri
const SENSITIVE_PATTERNS = [
    // API Keys
    {
        name: 'API Key',
        pattern: /([?&]api[_-]?key=)[^&\s]+/gi,
        replacement: '$1***MASKED***'
    },
    {
        name: 'API Token',
        pattern: /([?&]token=)[^&\s]+/gi,
        replacement: '$1***MASKED***'
    },
    {
        name: 'Access Token',
        pattern: /([?&]access[_-]?token=)[^&\s]+/gi,
        replacement: '$1***MASKED***'
    },
    // GitHub Personal Access Tokens
    {
        name: 'GitHub Token',
        pattern: /(ghp_)[a-zA-Z0-9]{36}/g,
        replacement: '$1***MASKED***'
    },
    // Generic tokens in URLs
    {
        name: 'Bearer Token in URL',
        pattern: /(bearer[_\s]+)[a-zA-Z0-9\-_.]{20,}/gi,
        replacement: '$1***MASKED***'
    },
    // JWT Tokens
    {
        name: 'JWT Token',
        pattern: /(eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)/g,
        replacement: '***MASKED_JWT***'
    },
    // AWS Access Keys
    {
        name: 'AWS Access Key',
        pattern: /(AKIA[0-9A-Z]{16})/g,
        replacement: '***MASKED_AWS_KEY***'
    },
    // Generic secrets in query parameters
    {
        name: 'Secret Parameter',
        pattern: /([?&]secret=)[^&\s]+/gi,
        replacement: '$1***MASKED***'
    },
    {
        name: 'Password Parameter',
        pattern: /([?&]password=)[^&\s]+/gi,
        replacement: '$1***MASKED***'
    },
    // Database connection strings with credentials
    {
        name: 'Database Connection String',
        pattern: /(mongodb:\/\/[^:]+:)[^@]+(@)/g,
        replacement: '$1***MASKED***$2'
    },
    {
        name: 'SQL Connection String',
        pattern: /(mysql:\/\/[^:]+:)[^@]+(@)/g,
        replacement: '$1***MASKED***$2'
    },
    {
        name: 'PostgreSQL Connection String',
        pattern: /(postgres:\/\/[^:]+:)[^@]+(@)/g,
        replacement: '$1***MASKED***$2'
    },
    // Git URLs with credentials
    {
        name: 'Git URL with credentials',
        pattern: /(https:\/\/[^:]+:)[^@]+(@)/g,
        replacement: '$1***MASKED***$2'
    }
];
/**
 * Detectează dacă un string conține informații sensibile
 */
function containsSensitiveData(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    return SENSITIVE_PATTERNS.some(pattern => pattern.pattern.test(text));
}
/**
 * Mascază informațiile sensibile dintr-un string
 */
function maskSensitiveData(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    let maskedText = text;
    for (const pattern of SENSITIVE_PATTERNS) {
        maskedText = maskedText.replace(pattern.pattern, pattern.replacement);
    }
    return maskedText;
}
/**
 * Sanitizează un obiect recursiv, mascând informațiile sensibile
 */
function sanitizeObject(obj) {
    if (!obj)
        return obj;
    if (typeof obj === 'string') {
        return maskSensitiveData(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
}
/**
 * Validează și sanitizează datele unui repository
 */
function sanitizeRepositoryData(data) {
    const sanitized = Object.assign({}, data);
    // Sanitizează câmpurile text
    if (sanitized.name) {
        sanitized.name = maskSensitiveData(sanitized.name);
    }
    if (sanitized.description) {
        sanitized.description = maskSensitiveData(sanitized.description);
    }
    return sanitized;
}
/**
 * Returnează lista pattern-urilor detectate într-un text
 */
function getDetectedPatterns(text) {
    if (!text || typeof text !== 'string') {
        return [];
    }
    const detected = [];
    for (const pattern of SENSITIVE_PATTERNS) {
        if (pattern.pattern.test(text)) {
            detected.push(pattern.name);
        }
    }
    return detected;
}
/**
 * Middleware pentru sanitizarea automată a datelor
 */
function createSanitizationMiddleware() {
    return function (req, res, next) {
        // Sanitizează doar req.body pentru a evita probleme cu proprietăți read-only
        if (req.body && typeof req.body === 'object') {
            try {
                req.body = sanitizeObject(req.body);
            }
            catch (error) {
                console.warn('[Security] Could not sanitize request body:', error);
            }
        }
        next();
    };
}
