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
exports.Repository = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const uriSanitizer_1 = require("../utils/uriSanitizer");
const RepositorySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        set: function (value) {
            return (0, uriSanitizer_1.maskSensitiveData)(value);
        }
    },
    description: {
        type: String,
        set: function (value) {
            return value ? (0, uriSanitizer_1.maskSensitiveData)(value) : value;
        }
    },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    collaborators: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }], // membrii
    isPrivate: { type: Boolean, default: false },
    starredBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }], // stele
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
// Pre-save middleware pentru validarea și logarea datelor sensibile
RepositorySchema.pre('save', function (next) {
    const repo = this;
    // Verifică și loghează dacă au fost detectate date sensibile
    const sensitiveFields = [];
    if ((0, uriSanitizer_1.containsSensitiveData)(repo.name)) {
        sensitiveFields.push('name');
    }
    if (repo.description && (0, uriSanitizer_1.containsSensitiveData)(repo.description)) {
        sensitiveFields.push('description');
    }
    if (sensitiveFields.length > 0) {
        console.warn(`[Security] Sensitive data detected and masked in repository ${repo._id} fields: ${sensitiveFields.join(', ')}`);
    }
    next();
});
// Pre-update middleware pentru actualizări
RepositorySchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
    const update = this.getUpdate();
    if (update.$set) {
        if (update.$set.name) {
            update.$set.name = (0, uriSanitizer_1.maskSensitiveData)(update.$set.name);
        }
        if (update.$set.description) {
            update.$set.description = (0, uriSanitizer_1.maskSensitiveData)(update.$set.description);
        }
    }
    // Pentru actualizări directe
    if (update.name) {
        update.name = (0, uriSanitizer_1.maskSensitiveData)(update.name);
    }
    if (update.description) {
        update.description = (0, uriSanitizer_1.maskSensitiveData)(update.description);
    }
    next();
});
exports.Repository = mongoose_1.default.model("Repository", RepositorySchema);
