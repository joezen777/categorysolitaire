# Implementation Plan: AI Baseball Cards Dashboard

## Overview

This plan implements a metrics collection module and retro baseball-card dashboard redesign for the Category Solitaire Amplify deployment. The work proceeds from core infrastructure (metrics module) through deploy script integration, then to the visual rendering layer (baseball cards, tooltips, carousel), with property tests validating correctness at each stage.

## Tasks

- [ ] 1. Create metrics collector module
  - [ ] 1.1 Create `scripts/collect-metrics.mjs` with exported `collectMetrics` function signature, per-metric timeout (30s), global timeout (120s), and null-fallback error handling
    - Implement the module skeleton with `AbortController` per metric helper and a 120-second circuit breaker
    - Each metric helper runs sequentially and returns `null` on failure or timeout
    - Export `collectMetrics(worktreePath, branchMeta)` returning a `MetricsResult` object
    - _Requirements: 1.1, 1.8, 1.9, 1.10, 1.11, 1.12_

  - [ ] 1.2 Implement file-system metric helpers (SLoC, File Count, Avg File Size, Bundle Size)
    - Use `find` + `wc -l` via `child_process` on `src/` for SLoC, file count, avg file size
    - Use `fs.statSync` on `dist/` for bundle size in KB
    - _Requirements: 1.2_

  - [ ] 1.3 Implement quality metric helpers (Maintainability Index, Max Cyclomatic Complexity, Duplication Percentage)
    - Use `escomplex` or `typhonjs-escomplex` for maintainability and complexity
    - Use `jscpd --reporters json` for duplication percentage
    - _Requirements: 1.3_

  - [ ] 1.4 Implement health metric helpers (Security Issues, TS Errors, Unused Exports)
    - Use `npm audit --json` to count security advisories
    - Use `tsc --noEmit --strict` error line count for TS errors
    - Use `knip` or `ts-unused-exports` for unused exports
    - _Requirements: 1.4_

  - [ ] 1.5 Implement process metric helpers (Commit Count, Code Churn, Test Coverage)
    - Use `git log --oneline | wc -l` for commit count
    - Use `git log --numstat` to sum additions and deletions for churn
    - Use `vitest run --coverage` and parse lcov summary for coverage percentage
    - _Requirements: 1.5_

  - [ ] 1.6 Implement UX and dependency metric helpers (Lighthouse A11y, Dependency Count, Bundle Weight)
    - Use `@lhci/cli` or `lighthouse` CLI for accessibility score
    - Parse `package.json` for dependency + devDependency count
    - Sum `dist/**/*.js` file sizes for bundle weight
    - _Requirements: 1.6, 1.7_

  - [ ]* 1.7 Write property test for file-system metric calculations
    - **Property 1: File-system metric calculations are correct**
    - Generate virtual directory trees with known file sizes and verify sloc, fileCount, avgFileSize, bundleSize, depCount, bundleWeight calculations
    - **Validates: Requirements 1.2, 1.7**

  - [ ]* 1.8 Write property test for git-based metric calculations
    - **Property 2: Git-based metric calculations are correct**
    - Generate synthetic git log numstat output and verify commits = N, churn = sum of additions + deletions
    - **Validates: Requirements 1.5**

  - [ ]* 1.9 Write property test for graceful degradation on metric failure
    - **Property 3: Graceful degradation on metric failure**
    - Simulate random subsets of metric helpers throwing or timing out, verify null for failed metrics and valid values for successful ones
    - **Validates: Requirements 1.8, 1.10**

- [ ] 2. Integrate metrics into deploy script
  - [ ] 2.1 Modify `scripts/deploy-amplify-board.mjs` to import `collectMetrics` and invoke it after each branch build
    - Import `collectMetrics` from `./collect-metrics.mjs`
    - Call `collectMetrics(worktreePath, branchMeta)` after `runBranchBuild` and before worktree removal
    - Attach returned metrics object to the branch entry in `deployedBranches`
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ] 2.2 Add error handling and `--skip-build` flag support for metrics collection
    - Wrap `collectMetrics` call in try/catch with 120s `Promise.race` timeout
    - On failure, log warning with branch name and substitute all-null metrics object
    - When `--skip-build` is active, skip metrics collection and use all-null metrics objects
    - Preserve existing branch configuration array and sequential build order
    - _Requirements: 2.4, 2.6, 2.7, 2.8_

  - [ ]* 2.3 Write property test for deploy script error fallback
    - **Property 4: Deploy script error fallback produces all-null metrics**
    - Simulate collectMetrics throwing/timing out and verify all-null substitution without deployment interruption
    - **Validates: Requirements 2.6**

