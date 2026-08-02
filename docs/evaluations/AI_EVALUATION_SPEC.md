# AI and CV evaluation specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Evaluation plan — no provider/model selected; execution `BLOCKED_BY_TBD-AI-*` and rights-cleared benchmark |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Product contract | [AI_WINDOW_VISUALIZER_SPEC.md](../specs/02-domain/AI_WINDOW_VISUALIZER_SPEC.md) |
| Technical pipeline | [AI_PIPELINE.md](../specs/04-technical/AI_PIPELINE.md) |

## 1. Decision to support

Evaluation decides whether each pipeline stage should use deterministic algorithms, local/self-hosted CV, an external provider, a hybrid, or remain manual/unsupported. It evaluates quality, calibration/failure detection, privacy/legal/security, regional availability, latency/capacity/cost, operational burden, accessibility and exit/lock-in.

It does not select a vendor from marketing claims, use production client/AMIGO images as a dataset, invent quality thresholds or treat visual attractiveness as product identity accuracy.

## 2. Нормативные evaluation requirements

- **AIEVAL-001 — MUST:** benchmark data has documented creator/source/rightsholder, permitted evaluation use, consent/basis where applicable, retention/delete and no production-client default.
- **AIEVAL-002 — MUST:** dataset represents target room/window/device/network conditions and product families with explicit gap analysis.
- **AIEVAL-003 — MUST:** train/development/tuning and held-out evaluation sets are separated; hidden test prevents threshold overfitting.
- **AIEVAL-004 — MUST:** ground truth annotation protocol, reviewer expertise, disagreement resolution and quality checks are documented.
- **AIEVAL-005 — MUST:** every model/provider/config version runs the same frozen cases/metrics unless a documented compatibility reason exists.
- **AIEVAL-006 — MUST:** detection/segmentation/geometry/material/protected-region/refinement are evaluated separately and end-to-end.
- **AIEVAL-007 — MUST:** failures/abstentions/confidence calibration and user correction effort count alongside successful-image quality.
- **AIEVAL-008 — MUST:** exact selected material/SKU identity and geometry/protected regions are hard gates; subjective realism cannot compensate.
- **AIEVAL-009 — MUST:** metrics/thresholds/weights are approved before final provider decision and preserve per-cohort results, not only aggregate average.
- **AIEVAL-010 — MUST:** privacy/security review verifies training/retention, region/subprocessors, deletion, encryption, auth/egress/callback, incident and contract evidence.
- **AIEVAL-011 — MUST:** performance/cost tests cover target regional networks/devices, queue/load/throttle/outage and cost per successful usable result.
- **AIEVAL-012 — MUST:** provider failure/disable/deletion returns deterministic base/manual/standard preview and never blocks core funnel.
- **AIEVAL-013 — MUST:** accessibility/usability evaluation includes photo guidance, candidate selection, point/mask correction, progress/error and before/base/refined comparison.
- **AIEVAL-014 — MUST:** no benchmark artifact, prompt, output or provider response enters public repo/log/analytics without rights/privacy approval.
- **AIEVAL-015 — MUST:** recommendation includes rejected alternatives, risks, assumptions, exit/rollback, re-evaluation triggers and named approvers.
- **AIEVAL-016 — MUST:** provider/model change cannot roll out solely on improved average score if privacy/security/material/geometry hard gate regresses.

## 3. Candidate architecture classes

| Class | Description | Main trade-offs |
|---|---|---|
| Manual geometry + deterministic renderer | User sets window; no CV/refinement | Strong control/privacy; higher effort |
| Local/self-hosted CV + deterministic renderer | Own detector/segmenter, exact renderer | Data/MLOps/compute burden; control/exit |
| External CV + deterministic renderer | Provider candidates/masks, own base | Privacy/availability/cost; faster capability |
| Hybrid CV cascade | Cheap/local first, provider/manual fallback | Complexity/calibration but resilient |
| Base + external generative refinement | Own geometry/product identity, optional blend | Realism vs drift/privacy/provider dependency |
| Base-only MVP | No generative provider | Lower risk/cost; may be sufficient if quality accepted |

Each stage can choose a different class; one vendor is not required for all. Provider/product names and current capabilities are researched only at execution time using primary contractual/technical sources.

## 4. Benchmark cohort design

Required cohort dimensions:

- window count: none, one, multiple; sash count/types;
- geometry: frontal, mild/strong perspective, partial crop, roof/irregular where target;
- scene: bright/dark/backlit/glare/reflection, plain/cluttered;
- occlusions: handles, frame, curtains, plants/furniture, screens/bars;
- photo: orientation, aspect, resolution, compression, blur/noise/device diversity;
- product family: roller, Zebra and later each family only when renderer profile ready;
- material: light/dark, solid/pattern/fine stripe, transparent/reflective/texture;
- hardware/control colors/sides/position;
- multiple demographics/ability contexts for correction UX without storing unnecessary personal attributes;
- regional device/network/latency and language/instruction comprehension.

Rare/high-risk cases are weighted/stratified explicitly; aggregate prevalence should reflect target use once researched. Unsupported families stay separate, not hidden in average.

## 5. Ground truth and annotation

Annotations: oriented image dimensions, window/sash polygons/corners, frame/handle/foreground/protected masks, target product plane/instances, product/material ID, allowed refinement mask and reviewer notes. At least a defined subset receives dual annotation/adjudication. Annotation tools/process must preserve private/rights constraints and record version.

Physical measurement is not inferred unless separate ground truth exists; geometry score measures overlay alignment, not real millimetres. Synthetic/composited scenes MAY augment edge cases but cannot be the only benchmark.

## 6. Metrics by stage

