# Requirements Document

## Introduction

This feature adds code measurement metrics collection and a retro baseball-card-style scorecard redesign to the existing Category Solitaire Amplify deployment dashboard. The deploy pipeline (scripts/deploy-amplify-board.mjs) currently builds four branch variants and deploys a static HTML dashboard with basic commit info. This feature enriches each card with quantitative code metrics and transforms the visual presentation into a nostalgic 1980s baseball card aesthetic, complete with 8-bit logos and stat breakdowns.

## Glossary

- **Dashboard**: The static HTML page deployed to the Amplify "dashboard" branch that displays cards for each code variant
- **Deploy_Script**: The Node.js script at scripts/deploy-amplify-board.mjs that orchestrates builds and deployments
- **Metrics_Collector**: The module responsible for running analysis tools against each branch's source code and returning structured metric data
- **Baseball_Card**: A single card component on the Dashboard representing one branch variant, styled with a retro 1980s baseball card visual treatment
- **Stat_Tooltip**: A UI element that displays the full meaning of an abbreviated metric label, accessible via hover on desktop and tap on mobile
- **Carousel**: A horizontally swipeable container used on mobile viewports to display Baseball_Cards one at a time
- **Branch_Variant**: One of the four source branches (Claude Vibe, Codex Vibe, Cerebras Vibe, Develop Kiro Vibe) built and deployed by the Deploy_Script
- **GitHub_Actions_Runner**: The CI environment (ubuntu-latest) that executes the deploy workflow
- **Coding_Paradigm**: The development methodology label displayed on each Baseball_Card (currently "Vibe" for all branches)
- **IDE_Label**: The tool or IDE name associated with each Branch_Variant (Claude CLI, VSCode Extension, Codex, or Kiro)

## Requirements

### Requirement 1: Metrics Collection Infrastructure

**User Story:** As a developer, I want code quality metrics collected automatically during the deploy pipeline, so that I can compare the quantitative output of each AI coding tool without manual analysis.

#### Architecture Note

The Metrics_Collector logic lives exclusively on the main branch (in `scripts/collect-metrics.mjs`). It runs against each Branch_Variant's source code via the existing git worktree checkout during the deploy process. Branch source code is the measurement target — it does not contain or depend on the metrics tooling. No cross-branch merging is required. Metrics are ephemeral build artifacts generated fresh each deploy run and consumed by `renderDashboard()` in the same process; no external persistence layer (S3, database) is needed.

#### Acceptance Criteria

1. WHEN the Deploy_Script checks out a Branch_Variant via git worktree, THE Metrics_Collector SHALL run analysis tools against that worktree's source code and return a JSON object containing all collected metrics keyed by metric name
2. THE Metrics_Collector SHALL collect Source Lines of Code, File count, Average File Size in lines, and Bundle size in kilobytes for each Branch_Variant
3. THE Metrics_Collector SHALL collect Maintainability Index, Maximum Cyclomatic Complexity, and Duplication Percentage for each Branch_Variant
4. THE Metrics_Collector SHALL collect Security Issue count, TypeScript strict-mode Error count, and Unused Export count for each Branch_Variant
5. THE Metrics_Collector SHALL collect Commit count, Code Churn (lines added + deleted), and Test Coverage percentage for each Branch_Variant
6. THE Metrics_Collector SHALL collect the Lighthouse Accessibility Score for each Branch_Variant
7. THE Metrics_Collector SHALL collect Dependency count and Bundle Weight in kilobytes for each Branch_Variant
8. IF a metric tool fails or does not return a result within 30 seconds, THEN THE Metrics_Collector SHALL record a null value for that metric and continue collecting remaining metrics
9. THE Metrics_Collector SHALL complete all metric collection for a single Branch_Variant within 120 seconds
10. IF the total collection time for a Branch_Variant reaches 120 seconds, THEN THE Metrics_Collector SHALL stop any remaining metric tools, record null for each uncollected metric, and return the partially completed metrics object
11. THE Metrics_Collector SHALL exist as a standalone module at `scripts/collect-metrics.mjs` on the main branch, importable by the Deploy_Script
12. THE Metrics_Collector SHALL NOT require any code changes or dependencies to be present in the Branch_Variant source code

