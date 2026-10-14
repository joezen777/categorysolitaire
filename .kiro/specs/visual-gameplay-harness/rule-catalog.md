# Independent UI rules oracle and ten-game evaluation

Status: implementation plan only. This planning change performs no app implementation, browser session, or game play. The frozen reference is main at ee5f686a5eea06b3aad53c11a55b536bb226da45: README.md Starting prompt and scripts/qa-agent.mjs. The evaluator remains external to each application branch. See [requirements](requirements.md), [design](design.md), and [implementation tasks](tasks.md).

## 1. Independent evidence and adjudication

Use separate stages: screenshot observation, entity/history tracking, deterministic rules adjudication, action selection, gesture delivery, and post-action adjudication. The planner proposes moves; it cannot declare its own move legal, its own progress genuine, or its own game won. A second visual review helps resolve observation disagreements, but a second model opinion alone is not ground truth.

The oracle uses a frozen rule catalog and public expected deck manifest derived from the original prompt. It does not import the app's rules, inspect React state, call game methods, read hidden cards from DOM attributes/storage/network, or use branch-specific source as gameplay truth. If accessible UI text is allowed in a separate evaluation mode, label that mode explicitly and keep it consistent across branches; screenshot-only and accessibility-assisted results must not be mixed silently.

For each card, pile, counter, and state field, retain its observed value or UNKNOWN, screenshot/frame/crop provenance, observation time, geometry, and confidence. Maintain card/category identity across visible events; never invent identities for card backs. Derive category membership from the public manifest, not the application's apparent acceptance of a move. Duplicate labels require tracked instances or a multiset; uncertainty about identity stays explicit.

Each candidate action receives LEGAL, ILLEGAL, or UNKNOWN under the catalog. LEGAL means every required precondition is established by evidence. ILLEGAL means evidence establishes an explicit rule violation. UNKNOWN covers missing observations, ambiguous rules, uncertain target identity, or plausible states with different legality. A useful formulation is to retain a set of states consistent with observation: certify legal or illegal only when all relevant consistent states agree. App behavior never changes the rule oracle's answer.

Every attempted action has two judgments: expected legality before delivery and observed effect after delivery. Expected labels written by the planner are advisory only. Semantic card/counter changes determine effects; image similarity is only a locator for possible change. PNG byte differences, rewards, animations, and unchanged pixels cannot prove acceptance or rejection.

Wait for bounded semantic settling, capture more than one stable observation, and retain video or intermediate frames for drag, bounce, glitter, and brief counters. An unresolved animation is UNKNOWN, not an application defect. Select a source point inside the exposed part of the intended card, including the visible strip of a stacked card; the full card's center may hit a different card.

## 2. Stable rule catalog

Every rule result includes rule ID/version, PASS/FAIL/UNKNOWN/NOT_EXERCISED/NOT_OBSERVABLE, concrete preconditions, expected transition, observed transition, evidence links, and attribution. NOT_EXERCISED means the prerequisite state never occurred; it is not a pass. All permitted and prohibited destinations below refer to visually established cards and slots.

### R01 — Opening board and deal

Preconditions: a verified new game using the original starter deck. Expected: source and draft at top, five empty foundations below, five tableau columns below those; tableau counts 4/5/6/7/8; only each column's bottom/exposed card face up; draft empty; score zero. The prescribed 86-card deck implies 30 tableau cards and 56 source cards. Violation: a visibly wrong count, region, or reveal pattern. Evidence: opening panorama plus readable crops and observable counts. Do not certify an occluded source count from appearance alone; its count may become verifiable from the complete draw history.

### R02 — Draw exactly one source card

Preconditions: nonempty source, settled board, one delivered source activation. Expected: exactly one new face-up top draft card, source decreases by one, other cards remain in place. Violation: multiple cards drawn, duplication/loss established by the ledger, wrong face orientation, or confirmed activation rejected. Evidence: before/after draft identities, pile counts where visible, gesture receipt evidence, and continuity of the ledger.

### R03 — Exhaustion and ordered recycling

Preconditions: source visibly exhausted and remaining draft sequence known from observed history. Expected: empty source slot; activating it transfers remaining draft cards face down to source and empties draft; the former draft bottom draws first, former top last. Violation: skipped, duplicated, lost, or wrong-order cards, premature recycling of a nonempty source, or a grounded legal recycle blocked. Evidence: ordered draw ledger, source-empty frame, recycle frames, and subsequent redraw sequence. A partial known sequence supports only a partial order check; do not certify the entire order from one redraw.

