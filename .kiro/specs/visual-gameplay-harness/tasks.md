# Dynamic visual gameplay harness — implementation tasks

Status update (2026-10-14): an exploratory implementation now exists in `scripts/qa-evaluate.mjs` and `scripts/qa/`, with usage, live-run evidence summary and limitations in `qa/`. Local browser, Ollama screenshot observation and AWS AgentCore paths have been exercised. The original checkboxes below remain acceptance gates: partial implementation does not certify full calibration or complete rule coverage.

Execution order: P0 → P1 → P2/P3 → P4 → P5 → P6 → P7 → P8. Contracts and the independent oracle can be developed in parallel after P1, but live scoring must wait for calibration. Keep each milestone reviewable with focused commits, tests, and evidence; never rewrite a measured game branch or its experiment history to add evaluator code.

## P0 — Establish the baseline and resolve deployment inputs

- [ ] Install the main-branch locked dependencies in an isolated evaluator checkout; run the existing QA and GIF helper tests. Record current behavior and failures before refactoring. Existing discovery found 11 agent and 3 GIF tests; neither is a gameplay validation suite.
- [ ] Freeze the original README rule/deck contract and hash; record all ambiguities A01–A07 from rule-catalog.md. Manually verify 13 categories, 73 items, 86 total, and all original spellings.
- [ ] Choose the fixed evaluator VLM/provider/model/version/settings, schemas, budget, and artifact retention. Use the same evaluator for Opus/Sonnet and methodology branches; do not make the evaluator model depend on the app generator.
- [ ] Identify reachable immutable app previews and the build-receipt mechanism. Treat the six new prompt-only branch tips as not ready until game implementations exist.
- [ ] Perform read-only AWS identity/service/quota preflight on the execution host using `opensearchprod` and region `us-east-1`. Confirm approved runner role, browser resource, recording bucket/prefix, and VLM credentials independently. Provisioning/session launches are implementation operations, not part of this planning commit.
- [ ] Spike the pinned AWS SDK/CDP connection and select Node integration or the small documented Python BrowserClient bridge; document session ownership, signing, refresh, touch capability, and cleanup. Do not implement two session owners.

Gate: baseline results, frozen contract, capability matrix, explicit preflight inputs, and a reviewed backend choice. Missing cloud access does not prevent local fixture development; cloud validation remains incomplete until performed.

## P1 — Versioned contracts, strict parsing, and reliable journals

- [ ] Introduce schemas for target/build receipts, observed facts/unknowns, actions, rule decisions, transition verdicts, events, findings, five primary outcomes, and summaries. Explicitly separate planner win claims from adjudicated results.
- [ ] Replace coercion/substring authority: reject nonboolean `is_win`, accept only exact phase enums, and preserve null score/counters. Values such as `drawing`, `incomplete`, `not_won`, `"false"`, absent fields, NaN, negatives, and impossible counts cannot create wins or observations.
- [ ] Reject out-of-range or malformed coordinates/bboxes with clear diagnostics. Convert explicit bbox forms consistently; never clamp a wrong click into a valid UI control.
- [ ] Create UUID run IDs, atomic report checkpoints, append-only step events, and artifact hashes before resource acquisition. Save complete raw and normalized observations/candidates with sensitive headers removed.
- [ ] Persist startup, model, navigation, action, timeout, cancellation, and cleanup errors independently. Report generation must survive failed browser close, policy writes, GIF encoding, or upload.
- [ ] Add validated run/action/model-call/retry/token/cost caps; implement a truly execution-free `--validate-only` path. Existing `--dry-run` is not an offline validator.

Tests: malformed/adversarial model fixtures; unknown versus zero; exact enums; bbox/coordinate transformations; concurrent ID uniqueness; journal interruption/recovery; injected cleanup/report exceptions; no browser/model/network call under validate-only.

Gate: strict schema tests pass; no false win from any adversarial parsing fixture; every pre-start failure has a recoverable run record.

## P2 — Browser abstraction, observations, and input delivery

