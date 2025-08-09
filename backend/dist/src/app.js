"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const repository_1 = __importDefault(require("./routes/repository"));
const invitation_1 = __importDefault(require("./routes/invitation"));
const organization_1 = __importDefault(require("./routes/organization"));
const org_invitation_1 = __importDefault(require("./routes/org-invitation"));
const user_1 = __importDefault(require("./routes/user"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/auth', auth_1.default);
app.use('/repository', repository_1.default);
app.use('/invitation', invitation_1.default);
app.use('/organization', organization_1.default);
app.use('/org-invitation', org_invitation_1.default);
app.use('/user', user_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
exports.default = app;
