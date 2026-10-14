# Evaluation plan — operator and evaluator only

Status: planned, not executed. Use the same protocol for all six cells. Keep evaluation tooling on a separate checkout of the measurement branch, as the existing baseball-card specifications require. Do not ask the game-building model to implement this evaluator, its dashboard, or this scorecard.

## Research questions and experiment matrix

Compare Opus 5.5 and Sonnet 5.5 within each of Vibe, Spec Driven Development, and Steering, all in Claude CLI. Compare the three styles within each model. Treat model × style interactions as possible outcomes. Do not assume the larger model wins.

The six initial runs form a pilot, one observation per cell. They cannot establish a reliable general model ranking. For stronger evidence, repeat each cell at least three times from its prepared SHA, with fresh sessions and separate clones. Randomize/interleave the six cells within each repetition; retain failures and timeouts rather than selecting the best run. Report individual runs and median/range; with enough repetitions add uncertainty intervals and paired comparisons.

The treatment includes its extra instruction/context tokens and, for specs, staged prompts and checkpoints. A steering benefit cannot be attributed solely to architecture: it also receives explicit interaction and validation guidance. Baseline product requirements remain the same. All cells receive the identical commit instrumentation; call Vibe “instrumented zero-shot,” since AGENTS adds measurement rules.

## Pre-register controls before the first run

- Same machine, OS, Node/npm versions, CLI version, provider/account class, permission mode, browser builds, network conditions, tool access, and hardware/resource limits. Record versions and exact commands. Use Claude Code 2.1.284 or later for both models and pin the same installed version throughout the comparison.
- Exact model IDs from experiment.json; medium effort for both. The same effort label does not imply the same amount of computation. Record resolved model IDs, context window, compactions, failures/fallbacks, and provider usage. Stop and label a fallback run invalid for the primary model comparison.
- New clone/session per cell; auto memory disabled; no cross-cell chat/history, global/custom skills, plugins, agents, MCP helpers, or previous generated code. Audit project and ancestor instructions with /context. Record unavoidable organization policies identically. `--setting-sources project` alone does not remove ancestor instruction files or every managed customization.
- Use the original 86-card deck (13 title cards, 73 items), no code from prior branches, no new features. Dependencies are installed by the model and count toward end-to-end time. Clear or identically prewarm package caches before each cell; record the chosen policy and install/network time.
- One implementation agent, no advisor/subagent model calls. Ordinary tools and browser access, if available, must be the same across cells. No human design advice or fixes during the primary run. The operator may approve permissions without adding solution hints; log permission delays and each intervention.
- Default cap: 90 minutes of active run time per cell, with the same cap across all eight specs combined. Human waiting between spec prompts is paused and separately logged; model/tool/build/test/install time remains active. Also report total wall time. At the cap, stop and preserve the partial output as a timeout. Choose a different cap only before running any cell and record it for all six.
- Spec branches receive exactly S01–S08, one at a time in one session. Record any extra repair prompt as an intervention. Zero-shot branches receive exactly one product prompt until their first-pass stop.

## Capture boundaries and raw evidence

1. Save the prepared branch HEAD as `RUN_BASE` before the run. Record the original-prompt SHA-256 and instruction hashes, model, style, and repetition ID in the run record. Preparation commits and original history are excluded.
2. Complete auth, trust, version/model/instruction checks before timing. Create a `RUN_START` empty commit immediately before submitting the first product prompt. Record UTC start in an external event log. Empty lifecycle commits carry `tokens-est:0`, `kind:event`, and a phase label; they are excluded from change counts and token estimates.
3. After every coherent file-writing action/batch, the model commits immediately. Preserve full commit hashes, parents, subjects, author time, committer time, and changed files. All timestamps are real; never amend, squash, rewrite, or set Git date variables.
4. Record each spec submit/finish, human pause start/end, permission delay, failed command, build/test result, and any restart. Record the timestamp and commit of first successful production build and first independently observed playable game. If the model never runs a build, first-build time is unknown, not zero.
5. At the model's first-pass stop (or cap), record UTC finish, `FIRST_PASS_SHA`, status, working-tree state, uncommitted tail work, and final report BEFORE any evaluator feedback. Immediately create the empty `RUN_END` commit, before screenshots, evaluation, exports, or other evidence collection. `RUN_END` marks the observed stop; the recorded UTC model-stop time remains the primary endpoint. Then capture screenshots/recordings and evaluate the frozen code SHA. A dirty tree is a protocol deviation; preserve its diff rather than silently discarding it.
6. Export CLI session/transcript and available usage records outside the repository, preserving raw input/output/cache counters and source/version. Do not sum duplicated streaming records or cached input twice; use provider aggregate totals or deduplicate request/message IDs according to the exported format. Record missing fields as null. Keep tokens-est totals separate from actual provider usage and any USD charge. Estimated run total = sum of change-commit estimates plus only the FINAL run tail estimate. Intermediate spec-tail reports are checkpoints; a later incremental commit already includes that work, so summing all spec tails would double-count it.
7. After the end marker and evaluation, preserve the code SHA separately from RUN_END. Store logs, scorecards, screenshots, and environment metadata together outside the implementation checkout. Remove secrets before sharing transcripts.

