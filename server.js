/*
  GradeTracker Local Server
  -------------------------
  Serves the React frontend and handles API requests to read/write 
  local JSON files.
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
app.use(express.json());
// Serve static frontend files
app.use(express.static(DIST_DIR));

// Helper: SHA-256 Hash
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

// Middleware: Authenticate Request
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
        const userHash = hashKey(userKey);

        // Constant time comparison to prevent timing attacks
        const valid = crypto.timingSafeEqual(
            Buffer.from(userHash), 
            Buffer.from(authData.passwordHash)
        );

        if (valid) {
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

// 1. Verify Login
app.post('/api/login', authenticate, (req, res) => {
    res.json({ success: true });
});

// 2. Get All Data
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

// 3. Save All Data
app.post('/api/data', authenticate, (req, res) => {
    try {
        // Simple full-write for local file system (reliable for single user)
        fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Failed to save data" });
    }
});

// 4. Change Password
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

// Catch-all: Serve React App
app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 GradeTracker Server running at http://localhost:${PORT}`);
    console.log(`   Data storage: ${DATA_DIR}`);
});
