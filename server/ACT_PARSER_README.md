# Локальный парсер актов МЭК

Разбор сканов актов МЭК (PDF/DOCX/XLSX) на своей машине, без облака.

## Как это работает

```
файл акта
  -> текстовый слой / OCR (Tesseract)
  -> локальная модель (Ollama, Qwen2.5) разбирает страницу в JSON
  -> actParser.js сводит страницы в карты
  -> отчёт: .json + .csv
```

## Почему так, а не "картинка в модель"

На слабом CPU (Kepler, 4 ядра) vision-режим даёт 3–8 минут на страницу.
Гибрид (OCR → текст → текстовая модель) — около 45 секунд на страницу.
Поэтому по умолчанию используется `--handler hybrid`.

## Режимы

| Флаг | Что делает | Время на страницу (CPU) |
|---|---|---|
| `--handler hybrid` | Tesseract -> текст -> Qwen2.5 3B | ~40-70 с |
| `--handler text` | только текстовый слой PDF -> модель | ~15-40 с |
| `--handler vision` | страница целиком в Qwen2.5-VL | 3-8 мин |
| `--handler echo` | без модели, эвристики по тексту | ~4 с |

## Установка (Windows)

```powershell
cd server\local-service
.\setup-windows.ps1
.\run.ps1 ollama-text
```

В отдельном окне:

```powershell
cd server
npm install
node scripts/parseActs.mjs C:\acts --handler hybrid --out C:\acts-out
```

## Зависимости Node

`pdfjs-dist` — разбор PDF, `@napi-rs/canvas` — рендер страниц в PNG,
`mammoth` — DOCX, `xlsx` — Excel.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `LLM_SERVICE_URL` | `http://127.0.0.1:8848` | адрес локального сервиса |
| `TESSERACT_BIN` | `tesseract` | путь к tesseract |
| `TESSERACT_LANG` | `rus+eng` | языки OCR |
| `OLLAMA_MODEL` | `qwen2.5:3b` | модель в Ollama |
| `MEK_BASE_URL` | `https://example.local/mek/acts` | база ссылок на акты |

## Известные ограничения

- 9 файлов из 10 в тестовой выборке — чистые сканы, текстового слоя нет.
- Смещение колонок таблицы (суммы и нарушения попадают в поле даты)
  лечится разбором структуры строки, а не сопоставлением по координатам.
- `pdfParser.js` в `src/parser` остаётся заглушкой: новая логика живёт
  в `scripts/parseActs.mjs` и `src/parser/actParser.js`.
