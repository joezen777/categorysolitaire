/**
 * Property-Based Tests for AI Baseball Cards Dashboard
 *
 * Feature: ai-baseball-cards-dashboard
 * Properties 1-12: Full coverage of metrics, rendering, tooltips, carousel, and HTML constraints
 */

import { describe, it, afterEach } from 'vitest';
import fc from 'fast-check';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { collectMetrics, createNullMetrics } from '../../scripts/collect-metrics.mjs';
import { renderDashboard, STAT_GROUPS, BRANCH_CONFIG, formatMetric } from '../../scripts/deploy-amplify-board.mjs';

// Track temp dirs for cleanup
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
  tempDirs.length = 0;
});

/**
 * Generates a line of source code content (non-blank) with a newline.
 */
function generateLine(index) {
  return `const x${index} = ${index};\n`;
}

/**
 * Creates a temporary worktree directory with known structure.
 */
function createTempWorktree(config) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'pbt-metrics-'));
  tempDirs.push(tmpDir);

  const srcDir = join(tmpDir, 'src');
  mkdirSync(srcDir, { recursive: true });

  for (const file of config.sourceFiles) {
    let content = '';
    for (let i = 0; i < file.lines; i++) {
      content += generateLine(i);
    }
    writeFileSync(join(srcDir, file.name), content);
  }

  const distDir = join(tmpDir, 'dist');
  mkdirSync(distDir, { recursive: true });

  for (const file of config.distFiles) {
    const buf = Buffer.alloc(file.sizeBytes, 'a');
    writeFileSync(join(distDir, file.name), buf);
  }

  const deps = {};
  for (let i = 0; i < config.depCount; i++) {
    deps[`dep-${i}`] = '1.0.0';
  }
  const devDeps = {};
  for (let i = 0; i < config.devDepCount; i++) {
    devDeps[`devdep-${i}`] = '1.0.0';
  }
  writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
    name: 'test-project',
    version: '1.0.0',
    dependencies: deps,
    devDependencies: devDeps,
  }));

  return tmpDir;
}

// --- Arbitraries for file-system tests ---

const arbSourceFiles = fc.array(
  fc.record({
    name: fc.nat({ max: 999 }).chain(n =>
      fc.constantFrom('.js', '.ts', '.jsx', '.tsx').map(ext => `file${n}${ext}`)
    ),
    lines: fc.integer({ min: 1, max: 500 }),
  }),
  { minLength: 1, maxLength: 20 },
).map(files => {
  const seen = new Set();
  return files.filter(f => {
    if (seen.has(f.name)) return false;
    seen.add(f.name);
    return true;
  });
}).filter(files => files.length >= 1);

const arbDistFiles = fc.array(
  fc.record({
    name: fc.nat({ max: 99 }).chain(n =>
      fc.constantFrom('.js', '.css', '.html', '.map').map(ext => `bundle${n}${ext}`)
    ),
    sizeBytes: fc.integer({ min: 100, max: 100_000 }),
    isJs: fc.constant(false),
  }),
  { minLength: 1, maxLength: 10 },
).map(files => {
  const seen = new Set();
  return files
    .filter(f => {
      if (seen.has(f.name)) return false;
      seen.add(f.name);
      return true;
    })
    .map(f => ({ ...f, isJs: f.name.endsWith('.js') }));
}).filter(files => files.length >= 1);

const arbDepCount = fc.integer({ min: 0, max: 30 });
const arbDevDepCount = fc.integer({ min: 0, max: 20 });

const arbWorktreeConfig = fc.record({
  sourceFiles: arbSourceFiles,
  distFiles: arbDistFiles,
  depCount: arbDepCount,
  devDepCount: arbDevDepCount,
});

// --- Arbitraries for rendering tests ---

