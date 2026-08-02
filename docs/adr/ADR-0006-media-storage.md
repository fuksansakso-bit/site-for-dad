# ADR-0006: Локальное хранение и разделение media assets

## Метаданные

| Поле | Значение |
|---|---|
| Статус | Accepted — storage model; vendor and retention durations pending |
| Дата решения | 2026-08-02 |
| Решение принято | Владелец продукта в рамках поручения Phase 0B |
| Область | Supplier, brand, portfolio, client upload and AI media |
| Заменяет | — |

## Контекст

Партнёрское разрешение допускает использование согласованных AMIGO product/material/example assets и badge, но каждое использование требует provenance и asset-level publication control. Production hotlink запрещён. Локальное портфолио нельзя смешивать с supplier examples. Фотографии клиентов и AI-результаты являются приватными данными и не могут находиться в public bucket/CDN.

## Драйверы

- источник, права и публикация каждого актива;
- неизменяемый оригинал и воспроизводимые derivatives;
- public/private separation;
- отсутствие hotlink/runtime AMIGO dependency;
- delete/retention propagation;
- безопасная обработка uploads;
- смена storage vendor без изменения доменной модели.

## Рассмотренные варианты

### A. Hotlink AMIGO

Отклонён: внешний контроль доступности/изменений, слабая воспроизводимость и несоответствие production policy.

### B. Единый публичный bucket

Отклонён: неприемлем для client uploads, AI outputs, quarantine и unpublished assets.

### C. Управляемое локальное object storage с раздельными trust zones

Принят; конкретный vendor выбирается после evaluation.

## Решение

1. Каждый asset MUST иметь `MediaAsset` и при внешнем происхождении `SourceAsset` с source URL/ID, original metadata/hash, capture/verification, rights/publication state и связи с catalog entity.
2. Оригинал MUST быть immutable; optimized/card/thumbnail/fullscreen/AI-reference derivatives получают собственные hashes, profiles и parent relation.
3. Supplier media MUST импортироваться в собственное storage только разрешённым процессом; storefront не hotlink-ит source URL.
4. Logical zones MUST разделять: public approved assets; private client/AI assets; staging/quarantine; protected originals/admin-only evidence.
5. `PARTNER_LICENSE` на source level не заменяет asset-level mapping/validation; публичная доставка разрешена только при `PUBLICATION_APPROVED` и опубликованном связанном объекте.
6. `LOCAL_PORTFOLIO` MUST иметь доказательство авторства/разрешения и не может автоматически возникнуть из supplier image.
7. `CLIENT_UPLOAD` и `AI_GENERATED_RESULT` MUST быть private, доступны по короткоживущему авторизованному grant и исключены из публичного CDN/listing.
8. Upload pipeline MUST проверять size/type/signature/decode, normalize metadata/orientation, strip disallowed metadata, malware/polyglot risk и помещать подозрительное в quarantine.
9. Logs, analytics, errors и тестовые fixtures MUST NOT содержать object URL, image bytes или чувствительные metadata.
10. Delete/retention job MUST удалять derivatives, grants, provider copies и соответствующие indexes, сохраняя только разрешённый минимальный audit record.
11. Backup/restore MUST сохранять access class and deletion semantics; удалённые private objects не должны бессрочно восстанавливаться.
12. Storage vendor, region, encryption/key model, exact TTL, backup retention and delivery topology остаются `BLOCKED_BY_TBD`.

## Asset lifecycle

`DISCOVERED → CAPTURED → VALIDATING → QUARANTINED|RIGHTS_REVIEW → PROCESSING → READY_FOR_REVIEW → PUBLICATION_APPROVED → PUBLISHED → HIDDEN → ARCHIVED → DELETED`.

Private client lifecycle использует `UPLOADED_PRIVATE → PROCESSING_PRIVATE → AVAILABLE_PRIVATE → EXPIRED → DELETE_PENDING → DELETED`; он никогда не переходит в `PUBLISHED` без отдельного законного основания и явного согласия.

## Последствия

Положительные: storefront стабилен; privacy boundary ясна; provenance и права аудируемы; derivatives воспроизводимы; vendor заменяем.

Отрицательные: storage и processing дороже hotlink; нужны lifecycle jobs, quarantine, CDN invalidation, delete verification, backup policy и capacity monitoring.

## Риски и меры

| Риск | Мера |
|---|---|
| Public grant на private object | Separate zone/account, deny-by-default, automated access tests |
| Публикация без прав | Asset-level gate и approval audit |
| Malicious upload | Signature/decode scanning, quarantine, resource limits |
| Derivative устарел | Parent hash/profile version and regeneration |
| Delete оставляет копии | Manifest-driven propagation and verification job |
| Backup возвращает удалённое | Tombstone/deletion ledger and restore reconciliation |

## Откат и supersede

Storage migration MUST копировать по manifest с hash/access/rights verification, затем dual-read ограниченное время и controlled cutover. Старое хранилище удаляется только после проверенного rollback window и deletion plan. Смена vendor требует уточняющего ADR; public/private boundary отменять нельзя без privacy/security approval.

## Связанные документы и требования

- [ASSET_MEDIA_PIPELINE.md](../specs/04-technical/ASSET_MEDIA_PIPELINE.md)
- [STORAGE_MEDIA.md](../specs/04-technical/STORAGE_MEDIA.md)
- [ASSET_RIGHTS_REGISTER.md](../00-global/ASSET_RIGHTS_REGISTER.md)
- `ASSET-001`–`ASSET-018`, `NFR-PRIV-001`, `NFR-SEC-001`, `PARTNER-001`
- Open: `TBD-ASSET-001`–`008`, `TBD-PRIV-001`–`006`, `TBD-INFRA-002/004/007`

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Принята local object storage model с immutable originals, derivatives и public/private zones. |
