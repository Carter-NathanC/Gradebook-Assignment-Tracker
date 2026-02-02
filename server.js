/*
  GradeTracker Local Server (Enhanced)
  ------------------------------------
  Features:
  - Rate Limiting (Security)
  - HttpOnly Cookies (Security)
  - Atomic File Writes (Data Integrity)
  - Backup Endpoint
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
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: "Too many requests, please try again later." }
});

// Middleware
app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(DIST_DIR));

// Helper: Atomic Write to prevent data corruption
const atomicWrite = (filePath, data) => {
    const tempFile = `${filePath}.tmp`;
    try {
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
        fs.renameSync(tempFile, filePath);
        return true;
    } catch (e) {
        console.error(`Write failed for ${filePath}:`, e);
        return false;
    }
};

// Helper: SHA-256 Hash
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

// Middleware: Authenticate Request via Cookie
const authenticate = (req, res, next) => {
    // Check for cookie first
    const token = req.cookies.auth_token;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        if (!fs.existsSync(AUTH_FILE)) {
            return res.status(500).json({ error: "Server not initialized." });
        }
        
        const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));

        // Compare cookie hash with stored hash (Constant time)
        // Note: In a real app, token would be a session ID, but for this local app,
        // we are storing the hashed key in the httpOnly cookie for simplicity/statelessness.
        const valid = crypto.timingSafeEqual(
            Buffer.from(token), 
            Buffer.from(authData.passwordHash)
        );

        if (valid) {
            next();
        } else {
            res.status(403).json({ error: "Invalid Token" });
        }
    } catch (e) {
        console.error("Auth Error:", e);
        res.status(500).json({ error: "Authentication failed" });
    }
};

// --- API Routes ---

// 1. Login (Sets HttpOnly Cookie)
app.post('/api/login', (req, res) => {
    const { accessKey } = req.body;
    if (!accessKey) return res.status(400).json({ error: "Missing key" });

    try {
        const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        const submittedHash = hashKey(accessKey);

        const valid = crypto.timingSafeEqual(
            Buffer.from(submittedHash),
            Buffer.from(authData.passwordHash)
        );

        if (valid) {
            // Set HttpOnly cookie
            res.cookie('auth_token', submittedHash, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use secure in prod
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            res.json({ success: true });
        } else {
            res.status(401).json({ error: "Invalid Access Key" });
        }
    } catch (e) {
        res.status(500).json({ error: "Login failed" });
    }
});

// 2. Logout (Clears Cookie)
app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true });
});

// 3. Get Data
app.get('/api/data', authenticate, (req, res) => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return res.json({ years: [], classes: [], assignments: [] });
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: "Failed to read database" });
    }
});

// 4. Save Data (Atomic)
app.post('/api/data', authenticate, (req, res) => {
    try {
        // Basic Validation
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: "Invalid data format" });
        }

        const success = atomicWrite(DB_FILE, req.body);
        if (success) res.json({ success: true });
        else res.status(500).json({ error: "Write failed" });
    } catch (e) {
        res.status(500).json({ error: "Failed to save data" });
    }
});

// 5. Change Password
app.post('/api/change-password', authenticate, (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: "Password too short" });
        }

        const newHash = hashKey(newPassword);
        const success = atomicWrite(AUTH_FILE, { passwordHash: newHash });
        
        if (success) {
            // Update the cookie immediately
            res.cookie('auth_token', newHash, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000
            });
            res.json({ success: true });
        } else {
            res.status(500).json({ error: "Failed to update password file" });
        }
    } catch (e) {
        res.status(500).json({ error: "Failed to update password" });
    }
});

// 6. Backup Data
app.get('/api/backup', authenticate, (req, res) => {
    try {
        if (fs.existsSync(DB_FILE)) {
            res.download(DB_FILE, `gradetracker-backup-${Date.now()}.json`);
        } else {
            res.status(404).json({ error: "No data to backup" });
        }
    } catch (e) {
        res.status(500).json({ error: "Backup failed" });
    }
});

// Catch-all: Serve React App
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 GradeTracker Server running at http://localhost:${PORT}`);
    console.log(`   Data storage: ${DATA_DIR}`);
});