- [ ] 3. Checkpoint - Ensure metrics infrastructure works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement baseball card HTML renderer
  - [ ] 4.1 Rewrite `renderDashboard()` to produce baseball card layout with retro styling
    - Generate bordered card elements with muted pastel backgrounds and pixel-style typography
    - Add inline `<style>` block with 1980s card aesthetic (border, font-family, pastel colors)
    - Render responsive grid layout for desktop viewports
    - _Requirements: 3.1, 6.1, 6.2_

  - [ ] 4.2 Create inline SVG pixel-art logos for each branch variant
    - Design 8-bit pixel-art SVGs for Claude, Codex, Cerebras (VSCode), and Kiro
    - Embed as inline SVG within each card's top-left quadrant (max 25% card width)
    - _Requirements: 3.2, 6.4_

  - [ ] 4.3 Implement card header section with LLM name, paradigm, and IDE label
    - Display LLM name, "Vibe" as Coding_Paradigm, and configured IDE_Label per branch
    - Map branches: Claude→"Claude CLI", Cerebras→"VSCode Extension", Codex→"Codex", Kiro→"Kiro"
    - Position header info to the right of the pixel-art logo
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ] 4.4 Implement stat group rendering with six labeled sections
    - Render Code, Quality, Health, Process, UX, Dependencies sections with headings
    - Display metrics using abbreviated labels from STAT_GROUPS configuration
    - Render null metrics as dash or "N/A" placeholder
    - Enforce minimum 12px font size for all stat labels and values
    - _Requirements: 3.9, 3.10, 3.11, 4.1_

  - [ ]* 4.5 Write property test for card structure completeness
    - **Property 5: Card structure completeness**
    - For arbitrary branch entries, verify rendered HTML contains SVG logo (≤25% width), LLM name, paradigm, IDE label, bordered card with pastel background and pixel font
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 4.6 Write property test for stat group rendering
    - **Property 6: Stat group rendering with abbreviations**
    - For valid metrics objects, verify exactly 6 stat group headings and their associated abbreviated labels are present in the HTML
    - **Validates: Requirements 3.9, 4.1**

  - [ ]* 4.7 Write property test for null metric placeholder rendering
    - **Property 7: Null metric placeholder rendering**
    - For metrics objects with random null fields, verify each null renders as dash or "N/A", never as literal "null" or empty
    - **Validates: Requirements 3.10**

- [ ] 5. Implement tooltip system
  - [ ] 5.1 Add ARIA-accessible tooltip HTML structure and CSS for abbreviated metric labels
    - Render each metric label as `<button>` with `aria-describedby` pointing to a tooltip `<div role="tooltip">`
    - Include full metric name and description in each tooltip
    - Style tooltips with CSS transitions for 200ms appearance
    - _Requirements: 4.2, 4.3, 4.6_

  - [ ] 5.2 Implement inline JavaScript for tooltip show/hide behavior (hover, focus, tap, single-visible constraint)
    - Show tooltip on `mouseenter`/`focus`, hide on `mouseleave`/`blur`
    - On mobile `touchstart`, toggle tooltip visibility
    - Dismiss on outside tap via document-level listener
    - Enforce only one tooltip visible at a time
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.3 Write property test for ARIA tooltip accessibility
    - **Property 8: ARIA tooltip accessibility**
    - For any rendered metric label, verify `aria-describedby` references a tooltip element with `role="tooltip"` containing full name and description
    - **Validates: Requirements 4.6**

- [ ] 6. Implement mobile carousel
  - [ ] 6.1 Add CSS media query and flex-based carousel layout for viewports ≤ 768px
    - Switch card container from grid to overflow-hidden flex carousel at `max-width: 768px`
    - Size each card to occupy ≥ 90% viewport width
    - Add `transform: translateX()` with `transition: transform 300ms ease` for animations
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [ ] 6.2 Implement inline JavaScript for swipe navigation, dot indicators, and bounds clamping
    - Handle `touchstart`/`touchmove`/`touchend` for swipe detection (50px threshold, 300ms)
    - Render dot indicators matching card count (inline SVG circles)
    - Clamp position: no wrap-around at first/last card
    - Skip dots and swipe listeners when only 1 card exists
    - _Requirements: 5.3, 5.4, 5.6, 5.7_

  - [ ]* 6.3 Write property test for carousel indicator count
    - **Property 9: Carousel indicator count matches card count**
    - For N branch cards (N > 1), verify exactly N dot indicators in rendered mobile HTML
    - **Validates: Requirements 5.3**

  - [ ]* 6.4 Write property test for carousel bounds clamping
    - **Property 10: Carousel bounds clamping**
    - For arbitrary position P and card count N, verify forward swipe → min(P+1, N-1) and backward → max(P-1, 0), never wrapping
    - **Validates: Requirements 5.6**

- [ ] 7. Ensure static HTML constraints
  - [ ] 7.1 Verify `renderDashboard` produces self-contained HTML with no external references
    - Audit output for zero `<link rel="stylesheet">`, zero `<script src>`, zero `<img src="http">`, zero fetch/XHR calls
    - Ensure all images are inline SVG or base64 data URIs
    - Keep total file size under 500 KB
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Write property test for self-contained HTML output
    - **Property 11: Self-contained HTML output**
    - For any valid deployedBranches input, verify zero external stylesheet/script/image references and no remote fetch calls
    - **Validates: Requirements 6.1, 6.4**

  - [ ]* 7.3 Write property test for output size constraint
    - **Property 12: Output size constraint**
    - For 1–4 branch entries with full or null metrics, verify rendered HTML < 500,000 bytes
    - **Validates: Requirements 6.5**

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Node.js ES modules with vitest and fast-check for testing
- All dashboard output is a single static HTML file deployed to AWS Amplify
- The metrics module runs only on the main branch against branch worktrees

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "1.6"] },
    { "id": 2, "tasks": ["1.7", "1.8", "1.9", "2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["2.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 6, "tasks": ["4.5", "4.6", "4.7", "5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 8, "tasks": ["6.2"] },
    { "id": 9, "tasks": ["6.3", "6.4", "7.1"] },
    { "id": 10, "tasks": ["7.2", "7.3"] }
  ]
}
```
