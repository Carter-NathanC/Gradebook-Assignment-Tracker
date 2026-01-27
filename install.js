/*
  GradeTracker Secure Installer
  --------------------------------
  1. Creates the local /data directory.
  2. Generates a random secure Access Key ONLY if one doesn't exist.
  3. Initializes an empty database if one doesn't exist.
*/

import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Helper: SHA-256 Hash
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');

function install() {
    console.log("\n🔒 GradeTracker Setup\n---------------------");

    // 1. Create Data Directory
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
        console.log("✔ Created data directory.");
    }

    // 2. Check/Generate Auth
    if (fs.existsSync(AUTH_FILE)) {
        console.log("✔ Auth configuration found. Keeping existing Access Key.");
    } else {
        // Generate Random Key
        const accessKey = crypto.randomBytes(16).toString('hex');
        const hashedKey = hashKey(accessKey);

        // Save Auth Config (Hash Only)
        const authConfig = { passwordHash: hashedKey };
        fs.writeFileSync(AUTH_FILE, JSON.stringify(authConfig, null, 2));
        
        console.log("\n---------------------------------------------------");
        console.log("🔑 NEW ACCESS KEY GENERATED");
        console.log("---------------------------------------------------");
        console.log(`\n    \x1b[33m${accessKey}\x1b[0m\n`); // Yellow color
        console.log("⚠️  COPY THIS KEY NOW. It is not stored in plain text!");
        console.log("---------------------------------------------------");
    }

    // 3. Initialize Database if missing
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            universityName: "My University",
            years: [],
            classes: [],
            assignments: [],
            events: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log("✔ Initialized local database.");
    } else {
        console.log("✔ Existing database found.");
    }
}

install();
