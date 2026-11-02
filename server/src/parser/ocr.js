/**
 * OCR-обёртка над Tesseract.
 *
 * Используется в гибридном режиме: Tesseract даёт слова с координатами,
 * модель уже разбирает готовый текст. На CPU это в разы быстрее,
 * чем скан страницы моделью целиком.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

export const TESSERACT_BIN = process.env.TESSERACT_BIN || 'tesseract';
export const TESSERACT_LANG = process.env.TESSERACT_LANG || 'rus+eng';

/**
 * @param {string} imagePath путь к PNG/JPG страницы
 * @returns {Promise<{text: string, words: Array<{text:string,x:number,y:number,w:number,h:number}>}>}
 */
export async function runOcr(imagePath) {
  const outBase = path.join(
    path.dirname(imagePath),
    `.ocr-${path.basename(imagePath, path.extname(imagePath))}`
  );

  const args = [imagePath, outBase, '-l', TESSERACT_LANG, 'tsv'];
  await execFileAsync(TESSERACT_BIN, args, { timeout: 120000 });

  const { stdout } = await execFileAsync('cat', [outBase + '.tsv'], {
    maxBuffer: 64 * 1024 * 1024,
  });

  const words = parseTsv(stdout);
  const text = words.map((w) => w.text).join(' ');
  return { text, words };
}

/** Разбирает TSV-вывод Tesseract в список слов с координатами. */
export function parseTsv(tsv) {
  const lines = String(tsv || '').split('\n');
  const out = [];
  for (const line of lines.slice(1)) {
    const c = line.split('\t');
    if (c.length < 12) continue;
    const text = (c[11] || '').trim();
    if (!text) continue;
    const level = Number(c[0]);
    if (level !== 5) continue; // только слова
    out.push({
      text,
      x: Number(c[6]),
      y: Number(c[7]),
      w: Number(c[8]),
      h: Number(c[9]),
    });
  }
  return out;
}
