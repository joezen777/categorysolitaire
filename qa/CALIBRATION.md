# Calibration coverage and evidence

This file separates verified harness behavior from remaining acceptance work. See `RESUME.md` for current run paths and the latest result checkpoint. Calibration fixtures are never included in live branch win rates.

## Reproduce

```sh
npm run qa:test
npm run qa:calibrate -- qa-results/calibration
npm run qa:calibrate:sequences -- qa-results/recycle
# Optional local Ollama vision check; failure is currently expected for some assertions.
npm run qa:calibrate:vision -- qa/fixtures/golden qa-results/vision
```

`qa:calibrate` starts a temporary localhost fixture server, runs complete games across four modalities, then adversarial variants, saves every result and returns a failing exit code if an expectation fails. `qa:calibrate:sequences` exercises all 56 draws, a recycle and all 56 redraws, separately for correct, Unicode-control and reversed-order versions. Servers and browser contexts are closed in finally blocks. These runners do not start AWS sessions.

The fixture imports only the public deck data. Its game transitions are implemented independently from the oracle. Its deterministic deal obeys the 4/5/6/7/8 opening tableau and 56-card stock. The full reference trace takes 142 UI actions: 56 draws, 13 title deposits, 73 item deposits. The complete trace must have zero gaps and no findings before the win is validated.

## Rule coverage matrix

“Calibrated subset” means the named cases passed, not that every possible implementation or visual state is covered.

| Rule | Calibrated subset | Remaining coverage |
|---|---|---|
| R01 opening | Exact visible opening counts; wrong count/inventory unit mutations | Unknown/occluded initial counts and arbitrary layouts |
| R02 draw | All 56 draws; two-card draw mutation | Lost draw/unchanged stock with unclear delivery |
| R03 recycle | Complete 56-card order, reverse-order mutation, Unicode control | Multiple partial cycles with arbitrary deposited-card histories |
| R04 movable sources | Normal policy chooses observed face-up sources | Buried waste and hidden-card negative UI probes |
| R05 title to tableau | All category-pair destination matrices | Dedicated positive/negative browser fixtures |
| R06 title to foundation | 13 real browser deposits; occupied destination matrix; rejected legal move mutation | More drag-selection receipt variants |
| R07 item to tableau | All category-pair matrices; exploratory live accepted transitions | Dedicated controlled browser mutation cases |
| R08 item to foundation | 73 real browser deposits; item-to-empty illegal acceptance mutation | More visual ambiguity cases |
| R09 item groups | Mixed/title-containing group rejection and destination unit checks | Full group-move browser fixtures; observed live suspected blocks remain unconfirmed |
| R10 reveal | 25 reference reveals; missing-reveal UI mutation | Partial stacks and ambiguous covered faces |
| R11 face-up preservation | Retained-prefix invariant implemented | Dedicated reveal/order/turnover UI mutations |
| R12 illegal return | Reference negative-control probe; unchanged-state checks | Bounce animation, precise original-location checks |
| R13 progress | Count/denominator/overflow checks; wrong-count/denominator UI mutations | Transient completion counters and unreadable labels |
| R14 completion/reuse | All 13 categories clear and reuse slots in full reference games | Duplicate-completion animation and delayed-clear UI mutations |
| R15 scoring | Exact 1300 reference score; wrong-score mutation | Additional inconsistent score-display cases |
| R16 victory | Full reference win, missing modal, premature win, forged high-score unit case | Occluding victory overlays, independent human review |
| R17 input | Full wins via mouse drag/tap and true touch drag/tap; native event fixture tests | More browser/device engines |
| R18 layout/readability | Visible exposed-strip recognition; explicit screenshot coordinate assertions | Responsive clipping, scrolling and overlapping-hit-target calibration |
| R19 restart/play again | Not yet automatically calibrated | Changed-state restart and terminal replay probes |
| R20 menu/quit | Not yet automatically calibrated | Visible menu/quit end-to-end probes |
| R21 audio | Not observable in current harness | Audio capture and sound-off verification |
| R22 deck/inventory | Exact 86-card manifest; visible duplicates; known inventory; lost/duplicate-card UI mutations | Fully occluded inventory, OCR uncertainty and more title anomalies |
| R90 source requirements | Not observable through UI | Separate source review |

## Observation uncertainty and attribution

A rule finding is conditional on the captured observation. Wrong OCR or geometry must not be called an independently adjudicated app bug. Unknown labels/counters prevent certification where they are needed. Conservation includes a foundation title only after its deposit was independently observed. Nonfinite confidence cannot authorize a move.

A legal move that produces no change is suspected after one attempt. The current positive confirmation requires two attempts from the same observed state, each with an accessible selection receipt; missing gesture receipts never become confirmed simply through repetition. This is narrower than complete drag pickup/return calibration.

Module hashes are frozen when the runner process loads, including long multi-case runs. The manifest does not certify a live deployment SHA. Keep observer type, model, policy revision, budgets and modalities fixed for comparisons; development trials intentionally change them and are not a controlled branch comparison.

## Screenshot-only model limitation

The local `qwen3.6:latest` model failed some explicit golden-frame checks. Observed failures included interpreting placeholder text as cards, hallucinating covered identities from the supplied deck, swapping foundation/tableau rows and inaccurate action coordinates. The oracle did not relax its win criteria to accommodate these failures. Raw replies and failed reports are retained. The model prompt now requests normalized coordinates and explains placeholders; the conversion is explicit, but passing a few prompts would not establish general perception reliability.

The saved three-frame fixture is task-author-reviewed, not independently human-adjudicated. It asserts exact exposed identities (including absence of invented cards), visible score/win/emptiness and in-target action points. Fully validated browser fixture wins currently rely on the visible-DOM observer. Screenshot-only controlled performance remains an open gate.
