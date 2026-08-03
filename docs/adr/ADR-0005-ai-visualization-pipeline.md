# ADR-0005: Geometry-first AI visualization pipeline

## Метаданные

| Поле | Значение |
|---|---|
| Статус | Accepted — pipeline boundary; provider/model/thresholds pending evaluation |
| Дата решения | 2026-08-02 |
| Решение принято | Владелец продукта в рамках поручения Phase 0B |
| Область | Client-window visualization and optional refinement |
| Заменяет | — |

## Контекст

Ключевое преимущество PROJECT_NAME — примерка конкретного изделия на фотографии окна клиента. Фотография приватна, а результат должен сохранять комнату, окно, створки, ручки, мебель, перекрывающие предметы и идентичность выбранного материала. Недоступность AI не должна блокировать каталог, расчёт или базовый geometric result. Провайдер, модель, dataset, пороги и retention ещё не утверждены.

## Драйверы

- сохранение product identity и protected regions;
- измеримый, исправляемый geometry-first процесс;
- пользовательский контроль точки/маски;
- privacy-by-design и минимизация передачи;
- детерминированный базовый fallback;
- отключаемая генеративная стадия;
- versioned evaluation и reproducibility.

## Рассмотренные варианты

### A. End-to-end генерация по текстовому prompt

Отклонён: высокий риск изменения комнаты, окна и SKU; слабая объяснимость и повторяемость.

### B. Только ручной compositing

Сохраняется как fallback, но не единственный целевой путь: создаёт слишком большую нагрузку на пользователя/менеджера.

### C. Geometry-first base с optional constrained refinement

Принят.

## Решение

1. Pipeline MUST создавать и хранить отдельно `GEOMETRIC_PREVIEW` и опциональный `AI_REFINED_PREVIEW`.
2. Сначала выполняются ориентация/валидация, detection proposal, user-confirmed point/mask, segmentation/geometry и deterministic compositing; refinement запускается только после валидного base.
3. Пользователь MUST иметь возможность исправить окно/маску или продолжить manual/base path при низкой confidence.
4. Protected-region mask MUST включать всё, что нельзя менять; refinement output проверяется на geometry, protected regions, material/color/pattern/SKU identity.
5. Failure hard gate MUST отклонять refined output и возвращать base без маскировки причины.
6. Provider adapter MUST быть заменяемым; input/output хранит provider/model/profile/prompt-policy/threshold/version metadata, но secrets и raw response не раскрываются клиенту.
7. Внешнему обработчику передаётся только минимально необходимая derivative и metadata после утверждённых privacy/security/contract controls.
8. Client uploads и outputs MUST быть private, краткоживущими и удаляемыми; URL/изображения/чувствительные metadata запрещены в logs/analytics.
9. Production photos MUST NOT использоваться для training/evaluation/demo без отдельного основания и explicit permission.
10. Каталог, конфигуратор, цена, корзина, заявка и standard preview MUST работать при полном отключении AI.
11. Provider/model/threshold/region/cost decision MUST основываться на [AI_EVALUATION_SPEC.md](../evaluations/AI_EVALUATION_SPEC.md) и оформляться новым/уточняющим ADR.
12. До закрытия `TBD-AI-*`, privacy/retention и benchmark реализация внешнего AI остаётся `BLOCKED_BY_TBD`.

## Состояния

`CREATED → UPLOAD_VALIDATED → GEOMETRY_PROPOSED → USER_REVIEW → BASE_RENDERED → REFINEMENT_QUEUED → REFINING → VALIDATING → COMPLETED`.

Альтернативы: `MANUAL_INPUT_REQUIRED`, `BASE_ONLY`, `REJECTED_UNSAFE`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `EXPIRED`, `DELETED`. `COMPLETED` не означает автоматически опубликованный или бессрочно сохранённый результат.

## Последствия

Положительные: AI не становится точкой отказа; hard gates защищают SKU и помещение; этапы отдельно оцениваются; сохраняется путь manual correction.

Отрицательные: pipeline сложнее одного prompt; нужны geometry UI, benchmark, job orchestration, quality checks и delete propagation; refined result может часто отклоняться до калибровки.

## Риски и меры

| Риск | Мера |
|---|---|
| Hallucination/изменение комнаты | Protected mask, similarity checks, human/user review, reject to base |
| Низкая confidence окна | Manual point/mask, abstention, no silent placement |
| Утечка личного фото | Private storage, scoped access, egress allowlist, deletion verification |
| Provider training/retention | Contract evidence and disabled training; fail closed |
| SKU drift выглядит реалистично | Material identity hard gate and source-reference comparison |
| Недоступность/стоимость | Queue controls, kill switch, base-only fallback |

## Откат и supersede

Kill switch отключает refinement, сохраняя base path. Provider adapter заменяется после regression/privacy review. Если geometry-first approach не проходит benchmark, pipeline возвращается к manual/base; end-to-end генерация не включается без нового ADR и hard-gate evidence.

## Связанные документы и требования

- [AI_WINDOW_VISUALIZER_SPEC.md](../specs/02-domain/AI_WINDOW_VISUALIZER_SPEC.md)
- [AI_PIPELINE.md](../specs/04-technical/AI_PIPELINE.md)
- [SECURITY_PRIVACY.md](../specs/04-technical/SECURITY_PRIVACY.md)
- [AI_EVALUATION_SPEC.md](../evaluations/AI_EVALUATION_SPEC.md)
- `FR-AI-VIS-001`, `FR-VIS-001`–`022`, `NFR-PRIV-001`, `NFR-SEC-001`
- Open: `TBD-AI-001`–`009`, `TBD-PRIV-003/005`, `TBD-INFRA-002`–`005`

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Принята geometry-first base + optional constrained refinement architecture. |