### Requirement 2: Deploy Pipeline Integration

**User Story:** As a developer, I want metrics collection integrated into the existing deploy script without breaking the current deployment flow, so that metrics are gathered as part of the normal CI process.

#### Architecture Note

The Deploy_Script's existing sequential flow (worktree checkout → build → zip → deploy) gains a single new step after build: `collectMetrics(worktreePath)`. Metrics results accumulate in memory alongside the existing `deployedBranches` array and are passed to `renderDashboard()` when all branches are complete. Optionally, the script may write per-branch JSON files to a `/metrics` directory in the artifact folder for debugging, but the dashboard rendering reads metrics from in-memory objects, not from disk.

#### Acceptance Criteria

1. THE Deploy_Script SHALL import and invoke a collectMetrics function from `scripts/collect-metrics.mjs` that accepts a branch worktree path and a branch metadata object, and returns the structured metrics object defined in Requirement 1
2. WHEN a Branch_Variant build completes successfully, THE Deploy_Script SHALL invoke collectMetrics with that branch's worktree path before removing the worktree, and attach the returned metrics object to the branch's entry in the deployedBranches array
3. THE Deploy_Script SHALL pass the complete deployedBranches array (including metrics) to the renderDashboard function so metrics are available for HTML generation
4. THE Deploy_Script SHALL preserve the existing branch configuration array, sequential build order, and deployment logic such that removing the metrics integration produces identical deployment behavior
5. THE GitHub_Actions_Runner SHALL have Node.js and any npm dependencies declared in package.json available at execution time, sufficient to run the collectMetrics function without additional manual installation steps
6. IF the collectMetrics function throws an error or does not return within 120 seconds for a Branch_Variant, THEN THE Deploy_Script SHALL log a warning message identifying the failed branch, substitute a metrics object with all metric fields set to null for that branch, and continue deployment without interruption
7. WHEN the --skip-build flag is provided, THE Deploy_Script SHALL skip metrics collection for all branches and use null-valued metrics objects for dashboard rendering
8. THE Deploy_Script SHALL NOT require merging main into any Branch_Variant or modifying Branch_Variant source code in order to collect metrics

### Requirement 3: Baseball Card Visual Design

**User Story:** As a viewer of the dashboard, I want each branch displayed as a retro baseball card with stat breakdowns, so that I can quickly compare AI tool performance in an engaging visual format.

#### Acceptance Criteria

1. THE Dashboard SHALL render each Branch_Variant as a Baseball_Card with a bordered card layout, muted pastel background color, and pixel-style typography consistent with 1980s baseball card aesthetics
2. THE Baseball_Card SHALL display an 8-bit pixel-art logo in the top-left quadrant of the card, sized to occupy no more than 25% of the card width, that is unique to each Branch_Variant's associated tool
3. THE Baseball_Card SHALL display the LLM name, Coding_Paradigm, and IDE_Label to the right of the 8-bit logo within the same top section of the card
4. WHEN rendering the Claude Branch_Variant, THE Baseball_Card SHALL display "Claude CLI" as the IDE_Label
5. WHEN rendering the Cerebras Branch_Variant, THE Baseball_Card SHALL display "VSCode Extension" as the IDE_Label
6. WHEN rendering the Codex Branch_Variant, THE Baseball_Card SHALL display "Codex" as the IDE_Label
7. WHEN rendering the Kiro Branch_Variant, THE Baseball_Card SHALL display "Kiro" as the IDE_Label
8. THE Baseball_Card SHALL display "Vibe" as the Coding_Paradigm for all Branch_Variants
9. THE Baseball_Card SHALL display collected metrics organized into six labeled stat groups (Code, Quality, Health, Process, UX, Dependencies) where each group heading is visible and its associated metrics are listed beneath the heading
10. IF a metric value is unavailable for a Branch_Variant, THEN THE Baseball_Card SHALL display a placeholder indicator (such as a dash or "N/A") in place of the missing value
11. THE Baseball_Card SHALL render all stat group labels and metric values at a minimum font size of 12px to ensure readability without zooming

