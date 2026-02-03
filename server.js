/*
  GradeTracker Local Server (Fixed for Docker)
  ------------------------------------
  - Critical Fix: Handles EXDEV errors for Docker volumes
  - Security: Rate limiting & HTTP-only cookies
*/

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const DIST_DIR = path.join(__dirname, 'dist');

const app = express();

// Security: Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Generous limit to prevent blocking legitimate saves
    message: { error: "Too many requests, please slow down." }
});

// Middleware
app.use(limiter);
app.use(cors({ origin: true, credentials: true })); 
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(DIST_DIR));

// Helper: Robust Atomic Write (Fixed for Docker/EXDEV)
const atomicWrite = (filePath, data) => {
    const tempFile = `${filePath}.tmp`;
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
        
        try {
            // Try fast rename first
            fs.renameSync(tempFile, filePath);
        } catch (renameError) {
            // If cross-device error (common in Docker volumes), copy and unlink
            if (renameError.code === 'EXDEV') {
                fs.copyFileSync(tempFile, filePath);
                fs.unlinkSync(tempFile);
            } else {
                throw renameError;
            }
        }
        return true;
    } catch (e) {
        console.error(`Write failed for ${filePath}:`, e);
        return false;
    }
};

// Helper: Hash
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

// Middleware: Authenticate
const authenticate = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        if (!fs.existsSync(AUTH_FILE)) return res.status(500).json({ error: "Server not initialized." });
        const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        
        const valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(authData.passwordHash));
        if (valid) next();
        else res.status(403).json({ error: "Invalid Token" });
    } catch (e) {
        console.error("Auth Error:", e);
        res.status(500).json({ error: "Authentication failed" });
    }
};

// --- API Routes ---

app.post('/api/login', (req, res) => {
    const { accessKey } = req.body;
    if (!accessKey) return res.status(400).json({ error: "Missing key" });

    try {
        const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        const submittedHash = hashKey(accessKey);
        const valid = crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(authData.passwordHash));

        if (valid) {
            res.cookie('auth_token', submittedHash, {
                httpOnly: true,
                secure: false, // Set to true if behind HTTPS proxy without mixed content issues
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });
            res.json({ success: true });
        } else {
            res.status(401).json({ error: "Invalid Access Key" });
        }
    } catch (e) {
        res.status(500).json({ error: "Login failed" });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

app.get('/api/data', authenticate, (req, res) => {
    try {
        if (!fs.existsSync(DB_FILE)) return res.json({ years: [], classes: [], assignments: [], events: [] });
        const data = fs.readFileSync(DB_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: "Failed to read database" });
    }
});

app.post('/api/data', authenticate, (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: "Invalid data format" });
        const success = atomicWrite(DB_FILE, req.body);
        if (success) res.json({ success: true });
        else res.status(500).json({ error: "Write failed" });
    } catch (e) {
        console.error("Save Error:", e);
        res.status(500).json({ error: "Failed to save data" });
    }
});

app.post('/api/change-password', authenticate, (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: "Password too short" });
        const newHash = hashKey(newPassword);
        const success = atomicWrite(AUTH_FILE, { passwordHash: newHash });
        if (success) {
            res.cookie('auth_token', newHash, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Failed to update password file" });
        }
    } catch (e) {
        res.status(500).json({ error: "Failed to update password" });
    }
});

app.get('/api/backup', authenticate, (req, res) => {
    if (fs.existsSync(DB_FILE)) res.download(DB_FILE, `gradetracker-backup-${Date.now()}.json`);
    else res.status(404).json({ error: "No data to backup" });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 GradeTracker Server running at http://localhost:${PORT}`);
    console.log(`   Data storage: ${DATA_DIR}`);
});
