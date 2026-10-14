# Category Solitaire — Opus 5.5 · Claude CLI · Steering

**Status: plan only; no game generated or experiment run.** This branch is ready to clone on the execution machine. It begins from the original prompt-only commit `d6a0d1e9fa5f6721ed02222ff8b10397c0e9552e`, which contains only LICENSE and README.md. Its product prompt is byte-for-byte archived in [prompts/original.md](prompts/original.md), SHA-256 `1fa5727d951cf2c7149e00c9f304504ad34436588b9924e3c873e942a464e9b2`. The prompt matches the Starting prompt section of the repository's measurement reference.

## What this branch measures

This is the **Opus 5.5 / Steering** cell of a 2 × 3 comparison. All six cells use Claude CLI, the same product prompt, a fresh app, medium effort, and identical token/commit instrumentation. The model and execution style are the planned variables. [EVALUATION.md](EVALUATION.md) defines controls, speed/rework/bug measurements, baseball-card KPI mappings, UI ratings, and the later comparison view. [experiment.json](experiment.json) contains machine-readable branch metadata.

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
git clone --single-branch --branch claude.cli.opus-5-5.steering git@github.com:joezen777/categorysolitaire.git claude.cli.opus-5-5.steering
cd claude.cli.opus-5-5.steering
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

## Submit this single zero-shot product prompt

Copy only the contents of the following text block into the fresh session once. AGENTS.md is loaded as persistent context. Allow the model to reach its first-pass stop without product follow-ups, then freeze/evaluate the result. The product text is identical in Vibe and Steering, including the exact starter deck. Any clarification question or additional instruction must be logged as an intervention; preserve unresolved assumptions in the final report rather than coaching the model toward another branch's result.

```text
Create a solitaire style mobile responsive web app using React/Vite/MUI components. Instead of a classic playing cards deck, we have a card deck that has several different categories. Make the code modular to easily substitute in new decks, using a clean JSON array for the deck data that separates `id`, `categoryTitle`, and `itemName` so it is easily swappable. 

At the top is the source deck of cards that deals out one card at a time into a draft pile of cards where the user can pull a card from the top of the draft pile. Cards in the source deck are face down so we can only see the back of the playing cards' generic design. The draft pile of cards is face up. When all cards are used up in the source deck, an empty card slot is shown. If the user clicks on the empty card slot, the cards in the draft pile are flipped over, the order is inverted so that the card on the top of the draft pile is last and the card that was on the bottom of the draft pile is first. The draft pile shows an empty spot again, and the cards are available to draw one at a time again on the source pile. 

Below the source and draft piles are five empty card holder slots (the Foundation). Because there are more categories in the deck than slots, when a category is completed and disappears, that slot becomes empty and receptive to a new category title card. 

Below the five empty card holder slots is the play area (the Tableau). The play area has five columns of cards when the game is started. The first column should have four cards, the second column five cards, the third column six cards, the fourth column seven cards, and the fifth column eight cards. All cards are face down except for the bottom card of each column. Whenever a face-up card is moved from a column, the new bottom card of that column must automatically reveal and flip face-up. 

Only face-up cards can be moved. The card deck consists of category title cards that list the name of the category and how many cards are in that category. The card deck also consists of category item cards; each category item card will have the text of the item that belongs to the category. If a category title card is at the bottom of one of the columns in the play area, it can only be placed into either an empty column in the play area, on top of a category item card of its same category, or it can be placed into one of the empty five card holder slots. Any other move is considered illegal and the card will make an error sound and drag back to where it started. 

Category item cards can only be placed on top of other category item cards of the same category in the play area, or on an empty column in the play area. A correctly stacked sequence of category item cards can be moved together as a single unit to a valid column. In the five empty cardholders area, the player can only drag a category item card to a slot if the same category's category title card already exists in that slot, or on top of a category item card of the same category. All other moves are illegal and will generate a warning noise and bounce back. 

To ensure mobile friendliness, implement both drag-and-drop (using a library like @dnd-kit/core or framer-motion) AND tap-to-move functionality (if a user taps a valid card and then taps a valid destination, the card moves there). 

If a player places a card on top of another face-up card in the play area, all cards remain face up. Use CSS absolute positioning with a calculated `top` offset for stacked cards so they overlap, making a smaller version of the category item text visible at the top of the stacked cards while the bottom card shows the full face. 

When the player puts category item cards into one of the five holder slots above the play area, a counter will show above the card displaying the category title text as well as how many cards have been collected in an "x/y" number format. When all category item cards for its category have been placed in its holder slot, the deck will glitter and then disappear with a success noise, awarding the user 100 points, and freeing up the slot. 

The score should show at the top left of the screen. There should be a basic menu cog option that allows the user to restart the game, quit, or turn off sound. Use the native browser Web Audio API to generate the requested error, warning, and success sound effects procedurally so no external audio files are needed. When all cards from the draw pile and play area have been successfully grouped and cleared, trigger a "Game Over - You Win!" modal with the final score and a button to play again.

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

```
