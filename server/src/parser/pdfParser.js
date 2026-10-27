/**
 * Заглушка парсера PDF/Word актов МЭК.
 *
 * Задача: по ссылке на акт открыть документ, найти запись по полю
 * «№ медицинской карты» и взять значение поля «Описание выявленных нарушений».
 * Если файл не найден — вернуть пустую строку.
 *
 * TODO: подключить парсер (например, `pdf-parse` для PDF и `mammoth` для DOCX).
 */

export async function extractViolationNote({ link, medicalCardNumber }) {
  if (!link || !medicalCardNumber) return '';
  try {
    // const buffer = await download(link);
    // const text = await parsePdf(buffer);
    // return findByCardNumber(text, medicalCardNumber);
    return '';
  } catch (e) {
    console.warn('[pdfParser] не удалось разобрать документ:', e?.message);
    return '';
  }
}

/** Ищет в распознанном тексте поле «Описание выявленных нарушений» для карты. */
export function findByCardNumber(text, medicalCardNumber) {
  if (!text) return '';
  const idx = text.indexOf(String(medicalCardNumber));
  if (idx === -1) return '';
  const after = text.slice(idx);
  const m = after.match(/Описание\s+выявленных\s+нарушений\s*:?\s*([^\n\r]{0,500})/i);
  return m ? m[1].trim() : '';
}
