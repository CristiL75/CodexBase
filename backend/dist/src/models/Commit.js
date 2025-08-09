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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Commit = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const crypto_1 = __importDefault(require("crypto"));
const commitSchema = new mongoose_1.Schema({
    repository: { type: mongoose_1.Schema.Types.ObjectId, ref: "Repository", required: true },
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    files: [{
            name: { type: String, required: true },
            content: { type: String, required: true },
            path: { type: String, required: true }
        }],
    hash: { type: String, unique: true },
    branch: { type: String, default: "main" },
    createdAt: { type: Date, default: Date.now }
});
commitSchema.pre("save", function (next) {
    if (!this.hash) {
        const data = this.repository.toString() + this.author.toString() + this.message + JSON.stringify(this.files) + Date.now();
        this.hash = crypto_1.default.createHash("sha1").update(data).digest("hex");
    }
    next();
});
exports.Commit = mongoose_1.default.model("Commit", commitSchema);
