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
