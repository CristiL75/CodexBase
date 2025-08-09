"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
// Importă strategia Google Passport pentru a evita eroarea "Unknown authentication strategy 'google'"
require("./auth/google");
const user_1 = __importDefault(require("./routes/user"));
const auth_1 = __importDefault(require("./routes/auth"));
const repository_1 = __importDefault(require("./routes/repository")); // <-- importă ruta pentru repository
const invitation_1 = __importDefault(require("./routes/invitation"));
const organization_1 = __importDefault(require("./routes/organization"));
const org_invitation_1 = __importDefault(require("./routes/org-invitation"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Mount routes
app.use("/auth", auth_1.default);
app.use("/user", user_1.default);
app.use("/repository", repository_1.default);
app.use('/invitation', invitation_1.default);
app.use("/organization", organization_1.default);
app.use("/org-invitation", org_invitation_1.default);
// <-- adaugă ruta pentru repository
app.get("/", (_, res) => {
    res.send("🔐 CodexBase backend running");
});
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(process.env.PORT || 5000, () => {
        console.log(`🚀 Server on http://localhost:${process.env.PORT || 5000}`);
    });
})
    .catch((err) => console.error("❌ MongoDB connection error:", err));
