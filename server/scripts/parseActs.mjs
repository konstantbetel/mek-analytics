#!/usr/bin/env node
/**
 * Батчер: папка с актами → отчёт + CSV + JSON.
 *
 * Использование:
 *   node server/scripts/parseActs.mjs ./acts --handler hybrid
 *   node server/scripts/parseActs.mjs ./acts --handler echo   # без модели, быстрая проверка
 *
 * Флаги:
 *   --handler text|vision|hybrid|echo   режим разбора (по умолчанию hybrid)
 *   --out <dir>                         куда складывать результаты
 *   --force                             переразобрать уже обработанные файлы
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildAct, mergeRows } from '../src/parser/actParser.js';
import { isServiceAvailable, parsePage } from '../src/parser/llmClient.js';
import { runOcr } from '../src/parser/ocr.js';
import { isProcessed, markProcessed } from '../src/parser/manifest.js';
import { SUMMARY_PROMPT, TABLE_PROMPT } from '../src/parser/prompts.js';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    handler: { type: 'string', default: 'hybrid' },
    out: { type: 'string', default: 'out' },
    force: { type: 'boolean', default: false },
  },
});

const srcDir = path.resolve(positionals[0] || '.');
const handler = values.handler;
const outDir = path.resolve(values.out);

async function listFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (/\.(pdf|docx|xlsx)$/i.test(entry.name)) out.push(path.join(dir, entry.name));
  }
  return out.sort();
}

/** Грубая эвристика: ищет «№ медицинской карты» и «Описание выявленных нарушений». */
function echoParse(text) {
  const rows = [];
  const re = /(?:№\s*)?медицинской\s+карты\s*[:№]?\s*([0-9\-\/]+)/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 800);
    const v = after.match(/Описание\s+выявленных\s+нарушений\s*:?\s*([^\n\r]{0,500})/i);
    rows.push({ cardNumber: m[1].trim(), violation: v ? v[1].trim() : null });
  }
  return { profile: null, rows };
}

async function handleFile(file, opts) {
  if (opts.handler === 'echo') return echoParse(await naiveText(file));
  if (opts.handler === 'text') {
    const text = await naiveText(file);
    return (await parsePage({ text, prompt: TABLE_PROMPT, mode: 'text' })) || { rows: [] };
  }
  // hybrid / vision: нужен рендер страницы в картинку (pdfjs + canvas)
  const pages = await renderPages(file);
  const results = [];
  for (const page of pages) {
    if (opts.handler === 'vision') {
      results.push((await parsePage({ image: page.base64, prompt: TABLE_PROMPT, mode: 'vision' })) || { rows: [] });
    } else {
      const ocr = await runOcr(page.pngPath);
      results.push((await parsePage({ text: ocr.text, prompt: TABLE_PROMPT, mode: 'text' })) || { rows: [] });
    }
  }
  return { pages: results };
}

/** Простейшее извлечение текста: DOCX/XLSX — как есть, PDF — текстовый слой через pdfjs. */
async function naiveText(file) {
  const ext = path.extname(file).toLowerCase();
  try {
    if (ext === '.docx') {
      const mammoth = await import('mammoth');
      const { value } = await mammoth.extractRawText({ path: file });
      return value;
    }
    if (ext === '.xlsx') {
      const XLSX = await import('xlsx');
      const wb = XLSX.readFile(file);
      return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n');
    }
    if (ext === '.pdf') {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const data = new Uint8Array(await fs.readFile(file));
      const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
        const p = await doc.getPage(i);
        const tc = await p.getTextContent();
        text += tc.items.map((it) => it.str).join(' ') + '\n';
      }
      return text;
    }
  } catch (e) {
    console.warn('[parseActs] не удалось извлечь текст:', e?.message);
  }
  return '';
}

/** Рендер страниц PDF в PNG (нужен для OCR и vision-режима). */
async function renderPages(file) {
  const out = [];
  if (path.extname(file).toLowerCase() !== '.pdf') return out;
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = await import('@napi-rs/canvas');
  const data = new Uint8Array(await fs.readFile(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const tmp = await fs.mkdtemp(path.join(process.cwd(), '.pages-'));
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const pngPath = path.join(tmp, `page-${String(i).padStart(4, '0')}.png`);
    await fs.writeFile(pngPath, canvas.toBuffer('image/png'));
    const base64 = (await fs.readFile(pngPath)).toString('base64');
    out.push({ page: i, pngPath, base64 });
  }
  return out;
}

function toCsv(act, file) {
  const head = ['file', 'cardNumber', 'dateStart', 'dateEnd', 'position', 'sum', 'violation', 'expert'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = act.cards.map((c) =>
    [file, c.cardNumber, c.dateStart, c.dateEnd, c.position, c.sum, c.violation, c.expert]
      .map(esc)
      .join(',')
  );
  return [head.join(','), ...rows].join('\n');
}

(async () => {
  const files = await listFiles(srcDir);
  if (!files.length) {
    console.log('Файлы не найдены в', srcDir);
    return;
  }
  await fs.mkdir(outDir, { recursive: true });

  if (handler !== 'echo' && !(await isServiceAvailable())) {
    console.warn('Локальный сервис модели недоступен (127.0.0.1:8848) — работаю в режиме echo.');
  }

  for (const file of files) {
    const name = path.basename(file);
    if (!values.force && (await isProcessed(srcDir, file))) {
      console.log('⏭  пропущен (уже обработан):', name);
      continue;
    }
    console.log('▶  ', name);
    try {
      const raw = await handleFile(file, { handler });
      const pages = raw.pages || [raw];
      const act = buildAct(pages.map((p) => ({ ...p, rows: mergeRows(p.rows) })));
      act.source = name;

      if (handler !== 'echo') {
        const summary = await parsePage({
          text: JSON.stringify(act.cards),
          prompt: SUMMARY_PROMPT,
          mode: 'text',
        });
        if (summary) act.summary = summary;
      }

      const base = path.join(outDir, path.basename(name, path.extname(name)));
      await fs.writeFile(base + '.json', JSON.stringify(act, null, 2), 'utf8');
      await fs.writeFile(base + '.csv', toCsv(act, name), 'utf8');
      await markProcessed(srcDir, file, { status: 'done', cards: act.cards.length, report: base + '.json' });
      console.log(`   карт: ${act.stats.total}, с нарушениями: ${act.stats.withViolation}`);
    } catch (e) {
      console.error('   ошибка:', e?.message);
      await markProcessed(srcDir, file, { status: 'error' });
    }
  }
  console.log('Готово. Результаты в', outDir);
})();
