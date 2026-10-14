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

## Spec driven execution

- Work on exactly ONE operator-submitted spec, S01 through S08, at a time. Never advance automatically, loop over specs, or implement the whole original prompt at S01.
- Read the current spec in README.md, its stated dependencies, and existing implementation. The original prompt is reference context; future specs are a roadmap, not authorization to implement them early.
- For the current spec, state a short implementation plan, make changes with the immediate commit rule above, then check that spec's acceptance conditions. Add focused automated checks when useful; record manual checks and missing coverage honestly. Repair current-spec failures with separate immediate commits.
- Preserve completed-spec behavior and rerun relevant earlier checks when the current spec changes it. Do not add unrelated features, a new design system mandate, or steering-only coding standards.
- End with `SPEC Sxx: PASS`, `FAIL`, or `BLOCKED`, supporting evidence, HEAD, and remaining issues. Then STOP and wait for the next spec prompt. A failed/blocked spec does not authorize skipping ahead.
- The operator advances only after inspecting the evidence. If the current spec failed, wait for a bounded repair instruction for that spec. Record it as an extra intervention, not as a new planned spec.
- Use the same conversation through S08 to preserve prior-spec context. If compaction/restart is necessary, report it; resume the same run/session and current spec, never a different model or experiment.
