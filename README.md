# Дневник PWA

Мобильное PWA-приложение для записей, проектов и списков. Поддерживает разделы и подразделы, архив каждой коллекции, свайпы, сортировку жестами, светлую/тёмную тему и регистрацию через Supabase.

## Запуск

Требуется Node.js 22+ и pnpm.

```bash
pnpm install
pnpm run dev
```

Перед запуском создайте `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Схема профилей и проверка уникальности никнеймов находятся в [`supabase/schema.sql`](supabase/schema.sql).

## Проверка сборки

```bash
pnpm run lint
pnpm run build
pnpm run build:pages
```

`build:pages` создаёт статический PWA в `dist-pages`. Workflow `.github/workflows/pages.yml` публикует его в GitHub Pages после push в `main`.
