# Experiment instructions

## Scope and measurement (identical in all six branches)

- Implement only the product prompt submitted by the operator. The README runbook, experiment metadata, and EVALUATION.md describe the experiment; they are not requests to implement a dashboard or run other experiments. Do not read EVALUATION.md, evaluator evidence, other branches, prior implementations, or comparison results during implementation; those materials are for the operator/evaluator.
- Use the exact model selected by the operator throughout the run. Do not switch models, use advisors, delegate to subagents, or start background coding agents. Report a model mismatch or fallback and stop the measured run.
- **Commit immediately after every change, using a commit-message prefix `[tokens-est:N]` where N is your incremental estimate of input plus output tokens spent since the preceding commit (or run start for the first change).** Include reasoning tokens only if exposed or estimable; state unknown components in your final report. This is an estimate, never a billing claim or a cumulative counter.
- A change means one coherent file-writing tool action or tightly coupled multi-file batch, including source, tests, configuration, lockfiles, or documentation. Finish that action/batch, stage its exact intended paths, and commit BEFORE starting another edit, test/build, lengthy analysis, or unrelated tool action. Do not accumulate a session or whole spec into one final commit. Read-only actions do not need commits.
- Use `[tokens-est:N] [kind:implementation|fix|test|docs] [step:zero-shot|S01|...|S08|repair] short description`, choosing one kind and one step. Example: `[tokens-est:1450] [kind:implementation] [step:zero-shot] add initial deal`. A test-discovered repair must be a new immediate `kind:fix` commit. Commit generated intended files such as a new lockfile promptly; ignore caches, node_modules, build output, logs, and secrets.
- Never amend, squash, rebase, backdate, or rewrite measured commits. Do not push or deploy as part of the implementation run. If committing fails, stop changes and report the failure; do not continue accumulating uncommitted work. Timing checkpoints may contain a failing intermediate state; describe it accurately.
- Keep the supplied prompt, README, AGENTS.md, CLAUDE.md, experiment.json, and EVALUATION.md fixed during the run. Add actual application run instructions to RUNNING.md. Normal app implementation files and the ignore file may be created/edited.
- At each requested stopping point, report HEAD, what works, what is incomplete, commands/checks actually run and their outcomes, and any assumptions. Never claim a check passed without running it. Record approximate uncommitted reasoning/read-only tail tokens in the final report; do not inflate the last change estimate retrospectively.

## Steering: code structure and game correctness

- Use React, Vite, and MUI as the product prompt requires. Keep deck data, game rules/state transitions, presentation, input handling, and audio concerns separate. Prefer small cohesive modules and direct composition; avoid a single component containing the whole game or speculative framework layers.
- Keep a single authoritative game state. Give cards stable unique IDs and represent title/item roles explicitly. Derive counts and completion from the deck data; do not scatter category names, item totals, or deck-specific conditions through components. Make a replacement deck a data change.
- Express legal moves and state transitions as pure functions where practical. Validate a whole move before changing state; move groups atomically; never mutate React state in place or use DOM position as game truth. Illegal input must leave card order, revealed state, and score unchanged.
- Route drag-and-drop and tap-to-move through the same move validation and transition path. Reveal the newly exposed tableau card after the move. Recycle the stock in the specified order. Award 100 points once per completed category, and determine victory from the full remaining game state.
- Keep timers, audio contexts, event listeners, and animations outside the rule engine; clean them up. Rapid taps, repeated drops, or a restart during completion must not duplicate cards, award points twice, or leave delayed effects applied to a new game.
- Prefer the smallest dependency set that meets the prompt. Commit the lockfile. Do not add a backend, accounts, online services, persistence, external audio downloads, or unrelated game features. Avoid unsafe HTML injection, broad error suppression, placeholder controls, and silent failure.

## Steering: final product and interaction

- Build a coherent mobile-first board with consistent card dimensions, spacing, typography, and hierarchy. Keep score/menu, source/draft, five foundations, and five tableau columns clearly distinguishable. Use the required absolute positioning and calculated offsets while keeping overlapped item labels readable.
- Check narrow phones (360px and 390px), tablets (768px), and desktop (1440px). Keep all five columns usable, avoid accidental page overflow and clipped drop targets, and retain readable labels and access to long stacks. Do not hide required controls to fit the viewport.
- Provide visible selection, legal-target, invalid-move, completion, and win feedback. Do not rely only on color or sound. Touch dragging must cooperate with scrolling, and a tap must not accidentally execute a drag. Respect reduced-motion preferences.
- Use semantic buttons and labeled controls, visible keyboard focus, sufficient contrast, and a usable keyboard route for card selection and movement. Manage modal focus and expose score/status updates appropriately. Prefer practical touch targets around 44px where layout permits.
- Initialize/resume Web Audio after a user gesture; respect mute across error and success events, handle unsupported audio gracefully, and clean up obsolete effects. A user should be able to restart or play again without reloading the page; quit must lead to a clear non-playing state.

## Steering: validation and completion

- After each immediate change commit, run focused checks before relying on that change. Prioritize rule tests for deck conservation/uniqueness, 4/5/6/7/8 dealing, source recycling, legal and illegal moves, group movement, reveal, category clearing, scoring once, and victory.
- Check drag and tap produce equivalent results, restart/quit/mute, and the required mobile board in a browser. Include a production build and relevant integration checks. Do not use tests that merely repeat the implementation as evidence of correctness.
- Fix observed failures in new immediate commits; preserve the chronology. Do not declare completion with known console errors, nonworking controls, invented check results, or placeholders. Report environmental limits and any remaining defects explicitly.
