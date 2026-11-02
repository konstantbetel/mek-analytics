/**
 * Учёт обработанных файлов: sha256 + статус.
 *
 * Нужен, чтобы батчер можно было гонять повторно и не обрабатывать
 * одни и те же акты дважды (на CPU это часы работы).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export const MANIFEST_NAME = 'manifest.json';

export async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function loadManifest(dir) {
  const p = path.join(dir, MANIFEST_NAME);
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveManifest(dir, manifest) {
  const p = path.join(dir, MANIFEST_NAME);
  await fs.writeFile(p, JSON.stringify(manifest, null, 2), 'utf8');
  return p;
}

/**
 * Помечает файл как обработанный.
 * @param {{sha?: string, status?: string, cards?: number, report?: string}} info
 */
export async function markProcessed(dir, filePath, info = {}) {
  const manifest = await loadManifest(dir);
  const sha = info.sha || (await sha256File(filePath));
  manifest[path.basename(filePath)] = {
    sha,
    status: info.status || 'done',
    cards: info.cards ?? null,
    report: info.report || null,
    updatedAt: new Date().toISOString(),
  };
  await saveManifest(dir, manifest);
  return manifest;
}

/** Возвращает true, если файл уже обработан и хэш совпадает. */
export async function isProcessed(dir, filePath) {
  const manifest = await loadManifest(dir);
  const rec = manifest[path.basename(filePath)];
  if (!rec || rec.status !== 'done') return false;
  try {
    const sha = await sha256File(filePath);
    return sha === rec.sha;
  } catch {
    return false;
  }
}