### Requirement 4: Stat Abbreviation Tooltips

**User Story:** As a dashboard viewer, I want metric labels shown as compact abbreviations with accessible explanations, so that the card remains readable while full context is available on demand.

#### Acceptance Criteria

1. THE Baseball_Card SHALL display metric labels using abbreviated text (e.g., "SLoC", "MI", "Cplx", "Dup%", "SecI", "TSE", "UExp", "Cov%", "LhA", "Deps", "Bndl")
2. WHEN a user hovers over an abbreviated metric label on a desktop device, THE Stat_Tooltip SHALL display the full metric name and a one-sentence description within 200 milliseconds of the hover event
3. WHEN a user taps an abbreviated metric label on a mobile device, THE Stat_Tooltip SHALL display the full metric name and a one-sentence description within 200 milliseconds of the tap event
4. WHILE the Stat_Tooltip is visible, THE Stat_Tooltip SHALL remain displayed until the user moves the pointer off the metric label, moves keyboard focus away from the metric label, or taps or clicks outside the tooltip and its associated label
5. WHEN a Stat_Tooltip is triggered while another Stat_Tooltip is already visible, THE Baseball_Card SHALL dismiss the previously visible tooltip before displaying the newly triggered tooltip
6. THE Stat_Tooltip SHALL be accessible to assistive technologies by associating each abbreviated label with its full name and description using an appropriate ARIA tooltip role, and SHALL be operable via keyboard focus

### Requirement 5: Mobile Carousel View

**User Story:** As a mobile user, I want to swipe between AI baseball cards in a carousel, so that I can easily compare branches on a small screen without scrolling a long page.

#### Acceptance Criteria

1. WHILE the viewport width is 768 pixels or less, THE Dashboard SHALL display Baseball_Cards in a horizontally swipeable Carousel instead of a grid layout
2. THE Carousel SHALL display one Baseball_Card per slide, sized to occupy at least 90% of the viewport width while remaining fully visible without horizontal scrolling
3. THE Carousel SHALL provide visual navigation indicators showing the current card position and total card count
4. WHEN a user swipes left or right within the Carousel, THE Dashboard SHALL transition to the adjacent Baseball_Card with an animation completing within 300 milliseconds
5. WHILE the viewport width is greater than 768 pixels, THE Dashboard SHALL display Baseball_Cards in the existing grid layout
6. IF the user swipes backward on the first card or forward on the last card, THEN THE Carousel SHALL remain on the current card and not wrap around
7. IF only one Baseball_Card exists, THEN THE Carousel SHALL display that card without navigation indicators and shall not respond to swipe gestures

### Requirement 6: Static HTML Output

**User Story:** As a developer, I want the dashboard to remain a single static HTML page with no runtime JavaScript framework dependencies, so that it deploys instantly to Amplify without a build step.

#### Acceptance Criteria

1. THE renderDashboard function SHALL produce a single HTML file that contains all CSS in inline `<style>` elements and all JavaScript in inline `<script>` elements, with no external resource references (no `<link rel="stylesheet">`, `<script src="...">`, `<img src="http...">`, or fetch/XHR calls to remote URLs)
2. THE Dashboard SHALL function without any third-party JavaScript framework or library loaded at runtime, using only browser-native APIs for all interactive behavior
3. THE Dashboard SHALL render without layout errors or missing content in the two most recent stable releases of Chrome, Firefox, Safari, and Edge, with all branch cards visible, all links clickable, and the responsive grid adapting at viewports of 620px and 980px breakpoints
4. THE Dashboard SHALL include all logo or decorative image assets as inline SVG elements or base64-encoded data URIs within the HTML file, resulting in zero external image requests when the page loads
5. THE renderDashboard function SHALL produce an HTML file no larger than 500 KB in total size to remain within Amplify manual deployment constraints and ensure fast initial page load
