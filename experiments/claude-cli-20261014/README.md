# Claude CLI experiment results — 2026-10-14

Six-cell pilot comparing pinned Opus 5.5 and Sonnet 5.5 at medium effort across Vibe, Steering, and Spec Driven Development. Each cell uses a fresh clone and session. Spec checkpoints are reviewed individually by the Codex operator; no automatic advancement.

[Protocol](protocol.json) · [Operator notes and deviations](operator-notes.json) · [Machine-readable results](results.json)

| Model | Method | Build | Tests | Active minutes | Wall minutes | Evidence | Demo |
|---|---|---|---|---:|---:|---|---|
| Opus 5.5 | Vibe | passed | passed | 7.8 | 7.8 | [Report](claude.cli.opus-5-5.vibe.md) | [Play](https://claude-cli-opus-5-5-vibe-solitaire.cardbrdbx.com/) |
| Opus 5.5 | Spec Driven Development | passed | passed | 25.0 | 41.6 | [Report](claude.cli.opus-5-5.spec.md) | [Play](https://claude-cli-opus-5-5-spec-solitaire.cardbrdbx.com/) |
| Opus 5.5 | Steering | passed | passed | 64.2 | 64.2 | [Report](claude.cli.opus-5-5.steering.md) | [Play](https://claude-cli-opus-5-5-steering-solitaire.cardbrdbx.com/) |
| Sonnet 5.5 | Vibe | passed | unavailable | 3.1 | 3.1 | [Report](claude.cli.sonnet-5-5.vibe.md) | [Play](https://claude-cli-sonnet-5-5-vibe-solitaire.cardbrdbx.com/) |
| Sonnet 5.5 | Spec Driven Development | passed | passed | 15.8 | 19.5 | [Report](claude.cli.sonnet-5-5.spec.md) | [Play](https://claude-cli-sonnet-5-5-spec-solitaire.cardbrdbx.com/) |
| Sonnet 5.5 | Steering | passed | passed | 12.8 | 12.8 | [Report](claude.cli.sonnet-5-5.steering.md) | [Play](https://claude-cli-sonnet-5-5-steering-solitaire.cardbrdbx.com/) |

## Reading the results

Tests are model-authored suites rerun independently after the first-pass freeze. Browser smoke checks are separate and do not establish full-game correctness. Four independent pure-rule probes cover item groups, title-containing groups, and two positive controls; their implementation was added after observing Opus Vibe's interpretation and then applied to every cell against the common preregistered rules. These are targeted probes, not an exhaustive rule-pass rate. No ten-game visual harness, Safari/device validation, human UX ratings, repair study, or repeat trials were performed. One observation per cell cannot establish an overall model ranking. Missing metrics are null, displayed as N/A (—).

Active time sums CLI invocation durations; wall time includes checkpoint pauses, including the user pause/resume between Opus S01 and S02. Commit estimates are approximate and separate from actual provider usage. Provider totals include cache reads and creation exactly once per distinct incremental CLI result, including background continuations; list-price cost metadata is not a subscription charge. Full raw transcripts are retained locally; public evidence includes final reports, aggregate usage, actual commit history, test/build logs, browser checks and screenshots.

Bundle sizes use KiB and exclude sourcemaps; JS bytes are a subset of total bundle bytes. Dependency counts include distinct runtime and dev names. Security counts use npm audit metadata total, without double-counting severity totals. Duplication uses the installed jscpd version with minimum 5 lines / 50 tokens on the listed application-source files. Source lines, maintainability, complexity, strict TypeScript diagnostics, unused exports, line coverage, and Lighthouse are unavailable unless explicitly supported by a recorded measurement. Process counts cover only file-changing measured commits, excluding start/end events; total churn includes tracked lockfiles and tests.

Deployment uses frozen result commits and successful checked production builds; it does not bypass TypeScript failures. The previous five variants remain on the board.

## Within-method comparisons

Differences below are Opus minus Sonnet for this single pilot. They describe these runs, not an overall model ranking.

| Method | Active minutes difference | Provider token difference | Bundle KiB difference |
|---|---:|---:|---:|
| Vibe | +4.7 | +1,057,077 | +92.4 |
| Spec Driven Development | +9.3 | +5,752,655 | +17.7 |
| Steering | +51.4 | +1,617,445 | +2.9 |

Commit timelines with checkpoint pause bands appear in each report. All displayed runs are first-pass; no repair runs or repetitions were conducted.
