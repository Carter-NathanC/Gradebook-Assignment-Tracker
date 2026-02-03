/*
  GradeTracker Local Server (Simple/Unsafe Version)
  -------------------------------------------------
  - Authentication: Header-based (x-access-key)
  - Storage: Direct synchronous writes (No atomic temp files)
  - Purpose: Maximum compatibility with Docker volumes where atomic moves fail
*/

import express from 'express';
import cors from 'cors';
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

app.use(cors());
// Increased limit to prevent data loss on large saves
app.use(express.json({ limit: '50mb' }));
app.use(express.static(DIST_DIR));

// Helper: SHA-256 Hash
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

// Middleware: Authenticate Request (Simple Header Check)
const authenticate = (req, res, next) => {
    const userKey = req.headers['x-access-key'];
    
    if (!userKey) {
        return res.status(401).json({ error: "Missing Access Key" });
    }

    try {
        if (!fs.existsSync(AUTH_FILE)) {
            return res.status(500).json({ error: "Server not initialized. Run install.js" });
        }
        
        const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        
        // Simple direct comparison
        if (hashKey(userKey) === authData.passwordHash) {
            next();
        } else {
            res.status(403).json({ error: "Invalid Access Key" });
        }
    } catch (e) {
        console.error("Auth Error:", e);
        res.status(500).json({ error: "Authentication failed" });
    }
};

// --- API Routes ---

// 1. Login (Just verifies key)
app.post('/api/login', (req, res) => {
    const { accessKey } = req.body;
    if (!accessKey) return res.status(400).json({ error: "Missing key" });

    try {
        const authData = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
        if (hashKey(accessKey) === authData.passwordHash) {
            res.json({ success: true });
        } else {
            res.status(401).json({ error: "Invalid Access Key" });
        }
    } catch (e) {
        res.status(500).json({ error: "Login failed" });
    }
});

// 2. Logout (No-op on server for stateless auth)
app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});

// 3. Get Data
app.get('/api/data', authenticate, (req, res) => {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return res.json({ years: [], classes: [], assignments: [], events: [] });
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: "Failed to read database" });
    }
});

// 4. Save Data (Direct Write)
app.post('/api/data', authenticate, (req, res) => {
    try {
        // Direct write to avoid EXDEV (Cross-device link) errors in Docker
        fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        console.error("Save Error:", e);
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
        fs.writeFileSync(AUTH_FILE, JSON.stringify({ passwordHash: newHash }, null, 2));
        
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to update password" });
    }
});

// 6. Backup Data
app.get('/api/backup', authenticate, (req, res) => {
    if (fs.existsSync(DB_FILE)) {
        res.download(DB_FILE, `gradetracker-backup-${Date.now()}.json`);
    } else {
        res.status(404).json({ error: "No data to backup" });
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
