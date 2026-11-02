/**
 * Сведение страниц одного акта в единый результат.
 *
 * На вход — результаты разбора отдельных страниц (rows из TABLE_PROMPT).
 * На выход — карточки акта: объединённые по номеру медицинской карты,
 * профиль, сводка по нарушениям.
 */

/**
 * @param {Array<object>} pageResults результаты по страницам
 * @returns {{profile: string|null, cards: Array<object>, stats: object}}
 */
export function buildAct(pageResults) {
  const byCard = new Map();
  let profile = null;

  for (const page of pageResults || []) {
    if (!page) continue;
    if (page.profile && !profile) profile = page.profile;

    for (const row of page.rows || []) {
      if (!row || !row.cardNumber) continue;
      const key = String(row.cardNumber).trim();
      const existing = byCard.get(key) || {
        cardNumber: key,
        dateStart: null,
        dateEnd: null,
        position: null,
        sum: null,
        violation: null,
        expert: null,
      };
      for (const field of ['dateStart', 'dateEnd', 'position', 'sum', 'violation', 'expert']) {
        if (!existing[field] && row[field]) existing[field] = row[field];
      }
      byCard.set(key, existing);
    }
  }

  const cards = [...byCard.values()];
  return {
    profile,
    cards,
    stats: buildStats(cards),
  };
}

export function buildStats(cards) {
  const total = cards.length;
  const withViolation = cards.filter((c) => c.violation).length;
  const withExpert = cards.filter((c) => c.expert).length;
  const sum = cards.reduce((acc, c) => {
    const n = Number(String(c.sum || '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? acc + n : acc;
  }, 0);
  return { total, withViolation, withExpert, sum: sum || null };
}

/** Усреднение строк по карте — помогает, если модель разбила карту на части. */
export function mergeRows(rows) {
  const out = [];
  for (const r of rows || []) {
    const last = out[out.length - 1];
    if (last && String(last.cardNumber) === String(r.cardNumber)) {
      for (const f of ['violation', 'expert', 'position', 'sum', 'dateStart', 'dateEnd']) {
        if (!last[f] && r[f]) last[f] = r[f];
      }
      continue;
    }
    out.push({ ...r });
  }
  return out;
}