### R04 — Movable sources and face-up restriction

Preconditions: identified selected card and source position. Expected: only face-up cards can move; only the top draft card is available. Violation: a face-down card or a buried draft card moves as an independent source. Evidence: pre-action visible face/orientation, top-of-draft ordering, action geometry and resulting location. Ambiguous interior tableau selections are governed by A03 below.

### R05 — Category title to tableau

Preconditions: face-up category title at the bottom/exposed end of a tableau column, or top draft under interpretation A01; destination established. Expected legal destinations: empty tableau column or exposed item of the same category. Illegal destinations: wrong-category item or another title. Violation types: an illegal destination is accepted, or a clearly legal destination is blocked after delivery is established. Evidence: title/category crop, destination crop, geometry, and source/destination before/after. A title underneath other face-up cards is not automatically eligible as a single bottom card.

### R06 — Category title to foundation

Preconditions: eligible title and foundation occupancy known. Expected: a title may enter an empty foundation. Occupied foundations do not accept an additional title under the original title-first rules. Evidence: source title, destination vacancy/occupancy, resulting foundation identity, and source vacancy/reveal. Do not infer that a decorative empty-looking slot is vacant without resolving overlays or a completion animation.

### R07 — Category item to tableau

Preconditions: eligible face-up item, category known, destination exposed card/empty column known. Expected legal destinations: empty column or exposed item of the same category. Wrong-category items and tableau titles are illegal destinations under the literal prompt. Evidence: source/destination text and kind, action geometry, and the resulting stack. The fact that the application accepts a title as a destination cannot redefine the rule.

### R08 — Category item to foundation

Preconditions: eligible single item and foundation's category/occupancy established. Expected: admission only where that category's title or matching item stack already exists. Illegal cases: empty foundation, wrong category, or no established matching title-first foundation. Evidence: original foundation title/deposit history, current visible counter/category, incoming item, and resulting membership. App counter growth alone is not proof that membership is correct.

### R09 — Same-category item sequence

Preconditions: entire selected face-up item sequence and its order/category are established; legal tableau destination under R07. Expected: the sequence moves together with its internal order preserved. Illegal cases: mixed categories, a face-down member, a title treated as an item, or wrong-category destination. Evidence: pre/post sequence crops, exposed source strips, drag/selection frames, and card ledger. The prompt authorizes sequences to tableau columns; group-to-foundation behavior is not used as a failure criterion without resolving A04.

### R10 — Automatic tableau reveal

Preconditions: a legal card/sequence move exposes a previously face-down bottom card in its source tableau column. Expected: that card flips face up without a separate user action. Violation: it remains face down after settling, disappears, or unrelated cards are revealed. Evidence: pre-move source back, move trace, and settled source face. An empty source column has no card to reveal and is not a failure.

### R11 — Preserve face-up cards

Preconditions: cards previously observed face up remain in tableau after a placement or sequence move. Expected: all remain face up. Violation: moving/covering cards flips an existing face-up card down. Evidence: tracked identities and pre/post exposed-label crops. A card becoming visually occluded is UNKNOWN about orientation unless enough of its face remains observable.

### R12 — Illegal rejection and return

Preconditions: oracle says ILLEGAL and evidence confirms delivery to the intended source/destination. Expected: no change to card membership/order/progress/score, dragged cards return/bounce to original location, and requested warning/error sound when enabled. Defect subtypes: ILLEGAL_ACCEPTED, REJECTED_BUT_STATE_CORRUPTED, RETURN_FEEDBACK_MISSING, SOUND_FEEDBACK_MISSING. Conversely, a legal action that is rejected is LEGAL_BLOCKED against its corresponding move rule, not a success for R12. Evidence: before/during/settled-after state, video and audio when available. No state change alone may mean a missed gesture and is insufficient to pass this rule.

### R13 — Foundation category and x/y progress

Preconditions: known category title and accepted item deposits in a foundation. Expected: category title and item progress x/y appear above the card; x reflects collected items and y the manifest's item total. Title is not an item under interpretation A02. Violation: mismatch, count changed on rejected move, count beyond y, or unreadable/missing required display. Evidence: deposit ledger, readable counter crops, and expected public category total.

### R14 — Category completion and slot reuse

Preconditions: the last distinct required item legally enters a category foundation. Expected: glitter, completed category disappears, slot becomes available for a new title, and completion occurs once. Illegal cases: premature clearing, repeated completion, clearing a different category, lost/duplicated cards, or slot remaining unusable. Evidence: complete membership ledger, transition video, cleared slot, and subsequent legal title admission. A skipped animation frame does not prove missing glitter.