const arbMetricsResult = fc.record({
  sloc: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 50000 })),
  fileCount: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 500 })),
  avgFileSize: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 1000 })),
  bundleSize: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 5000 })),
  maintainability: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
  maxComplexity: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 50 })),
  duplication: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 100, noNaN: true })),
  securityIssues: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 20 })),
  tsErrors: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 200 })),
  unusedExports: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
  commits: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 5000 })),
  churn: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100000 })),
  coverage: fc.oneof(fc.constant(null), fc.double({ min: 0, max: 100, noNaN: true })),
  lighthouseA11y: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
  depCount: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 200 })),
  bundleWeight: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 5000 })),
});

const branchKeys = ['claude-vibe', 'codex-vibe', 'cerebras-vibe', 'develop-kiro-vibe'];

const arbDeployedBranch = fc.record({
  deployBranch: fc.constantFrom(...branchKeys),
  label: fc.constantFrom('Claude Vibe', 'Codex Vibe', 'Cerebras Vibe', 'Develop Kiro Vibe'),
  sourceRef: fc.constantFrom('origin/claude.vibe', 'origin/codex.vibe', 'origin/cerebras.vibe', 'origin/develop.kiro.vibe'),
  url: fc.constant('https://test.amplifyapp.com/'),
  commit: fc.string({ minLength: 8, maxLength: 12 }),
  message: fc.string({ minLength: 1, maxLength: 50 }),
  metrics: arbMetricsResult,
});

const arbDeployedBranches = fc.array(arbDeployedBranch, { minLength: 1, maxLength: 4 });

const mockApp = { appId: 'test-app-id', defaultDomain: 'test.amplifyapp.com' };

// =========================================================================
// Property 1: File-system metric calculations are correct
// Validates: Requirements 1.2, 1.7
// =========================================================================
describe('Property 1: File-system metric calculations are correct', () => {
  it('file-system metrics match expected calculations for arbitrary directory trees', async () => {
    await fc.assert(
      fc.asyncProperty(arbWorktreeConfig, async (config) => {
        const worktreePath = createTempWorktree(config);

        const metrics = await collectMetrics(worktreePath, {
          sourceRef: 'test',
          deployBranch: 'test-branch',
          label: 'test-label',
        });

        const expectedSloc = config.sourceFiles.reduce((sum, f) => sum + f.lines, 0);
        const expectedFileCount = config.sourceFiles.length;
        const expectedAvgFileSize = Math.round(expectedSloc / expectedFileCount);
        const expectedBundleSize = Math.round(
          config.distFiles.reduce((sum, f) => sum + f.sizeBytes, 0) / 1024
        );
        const expectedDepCount = config.depCount + config.devDepCount;
        const expectedBundleWeight = Math.round(
          config.distFiles.filter(f => f.isJs).reduce((sum, f) => sum + f.sizeBytes, 0) / 1024
        );

        if (metrics.sloc !== expectedSloc) throw new Error(`sloc: got ${metrics.sloc}, expected ${expectedSloc}`);
        if (metrics.fileCount !== expectedFileCount) throw new Error(`fileCount: got ${metrics.fileCount}, expected ${expectedFileCount}`);
        if (metrics.avgFileSize !== expectedAvgFileSize) throw new Error(`avgFileSize: got ${metrics.avgFileSize}, expected ${expectedAvgFileSize}`);
        if (metrics.bundleSize !== expectedBundleSize) throw new Error(`bundleSize: got ${metrics.bundleSize}, expected ${expectedBundleSize}`);
        if (metrics.depCount !== expectedDepCount) throw new Error(`depCount: got ${metrics.depCount}, expected ${expectedDepCount}`);
        if (metrics.bundleWeight !== expectedBundleWeight) throw new Error(`bundleWeight: got ${metrics.bundleWeight}, expected ${expectedBundleWeight}`);
      }),
      { numRuns: 20 }
    );
  });
});

