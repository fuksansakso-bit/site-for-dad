# Phase 2A data migration report

Источник защищён dump/checksums в ignored `.local/phase-2a-migration/source`; исходная БД и object storage не удалялись.

| Срез           |     Source | Target |                     Не перенесено |
| -------------- | ---------: | -----: | --------------------------------: |
| Category rows  |         28 |     19 |                  9 owner-excluded |
| Materials      |      1 655 |  1 428 |                227 owner-excluded |
| Primary images |      1 597 |  1 371 |                226 owner-excluded |
| Valid orders   | 12 checked |      0 | 12 synthetic/development requests |
| Portfolio      |          0 |      0 |                                 0 |
| Site settings  |          1 |      1 |                                 0 |

Исключены по `OWNER-DECISION-022`: ZIP systems, shutters, curtains, pleated/гофре and motorized curtains через checksum-bound stable source IDs; runtime name matching не используется. Все 1 428 retained materials имеют primary media; 57 повторных ссылок дедуплицированы до 1 371 WebP objects. Source bytes 265 007 878 → optimized 91 215 814. Transform повторён без изменения manifest; cloud import/repeat no-op ещё не выполнялся из-за отсутствия credentials. Команды и порядок приведены в `SUPABASE_SETUP.md`; `migration:verify` сравнивает counts/articles/prices/availability/media and repeat identity.
