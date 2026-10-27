import { updateConfig } from './config.js';

/**
 * Запускает задачу сразу и далее с периодом intervalHours.
 * Период можно менять на лету через updateConfig — таймер перезапускается.
 */
export function startScheduler(task, intervalHours) {
  let timer = null;

  const schedule = (hours) => {
    if (timer) clearInterval(timer);
    const ms = Math.max(1, hours) * 60 * 60 * 1000;
    timer = setInterval(async () => {
      try {
        await task();
        console.log(`[scheduler] парсер отработал, следующий запуск через ${hours} ч`);
      } catch (e) {
        console.error('[scheduler] ошибка парсинга:', e);
      }
    }, ms);
    console.log(`[scheduler] первый запуск сейчас, далее каждые ${hours} ч`);
  };

  schedule(intervalHours);

  // Перезапуск таймера при изменении периода
  const originalUpdate = updateConfig;
  return { reschedule: schedule, originalUpdate };
}
