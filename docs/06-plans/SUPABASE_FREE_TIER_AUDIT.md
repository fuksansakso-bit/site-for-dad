# Supabase Free Tier audit — Phase 2A

Дата измерения: 2026-08-12. Это capacity-аудит, а не обещание доступности или коммерческого production.

## Фактическая исходная точка

| Показатель | Значение |
|---|---:|
| Старая PostgreSQL (`pg_database_size`) | 436 917 951 B (416.68 MiB) |
| Активные primary media до бизнес-фильтра | 438 897 117 B |
| Исключено по `OWNER-DECISION-022` | 9 category rows, 227 materials, 226 images, 175 137 385 B |
| Оставшийся source media | 1 371 images, 265 007 878 B |
| Оптимизированный WebP target | 1 371 objects, 91 215 814 B (86.99 MiB) |
| Target catalog | 19 categories, 1 428 materials |
| Transform JSON evidence | 3 018 999 B |
| Прежний `.next` baseline | 148 492 315 B, 81 route entries |
| Phase 2A production `.next` (без `cache`/`dev`) | 24 402 011 B, 467 files |
| Vercel Preview output | 48 lambda entries, 3 shared deployed functions, 2 676 300 unique function bytes |

Новая БД не переносит raw snapshots, jobs, sessions, diagnostics, AI/client-photo assets и development audit noise. Serialized target занимает 2.88 MiB; консервативный верхний прогноз PostgreSQL с индексами/служебным запасом — **до 30 MiB**, подтвердить после cloud import командой `select pg_database_size(current_database())`. Цель 350 MiB оставляет не менее 320 MiB запаса.

Storage target 86.99 MiB значительно ниже внутренней цели 800 MiB и оставляет 89% от 800 MiB. Исходники и Docker volumes в Supabase не загружаются. Средний оптимизированный объект — 66 532 B; сокращение к retained source — 65.6%.

## Нагрузка и egress

Planning assumption, пока нет production analytics: 5 000 визитов/мес., 8 страниц и 6 API-чтений на визит = около 40 000 page views и 240 000 data requests/мес. Каталожные изображения имеют `loading=lazy`; консервативный сценарий 24 реально просмотренных средних объекта на визит без cache hit даёт ≈ 7.44 GiB/мес., а при 70% CDN/browser cache hit origin egress ≈ 2.23 GiB/мес. Это прогноз, не измеренный трафик; после запуска нужны фактические Storage/egress метрики и платный план/CDN review при выходе за лимит.

## Вывод

Измеренные данные помещаются во внутренние цели Phase 2A с запасом. Supabase Free допустим для development/preview и первоначальной активации только после проверки фактических лимитов проекта, import size и egress. Vercel Hobby разрешён лишь для допустимого некоммерческого preview/testing; коммерческий production требует подходящего плана. Стандартный Next.js build сохраняет переносимость на другой Node-compatible hosting. Новый build уменьшил production artifact до 24 402 011 B; Vercel сгруппировал 48 route-output entries в 3 физические функции.