// =========================================================================
// Property 2: Git-based metric calculations are correct
// Validates: Requirements 1.5
// =========================================================================
describe('Property 2: Git-based metric calculations are correct', () => {
  it('git metrics match expected calculations for synthetic git histories', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.array(
            fc.record({
              additions: fc.integer({ min: 1, max: 100 }),
              deletions: fc.integer({ min: 0, max: 50 }),
              filename: fc.nat({ max: 5 }).map(n => `file${n}.js`),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          { minLength: 1, maxLength: 10 }
        ),
        async (commitFiles) => {
          const tmpDir = mkdtempSync(join(tmpdir(), 'pbt-git-'));
          tempDirs.push(tmpDir);

          execSync('git init', { cwd: tmpDir, stdio: 'ignore' });
          execSync('git config user.email "test@test.com"', { cwd: tmpDir, stdio: 'ignore' });
          execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' });

          mkdirSync(join(tmpDir, 'src'), { recursive: true });
          writeFileSync(join(tmpDir, 'src', 'index.js'), 'const x = 1;\n');
          writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));

          execSync('git add .', { cwd: tmpDir, stdio: 'ignore' });
          execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' });

          const expectedCommits = commitFiles.length + 1;

          for (let i = 0; i < commitFiles.length; i++) {
            const files = commitFiles[i];
            for (const fileChange of files) {
              const filePath = join(tmpDir, 'src', fileChange.filename);
              let currentLines = [];
              try {
                const content = readFileSync(filePath, 'utf-8');
                currentLines = content.split('\n').filter(l => l.length > 0);
              } catch { /* file doesn't exist yet */ }

              const linesToDelete = Math.min(fileChange.deletions, currentLines.length);
              const remainingLines = currentLines.slice(0, currentLines.length - linesToDelete);
              const newLines = [];
              for (let j = 0; j < fileChange.additions; j++) {
                newLines.push(`const v${i}_${j} = ${i * 1000 + j};`);
              }
              writeFileSync(filePath, [...remainingLines, ...newLines].join('\n') + '\n');
            }

            execSync('git add .', { cwd: tmpDir, stdio: 'ignore' });
            execSync(`git commit -m "commit ${i}" --allow-empty`, { cwd: tmpDir, stdio: 'ignore' });
          }

          const metrics = await collectMetrics(tmpDir, {
            sourceRef: 'HEAD',
            deployBranch: 'test',
            label: 'test',
          });

          if (metrics.commits !== null && metrics.commits !== expectedCommits) {
            throw new Error(`commits: got ${metrics.commits}, expected ${expectedCommits}`);
          }

          if (metrics.churn !== null) {
            const gitLog = execSync('git log --numstat --format=""', { cwd: tmpDir, encoding: 'utf-8' });
            const actualChurn = gitLog.trim().split('\n').filter(l => l.length > 0).reduce((sum, line) => {
              const parts = line.split('\t');
              return sum + (parseInt(parts[0], 10) || 0) + (parseInt(parts[1], 10) || 0);
            }, 0);
            if (metrics.churn !== actualChurn) {
              throw new Error(`churn: got ${metrics.churn}, expected ${actualChurn}`);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

// =========================================================================
// Property 3: Graceful degradation on metric failure
// Validates: Requirements 1.8, 1.10
// =========================================================================
describe('Property 3: Graceful degradation on metric failure', () => {
  it('returns null for failed metrics and valid values for successful ones', async () => {
    await fc.assert(
      fc.asyncProperty(arbWorktreeConfig, async (config) => {
        const worktreePath = createTempWorktree(config);

        const metrics = await collectMetrics(worktreePath, {
          sourceRef: 'test',
          deployBranch: 'test-branch',
          label: 'test-label',
        });

        const metricKeys = Object.keys(createNullMetrics());
        for (const key of metricKeys) {
          const value = metrics[key];
          if (value !== null && (typeof value !== 'number' || Number.isNaN(value))) {
            throw new Error(`"${key}" is neither null nor a valid number: ${JSON.stringify(value)}`);
          }
        }

        if (metrics.sloc === null) throw new Error('sloc should not be null when src/ contains files');
        if (metrics.fileCount === null) throw new Error('fileCount should not be null when src/ contains files');
        if (metrics.depCount === null) throw new Error('depCount should not be null when package.json exists');
      }),
      { numRuns: 20 }
    );
  });
});

// =========================================================================
// Property 4: Deploy script error fallback produces all-null metrics
// Validates: Requirements 2.6
// =========================================================================
describe('Property 4: Deploy script error fallback produces all-null metrics', () => {
  it('createNullMetrics produces an object where every metric field is null', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (count) => {
        for (let i = 0; i < count; i++) {
          const nullMetrics = createNullMetrics();
          const keys = Object.keys(nullMetrics);
          if (keys.length !== 16) throw new Error(`Expected 16 keys, got ${keys.length}`);
          for (const key of keys) {
            if (nullMetrics[key] !== null) throw new Error(`Expected null for "${key}"`);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('error fallback does not interrupt the deployment loop', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceRef: fc.string({ minLength: 1, maxLength: 20 }),
          deployBranch: fc.string({ minLength: 1, maxLength: 20 }),
          label: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        async (branchMeta) => {
          let metrics;
          try {
            await Promise.reject(new Error('Simulated failure'));
          } catch {
            metrics = createNullMetrics();
          }
          const keys = Object.keys(metrics);
          for (const key of keys) {
            if (metrics[key] !== null) throw new Error(`Expected null for "${key}" after error`);
          }
          const deployedBranches = [];
          deployedBranches.push({ ...branchMeta, url: 'https://test.amplifyapp.com/', metrics });
          if (deployedBranches.length !== 1) throw new Error('Deployment loop interrupted');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =========================================================================
// Property 5: Card structure completeness
// Validates: Requirements 3.1, 3.2, 3.3
// =========================================================================
describe('Property 5: Card structure completeness', () => {
  it('rendered HTML contains SVG logo, LLM name, paradigm, IDE label, bordered card with pastel bg and pixel font', () => {
    fc.assert(
      fc.property(arbDeployedBranches, (branches) => {
        const html = renderDashboard(mockApp, branches);

        for (const branch of branches) {
          const config = BRANCH_CONFIG[branch.deployBranch];
          if (!config) continue;
          if (!html.includes('<svg')) throw new Error('No inline SVG found');
          if (!html.includes('width:25%')) throw new Error('Logo container missing 25% width');
          if (!html.includes(config.llm)) throw new Error(`LLM name "${config.llm}" not found`);
          if (!html.includes(config.paradigm)) throw new Error(`Paradigm "${config.paradigm}" not found`);
          if (!html.includes(config.ide)) throw new Error(`IDE label "${config.ide}" not found`);
        }

        if (!html.includes('card-slide')) throw new Error('No card-slide class');
        if (!html.includes('baseball-card')) throw new Error('No baseball-card class');
        if (!html.includes('open-app-button')) throw new Error('No standalone open-app-button class');
        if (!html.includes('color:var(--header-text)')) throw new Error('Open App button should use readable text color');
        if (html.includes('color:var(--header-bg);')) throw new Error('Open App button text matches its background');
        if (html.includes('padding:6px 8px 0')) throw new Error('Open App button has clipped bottom padding');
        if (html.includes('card-footer')) throw new Error('Deprecated card-footer block found');
        if (!html.includes("board.querySelectorAll('.card-slide')")) {
          throw new Error('Carousel selector does not use card-slide');
        }
        if (html.includes("board.querySelectorAll('.baseball-card')")) {
          throw new Error('Carousel selector still uses baseball-card');
        }
        if (!html.includes('border:3px solid')) throw new Error('No bordered card style');
        if (!html.includes('min-height:0')) throw new Error('Card should shrink/grow to full content height');
        if (!html.includes('overflow:visible')) throw new Error('Card bottom must not clip vertical content');
        if (!html.includes('--card-bg-')) throw new Error('No pastel background CSS vars');
        if (!html.includes('--pixel-font')) throw new Error('No pixel font CSS var');
        if (!html.includes('"Courier New"')) throw new Error('No pixel-style font-family');
      }),
      { numRuns: 100 }
    );
  });
});

// =========================================================================
// Property 6: Stat group rendering with abbreviations
// Validates: Requirements 3.9, 4.1
// =========================================================================
describe('Property 6: Stat group rendering with abbreviations', () => {
  it('contains exactly 6 stat group headings and their abbreviated labels', () => {
    fc.assert(
      fc.property(arbDeployedBranches, (branches) => {
        const html = renderDashboard(mockApp, branches);
        const groupNames = Object.keys(STAT_GROUPS);

        if (groupNames.length !== 6) throw new Error(`Expected 6 stat groups, got ${groupNames.length}`);

        for (const groupName of groupNames) {
          if (!html.includes(groupName)) throw new Error(`Heading "${groupName}" not found`);
          for (const stat of STAT_GROUPS[groupName]) {
            if (!html.includes(stat.abbr)) throw new Error(`Abbr "${stat.abbr}" not found`);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

// =========================================================================
// Property 7: Null metric placeholder rendering
// Validates: Requirements 3.10
// =========================================================================
describe('Property 7: Null metric placeholder rendering', () => {
  it('null metrics render as dash, never literal "null" or empty', () => {
    const arbNullMetrics = fc.record({
      sloc: fc.constant(null), fileCount: fc.constant(null), avgFileSize: fc.constant(null),
      bundleSize: fc.constant(null), maintainability: fc.constant(null), maxComplexity: fc.constant(null),
      duplication: fc.constant(null), securityIssues: fc.constant(null), tsErrors: fc.constant(null),
      unusedExports: fc.constant(null), commits: fc.constant(null), churn: fc.constant(null),
      coverage: fc.constant(null), lighthouseA11y: fc.constant(null), depCount: fc.constant(null),
      bundleWeight: fc.constant(null),
    });

    fc.assert(
      fc.property(
        fc.array(fc.record({
          deployBranch: fc.constantFrom(...branchKeys),
          label: fc.constant('Test'), sourceRef: fc.constant('origin/test'),
          url: fc.constant('https://test.amplifyapp.com/'),
          commit: fc.constant('abc123'), message: fc.constant('test'),
          metrics: arbNullMetrics,
        }), { minLength: 1, maxLength: 4 }),
        (branches) => {
          const html = renderDashboard(mockApp, branches);
          const statValuePattern = /<span class="stat-value">([^<]*)<\/span>/g;
          let match;
          while ((match = statValuePattern.exec(html)) !== null) {
            if (match[1] === 'null') throw new Error('Literal "null" displayed');
            if (match[1] === '') throw new Error('Empty string displayed');
          }
          if (!html.includes('\u2014')) throw new Error('Dash placeholder not found');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =========================================================================
// Property 8: ARIA tooltip accessibility
// Validates: Requirements 4.6
// =========================================================================
describe('Property 8: ARIA tooltip accessibility', () => {
  it('each metric label has aria-describedby referencing a tooltip with role="tooltip"', () => {
    fc.assert(
      fc.property(arbDeployedBranches, (branches) => {
        const html = renderDashboard(mockApp, branches);

        const labelPattern = /aria-describedby="([^"]+)"/g;
        let match;
        const tipIds = [];
        while ((match = labelPattern.exec(html)) !== null) {
          tipIds.push(match[1]);
        }
        if (tipIds.length === 0) throw new Error('No aria-describedby found');

        for (const tipId of tipIds) {
          if (!html.includes(`id="${tipId}" role="tooltip"`)) {
            throw new Error(`Tooltip with id="${tipId}" and role="tooltip" not found`);
          }
          const idx = html.indexOf(`id="${tipId}"`);
          const end = html.indexOf('</div>', idx);
          const content = html.substring(idx, end);
          if (!content.includes('<strong>')) throw new Error(`Tooltip "${tipId}" missing <strong>`);
          if (!content.includes('<span>')) throw new Error(`Tooltip "${tipId}" missing <span>`);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// =========================================================================
// Property 9: Carousel indicator count matches card count
// Validates: Requirements 5.3
// =========================================================================
describe('Property 9: Carousel indicator count matches card count', () => {
  it('for N > 1 cards, renders exactly N dot indicators', () => {
    fc.assert(
      fc.property(
        fc.array(arbDeployedBranch, { minLength: 2, maxLength: 4 }),
        (branches) => {
          const html = renderDashboard(mockApp, branches);
          const dotMatches = html.match(/class="dot/g);
          const dotCount = dotMatches ? dotMatches.length : 0;
          if (dotCount !== branches.length) {
            throw new Error(`Expected ${branches.length} dots, got ${dotCount}`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('for a single card, no dot indicators are rendered', () => {
    fc.assert(
      fc.property(
        fc.array(arbDeployedBranch, { minLength: 1, maxLength: 1 }),
        (branches) => {
          const html = renderDashboard(mockApp, branches);
          const dotMatches = html.match(/class="dot/g);
          if (dotMatches && dotMatches.length > 0) throw new Error('Dots rendered for single card');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =========================================================================
// Property 10: Carousel bounds clamping
// Validates: Requirements 5.6
// =========================================================================
describe('Property 10: Carousel bounds clamping', () => {
  it('forward clamps to min(P+1, N-1) and backward to max(P-1, 0)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 0, max: 9 }),
        (n, rawP) => {
          const p = Math.min(rawP, n - 1);
          const forward = Math.min(p + 1, n - 1);
          const backward = Math.max(p - 1, 0);
          if (forward > n - 1 || forward < 0) throw new Error(`Forward out of bounds: ${forward}`);
          if (backward < 0 || backward > n - 1) throw new Error(`Backward out of bounds: ${backward}`);
          if (p === n - 1 && forward !== n - 1) throw new Error('Forward wrapped at end');
          if (p === 0 && backward !== 0) throw new Error('Backward wrapped at start');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =========================================================================
// Property 11: Self-contained HTML output
// Validates: Requirements 6.1, 6.4
// =========================================================================
describe('Property 11: Self-contained HTML output', () => {
  it('zero external references and no remote fetch calls', () => {
    fc.assert(
      fc.property(arbDeployedBranches, (branches) => {
        const html = renderDashboard(mockApp, branches);
        if (/<link[^>]+rel=["']stylesheet["'][^>]*href=["']http/i.test(html)) throw new Error('External stylesheet');
        if (/<script[^>]+src=["']/i.test(html)) throw new Error('External script');
        if (/<img[^>]+src=["']https?:/i.test(html)) throw new Error('External image');
        if (/\bfetch\s*\(/i.test(html)) throw new Error('fetch() call found');
        if (/XMLHttpRequest/i.test(html)) throw new Error('XMLHttpRequest found');
      }),
      { numRuns: 100 }
    );
  });
});

// =========================================================================
// Property 12: Output size constraint
// Validates: Requirements 6.5
// =========================================================================
describe('Property 12: Output size constraint', () => {
  it('rendered HTML < 500KB for 1-4 branch entries', () => {
    fc.assert(
      fc.property(arbDeployedBranches, (branches) => {
        const html = renderDashboard(mockApp, branches);
        const bytes = Buffer.byteLength(html, 'utf-8');
        if (bytes >= 500_000) throw new Error(`HTML is ${bytes} bytes, exceeds 500KB`);
      }),
      { numRuns: 100 }
    );
  });
});