- [ ] Extract browser lifecycle from `qa-agent.mjs` into local and AgentCore providers with the shared design contract. Preserve existing exploratory command compatibility.
- [ ] Implement fresh context/session and storage policy per slot. Instrument URL/build identity, viewport/DPR/touch, console errors, page errors, failed requests, and browser disconnection.
- [ ] Implement explicit mouse drag, touch drag, pointer/touch tap-to-move, scroll, wait, and optional keyboard actions. Verify actual event types in fixture receivers; do not certify touch through mouse events.
- [ ] Select exposed source hit areas for overlapping cards, account for scrolling, and capture selection/pickup/release evidence. Record bounded retries and restore/re-observe after uncertain state changes.
- [ ] Decode images and implement stable-frame/region comparison with a maximum wait. Handle continuous harmless animation, hover/focus changes, loading UI, and transient score/glitter effects.
- [ ] Keep original screenshots, gesture frames/video, and runtime events. Reuse GIF utilities as preview tooling, pin fault/terminal frames, and preserve actual timestamps outside the GIF.
- [ ] Implement AgentCore start/connect/stop ownership, signed headers, a persisted idempotency client token before start, reconciliation after a lost start response, session ID persistence, cancellation, budget timeout, recording retrieval and bounded cleanup retry. Build a narrowly scoped owned-session watchdog before scheduled cloud runs.
- [ ] Add capability reporting for unsupported touch/audio/video/browser modes. Localhost URLs and unreachable private URLs, or private routes without validated network configuration, fail clearly before allocation; an approved and validated private-network provider configuration remains supported.

Tests: create minimal gesture-receiver browser fixtures in P2 and run the same observable-action contract against them locally and on the remote backend; scrolling/DPR/occlusion; selection miss versus rejection; true touch event traces; networkidle never reached; launch/auth/signing expiry; start-success/response-lost idempotent retries and reconciliation; cleanup after a crashed runner; audio capability unavailable.

Gate: all required input profiles work on the P2 gesture-receiver fixtures with evidence (full game calibration remains in P6); no leaked owned session after failure/cancel tests; unsupported modes never count as passes.

## P3 — External rule engine and observed-card ledger

- [ ] Implement the public deck/rules manifest independently of generated app code. Track observed entities, category membership, hidden/unknown cards, source/draft order learned through draws, foundations, completion events, and score.
- [ ] Implement LEGAL/ILLEGAL/UNKNOWN preconditions and allowed partial transitions for R01–R22. Mark R90/nonvisual requirements separately.
- [ ] Preserve uncertainty and contradictory observations. Do not fill a card's hidden identity from fixture truth, DOM state, assumed conservation, or what the rule engine wanted the app to do.
- [ ] Detect illegal acceptance, legal blocking, wrong transition, loss/duplication supported by evidence, reveal failure, recycle-order failure, wrong foundation counts, early clearing, repeated scoring, and premature/missing victory.
- [ ] Require independent completion/card ledger plus stable terminal evidence for VALID_OBSERVED_WIN. Implement the exact five-way precedence and assistance rules from rule-catalog.md.
- [ ] Implement PASS/FAIL/UNKNOWN/NOT_EXERCISED/NOT_OBSERVABLE coverage, opportunity counts, confirmed versus suspected attribution, defect grouping, and reviewer adjudication records.

Tests: hand-authored transition examples for each legal/illegal case; unknown-card property cases; face-up/order/conservation invariants; title/item asymmetry; full/subset sequence ambiguity; variable category counts; score-once; false/premature/absent win; source implementation checks remain unobserved.

Gate: independently reviewed expected answers; no imports from app variants; every original requirement maps to an explicit test or observation limitation.

## P4 — Fixed visual player and isolated adversarial probes

