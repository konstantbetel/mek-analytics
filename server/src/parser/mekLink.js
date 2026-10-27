/**
 * Генерация ссылки на акт МЭК по его названию.
 *
 * Название вида: 'СОГАЗ Акт № 008116 ЭКМП   экс - 5'
 * Номер файла берётся из номера акта (008116).
 */

export const MEK_BASE_URL =
  process.env.MEK_BASE_URL || 'https://example.local/mek/acts';

export function extractActNumber(actTitle) {
  if (!actTitle) return null;
  const m = String(actTitle).match(/№\s*([0-9]+)/);
  return m ? m[1] : null;
}

/**
 * @param {string} actTitle — название акта МЭК
 * @returns {string} ссылка на PDF (пустая строка, если номер не найден)
 */
export function generateMekLink(actTitle) {
  const num = extractActNumber(actTitle);
  if (!num) return '';
  return `${MEK_BASE_URL}/${num}.pdf`;
}