### R15 — Score

Preconditions: complete observation of category completion events since new game. Expected: top-left score starts at zero and adds exactly 100 once per completed category; rejected moves do not change it. For the original 13 categories, the correct final score is 1300. Evidence: independent completion count plus score crops. Score is an output to validate, never the source of completion truth.

### R16 — Win and final modal

Preconditions: independent ledger establishes every expected title/item has been legally grouped and every category cleared, with no cards remaining in source, draft, tableau, or foundations. Expected: modal reading exactly Game Over - You Win!, correct final score, and play-again control. Violation: premature win, wrong final score, missing win/modal/control, or winning by cards disappearing through an illegal transition. Evidence: full completion ledger, final stable board, modal/counter crops and transition video. A visible win modal is a win CLAIM until adjudicated; a complete or cleared phase string is never proof.

### R17 — Required interaction methods

Preconditions: a move with established legal preconditions, ready input surface and selected modality. Expected: both drag-and-drop and select-card-then-tap-destination can perform supported single moves and tableau sequence moves. Evidence: gestures and resulting semantic transitions; exercise pointer drag, pointer tap, true touch tap, and true touch drag as separate subcases. Mouse events inside a mobile-sized viewport do not certify touch drag. Confirming failure of one modality does not require declaring the other broken.

### R18 — Readable overlapping cards and responsive layout

Preconditions: stacked face-up cards, declared phone/desktop viewport and browser scale. Expected: covered item text remains visibly readable at the top, bottom card shows full face, and required controls/piles/columns can be reached. Violation: missing text, unrecoverably clipped controls, overlapping hit targets preventing intended moves, or broken board layout. Evidence: viewport/device metadata, overview and card crops, scroll/action trace. CSS absolute positioning and calculated top offsets cannot be proved from screenshots; their implementation remains a separate nonvisual check.

### R19 — Restart and play again

Preconditions: active game with changed state, or adjudicated terminal game. Expected: respective control creates a fresh opening board with reset score/progress/piles. Evidence: pre-reset state, activation, and R01/R15 checks. Do not reset an unfinished normal game to improve the primary result; exercise mid-game restart in separate probes. Replay may be checked after freezing a finished game's result, without counting a new primary game implicitly.

### R20 — Menu and quit

Preconditions: visible active game. Expected: basic cog menu offers restart, quit and sound-off; quit yields a coherent exit from active play. Evidence: menu/quit screenshots and interaction trace. The exact quit destination is unspecified; label the interpretation rather than demanding a particular home screen. Keyboard behavior is optional diagnostic coverage, not a prompt requirement.

### R21 — Audio and sound-off

Preconditions: user gesture has enabled browser audio, sound enabled, and a delivered invalid move or completed category. Expected: error/warning or success sound; sound-off suppresses requested effects. Evidence: timestamped captured audio tied to action, controls and browser audio readiness. Screenshot-only runs mark audio NOT_OBSERVABLE. Lack of capture, OS muting, an audio permission problem, or unsupported headless audio cannot be called an app sound bug. Procedural native Web Audio and lack of external audio files require a separate static/runtime implementation review; hearing a sound does not establish how it was generated.

### R22 — Deck fidelity and card-face text

Preconditions: original starter-deck profile; visible cards encountered during play. Expected: exact category/item spelling and capitalization, title name/item count, item text, and generic backs for face-down cards. Public manifest: 13 titles and 73 items, 86 total. Evidence: per-card sightings and manifest comparison, with missing entries unresolved until full trace or proven loss. A different deck is a requirement deviation only for a profile that specifies this deck; never silently infer the expected deck from whatever the app happens to contain.

### R90 — Requirements not observable from visual play

React/Vite/MUI, modular swappable JSON with separate id/categoryTitle/itemName, CSS positioning implementation, drag library choice, and procedural audio implementation cannot be certified through visual behavior. Report NOT_OBSERVABLE in this harness, with a separate optional source-review result that does not feed hidden gameplay state to the player. No blanket all-requirements-pass label is permitted from a visual run alone.

## 3. Original prompt ambiguities, frozen before comparison