- [ ] Separate visual perception from planning and rule adjudication. Use structured screenshot-derived entities with field confidence and provenance.
- [ ] Enumerate visible candidate actions, validate them externally, prioritize legal completion/reveal progress, and track revealed draft cards and repeat states. Bind model confidence to observation tasks, not rule truth.
- [ ] Add bounded recovery: another crop/frame, re-localization, alternate legal candidates, fresh gesture attempt when state is known unchanged. Model/schema errors stop with an evaluator failure after retries rather than guessed fallback clicks.
- [ ] Remove evaluation policy updates/saves and timestamp-mixed RNG seeds. Keep training as a separately named exploratory mode and isolate its files/memory.
- [ ] Implement probe recipes for all meaningful positive/negative rule cases. Reach prerequisites through UI play; never inject hidden state into measured branch apps.
- [ ] Stop/reset corrupted probe sessions and preserve the counterexample. Do not feed probe outcomes into the scored player policy or mix probe win counts with normal games.
- [ ] Record no-progress stops as POLICY_EXHAUSTED/INCOMPLETE with solvability UNKNOWN unless a separate proof is actually available. Never infer that a generated game is impossible from two stock cycles.

Tests: scripted perception/action adapters, held-out layouts, wrong OCR, no candidate actions despite visible moves, intentionally bad player choice, repeat-state recovery, provider failure, and policy-file byte identity before/after evaluation.

Gate: model behavior cannot certify a win or legality; frozen policy/model use is demonstrated; each failed solver attempt is attributable or explicitly unknown.

## P5 — Ten-game coordinator and complete results

- [ ] Allocate ten slots per target SHA with the fixed 3/2/3/2 modality schedule. Continue after each slot's win, failure, or inconclusive stop.
- [ ] Enforce per-slot fresh state, frozen input profile, active-time and hard wall-clock deadlines plus all other budget caps, monotonically recorded events, and immutable build identity. Allocate normal and probe cohorts independently.
- [ ] Create a terminal row for every slot, including startup failure, unsupported modality, operator cancellation, and a run that never starts. No hidden replacement trials.
- [ ] Implement five-outcome totals summing exactly to ten; unassisted VALID_OBSERVED_WIN/10 is the primary conservative success count. Preserve all completion/defect/assistance subtypes.
- [ ] Aggregate games with violations, illegal acceptance, legal blocking, other app bugs, agent/perception/delivery errors, rule coverage, and source SHA. Keep unique defects, occurrences, and affected-game counts distinct.
- [ ] Preserve model request IDs and actual usage without double-counting retries/stream messages; separate gameplay, setup, model inference, artifact, and review times.
- [ ] Implement exit policy that distinguishes confirmed defects, complete evaluation protocol, and incomplete protocol/coverage or evaluator/infrastructure failures. A normal budget-limited INCOMPLETE game alone is not an incomplete evaluation protocol. A partial suite is never a clean pass merely because it found no bugs.

Tests: first slot wins, first slot stalls, crash at every lifecycle boundary, 10 failures, cancellation before launch, mixture of outcomes, retries, assisted wins, stale deployment mid-run, unknown coverage, and aggregation/property invariants.

Gate: every fixture suite always emits ten primary rows and a truthful partition; negative probes and supplementary reruns cannot inflate the numerator.

## P6 — Calibrate before scoring generated branches

- [ ] Build independent known-good fixture apps with several visually different layouts and predeclared solvable deals. Freeze fixture truth/expected results separately; the visual player sees only the UI.
- [ ] Add togglable mutations for each critical behavior: illegal category accepted, legal destination rejected, wrong recycle order, no reveal, loss/duplicate cards, group split, counter mismatch, premature clearing, double score, false win, hidden remaining cards, missing modal, bad input target, and restart leaks.
- [ ] Add nonbugs that previously fooled the prototype: PNG encoder changes, harmless animation, missed gesture, `incomplete` phase, score unknown, genuine player dead end, occlusion, and service errors.
- [ ] Run hand-labeled oracle tests and live browser fixture suites; compare expected and adjudicated outcomes. Include difficult uncertainty cases that must remain unknown.
- [ ] Require no false validated wins or false confirmed defects on the known-good calibration set and detection of every configured critical mutation with evidence. Report false positives/negatives and unresolved cases; retain all calibration artifacts.
- [ ] Demonstrate ten complete unassisted legal wins on solvable known-good fixture deals across the required input profiles, then parity on the AgentCore backend. This proves those calibration cases, not all arbitrary deals.
- [ ] Have a second reviewer audit each claimed win/confirmed defect during calibration and the initial generated-app pilot. If evidence is insufficient, downgrade the verdict rather than forcing agreement.

