# Implementation Plan: AI Baseball Cards Dashboard

## Overview

This plan implements a metrics collection module and retro baseball-card dashboard redesign for the Category Solitaire Amplify deployment. The work proceeds from core infrastructure (metrics module) through deploy script integration, then to the visual rendering layer (baseball cards, tooltips, carousel), with property tests validating correctness at each stage.

## Tasks

- [x] 1. Create metrics collector module
  - [x] 1.1 Create `scripts/collect-metrics.mjs` with exported `collectMetrics` function signature, per-metric timeout (30s), global timeout (120s), and null-fallback error handling
  - [x] 1.2 Implement file-system metric helpers (SLoC, File Count, Avg File Size, Bundle Size)
  - [x] 1.3 Implement quality metric helpers (Maintainability Index, Max Cyclomatic Complexity, Duplication Percentage)
  - [x] 1.4 Implement health metric helpers (Security Issues, TS Errors, Unused Exports)
  - [x] 1.5 Implement process metric helpers (Commit Count, Code Churn, Test Coverage)
  - [x] 1.6 Implement UX and dependency metric helpers (Lighthouse A11y, Dependency Count, Bundle Weight)
  - [x] 1.7 Write property test for file-system metric calculations
  - [x] 1.8 Write property test for git-based metric calculations
  - [x] 1.9 Write property test for graceful degradation on metric failure

- [x] 2. Integrate metrics into deploy script
  - [x] 2.1 Modify `scripts/deploy-amplify-board.mjs` to import `collectMetrics` and invoke it after each branch build
  - [x] 2.2 Add error handling and `--skip-build` flag support for metrics collection
  - [x] 2.3 Write property test for deploy script error fallback

- [x] 3. Checkpoint - Ensure metrics infrastructure works

- [x] 4. Implement baseball card HTML renderer
  - [x] 4.1 Rewrite `renderDashboard()` to produce baseball card layout with retro styling
  - [x] 4.2 Create inline SVG pixel-art logos for each branch variant
  - [x] 4.3 Implement card header section with LLM name, paradigm, and IDE label
  - [x] 4.4 Implement stat group rendering with six labeled sections
  - [x] 4.5 Write property test for card structure completeness
  - [x] 4.6 Write property test for stat group rendering
  - [x] 4.7 Write property test for null metric placeholder rendering

- [x] 5. Implement tooltip system
  - [x] 5.1 Add ARIA-accessible tooltip HTML structure and CSS for abbreviated metric labels
  - [x] 5.2 Implement inline JavaScript for tooltip show/hide behavior (hover, focus, tap, single-visible constraint)
  - [x] 5.3 Write property test for ARIA tooltip accessibility

- [x] 6. Implement mobile carousel
  - [x] 6.1 Add CSS media query and flex-based carousel layout for viewports ≤ 768px
  - [x] 6.2 Implement inline JavaScript for swipe navigation, dot indicators, and bounds clamping
  - [x] 6.3 Write property test for carousel indicator count
  - [x] 6.4 Write property test for carousel bounds clamping

- [x] 7. Ensure static HTML constraints
  - [x] 7.1 Verify `renderDashboard` produces self-contained HTML with no external references
  - [x] 7.2 Write property test for self-contained HTML output
  - [x] 7.3 Write property test for output size constraint

- [x] 8. Final checkpoint - Ensure all tests pass

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
