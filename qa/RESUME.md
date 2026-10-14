# QA harness continuation checkpoint

Updated: 2026-10-14. Baseline main commit: 50cbdcf.

## Objective

Extend independent win validation and rule calibration; document each milestone. Do not confuse a controlled fixture win with a win on an existing live implementation. Preserve six model/style experiment branches.

## Current implementation

- `scripts/qa-evaluate.mjs`: isolated ten-slot browser runner, reports, normal/probe separation.
- `scripts/qa/oracle.mjs`: independent deck/rule ledger; conservative win outcomes.
- `scripts/qa/observer.mjs`: Ollama screenshot adapter and experimental visible-DOM geometry adapter.
- Local browser and AWS AgentCore tested; prior remote session stopped.
- Baseline: 31 targeted tests; no validated live win. Claude tap crashes and score deviations retained in `qa/results/`.

## Work plan for this continuation

1. Audit and strengthen oracle invariants and uncertain transitions; add adversarial fixtures.
2. Build a separate, deterministic browser fixture containing all 86 cards, with a known solvable deal and mutation modes. Play through normal rendered UI, never inject state into live apps.
3. Validate full browser-to-observer-to-ledger win path, and reject deliberately broken fixture variants.
4. Improve generic visible observation and deterministic play strategy; run bounded extended live trials.
5. Record exact commands, reports, completed tests and open gates here; commit milestones and push final work to main.

## Outstanding acceptance gates

Independent screenshot adjudication, full live win, complete R01–R22 coverage, lost/duplicate card invariants, reliable legal-block confirmation, audio, deployment identity, UI-level matched deals and long-running interruption recovery. A fixture validates the harness, not a live branch.

## Resume commands

```sh
npm ci
npm run qa:agent:install
npm run qa:test
# Consult qa/README.md and this checkpoint before starting new cloud sessions.
```

Working checkout: isolated `work/categorysolitaire-experiments` in this task. Original OneDrive checkout contains unrelated changes and must remain untouched.

## Milestone 1 — full UI fixture win achieved

- Added `qa/fixtures/reference.html` and `scripts/qa/fixture-server.mjs`: independently implemented move handling, exact 86-card deck, 4/5/6/7/8 opening columns and 56 stock cards, deterministic known-solvable layout.
- Improved visible-DOM observation: exposed-strip filtering, visible back counts, explicit empty piles, stock/waste counts and stricter title recognition.
- Added R01 opening checks, R02 count deltas, R10 reveal checks, R11 retained face-up checks, R13 counter limits, R22 visible duplicates/inventory, R16 missing modal.
- `reference-v2`: **VALID_OBSERVED_WIN after 142 browser actions**, all 13 categories and 73 items deposited, score 1300, zero ledger gaps, zero findings. This is a controlled fixture, NOT a live-demo win.
- Command: `node scripts/qa-evaluate.mjs --url http://127.0.0.1:4179 --observer dom --games 1 --max-steps 300 --max-seconds 180 --settle-ms 20 --calibration --output ../qa-calibration/reference-v2`.
- Full evidence: task `work/qa-calibration/reference-v2`. The first interrupted fixture trial exposed an encoding problem; UTF-8 was fixed before reference-v2.
- 17 current `qa:test` tests passed. Next: adversarial mutation fixtures, other input modalities, live extended trials, and a maintained coverage matrix.

## Milestone 2 — expanded calibration in progress

- Full 142-action fixture wins now passed desktop drag, desktop tap, phone tap, and phone touch drag in `work/qa-calibration/suite-v1`.
- Wrong-score fixture correctly classified WIN_CLAIM_WITH_VIOLATIONS. Remaining mutation cases are still running; inspect `suite-v1/calibration.json` before reporting totals.
- Added 25 tests covering all 13 categories' item/title destination matrices, opening/inventory loss, duplicate identities, unknown counts, missing reveal, double draw, foundation overflow/denominator, premature wins, forged banners, mixed groups and legal-block attribution. 42 new-harness tests currently pass.
- Added one bounded retry for unchanged legal actions with observed selection. Two receipts from the same unchanged state are required for confirmed blockage; missed delivery stays suspected.
- Extended live Kiro trial is running (`work/qa-calibration/kiro-extended-v1`, 500 actions / 360 seconds). At 49 actions: no ledger gaps; no completed category yet. Do not infer final result from this checkpoint.
- Added `scripts/qa-calibrate-sequences.mjs`: draws all 56 stock cards, recycles, redraws all 56 via UI; compares reference against reverse-recycle mutation. Running as `work/qa-calibration/recycle-v1`.
- Generic DOM observer now recognizes Foundation/Draft placeholders and adjacent numeric stock counters. These were informed by rendered screenshots across all five live demos, without reading their source/state.
- Before final publication: rerun the suite on frozen code (development edits during suite-v1 can make its later manifest hashes differ from loaded modules), update usage/coverage docs, export reports, commit and push main.

