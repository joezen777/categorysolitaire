# Category Solitaire — Opus 5.5 · Claude CLI · Spec Driven Development

**Status: plan only; no game generated or experiment run.** This branch is ready to clone on the execution machine. It begins from the original prompt-only commit `d6a0d1e9fa5f6721ed02222ff8b10397c0e9552e`, which contains only LICENSE and README.md. Its product prompt is byte-for-byte archived in [prompts/original.md](prompts/original.md), SHA-256 `1fa5727d951cf2c7149e00c9f304504ad34436588b9924e3c873e942a464e9b2`. The prompt matches the Starting prompt section of the repository's measurement reference.

## What this branch measures

This is the **Opus 5.5 / Spec Driven Development** cell of a 2 × 3 comparison. All six cells use Claude CLI, the same product prompt, a fresh app, medium effort, and identical token/commit instrumentation. The model and execution style are the planned variables. [EVALUATION.md](EVALUATION.md) defines controls, speed/rework/bug measurements, baseball-card KPI mappings, UI ratings, and the later comparison view. [experiment.json](experiment.json) contains machine-readable branch metadata.

| Model | Style | Branch |
| --- | --- | --- |
| Opus 5.5 | Vibe | `claude.cli.opus-5-5.vibe` |
| Opus 5.5 | Spec Driven Development | `claude.cli.opus-5-5.spec` |
| Opus 5.5 | Steering | `claude.cli.opus-5-5.steering` |
| Sonnet 5.5 | Vibe | `claude.cli.sonnet-5-5.vibe` |
| Sonnet 5.5 | Spec Driven Development | `claude.cli.sonnet-5-5.spec` |
| Sonnet 5.5 | Steering | `claude.cli.sonnet-5-5.steering` |

Vibe sends the original prompt once with neutral measurement instructions. Spec Driven Development submits S01–S08 one at a time, with acceptance checkpoints and no automatic advance. Steering sends the same original prompt once with extra persistent rules for structure, correctness, interaction quality, and validation. The neutral commit rule is identical in every AGENTS.md; additional rules live only in the appropriate treatment. Token overhead from those rules is part of the result.

## Execution plan on the other machine

1. Before running any cell, read EVALUATION.md and freeze the common environment, order, time cap, evidence collection, and evaluator scenarios. Use a fresh clone and new Claude conversation for each cell. For repeats, start again from the recorded prepared SHA, never from an earlier generated game.
2. Clone this branch into a new directory. This branch contains no app package yet; let the model create it during the measured run. Do not copy implementations from another branch or merge main.

```bash
git clone --single-branch --branch claude.cli.opus-5-5.spec git@github.com:joezen777/categorysolitaire.git claude.cli.opus-5-5.spec
cd claude.cli.opus-5-5.spec
export RUN_BASE="$(git rev-parse HEAD)"
git status --short
claude --version
node --version
npm --version
```

3. Record RUN_BASE, the prompt/instruction hashes, Git identity, OS/hardware/browser, provider, CLI/Node/npm versions, and permission/cache policy in an external run record. Ensure a clean tree and working Git identity before starting. Use the same Claude Code version (at least 2.1.284) for all six cells. Keep auth/trust checks outside the timed interval.
4. Start the pinned model with the command below. Do not use floating `opus`/`sonnet` aliases or an automatic fallback chain. Use `/status` to verify the resolved model and `/context` to verify the imported AGENTS.md instructions. Audit/remove unrelated personal/ancestor instructions and custom tools for the experiment; managed policies must be documented consistently. Do not run `/init` or generate new instructions.

```bash
CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 claude --model claude-opus-5-5 --effort medium --setting-sources project
```

5. Once ready, in a second terminal in this same clone, create the timing marker immediately before submitting the first product prompt. Record actual UTC submission/stop/pause timestamps in an external event log as well; the preparation commit time is NOT the run start. In the second terminal, set RUN_BASE again if needed from the recorded prepared hash.

```bash
git commit --allow-empty -m '[tokens-est:0] [kind:event] [phase:run-start] begin measured run'
date -u '+%Y-%m-%dT%H:%M:%SZ'
```

6. Submit the prompt(s) below as directed. Approve ordinary tool permissions under the same policy in every cell, logging delay. Do not supply extra design hints. The model must commit immediately after each change with `[tokens-est:N]` as defined in AGENTS.md; this makes real commit timestamps useful for observing progress. Its estimates are incremental and approximate; export actual CLI usage separately when available.
7. At first-pass completion or the shared time cap, immediately freeze HEAD, record the final report, exit status, dirty-tree status, and UTC stop, and create the RUN_END marker using the commands below. Do this BEFORE screenshots, evaluation, exports, or feedback. The recorded model-stop time is the primary endpoint; the marker may include a small operator delay, which should be logged.