Useful read-only extraction commands, with RUN_BASE and FIRST_PASS_SHA set to recorded hashes:

```bash
git log --reverse --format='%H%x09%P%x09%aI%x09%cI%x09%s' "$RUN_BASE..$FIRST_PASS_SHA"
git log --numstat --format='commit %H' "$RUN_BASE..$FIRST_PASS_SHA"
git diff --stat "$RUN_BASE" "$FIRST_PASS_SHA"
```

Elapsed-to-first-change = first change commit UTC minus recorded start. Inter-change intervals use committer timestamps. End-to-end wall time = stop minus start; active time subtracts explicitly logged human pauses, not model reasoning or tool work. Commits timestamp completed changes; they do not measure pure model latency or typing speed. Missing/late commits are instrumentation defects to disclose. Commit count is not a productivity score.

## Existing baseball-card KPIs

Provenance: the frozen measurement reference in experiment.json, files `.kiro/specs/ai-baseball-cards-dashboard/requirements.md` and `design.md`. Retain these names/keys so a later dashboard can consume the data. Store tool/version, scope, raw output, units, and availability reason with each value.

| Group | Key | Definition and comparable collection |
| --- | --- | --- |
| Code | sloc | Nonblank, noncomment application source lines; use a pinned source-aware counter. |
| Code | fileCount | Application source file count in the same declared scope. |
| Code | avgFileSize | sloc / fileCount, null for an empty scope. |
| Code | bundleSize | Total production dist bytes / 1024 (KiB), with a fixed sourcemap policy. |
| Quality | maintainability | Maintainability Index, 0–100, from the same supported parser/formula. |
| Quality | maxComplexity | Maximum function cyclomatic complexity from the same analyzer. |
| Quality | duplication | Duplicated source percentage with fixed jscpd thresholds/exclusions. |
| Health | securityIssues | Known dependency vulnerabilities from a pinned audit approach; retain severity totals and count advisories once. |
| Health | tsErrors | Strict TypeScript diagnostics when applicable; JavaScript-only/no valid strict configuration is N/A, not zero. |
| Health | unusedExports | Unused exported symbols from an actual dependency-aware analyzer. |
| Process | commits | File-changing implementation/test/fix/app-doc commits in RUN_BASE..snapshot; exclude lifecycle events and setup. |
| Process | churn | Sum additions + deletions across those commits; report total churn and application-source-only churn separately. |
| Process | coverage | Application source line coverage from actual executed tests with a fixed source scope; missing evidence is null. |
| UX | lighthouseA11y | Actual Lighthouse accessibility audit of the rendered running app, 0–100; not a static-HTML score. |
| Dependencies | depCount | Number of distinct direct dependency names across dependencies and devDependencies; also report each group separately. |
| Dependencies | bundleWeight | Production JavaScript bytes / 1024 (KiB); exclude maps and do not add this subset to bundleSize. |

For source metrics/churn, include all authored application source and styles regardless of folder, and disclose the glob; exclude plan/evaluation files, lockfiles, dependencies, generated output, and vendored code. Record test-code size/churn separately. Distinguish model-authored coverage from independent acceptance pass rate; neither proves correctness alone.

The current collector at the frozen reference is not authoritative for several fields: it counts whole-history commits/churn, counts raw lines for SLoC, may estimate maintainability/complexity from file size, approximates unused exports, and labels static HTML checks as Lighthouse. Some failed/missing tools become zero, and security severity aggregation can double-count a total. A later evaluator must correct or replace those collectors externally before reporting these values. Never relabel a heuristic as an actual measurement. Do not merge the measurement branch into game variants.

Honor the baseball-card contract: unavailable/failed/not-applicable values are null with a reason (display N/A); 30-second per-metric and 120-second per-branch collection limits, with partial results preserved. Browser playtests and human UX rating are a separately timed evaluation stage, outside those code-metric limits and outside implementation time.

## Behavior, UI, and user experience

Freeze the same acceptance checklist before evaluating all cells. Test both pointer dragging and touch/tap input where relevant. Keep expected behavior independent of each model's self-written tests.

| Area | Fixed scenarios and evidence |
| --- | --- |
| Deck/deal | Exact 13 categories/73 items/86 unique cards; 4/5/6/7/8 tableau; only bottom cards face up; 56 source cards. |
| Draw/recycle | Draw one at a time; only top draft movable; exhaust source, invert draft back into source in specified order; no duplicates or losses. |
| Tableau legality | Titles to empty columns or matching items; items to empty columns or matching items; reject other categories/title targets and face-down moves. |
| Groups/reveal | A valid face-up matching item sequence moves as a unit to a legal column; illegal moves restore all positions; newly exposed bottom card reveals. |
| Foundations | Five reusable slots; title required before matching items; counter shows title and x/y; completion glitters, sounds, clears, and awards exactly 100. |
| Interaction | Equivalent drag/tap result; canceled drop, invalid drop, rapid repeated input, long stack, and mobile scroll interactions. |
| Controls/end | Score top left; restart, quit, mute; generated Web Audio; win only when all cards/categories cleared; final 1300 for the starter deck; play again. |
| Layout/feedback | Readable overlaps, visible selection/destinations/errors, usable empty slots, no obscured controls, clear completed-category and win feedback. |