## Milestone 3 — actual limits discovered and addressed

- `suite-v1`: all four full wins and all intended mutation detections occurred. One harness assertion expected the wrong rule ID: the illegal probe selected an item into an empty foundation (R08), not a title-to-tableau violation (R05). Corrected expected ID; preserved original failed suite evidence.
- `recycle-v1`: both 113-action UI cases passed; reference order produced no findings and reversed order produced R03 findings.
- Kiro v1 stopped after 108 actions, score 100, with observer layout/counter gaps. Fixed foundation-row identity to stay anchored to the initial row and expanded visible counter recognition above slots.
- Kiro v2 stopped after 105 actions with zero ledger gaps and no findings, but failed to recognize a Unicode variation-selector recycle icon. Normalized variation selectors; added a Unicode-recycle calibration variant.
- Improved strategy: prefer useful tableau moves and foundation deposits, keep waste titles recoverable instead of capping tableau item sequences, and defer filling empty columns from waste while drawing/recycling remains available. This is a changed evaluator policy, not a game modification.
- Kiro v3 now running, 500 actions / 600 seconds, default settling. Inspect its final report before drawing conclusions.
- `suite-v2` runs expanded lost/duplicate-card and wrong counter variants. Module hashes now freeze once per process, so editing files cannot retroactively change later run manifests.
- Screenshot vision calibration is running on three explicit fixture frames: opening, first category completion, final victory. Script: `scripts/qa-calibrate-vision.mjs`.

## Milestone 4 — live wins and final checkpoint

- Kiro v3 reached score 1300/You Win after 345 actions (~510 s); v4 reached it after 205 actions (~296 s). Both automatic outcomes are WIN_CLAIM_UNVERIFIED solely at the terminal foundation readings behind the victory overlay.
- Reviewed both saved terminal frames for each game. The five foundation placeholders are visibly empty above the opaque dialog. Added `scripts/qa-replay.mjs` to apply explicit, hash-bound terminal perception corrections and reconstruct the entire independent ledger. Both reviewed traces yield VALID_OBSERVED_WIN, 13 categories, zero gaps and no confirmed violations, with **assisted=true**. Original automatic results remain unchanged.
- Portable traces, screenshots, review recipes and reviewed results are committed under `qa/results/kiro-v3` and `kiro-v4`. Replay commands are in `qa/results/2026-10-14-calibration.md`.
- Final browser suite: 16/16 cases passed. Recycle suite: 3/3 cases passed. Targeted regression suite: 65 tests. Full fixture wins cover all four input modalities.
- Screenshot-only Qwen is NOT calibrated: placeholder/geometry errors and invented covered card identities were observed. Three explicit portable golden screenshots are under `qa/fixtures/golden`; the optional vision command is expected to expose these failures, not silently pass.
- Evidence runs: `work/qa-calibration/suite-final`, `recycle-final`, `vision-golden-v1`, `vision-golden-v2`, `kiro-extended-v1..v4`. Final output bundle: `outputs/qa-calibration-evidence`.

### Next work, in priority order

1. Add transparent and opaque victory-overlay fixture variants. Calibrate observation without reading occluded card identities, inventing empty states, dismissing/resetting a win before evidence capture, or weakening the ledger. Aim to remove terminal review assistance.
2. Improve/replace screenshot perception only after running the saved golden assertions (including exact exposed-card lists and in-target coordinates). More layouts and independent human adjudication are still needed.
3. Add controlled browser group-move, hidden-source, face-up-preservation, restart, replay, menu, quit and audio tests. Consult the rule-by-rule matrix in CALIBRATION.md.
4. Freeze the runner/model/deployment receipts and run ten games per target. Current exploratory random deals, changed policies and assisted reviews are not comparable primary experiment results.

No game implementation on the original six experiment branches was run or modified. No AWS session was started in this continuation. Local fixture servers should be stopped at turn completion.

Final cleanup: all calibration/live browser runs completed; the standalone localhost fixture server was stopped. No active AWS sessions were created by this continuation. The exported evidence landing page was rendered successfully, and replay without a review still returns WIN_CLAIM_UNVERIFIED as intended.
