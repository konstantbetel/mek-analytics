import { generateMekLink } from '../parser/mekLink.js';

const MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];

const DEPARTMENTS = ['Отделение 1', 'Отделение 2', 'Отделение 3'];
const DOCTORS = ['Иванов И.И.', 'Петрова А.С.', 'Сидоров В.В.', 'Кузнецова М.П.'];
const ACT_TITLES = [
  'СОГАЗ Акт № 008116 ЭКМП   экс - 5',
  'СОГАЗ Акт № 008412 ЭКМП   экс - 5',
  'СОГАЗ Акт № 009733 ЭКМП   экс - 7',
];
const DEFECT_CODES = ['3.2.1', '1.4.7', '', '', '5.1.2', ''];

/** Детерминированный псевдослучайный генератор, чтобы данные не «прыгали». */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildStubData() {
  const rnd = mulberry32(20260101);
  const now = new Date();
  const years = [now.getFullYear() - 1, now.getFullYear()];

  const DATA = {};

  for (const dep of DEPARTMENTS) {
    DATA[dep] = {};
    for (const year of years) {
      DATA[dep][year] = {};
      for (const month of MONTHS) {
        DATA[dep][year][month] = {};
        for (const doctor of DOCTORS) {
          const total = 4 + Math.floor(rnd() * 8);
          const detail = [];
          let countError = 0;

          for (let i = 0; i < total; i++) {
            const code = DEFECT_CODES[Math.floor(rnd() * DEFECT_CODES.length)];
            if (code) countError++;
            const actTitle = ACT_TITLES[Math.floor(rnd() * ACT_TITLES.length)];
            const day = 1 + Math.floor(rnd() * 27);
            detail.push({
              'Номер талона': String(i + 1),
              'Код дефекта': code,
              'Сумма': Math.round((200 + rnd() * 4000) * 100) / 100,
              'Акт МЭК': actTitle,
              'Дата': `${year}-${String(MONTHS.indexOf(month) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
              'link': generateMekLink(actTitle),
              'Примечание': code ? 'Выявлено нарушение при экспертизе.' : '',
            });
          }

          DATA[dep][year][month][doctor] = {
            CountError: countError,
            CountNoError: total - countError,
            DETAIL: detail,
          };
        }
      }
    }
  }

  return DATA;
}
