"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.File = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const uriSanitizer_1 = require("../utils/uriSanitizer");
const FileSchema = new mongoose_1.Schema({
    repository: { type: mongoose_1.Schema.Types.ObjectId, ref: "Repository", required: true },
    branch: { type: String, default: "main" },
    name: {
        type: String,
        required: true,
        set: function (value) {
            return (0, uriSanitizer_1.maskSensitiveData)(value);
        }
    },
    content: {
        type: String,
        default: "",
        set: function (value) {
            return value ? (0, uriSanitizer_1.maskSensitiveData)(value) : value;
        }
    },
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// Pre-save middleware pentru validarea și logarea datelor sensibile
FileSchema.pre('save', function (next) {
    const file = this;
    // Verifică și loghează dacă au fost detectate date sensibile
    const sensitiveFields = [];
    if ((0, uriSanitizer_1.containsSensitiveData)(file.name)) {
        sensitiveFields.push('name');
    }
    if (file.content && (0, uriSanitizer_1.containsSensitiveData)(file.content)) {
        sensitiveFields.push('content');
    }
    if (sensitiveFields.length > 0) {
        console.warn(`[Security] Sensitive data detected and masked in file ${file.name} (repo: ${file.repository}) fields: ${sensitiveFields.join(', ')}`);
    }
    next();
});
// Pre-update middleware pentru actualizări
FileSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    const update = this.getUpdate();
    if (update.$set) {
        if (update.$set.name) {
            update.$set.name = (0, uriSanitizer_1.maskSensitiveData)(update.$set.name);
        }
        if (update.$set.content) {
            update.$set.content = (0, uriSanitizer_1.maskSensitiveData)(update.$set.content);
        }
    }
    // Pentru actualizări directe
    if (update.name) {
        update.name = (0, uriSanitizer_1.maskSensitiveData)(update.name);
    }
    if (update.content) {
        update.content = (0, uriSanitizer_1.maskSensitiveData)(update.content);
    }
    next();
});
exports.File = mongoose_1.default.model("File", FileSchema);
