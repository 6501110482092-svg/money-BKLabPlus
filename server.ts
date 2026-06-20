import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// CORS setup to allow queries from different origins like vercel.app
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Accept,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const RECORDS_FILE = path.join(DATA_DIR, 'records.json');
const LAB_TESTS_FILE = path.join(DATA_DIR, 'labtests.json');

// Memory cache as fallback
let recordsCache: Record<string, any> = {};
let labTestsCache: any[] = [];

// Load initial data
try {
  if (fs.existsSync(RECORDS_FILE)) {
    recordsCache = JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf-8'));
  }
} catch (e) {
  console.error("Error reading records file", e);
}

try {
  if (fs.existsSync(LAB_TESTS_FILE)) {
    labTestsCache = JSON.parse(fs.readFileSync(LAB_TESTS_FILE, 'utf-8'));
  }
} catch (e) {
  console.error("Error reading labtests file", e);
}

// REST API for sync
app.get('/api/records', (req, res) => {
  res.json(recordsCache);
});

app.post('/api/records', (req, res) => {
  try {
    recordsCache = req.body;
    fs.writeFileSync(RECORDS_FILE, JSON.stringify(recordsCache, null, 2), 'utf-8');
    res.json({ success: true, count: Object.keys(recordsCache).length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/labtests', (req, res) => {
  res.json(labTestsCache);
});

app.post('/api/labtests', (req, res) => {
  try {
    labTestsCache = req.body;
    fs.writeFileSync(LAB_TESTS_FILE, JSON.stringify(labTestsCache, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite Middleware inside server.ts
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

setupVite();