- A01: Title destinations are written explicitly for tableau-bottom titles, while top draft cards must be playable. Recommended declared interpretation applies the same card-type destination rules to the top draft. Mark this as interpretation-derived and apply uniformly.
- A02: Title text says number of cards in category; foundation progress explicitly counts items. Recommended declared interpretation uses item count consistently. Keep a raw wording note so title-count interpretation cannot be confused with a duplicate/lost-card defect.
- A03: Eligibility of an interior face-up single tableau item, removal from foundations, and arbitrary partial subsets of a face-up sequence are not fully specified. Normal play uses exposed eligible singles or fully identified contiguous same-category item sequences. Do not label uncertain variants illegal without an agreed extension.
- A04: Sequence movement is expressly to a valid column; multi-card deposits into foundations are not expressly required. Keep such actions outside required positive coverage and label permissibility UNKNOWN unless the evaluator adopts a declared extension before all runs. Mixed/hidden/title sequences remain explicitly invalid as item sequences.
- A05: Shuffle algorithm, seed, solvable-deal guarantee, redeal cap, hinting, undo, and automatic moves are not specified. Absence is not a bug. App-added automation that changes cards must still be observable and checked; otherwise a win becomes unverified.
- A06: Quit destination and exact glitter/sound aesthetic are unspecified. Assess function and presence, without prescribing a design.
- A07: Keyboard operation is not an explicit original requirement. Record optional keyboard/accessibility findings separately; never reduce the original-spec compliance score solely because a keyboard shortcut is absent.

## 4. Action evidence and attribution

Minimum event record: run/game/session ID; branch and frozen commit/deployment identity; rule-catalog and manifest hashes; monotonically increasing action ID and UTC/monotonic timestamps; normal/probe cohort; action intent and modality; source/destination entity IDs and geometry; field-level observations/provenance; oracle precondition/result; emitted gesture/path; pre/during/settled-after frames; audio if available; semantic delta; ledger update; rule verdict; attribution; reviewer and confidence; recovery/retry links.

Attribution values: APP_CONFIRMED, APP_SUSPECTED, AGENT_PLANNING, PERCEPTION_CONFIRMED, GESTURE_DELIVERY, HARNESS_OR_ENVIRONMENT, RULE_AMBIGUITY, or UNRESOLVED. They may overlap. If an agent mistakenly sends a wrong-category card and the app accepts it, record both the agent mistake and the app enforcement violation. A correctly rejected accidental illegal attempt is an agent error, not an application bug. An unreadable app label may be both a UI defect and the reason gameplay evidence remains unknown.

Confirm ILLEGAL_ACCEPTED only with established illegal preconditions, delivered action and a persistent prohibited state transition. Confirm LEGAL_BLOCKED only with established legal preconditions and input delivery/selection evidence, settled unchanged/rejected state, and a bounded retry from a fresh observation or independent reviewer confirmation. A successful alternate modality can isolate a modality defect; it does not erase the failed attempt. If delivery or perception remains uncertain, preserve UNKNOWN instead of fabricating a defect. Stop after the predeclared retry budget; repeated random clicking is not evidence.

Record each occurrence, but deduplicate the defect list by rule, symptom, modality and reproducible preconditions. Without source analysis, do not assert identical root causes merely because two symptoms look similar. All suspected findings stay separate from confirmed findings.

## 5. Ten normal games and isolated probes

Preschedule exactly ten normal game slots per frozen branch/deployment. Suggested balanced allocation: games 1–3 desktop pointer drag; 4–5 desktop pointer tap-to-move; 6–8 phone touch tap-to-move; 9–10 phone true touch drag. This gives five desktop, five phone, five drag, and five tap games. Use explicit viewport width/height, device scale and touch capability; do not rely on a mobile flag to set dimensions implicitly. A separate supported allocation is acceptable if frozen identically before evaluating branches.

Start each slot in a fresh browser context with fresh storage/cache policy, using the UI to establish a new game. Retain opening evidence. Do not assume page reload resets state, and do not assume equal visible opening cards establish identical hidden deals. Freeze evaluator model/version, observation prompt, planner/oracle version, strategy, retry policy, budgets, hardware, browser and modality allocation. Freeze or reset learning weights identically; never adapt the policy across compared branches or let adversarial probes train it. Record planner seed separately from game seed; an app seed is unavailable unless the public UI supports it. Do not inject a deterministic shuffle into app internals.

Normal play attempts only oracle-LEGAL moves using the assigned primary modality; uncertainty triggers observation or the bounded recovery policy. Unexpected illegal actions caused by mistakes remain logged. Deliberate illegal actions belong exclusively to fresh probe sessions. Failure of the assigned modality is reported; alternate-modality recovery may continue for diagnosis but marks the outcome assisted and cannot become an unqualified primary success.