| Stage | Candidate metrics / evidence | Hard failure examples |
|---|---|---|
| Input quality | Valid/reject correctness, guidance usefulness | Unsafe accepted, good input falsely blocked at harmful rate |
| Detection | Candidate recall/precision, localization, calibration, no-window handling | Wrong window confidently auto-selected |
| Sash/segmentation | Region overlap/boundary, instance count, handle/frame masks | Frame/handle overwritten |
| Geometry/editor | Corner/edge error, transform validity, user correction time/actions/success | Self-intersection, impossible/uncorrectable geometry |
| Base renderer | Perspective/scale/occlusion, repeat/stripe/slat behavior, determinism | Wrong family/material/SKU |
| Material fidelity | Color/pattern/texture/identity similarity plus expert review | Material substitution/phase distortion beyond tolerance |
| Refinement | Protected-region change, allowed-mask artifacts, identity, realism pairwise rubric | Room/product/geometry change, new object/text/logo |
| End-to-end | Usable result, failure detection, correction/drop-off, user confidence | Forced plausible but wrong output |
| Operations | Queue/stage/provider latency, errors/throttle, compute/cost, deletion | No delete/region/training guarantee |

Metric selection/thresholds are `TBD-AI-001/002/008/009`; this plan prevents arbitrary values.

## 7. Human review rubric

Blinded reviewers assess 1) correct target/window/sashes; 2) geometry/perspective; 3) frame/handle/occlusion preservation; 4) exact product family/hardware; 5) material/pattern/color identity; 6) artifacts/blending; 7) misleading physical implication; 8) base vs refined preference; 9) accept/correct/reject and reason. Experts review technical identity; target users review usability/expectation. Inter-rater agreement/disagreement is reported.

Review UI randomizes options and hides provider; no production customer image appears unless separately authorized. Reviewers have confidentiality/access/deletion rules.

## 8. Privacy, security and legal scorecard

Evidence per candidate:

- data flow/region/subprocessors and contractual controller/processor roles;
- input/output/prompt/log/metadata retention and provider training/default opt-out proof;
- deletion API/process/timeline/evidence and backup handling;
- encryption, access/auth/service accounts, network/egress, audit and incident terms;
- content/source license compatibility including AMIGO assets;
- model/service safety limitations and prohibited use;
- data portability/export/version pinning/exit and service discontinuation;
- vulnerability/compliance evidence relevant to legal review, without equating certificate to full safety.

Missing critical evidence is a blocker, not a low weighted score.

## 9. Availability, performance and cost protocol

Measure from approved target networks/hosting region: request/upload/queue/stage/end-to-end percentiles, error/throttle/timeout, concurrency limits, cold start, outage/circuit recovery and delete/cancel. Cost model includes compute/request/image/egress/storage/queue/retry/support, failed/corrected vs usable result and forecast volumes from `TBD-INFRA-003`.

No numeric target until `TBD-INFRA-002/003/005` closes. Compare base-only and refinement-on-demand to avoid making optional cost critical.

## 10. Experiment procedure

1. Approve scope/families/benchmark rights/annotations and frozen version.
2. Approve metrics/hard gates/weights/thresholds before hidden test.
3. Configure candidates with documented versions and equivalent input policies.
4. Run deterministic stages and provider tests in isolated environment; collect safe metrics/artifacts.
5. Conduct blinded expert/user review and accessibility tasks.
6. Inject throttle/outage/cancel/delete/late callback and security/privacy checks.
7. Calculate per-cohort/aggregate uncertainty, cost and operational scores.
8. Review hard failures, risks, contract evidence and fallback.
9. Recommend architecture/class/provider or base/manual deferral; record ADR.
10. Retain/delete benchmark artifacts according to rights/policy and version report.

## 11. Decision matrix template

| Dimension | Weight/threshold | Candidate A | B | C | Evidence/gap |
|---|---|---:|---:|---:|---|
| Detection/calibration | TBD | — | — | — | Benchmark report |
| Segmentation/geometry | TBD hard gate | — | — | — | Per-cohort |
| Material/protected identity | TBD hard gate | — | — | — | Automated + expert |
| End-to-end usable/correction | TBD | — | — | — | User study |
| Privacy/legal/security | Pass/fail + TBD | — | — | — | Contract/review |
| Regional availability/performance | TBD | — | — | — | Measurements |
| Cost/capacity | TBD | — | — | — | Volume model |
| Operations/observability/delete | TBD | — | — | — | Fault/drill |
| Accessibility/UX | Pass/fail + TBD | — | — | — | Task run |
| Lock-in/exit | TBD | — | — | — | Adapter/export/rollback |

Blank cells mean not evaluated, not zero. No overall score can override failed hard gate.

## 12. Continuous evaluation and rollout

After implementation authorization, every model/provider/profile/prompt/threshold change runs regression benchmark and privacy/security diff. Rollout is disabled→staging→rights-cleared shadow/canary where allowed→limited production with kill switch→expand. Production quality feedback uses user-reported issue/reason and version, not automatic retention of photo. Drift triggers disable/refallback/re-evaluation.

## 13. Acceptance, risks and open questions

Evaluation completion requires rights-cleared representative benchmark, approved metrics/thresholds, identical candidate runs, per-cohort/hard-gate results, provider contract/security/privacy evidence, regional performance/cost/fault tests, accessibility/user review and documented recommendation/ADR/fallback/exit.

Open: `TBD-AI-001`–`009`, `TBD-PRIV-003/005`, `TBD-INFRA-002`–`005`, complex family scope and benchmark reviewers. Risks: biased/synthetic benchmark, rights gap, threshold tuned to test, average hides rare failure, subjective realism hides SKU drift, provider marketing substituted for contract and cost without target volume.

## 14. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined provider-neutral dataset, metrics, hard gates, human/privacy/performance evaluation and decision/rollout process. |