Gate: calibration report passes and is version-linked. Any material observer/oracle/model change requires recalibration before comparing new scored runs.

## P7 — Run reports and baseball-card integration

- [ ] Generate self-contained readable HTML, JSON, games CSV, defects CSV, and rule coverage from stored artifacts without rerunning the model.
- [ ] Show ten game tiles, the five terminal outcomes, completion validity/assistance, modality strata, rule heatmap, illegal-accepted and legal-blocked tables, suspected findings, and evaluator failures. Label every denominator.
- [ ] Attach exact before/action/after media, runtime evidence, timestamps, and replay references. Give screen-reader/keyboard access to report filters and evidence links.
- [ ] Add the gameplay summary and report link to the external baseball-card board, keyed to source SHA. Keep existing code KPIs separate and preserve their N/A semantics.
- [ ] Detect stale results and missing artifacts; prevent results for one branch iteration from being displayed as another. Separate first-pass app results from post-repair iterations.
- [ ] Store large evidence in local artifact directories/S3 with retention; redact credentials and private signed URLs; keep only manifests or deliberate examples in Git.

Tests: ten-outcome rendering, overlapping counts not summed, all unknown/missing data, artifact link resolution, stale SHA, long bug text, mobile layout, and readable evidence navigation.

Gate: a reviewer can reconstruct every win claim and confirmed bug from the report and identify untested requirements without reading logs manually.

## P8 — Dynamic rollout and operational handoff

- [ ] Add a manually dispatched QA workflow accepting immutable target manifests and explicit budgets. Use CI workload identity, not local-profile credentials copied into secrets.
- [ ] Integrate deployment receipts from the existing branch build flow. Run gameplay as a separate stage, not inside the 120-second code-metrics step. Documentation-only/plan-only updates do not start paid evaluations.
- [ ] Run the full calibrated suite against at least two independently generated, completed game branches. Add a third unseen layout by manifest only to demonstrate dynamic targeting.
- [ ] Evaluate all six new Claude branches when their implementations are available, preserving exact generator/model/style labels and evaluator version. Never treat their current plan-only tips as finished apps.
- [ ] Randomize branch order, fix budgets and policy, retain failed/inconclusive batches, and present ten-game results as descriptive evidence. Repeated batches can assess stability later.
- [ ] Document local and AgentCore setup, profile/region selection, permissions, model config, costs/budgets, cleanup/recovery, unsupported capabilities, report interpretation, and legacy exploratory CLI behavior.
- [ ] Publish the accepted calibration report, example real-branch report, version manifest, and known limitations. Capture whether the harness itself has been live-tested on the current host/backend.

Gate: dynamic target contract proven; no source-specific coupling; all required backend, cleanup, rule, report, and real-branch checks have evidence. A reduced or failed rollout remains explicitly incomplete.

## Completion checklist for this planning change

- [x] Located committed prototype and its introducing commit.
- [x] Inspected helper-test coverage and limitations; did not claim gameplay verification.
- [x] Checked existing QA script syntax and local AWS CLI/profile/request-schema availability without cloud calls.
- [x] Defined dynamic targeting, AgentCore/local backends, independent oracle, ten-game accounting, isolated probes, evidence, and report design.
- [x] Recorded detailed implementation stages and validation gates.
- [ ] Future harness implementation and live execution — intentionally not performed in this planning change.

## Publishing the plan

The user requested these plans on main. Commit only this spec directory and the README index update, then push as a normal fast-forward to main. The existing workflow deploys Amplify on every main push, so use `[skip ci]` on this documentation-only commit to avoid an unrelated deployment. Leave the workflow definition unchanged. GitHub documents that commit marker for push-triggered workflows. [Skipping workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)