Initial deal order was not specified in the original prompt. For repeatable UI scenarios, predeclare one evaluator-controlled random-number stream for each scenario (injected before app initialization, identical across variants) or drive the required states through visible legal moves. Do not modify app source or require a seed feature only in one cell. If implementations consume randomness differently, record the resulting deal and avoid claims of identical board state. An unreached scenario is untested, not passed. Do not count an unsolvable random deal as an implementation defect without evidence.

Capture the initial board, selected card/valid target, illegal move, longest available stack, midgame foundation, completion, menu/mute, and win/play-again at 360×800, 390×844, 768×1024, and 1440×900. Use the same browser/device pixel ratio and interaction scenarios. Include short video/GIF evidence for dragging, tapping, error rollback, and completion. Record any scenario that cannot be reached. Evaluate Chrome and Safari touch behavior with pinned versions; if a device/browser is unavailable, mark that coverage missing.

Blind the model and style labels for rating. Use at least two independent raters if available, record each rating, then average. Rate five dimensions 1–5: visual hierarchy/consistency, card/text readability, touch/drag/tap usability, responsive layout, and state feedback/accessibility. Anchor 1 = blocks basic use; 3 = usable with noticeable friction; 5 = clear and polished across the tested scenarios. UX score /100 = 4 × sum of the five mean ratings. Preserve dimension scores and examples; do not blend Lighthouse or maintainability into this UX score.

Optionally measure naive-user task success and time (draw, move by tap, move by drag, complete a category, mute/restart) using the same tasks, participant instructions, and counterbalanced app order. Separate rule-discovery time from interaction failures. Aesthetic rating is subjective; actual task completion provides complementary evidence.

## Bugs, rework, and extension effort

Track each unique defect with ID, scenario, expected/actual behavior, severity (blocker/major/minor/cosmetic), first observed SHA, reproduction evidence, fix SHA, and retest/regression result. Report unique confirmed defects, scenario pass/total/untested, defects per tested scenario, broken builds, and regressions. Audit dependency vulnerabilities separately from gameplay bugs.

First-pass results are the primary comparison. If evaluating repair, use the same repair template and 20-minute active-time cap per cell after freezing first pass. Supply that cell's independently observed failures in the same table format; different defect lists are expected. Prompt: “Fix only the attached independently reproduced defects. Preserve existing requirements and follow AGENTS.md, including immediate token-prefixed commits. Report retest evidence and remaining defects. Stop at the allotted repair limit.” Record the additional input and human intervention count. Report repair time, fix commits, tokens, source churn, and remaining defects separately; do not replace the first-pass result with the improved snapshot.

For maintenance, an optional second study can ask each completed variant to replace the starter deck with the SAME prewritten replacement JSON deck, preserving all game rules. Freeze the replacement dataset and acceptance checks before running this stage and apply the same 15-minute cap/model/settings. Report files touched, time, tokens, bugs/regressions, and rule-module edits. Do not include this feature/change phase in the primary creation result, and do not improvise different requests per cell.

Churn is a rework proxy, not proof of wasted effort. Report source lines deleted or rewritten after the first playable snapshot, explicit fix commits, repeated failures, and repaired defects together. Do not reward fewer commits when the protocol requires frequent commits.

## Planned comparison presentation

After runs, extend the existing external baseball-card board with six cells: rows = Opus/Sonnet, columns = Vibe/Spec/Steering. Each card needs explicit model, “Claude CLI,” method, prepared SHA, result SHA, run status, same-viewport UI thumbnail, demo/evidence links, first-pass UX dimensions, rule pass rate, bugs by severity, active/wall time, and estimated versus actual tokens. Include the existing Code/Quality/Health/Process/UX/Dependencies groups with units and tooltips. Mobile may use the existing carousel pattern. Show a first-pass/repair toggle and separate repeated-run summaries; never hide failed cells or unavailable metrics.

Add a timeline of real commits aligned to run start, with type/spec markers and pause bands, plus pairwise model differences within each style. Keep model identity hidden until UX ratings are submitted. Do not present a single overall winner by averaging unlike quantities; let viewers inspect UI evidence beside speed and code measurements.

This preparation task creates no implementation, deployment, dashboard changes, or measured results. The existing deploy script has a fixed branch list; these six branches will not automatically appear on the board. Register and evaluate finished snapshots later in the measurement checkout. Never run the deploy workflow against these plan-only branch tips.
