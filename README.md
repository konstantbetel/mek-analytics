# MEK Analytics

React + Node приложение для анализа дефектов по актам МЭК.

## Структура
- `server/` — Node.js (Express): модуль парсинга Excel (заглушка) и расписания, API `GET /api/data`
- `client/` — React (Vite): модуль отрисовки — отделения / год / месяц / врач / сводка / таблица

## Запуск

```bash
# 1. сервер
cd server
npm install
npm run dev      # http://localhost:4000

# 2. клиент (в отдельном терминале)
cd client
npm install
npm run dev      # http://localhost:5173
```

Клиент тянет данные с `/api/data` (проксируется в Vite на порт 4000).

## API
- `GET /api/health` — статус
- `GET /api/data` — объект DATA
- `GET /api/config` — текущий период парсинга (интервал в часах)
- `POST /api/config` — изменить период (часы), `{"intervalHours": 3}`

## Формат данных

```
Отделение -> Год -> Месяц -> Врач -> {
  CountError, CountNoError,
  DETAIL: [{ 'Номер талона', 'Код дефекта', 'Сумма', 'Акт МЭК', 'Дата', 'link', 'Примечание' }]
}
```
