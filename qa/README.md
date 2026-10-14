# Independent UI gameplay evaluator

Implemented exploratory harness. Accepts any HTTP(S) game URL without importing its code or reading hidden game state. The existing `qa:agent` remains a separate exploratory learning agent. This evaluator does not learn between runs.

## Install and run

```sh
npm ci
npm run qa:agent:install
npm run qa:discover -- https://solitaire.cardbrdbx.com/
# Start Ollama separately with a vision-capable model, e.g. qwen3.6:latest.
npm run qa:evaluate -- --url https://codex-vibe-solitaire.cardbrdbx.com/ \
  --observer vision --model qwen3.6:latest --output qa-results/codex
# Faster optional visible-text/geometry adapter, with narrower layout support:
npm run qa:evaluate -- --url https://claude-vibe-solitaire.cardbrdbx.com/ \
  --observer dom --max-steps 40 --max-seconds 90 --output qa-results/claude-smoke
npm run qa:test
```

Default: ten fresh contexts, desktop drag ×3, desktop tap ×2, phone tap ×3, true phone touch drag ×2. Desktop 1440×900; phone 390×844. Each slot uses up to 1500 actions, 1600 vision calls, or 1200 seconds including startup. Each inference has a 120-second timeout capped by remaining slot time. Browser operations/cleanup can exceed the slot budget by their bounded operation timeouts. `--games 1` is a supplemental smoke run, not a ten-game experiment. All slots continue after failures or wins. Reports initially reserve every slot as NOT_STARTED/PENDING; a process killed mid-run leaves those explicit pending rows.

The vision adapter calls Ollama `/api/chat` and stores raw provider replies alongside screenshots. `--vision-url`, `--model`, and `--inference-ms` configure it. No heuristic fallback occurs on provider failure. The DOM adapter uses only rendered text and card-sized rectangles; it cannot recognize every layout, canvas, overlapping card, or empty pile. Both modes preserve missing information as unknown. Compare branches using the **same observer, model, budgets, modalities, evaluator revision and rule manifest**. Never mix results from these two observation modes as equivalent.

## AWS AgentCore Browser

```sh
python3 -m venv .qa-venv
.qa-venv/bin/pip install -r qa/requirements-agentcore.txt
aws sso login --profile opensearchprod
npm run qa:evaluate -- --url https://claude-vibe-solitaire.cardbrdbx.com/ \
  --backend agentcore --aws-profile opensearchprod --region us-east-1 \
  --python .qa-venv/bin/python --observer dom --games 1 --max-steps 5 \
  --max-seconds 90 --output qa-results/aws-smoke
```

Requires AWS permission to start/list/stop AgentCore Browser sessions and connect to their automation stream. The pinned Python SDK signs the CDP stream; credentials/signed headers are never saved in evidence. The local Node process handles observation and planning, so Ollama runs on the evaluator machine even when the browser runs in AWS. Each session has a 30-minute service TTL and an explicit stop in cleanup. `agentcore-session.json` records the ID and cleanup status. An unsuccessful cleanup is displayed in the report and requires reconciliation using that receipt. No cloud resources other than temporary browser sessions are provisioned. AWS usage incurs normal service charges. The SDK bridge relies on pinned private identifier/session fields; retest before upgrading it.

## Evidence and reports

Open `<output>/index.html`. JSON and CSV include all scheduled rows, outcomes, actions, duration, runtime errors, findings and rule coverage. Each game folder has opening/final and intermediate screenshots, gesture screenshots, observation JSON, append-only `events.jsonl`, checkpoint, and optional local video (`--video`). Manifest hashes identify the evaluator modules and frozen deck. A live URL is labeled **unverified build**; the runner does not infer its deployed commit from a branch name. Record deployment receipts externally before using these results for controlled comparisons.

Five exclusive outcomes: VALID_OBSERVED_WIN, WIN_CLAIM_WITH_VIOLATIONS, WIN_CLAIM_UNVERIFIED, INCOMPLETE, NOT_STARTED. Wins require observed deposits of every expected item, all 13 category completions, score 1300, empty piles and a visible victory claim, with no material ledger gaps. A banner, model assertion, or high score alone is insufficient. No winning live game has yet been validated with this harness. Incomplete games are **not evidence of unsolvability**.

Rule counters represent the specific observed transition checks, not blanket certification of a whole requirement. Zero pass/fail/unknown means NOT_EXERCISED. R21 audio and R90 source requirements are NOT_OBSERVABLE. Several rules currently have no automatic verifier; the catalog remains the full acceptance target. Confirmed findings mean deterministic oracle conclusions *conditional on the recorded observations*; review screenshots before treating them as adjudicated product defects. Legal moves with no visible effect remain suspected because selection alone does not establish a valid completed gesture. Unknown transitions prevent win certification. Repeated settled observations reduce animation uncertainty but do not eliminate correlated perception errors.

## Isolated negative probes

```sh
npm run qa:evaluate -- --url GAME_URL --observer vision --probe \
  --games 2 --max-steps 10 --max-seconds 180 --output qa-results/probes
```

Probes start fresh sessions, select known illegal moves, and stop on an accepted move. Probe outcomes never enter the normal win-rate denominator. Missing prerequisites are unexercised, not passes. This is opportunistic probing, not a complete suite that constructs every required state.

## Calibration and remaining work

Unit tests cover exact deck, strict booleans/unknown counters, legal/illegal destinations, uncertain groups, score inflation, illegal acceptance, premature/unverified wins, and a full synthetic 86-card deposit trace. Browser fixtures verify actual pointer/touch event delivery for four modalities and empty-page observation. The synthetic trace is an oracle fixture, **not a won live game**.

Still needed before claiming a calibrated benchmark: independently adjudicated screenshot fixtures; duplicate/lost-card checks across all transitions; complete reveal/setup/deck and UI rule coverage; exposed-strip/scroll recovery; reliable pickup and bounded retry evidence for confirmed legal blocks; stronger strategy and matched deal controls; full negative-state construction; audio capture; immutable deployment receipts; interruption/resumption; token/cost accounting and consolidated multi-branch comparison UI. Ten games are descriptive evidence, not a causal estimate of model/style quality. Development speed, token estimates and rework KPIs belong to branch commit/usage records, separate from these gameplay timings.
