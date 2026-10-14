# Expanded QA validation — 2026-10-14

## Results

- **Two real Kiro demo wins passed supplemental perception-assisted review.** Target: https://develop-kiro-vibe-solitaire.cardbrdbx.com/. Each review independently reconstructed all 13 categories and all 73 item deposits, score 1300, with zero ledger gaps and no confirmed violations. The runs took 345 actions (~510 seconds) and 205 actions (~296 seconds). Different random deals and policies mean these timings are not a controlled speed comparison.
- Original automatic outcomes remain **WIN_CLAIM_UNVERIFIED**. The victory overlay blocked DOM hit testing for the five visibly empty foundations. Codex reviewed two saved terminal frames per game and corrected only those five final emptiness fields. Neither score, victory claim, action legality nor deposit history was overridden. These are **assisted supplemental results, not automatic primary successes or independent human adjudication**.
- Four complete controlled-fixture wins passed: desktop pointer drag/tap and phone touch drag/tap, each 142 actions. Full browser calibration suite: **16/16 cases passed**, comprising these four reference games, one reference illegal-rejection control and eleven deliberate defect variants.
- Full recycle-order calibration: **3/3 cases passed**, each 113 actions (56 draws, recycle, 56 redraws), covering normal order, Unicode recycle control and deliberately reversed order.
- Targeted unit/browser/review regression suite: **65 tests passed**.
- Screenshot-only Qwen perception failed some explicit golden-frame checks, including placeholders, invented covered identities and coordinates. No screenshot-only benchmark calibration is claimed.

See [machine-readable summary](2026-10-14-calibration.json) and [coverage matrix](../CALIBRATION.md). Earlier live attempts and failed development calibrations are retained in the task evidence bundle. Deployed build identities remain unverified; these are exploratory runs, not the planned six-branch experiment or a ten-game comparison.

## Reproduce the real-win reviews

The compressed traces contain every observed action/transition. Only evidence paths were reduced to basenames; original and portable trace hashes are retained. Two terminal images per game are included. Full intermediate screenshots remain in the task evidence bundle.

```sh
npm run qa:replay -- qa/results/kiro-v3/events.jsonl.gz qa/results/kiro-v3/review.json qa-results/review-v3
npm run qa:replay -- qa/results/kiro-v4/events.jsonl.gz qa/results/kiro-v4/review.json qa-results/review-v4
# Reproduce the uncorrected outcome from the same portable trace:
npm run qa:replay -- qa/results/kiro-v4/events.jsonl.gz - qa-results/unreviewed-v4
```

The replay validates trace continuity and cryptographic evidence hashes, rejects score/win/ledger overrides, and supports only explicitly reviewed terminal foundation-emptiness corrections. It does not itself prove that a reviewer interpreted an image correctly. The original automatic report is never rewritten.

## Main remaining gates

1. Calibrate transparent-backdrop/occluded victory handling so complete live wins no longer need supplemental perception review. Add positive and deceptive-overlay fixtures before changing recognition.
2. Improve screenshot-only perception and coordinate accuracy across multiple layouts; preserve unknown states and independently review failures.
3. Add dedicated browser cases for hidden/buried sources, sequence moves, face-up preservation, restart/play-again, menu/quit, and audio.
4. Freeze evaluator/deployment identities and run the actual ten-game-per-branch comparison after these readiness gates. Keep assisted reviews separate from automatic wins.