Use a proposed cap of 20 active minutes, 1500 issued gameplay actions, or 1600 model calls per normal game, whichever comes first; also honor a 25-minute hard wall-clock deadline from session allocation (including pauses/setup) and the preregistered token/USD caps in requirements.md. Freeze these limits and the inference/retry limits after an independent calibration run, before scored games; do not tune caps for individual branches. Active time includes observation/model planning, action delivery and settling; exclude only explicitly logged operator/environment pauses. Log wall time, active browser interaction time, model inference time, and environment waiting separately. These are QA-play times, not development speed or git timing KPIs. Do not stop the batch after the first win or stall. Every slot yields a row, including unavailable starts and interrupted games. Optional reruns get new IDs and remain supplemental; never replace a primary row silently.

Probe suite has separate IDs, browser contexts, outcomes and denominators. Include positive controls and one-factor negative cases for each movement rule; matched and mismatched categories; title-on-item versus item-on-title; empty/occupied foundations; hidden/buried cards; valid and mixed groups; reveal; recycle order; final item exactly once; slot reuse; early-win rejection; restart; quit; sound-off; desktop/phone input. Build prerequisite states through ordinary UI play and observed history. If an initial deal never yields a prerequisite, mark NOT_EXERCISED, not PASS. Optional fixture apps are for calibrating the harness and are never passed off as measured branch games.

## 6. Mutually exclusive primary outcomes summing to ten

Assign exactly one outcome per prescheduled normal slot, using the precedence below. Keep terminal evidence, gameplay validity, conformance, assistance and attribution as separate fields so a compact label cannot hide uncertainty.

1. WIN_CLAIM_WITH_VIOLATIONS: the app shows a win/terminal success claim and at least one confirmed requirement violation occurred in that normal trace. Include premature or illegal wins and also honest gameplay completion accompanied by a confirmed UI/audio defect; distinguish gameplay-invalid, gameplay-valid-with-presentation-defect, and completion-unresolved subtypes. This is not counted as a clean validated win.
2. VALID_OBSERVED_WIN: stable terminal win evidence, complete expected-deck/category ledger, all necessary state transitions adjudicable and legal, correct completion/score/empty-board conditions, no confirmed requirement violation in the trace, and no unresolved material gameplay gaps. Required scope qualification: valid under observed gameplay coverage, not proof of every feature or source requirement. Primary success also requires unassisted use of the assigned modality.
3. WIN_CLAIM_UNVERIFIED: win claim exists, no confirmed violation, but missing/ambiguous ledger, uncertain card membership, material perception gaps, or unresolved transitions prevent validation. A plausible final score is insufficient to promote it.
4. INCOMPLETE: a new game was established but no win claim was reached. Reasons include action/time cap, observed stall, suspected or confirmed app blocker, agent mistake, perception/delivery failure, interrupted session, or legitimately reached nonwinning state. A completely cleared board without the required win modal is INCOMPLETE with independently-completed gameplay and a confirmed missing-win-display defect if evidence supports it.
5. NOT_STARTED: no new playable game could be established before the slot's startup budget or environment interruption. Attribute app loading failure, deployment/network failure, harness/provider failure, or uncertainty separately. Retain the assigned slot in the denominator.

These five counts sum to exactly ten. Confirmed bugs, suspected bugs, app crashes, legal-blocked moves, illegal-accepted moves, agent mistakes, unknown actions, missing coverage and assistance are overlapping metrics, not extra outcome categories. For cases in which a win is validated after alternate-modality assistance, retain VALID_OBSERVED_WIN with assisted=true, but exclude it from the headline unassisted valid-win numerator and show the difference prominently.

For a suite with at least one started game, a conservative valid-win rate is unassisted VALID_OBSERVED_WIN / 10 planned, with the five outcome counts beside it. When no game starts due to readiness/preflight failure, show Not tested / N/A and 0 of 10 started, retaining ten NOT_STARTED rows rather than claiming measured 0/10 win performance. Also report usable-start rate and per-modality counts. Do not silently shrink denominators to completed games. Ten runs are descriptive evidence, not a strong causal or statistical conclusion about all possible deals.

## 7. Unsolvability and stopping semantics

Two unchanged recycle cycles, a planner saying no moves, repeated screenshots, or a step limit justify stopping under a budget; none proves the original deal unsolvable. Report POLICY_EXHAUSTED for the configured cycle/repeated-state or no-observed-progress stopping rule, and solvability UNKNOWN by default; use ACTION_BUDGET or ACTIVE_TIME_BUDGET for those respective caps. Legal but strategically poor choices can create a dead end without an app bug.

