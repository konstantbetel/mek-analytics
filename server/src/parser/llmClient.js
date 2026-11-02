/**
 * Клиент локального сервиса с моделью.
 *
 * Локальный сервис (server/local-service/service.py) поднимает Ollama
 * и отдаёт два эндпоинта:
 *   GET  /health  — доступна ли модель
 *   POST /parse   — разбор страницы; body: { text } или { image } + { mode }
 *
 * Режимы:
 *   'vision' — на сервис уходит base64-изображение страницы;
 *   'text'   — на сервис уходит только распознанный текст (быстрый путь).
 */

export const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://127.0.0.1:8848';

export async function isServiceAvailable(timeoutMs = 3000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${LLM_SERVICE_URL}/health`, { signal: ctrl.signal });
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data && data.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{text?: string, image?: string, mode?: 'text'|'vision', prompt?: string}} payload
 * @returns {Promise<object|null>} разобранный JSON или null
 */
export async function parsePage(payload) {
  const body = {
    mode: payload.mode || (payload.image ? 'vision' : 'text'),
    prompt: payload.prompt,
  };
  if (payload.text) body.text = payload.text;
  if (payload.image) body.image = payload.image;

  let res;
  try {
    res = await fetch(`${LLM_SERVICE_URL}/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.warn('[llmClient] сервис недоступен:', e?.message);
    return null;
  }

  if (!res.ok) {
    console.warn('[llmClient] HTTP', res.status);
    return null;
  }
  const data = await res.json();
  return data && typeof data === 'object' ? data.result ?? data : null;
}

/** Достаёт JSON из ответа модели: модель любит оборачивать его в ```json ... ``` */
export function extractJson(text) {
  if (!text) return null;
  const fenced = String(text).match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : String(text);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}