```bash
export FIRST_PASS_SHA="$(git rev-parse HEAD)"
git status --short
date -u '+%Y-%m-%dT%H:%M:%SZ'
git commit --allow-empty -m '[tokens-est:0] [kind:event] [phase:run-end] end measured first pass'
git log --reverse --format='%H%x09%cI%x09%s' "$RUN_BASE..$FIRST_PASS_SHA"
```

8. After the end marker, save CLI transcripts/usage and environment logs outside the app checkout, then evaluate the frozen code using the common external checklist. Record every untested or unavailable measure explicitly. Keep first-pass results distinct from the optional bounded repair and later maintainability studies in EVALUATION.md. Register finished snapshots with the comparison board later from the measurement checkout. These plan-only branches are not deployable games, and this plan does not execute builds, prompts, or deployment.

## Claude instruction loading

[AGENTS.md](AGENTS.md) contains this branch's persistent instructions. [CLAUDE.md](CLAUDE.md) contains only an import of that file so the same instructions load explicitly even when AGENTS auto-discovery is unavailable or affected by ancestor CLAUDE files. Verify the import once with `/context`; do not load a second copy manually. Extra ancestor instructions are not removed by this import.

The commands and model IDs were checked against official [model configuration](https://code.claude.com/docs/en/model-config), [CLI reference](https://code.claude.com/docs/en/cli-reference), and [project memory](https://code.claude.com/docs/en/memory) documentation on 2026-10-14. Model availability still depends on the execution machine's provider/account. If the requested model is unavailable, record the cell as blocked; do not substitute another model silently.

## Submit exactly one spec at a time

Copy only S01's fenced prompt into the fresh session. Inspect its PASS/FAIL/BLOCKED report and actual evidence. Only after S01 passes, submit S02 in that same session, and continue in order through S08. Never paste all specs together, request “complete every spec,” or use a loop/auto-runner. Pause the active timer during human waiting between prompts; preserve total wall time and log each boundary. Extra failure-repair prompts are counted as interventions, even when necessary to progress.

The prompts below are the complete staged treatment. Future specs may be read for context, but AGENTS.md prohibits implementing them before submission. The unchanged original prompt is available in prompts/original.md for traceability, not as a zero-shot execution instruction in this branch.

| Original requirement | Owning spec(s) |
| --- | --- |
| React/Vite/MUI, modular JSON and exact starter deck | S01 |
| Board regions, five slots, 4/5/6/7/8 dealing and card faces | S02 |
| Source/draft drawing, exhaustion and reversed recycle | S03 |
| Legal title/item/group moves, foundation admission, reveal | S04 |
| x/y progress, completion glitter, 100 points and slot reuse | S05 |
| Drag and tap, absolute-positioned readable overlaps, mobile | S06 |
| Menu/restart/quit/mute, Web Audio, win/final score/replay | S07 |
| Integrated fulfillment and production-build handoff | S08 |

### S01 — Scaffold and interchangeable starter deck

Dependency: None; prepared branch only.

```text
S01: Scaffold and interchangeable starter deck

Build the foundation of Category Solitaire using React, Vite, and MUI. Create the runnable development/production app and the complete starter deck as clean JSON array data separating id, categoryTitle, and itemName. Represent category title cards and item cards so the remaining specs can use them; title cards must show the category name and number of items. Keep the deck modular and replaceable as required by the original prompt. Add truthful install/start/build instructions to RUNNING.md.

Use this exact starter deck, preserving spelling and capitalization:

Here is an example starter deck configuration. The first level bullet is the category title and the second level bullet is the category item:
 - King
 - - Scepter
 - - Orb
 - - Throne
 - Chimera
 - - Goat
 - - Lion
 - - Snake
 - Ceramic
 - - Vase
 - - Mug
 - - Plate
 - - Tile
 - - Bowl
 - Jupiter
 - - Io
 - - Ganymedes
 - - Callisto
 - - Europa
 - Think
 - - Consider
 - - Suppose
 - - Imagine
 - - Ponder
 - - Suggestion
 - Smell
 - - Nose
 - - Odor
 - - Perfume
 - - Bouquet
 - - Aroma
 - - Scent
 - Winds
 - - Vendavel
 - - Mistral
 - - Bora
 - - Breeze
 - - Piteraq
 - - Chinook
 - - Zephyr
 - - Sirocco
 - Refuge
 - - Den
 - - Hideout
 - - Hideaway
 - - Safety
 - - Lair
 - - Security
 - - Shelter
 - Beds
 - - Bunk
 - - Crib
 - - Cradle
 - - Berth
 - - Sofa bed
 - - Futon
 - - Cot
 - - Hammock
 - Wine
 - - Riesling
 - - Prosecco
 - - Merlot
 - - Cabernet
 - - Rose
 - - Cava
 - Neck
 - - Bowtie
 - - Dress Shirt
 - - Scarf
 - - Tie
 - Pirate
 - - Rum
 - - Pegleg
 - - Treasure
 - - Cannon
 - - Cutlass
 - - Parrot
 - Aviation
 - - Jet
 - - Runway
 - - Flight
 - - Airport
 - - Pilot
 - - Fuselage
 - - Airline
 - - Airship


Acceptance: dependencies install, development app loads, and production build succeeds; the deck contains 13 title cards plus 73 item cards with stable unique IDs, 86 total; displayed title counts agree with the data. The full game is not expected yet. Do not implement later specs.
```

### S02 — Board layout and initial deal

Dependency: All preceding specs through S01 must pass.

```text
S02: Board layout and initial deal

Continue the existing app after S01. Build the mobile responsive board: score at top left and a menu cog position, source and draft piles at the top, five empty foundation card slots below, and a five-column tableau below those. Start a new game by dealing 4, 5, 6, 7, and 8 cards to the respective tableau columns. Only the bottom/exposed card in each column is face up; other cards show a generic card back. Remaining cards form the face-down source; draft starts empty. Category title faces show title and item count; item faces show the item text.

Acceptance: exactly 30 cards in the tableau and 56 in source, each of the 86 IDs in exactly one place, one exposed face-up bottom per column, five empty foundations, and initial score zero. Verify the required region order on a phone-sized viewport. Movement, drawing, menu actions, and completion are deferred. Preserve S01.
```

### S03 — Draw one card and recycle the draft

Dependency: All preceding specs through S02 must pass.

```text
S03: Draw one card and recycle the draft

At the top is the source deck of cards that deals out one card at a time into a draft pile of cards where the user can pull a card from the top of the draft pile. Cards in the source deck are face down so we can only see the back of the playing cards' generic design. The draft pile of cards is face up. When all cards are used up in the source deck, an empty card slot is shown. If the user clicks on the empty card slot, the cards in the draft pile are flipped over, the order is inverted so that the card on the top of the draft pile is last and the card that was on the bottom of the draft pile is first. The draft pile shows an empty spot again, and the cards are available to draw one at a time again on the source pile. 

Implement the paragraph above in the S02 app. Only the top card of the face-up draft is available to subsequent move interactions. Show empty placeholders for empty piles. Handle an empty source and empty draft without inventing cards.

Acceptance: each source click draws exactly one card; consuming the source exposes its empty slot; clicking that empty slot returns all draft cards face down to source, inverts their order so the former draft bottom is drawn first and former draft top last, and empties draft. Check a known small ordered sequence and card conservation before/after repeated cycles. Do not implement tableau/foundation moves yet. Preserve S01–S02.
```

### S04 — Legal moves, item groups, and reveal

Dependency: All preceding specs through S03 must pass.

```text
S04: Legal moves, item groups, and reveal

Only face-up cards can be moved. The card deck consists of category title cards that list the name of the category and how many cards are in that category. The card deck also consists of category item cards; each category item card will have the text of the item that belongs to the category. If a category title card is at the bottom of one of the columns in the play area, it can only be placed into either an empty column in the play area, on top of a category item card of its same category, or it can be placed into one of the empty five card holder slots. Any other move is considered illegal and the card will make an error sound and drag back to where it started. 

Category item cards can only be placed on top of other category item cards of the same category in the play area, or on an empty column in the play area. A correctly stacked sequence of category item cards can be moved together as a single unit to a valid column. In the five empty cardholders area, the player can only drag a category item card to a slot if the same category's category title card already exists in that slot, or on top of a category item card of the same category. All other moves are illegal and will generate a warning noise and bounce back. 

Implement these rules over the existing board, including top draft cards as move sources. Provide enough selection/move interaction to demonstrate each rule; S06 will finish both required input modes. Create the five foundation slots' title-first and matching-category behavior. After moving a face-up tableau card or valid group, automatically reveal its newly exposed bottom card. Face-up cards already exposed remain face up. Count only collected item cards in each foundation's category progress. Keep completed foundations in place until S05 adds completion/clearing.

Acceptance: exercise each allowed title/item destination and each rejected wrong-category/title/face-down destination; illegal moves leave state unchanged; valid same-category item sequences move together to legal tableau columns; a moved draft card exposes the next draft top; a vacated tableau bottom flips. Do not grant arbitrary groups moves to destinations only specified for a single card. Implement visible rejection now; audio is finished in S07. Preserve S01–S03.
```

### S05 — Foundation progress, clearing, and score

Dependency: All preceding specs through S04 must pass.

```text
S05: Foundation progress, clearing, and score

When the player puts category item cards into one of the five holder slots above the play area, a counter will show above the card displaying the category title text as well as how many cards have been collected in an "x/y" number format. When all category item cards for its category have been placed in its holder slot, the deck will glitter and then disappear with a success noise, awarding the user 100 points, and freeing up the slot. 

Implement this completion behavior in the existing game. Maintain five reusable slots, the category title plus x/y item counter above each occupied slot, and the top-left score. The title card does not count as an item. Categories have different item totals derived from the starter deck. Make glitter/clearing visible; S07 adds the requested procedural sound.

Acceptance: incomplete categories retain their slot; matching the final required item awards exactly 100 points once, clears that category, and makes the slot receptive to another title; a rejected card never increments progress or score. Complete two distinct categories and verify score 200 and slot reuse. Preserve S01–S04. The final win modal and sound remain for S07.
```

### S06 — Drag, tap, overlapping cards, and mobile play

Dependency: All preceding specs through S05 must pass.

```text
S06: Drag, tap, overlapping cards, and mobile play

To ensure mobile friendliness, implement both drag-and-drop (using a library like @dnd-kit/core or framer-motion) AND tap-to-move functionality (if a user taps a valid card and then taps a valid destination, the card moves there). 

If a player places a card on top of another face-up card in the play area, all cards remain face up. Use CSS absolute positioning with a calculated `top` offset for stacked cards so they overlap, making a smaller version of the category item text visible at the top of the stacked cards while the bottom card shows the full face. 

Implement these interactions and rendering requirements for the existing legal-move system. Both input modes must move an eligible single card, and a correctly stacked same-category item sequence must move together to a valid tableau column. Invalid drops or taps must reject the move and restore the card/group to its starting location. Keep face-down cards immovable. Ensure touch users can reach the source, draft, all five foundations, and all five tableau columns.

Acceptance: run equivalent valid/invalid moves through dragging and tap-select/tap-destination and compare outcomes; demonstrate moving a matching item sequence as a unit; confirm old and new face-up cards remain face up and covered labels remain visible using absolute positioning with calculated top offsets. Check a narrow phone viewport and desktop. Do not introduce extra game modes or features. Preserve S01–S05; S07 supplies audio.
```

### S07 — Procedural audio, menu, and win/replay

Dependency: All preceding specs through S06 must pass.

```text
S07: Procedural audio, menu, and win/replay

The score should show at the top left of the screen. There should be a basic menu cog option that allows the user to restart the game, quit, or turn off sound. Use the native browser Web Audio API to generate the requested error, warning, and success sound effects procedurally so no external audio files are needed. When all cards from the draw pile and play area have been successfully grouped and cleared, trigger a "Game Over - You Win!" modal with the final score and a button to play again.

Finish the error/warning audio for invalid moves and success audio for category completion requested in prior specs. Connect restart, quit, and sound-off controls in the menu. Use browser-generated Web Audio with no external audio assets. Implement a clear quit outcome and state your interpretation because the original prompt does not specify its destination. Restart/play-again must produce a fresh game. Victory requires the full deck to have been grouped and cleared, including any cards remaining in draft or foundations.

Acceptance: illegal moves and completion emit the respective effects when enabled; mute suppresses all requested sounds; restart and replay reset score/piles; quit exits active play coherently; the win modal contains the exact “Game Over - You Win!” text, final score, and play-again control. An incomplete game must not win. With all 13 starter categories cleared, score is 1300. Preserve S01–S06.
```

### S08 — Whole-game integration and final handoff

Dependency: All preceding specs through S07 must pass.

```text
S08: Whole-game integration and final handoff

Finish the same Category Solitaire product after S01–S07. Review the original prompt in prompts/original.md and reconcile omissions or inconsistencies in the already authorized features. This is integration, not a request for new features or an architecture redesign.

Acceptance: demonstrate the full required app: React/Vite/MUI; interchangeable id/categoryTitle/itemName deck; exact starter categories/items; source draw/recycle order; five reusable foundations; 4/5/6/7/8 initial tableau and reveals; legal titles/items/group moves; illegal bounce-back and warning; both drag-and-drop and tap-to-move; absolute-positioned readable overlaps; x/y counters, glitter, success sound, and 100-point clearing; top-left score; restart/quit/mute; Web Audio without external files; win/final score/play again. Confirm it remains usable on a narrow phone and desktop and run a production build. Run available relevant checks and honestly identify missing test/browser coverage.

Repair observed integration defects with immediate separate commits and keep RUNNING.md accurate. Report completed requirements, actual checks/results, HEAD, assumptions, and remaining defects. End with SPEC S08 status and stop. Do not deploy, push, run evaluation tooling, or start a repair/maintenance study yourself.
```
