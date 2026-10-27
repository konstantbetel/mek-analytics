import express from 'express';
import cors from 'cors';
import { getData } from './services/dataService.js';
import { getConfig, updateConfig } from './services/config.js';
import { startScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.get('/api/data', (_req, res) => {
  try {
    res.json(getData());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/config', (_req, res) => res.json(getConfig()));

app.post('/api/config', (req, res) => {
  const hours = Number(req.body?.intervalHours);
  if (!Number.isFinite(hours) || hours <= 0) {
    return res.status(400).json({ error: 'intervalHours должен быть положительным числом' });
  }
  res.json(updateConfig({ intervalHours: hours }));
});

// Единый запуск парсера
app.post('/api/parse', async (_req, res) => {
  try {
    const data = await runParse();
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

async function runParse() {
  const { parseSchedule } = await import('./parser/excelParser.js');
  const data = await parseSchedule();
  const { setData } = await import('./services/dataService.js');
  setData(data);
  return data;
}

// Парсинг по расписанию: сразу при старте + каждые N часов (N настраивается)
startScheduler(runParse, getConfig().intervalHours);

app.listen(PORT, () => {
  console.log(`[mek-server] http://localhost:${PORT}`);
});
