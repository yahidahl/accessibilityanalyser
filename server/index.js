import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import Report from './models/Report.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

app.get('/', (req, res) => {
  res.send('✅ Backend is running');
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// 🚀 Get user-specific reports
app.post('/api/user-reports', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  try {
    const reports = await Report.find({ userId }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ HTTP server running on http://localhost:${PORT}`);
});

// ✅ WebSocket Audit Listener
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  console.log('🌐 WebSocket client connected');

  ws.on('message', async (msg) => {
    try {
      const { url, userId } = JSON.parse(msg.toString());
      ws.send(`🔍 Auditing: ${url}`);

      const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
      });

      const result = await lighthouse(url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'info',
        onlyCategories: ['accessibility'],
      });

      const score = Math.round(result.lhr.categories.accessibility.score * 100);
      const issues = Object.values(result.lhr.audits)
        .filter(a => a.score !== 1 && a.scoreDisplayMode !== 'notApplicable')
        .map(a => a.title);

      const report = new Report({ url, score, issues, userId });
      await report.save();

      ws.send(JSON.stringify({ score, issues }));
      await chrome.kill();
    } catch (error) {
      console.error('❌ Audit error:', error.message);
      ws.send(`❌ Lighthouse audit failed: ${error.message}`);
    }
  });
});