A proven dead end requires a complete relevant state from visible history and exhaustive independent legal-transition analysis showing no path to progress/win, with a proof/certificate and declared assumptions. Any unknown hidden identities/order or uncovered action must be reflected in that proof. Proving the current state unwinnable does not prove the original deal was unwinnable; earlier player choices may have caused it. Keep initial-deal-solvability, current-state-solvability, and suspected app blockage separate.

## 8. Reports and acceptance gates

Ten-row table: game ID, frozen target, modality/viewport, outcome, gameplay completion status, claimed/final verified score, independently completed categories, verified/unknown action counts, confirmed rule violations, legal-blocked and illegal-accepted counts, agent/perception/delivery incidents, assistance, stop reason, solvability status, actions and separated time measures, opening/final screenshot, video/GIF and full trace links. Provide a rule-by-rule coverage matrix and a separate defect table with minimal before/action/after evidence and reproduction prerequisites. Probe results appear in their own panel, never mixed into the ten rows or win rate.

For legal-blocked and illegal-accepted rates, use adjudicable delivered actions as denominators, report unknown/missed-delivery counts beside them, and keep normal/probe strata separate. Record distinct defects and occurrence counts separately. Audio or source implementation checks remain explicitly unobserved when evidence cannot assess them.

Gate A — Catalog: every original requirement maps to a rule or a documented nonvisual limitation; ambiguities and expected deck are frozen identically across branches.

Gate B — Oracle calibration: a hand-adjudicated fixture set covers legal moves, illegal acceptance, legal rejection, wrong gestures, uncertain OCR, hidden-card uncertainty, recycle order, transient animations, true wins, premature wins, fake high scores, duplicate/lost cards, and missing modal. Require no false validated wins or false confirmed defects on the reference cases; unknown fixtures must remain unknown. Do not use app rule code to create expected answers.

Gate C — Gesture/evidence calibration: verify all four input subtypes with recorded events and effects; collect exposed-strip coordinates; verify screenshot scale, scroll offsets, settling and video/audio limitations. After bounded provider retries are exhausted (or another budget ends first), a provider failure must yield INCOMPLETE or NOT_STARTED with the exact provider/budget reason rather than heuristic fallback counted as gameplay evidence.

Gate D — Isolation and completeness: freeze app SHA/deployment identity and policy hashes; fresh context for every normal slot; learning disabled/frozen; no hidden-state reads; ten assigned rows survive failures; probes and retries cannot overwrite primary rows.

Gate E — Outcome audit: independently review every claimed win and confirmed violation using the evidence package. A complete ledger is required for a validated win. Every defect has established preconditions and before/action/after evidence. Unresolved disagreement produces UNKNOWN/unverified status.

Gate F — Honest final report: five primary outcomes sum to ten; overlapping defect metrics are labeled; all denominators, missing coverage, assistance and uncertainty remain visible; no production-build, sound, keyboard, framework or source-structure claim exceeds available evidence.

## 9. Existing harness gaps the plan must address

- normalizePlan marks a win from planner booleans or a broad win/won/complete/cleared phase regex; the regex can match incomplete. It also treats a nonempty string false as truthy if supplied in is_win. Replace this authority with evidence adjudication.
- Reward uses planner progress and differences between compressed PNG bytes. Neither establishes semantic progress or rule correctness.
- EpisodeStopTracker immediately accepts planner blocked/no-valid/stuck/unsolvable descriptions and stops after recycle counts; these are stopping reasons, not unsolvability proof.
- Non-training execution exits the episode loop after its first win or blocked episode, so simply setting episodes=10 does not produce ten independent scored games.
- Policy updates and saves occur in solve/mechanics too, and the same policy can persist across branches. Planner random seeding includes a timestamp-derived run ID. Freeze/reset policy and distinguish reproducible policy settings from app deal randomness.
- Episodes reload one page in one shared browser context, which does not establish a fresh independent game when the application persists state.
- Mobile drag emits mouse gestures. The mobile parsing branch also does not replace already populated default dimensions. Specify viewport and true touch behavior explicitly.
- Provider absence/errors fall back to low-confidence heuristic taps. Such runs must be reported unavailable/unverified rather than evaluated as competent normal play.
- Current reports collapse outcomes into won/blocked booleans and a reward. They need independent rule evidence, attribution, uncertainty, complete ten-game accounting, and a separate probe report.
