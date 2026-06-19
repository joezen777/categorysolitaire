#!/usr/bin/env node
/**
 * Metrics Collector Module
 *
 * Collects code quality metrics from a branch worktree during the deploy pipeline.
 * Each metric is gathered by a dedicated async helper with a 30-second timeout.
 * A global 120-second circuit breaker aborts all remaining work if exceeded.
 *
 * On any failure or timeout, the affected metric records null and collection continues.
 */

import { execFile } from 'node:child_process';
import { existsSync, statSync, readdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const PER_METRIC_TIMEOUT_MS = 30_000;
const GLOBAL_TIMEOUT_MS = 120_000;

/**
 * Executes a shell command and returns its stdout.
 * Passes the AbortSignal through for cancellation support.
 *
 * @param {string} command - Shell command to execute
 * @param {string} cwd - Working directory
 * @param {AbortSignal} signal - Abort signal for cancellation
 * @returns {Promise<string>} stdout from the command
 */
function execShell(command, cwd, signal) {
  return new Promise((res, reject) => {
    execFile('/bin/sh', ['-c', command], { cwd, signal }, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        res(stdout);
      }
    });
  });
}

/**
 * @typedef {Object} MetricsResult
 * @property {number|null} sloc - Source Lines of Code
 * @property {number|null} fileCount - Total file count
 * @property {number|null} avgFileSize - Average file size (lines)
 * @property {number|null} bundleSize - Bundle size (KB)
 * @property {number|null} maintainability - Maintainability Index (0-100)
 * @property {number|null} maxComplexity - Maximum Cyclomatic Complexity
 * @property {number|null} duplication - Duplication Percentage
 * @property {number|null} securityIssues - Security issue count
 * @property {number|null} tsErrors - TypeScript strict-mode error count
 * @property {number|null} unusedExports - Unused export count
 * @property {number|null} commits - Commit count
 * @property {number|null} churn - Code churn (lines added + deleted)
 * @property {number|null} coverage - Test coverage percentage
 * @property {number|null} lighthouseA11y - Lighthouse Accessibility Score
 * @property {number|null} depCount - Dependency count
 * @property {number|null} bundleWeight - Bundle weight (KB)
 */

/**
 * Creates a null-filled MetricsResult object.
 * @returns {MetricsResult}
 */
export function createNullMetrics() {
  return {
    sloc: null,
    fileCount: null,
    avgFileSize: null,
    bundleSize: null,
    maintainability: null,
    maxComplexity: null,
    duplication: null,
    securityIssues: null,
    tsErrors: null,
    unusedExports: null,
    commits: null,
    churn: null,
    coverage: null,
    lighthouseA11y: null,
    depCount: null,
    bundleWeight: null,
  };
}

/**
 * Runs an async metric helper with a per-metric AbortController timeout.
 * Returns null if the helper throws, rejects, or exceeds the timeout.
 *
 * @param {string} name - Metric name for logging
 * @param {(signal: AbortSignal) => Promise<number|null>} helperFn - The metric helper
 * @param {AbortSignal} globalSignal - The global circuit breaker signal
 * @returns {Promise<number|null>}
 */
async function runWithTimeout(name, helperFn, globalSignal) {
  // If global timeout already fired, skip immediately
  if (globalSignal.aborted) {
    return null;
  }

  const perMetricController = new AbortController();
  const perMetricSignal = perMetricController.signal;

  // Abort this metric if the global signal fires
  const onGlobalAbort = () => perMetricController.abort();
  globalSignal.addEventListener('abort', onGlobalAbort, { once: true });

  const timeout = setTimeout(() => {
    perMetricController.abort();
  }, PER_METRIC_TIMEOUT_MS);

  try {
    const result = await helperFn(perMetricSignal);
    return result;
  } catch (error) {
    // Log the failure but return null gracefully
    console.warn(`[collect-metrics] ${name} failed: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
    globalSignal.removeEventListener('abort', onGlobalAbort);
  }
}

// ---------------------------------------------------------------------------
// Metric Helpers
// They accept (worktreePath, signal) and return a numeric value or null.
// ---------------------------------------------------------------------------

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectSloc(worktreePath, signal) {
  const srcDir = join(worktreePath, 'src');
  if (!existsSync(srcDir)) return null;

  const stdout = await execShell(
    `find src/ -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l`,
    worktreePath,
    signal,
  );

  // wc -l output ends with a "total" line when multiple files are found
  const lines = stdout.trim().split('\n');
  if (lines.length === 0) return 0;

  // If only one file, there's no "total" line - the single line IS the count
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.includes('total')) {
    const match = lastLine.match(/^\s*(\d+)\s+total/);
    return match ? parseInt(match[1], 10) : null;
  }

  // Single file case: parse the count from the only line
  const match = lastLine.match(/^\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectFileCount(worktreePath, signal) {
  const srcDir = join(worktreePath, 'src');
  if (!existsSync(srcDir)) return null;

  const stdout = await execShell(
    `find src/ -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\)`,
    worktreePath,
    signal,
  );

  const lines = stdout.trim().split('\n').filter(l => l.length > 0);
  return lines.length;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectAvgFileSize(worktreePath, signal) {
  const srcDir = join(worktreePath, 'src');
  if (!existsSync(srcDir)) return null;

  // Get total SLoC
  const slocStdout = await execShell(
    `find src/ -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs wc -l`,
    worktreePath,
    signal,
  );

  const slocLines = slocStdout.trim().split('\n');
  if (slocLines.length === 0) return null;

  let sloc;
  const lastLine = slocLines[slocLines.length - 1].trim();
  if (lastLine.includes('total')) {
    const match = lastLine.match(/^\s*(\d+)\s+total/);
    sloc = match ? parseInt(match[1], 10) : null;
  } else {
    const match = lastLine.match(/^\s*(\d+)/);
    sloc = match ? parseInt(match[1], 10) : null;
  }

  if (sloc == null) return null;

  // Get file count
  const fileStdout = await execShell(
    `find src/ -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\)`,
    worktreePath,
    signal,
  );

  const fileLines = fileStdout.trim().split('\n').filter(l => l.length > 0);
  const fileCount = fileLines.length;

  if (fileCount === 0) return null;
  return Math.round(sloc / fileCount);
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectBundleSize(worktreePath, signal) {
  const distDir = join(worktreePath, 'dist');
  if (!existsSync(distDir)) return null;

  let totalBytes = 0;
  const entries = readdirSync(distDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) {
      const filePath = join(entry.parentPath || entry.path, entry.name);
      const stat = statSync(filePath);
      totalBytes += stat.size;
    }
  }

  // Convert to KB, rounded to nearest integer
  return Math.round(totalBytes / 1024);
}

// ---------------------------------------------------------------------------
// Quality Metric Helpers (Task 1.3)
// Maintainability Index, Max Cyclomatic Complexity, Duplication Percentage
// ---------------------------------------------------------------------------

/**
 * Recursively collects all source file paths (.ts, .tsx, .js, .jsx, .mjs) from a directory.
 * @param {string} dir - Directory to scan
 * @returns {string[]} Array of file paths
 */
function getSourceFiles(dir) {
  const results = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      results.push(...getSourceFiles(fullPath));
    } else if (entry.isFile()) {
      if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Runs escomplex analysis on source files and returns the aggregate result.
 * Uses typhonjs-escomplex if available, falls back to escomplex.
 * Returns null gracefully if neither tool is installed.
 *
 * @param {string} worktreePath - Path to the worktree
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<{maintainability: number, maxComplexity: number}|null>}
 */
async function runEscomplexAnalysis(worktreePath, signal) {
  const srcDir = join(worktreePath, 'src');
  const sourceFiles = getSourceFiles(srcDir);
  if (sourceFiles.length === 0) return null;

  // Try to dynamically import typhonjs-escomplex first, then escomplex
  let escomplex;
  try {
    escomplex = await import('typhonjs-escomplex');
    if (escomplex.default) escomplex = escomplex.default;
  } catch {
    try {
      escomplex = await import('escomplex');
      if (escomplex.default) escomplex = escomplex.default;
    } catch {
      // Neither tool is available - return null gracefully
      return null;
    }
  }

  if (signal.aborted) return null;

  // Read all source files and prepare for analysis
  const sources = [];
  for (const filePath of sourceFiles) {
    if (signal.aborted) return null;
    try {
      const content = readFileSync(filePath, 'utf-8');
      sources.push({ srcPath: filePath, code: content });
    } catch {
      // Skip files that can't be read
      continue;
    }
  }

  if (sources.length === 0) return null;
  if (signal.aborted) return null;

  // Analyze using the escomplex API
  let aggregateMaintainability = 0;
  let maxComplexity = 0;
  let analyzedCount = 0;

  if (typeof escomplex.analyzeProject === 'function') {
    // Use project-level analysis for aggregate results
    try {
      const projectResult = escomplex.analyzeProject(sources);
      if (projectResult.maintainability != null) {
        aggregateMaintainability = projectResult.maintainability;
      } else if (projectResult.summary && projectResult.summary.maintainability != null) {
        aggregateMaintainability = projectResult.summary.maintainability;
      }

      // Find max cyclomatic complexity across all functions in all modules
      const modules = projectResult.modules || projectResult.reports || [];
      for (const mod of modules) {
        const methods = mod.methods || mod.functions || [];
        for (const method of methods) {
          const complexity = method.cyclomatic || method.complexity?.cyclomatic || 0;
          if (complexity > maxComplexity) {
            maxComplexity = complexity;
          }
        }
        // Also check module-level aggregate complexity
        if (mod.aggregate && mod.aggregate.cyclomatic > maxComplexity) {
          maxComplexity = mod.aggregate.cyclomatic;
        }
      }

      return { maintainability: Math.round(aggregateMaintainability * 10) / 10, maxComplexity };
    } catch {
      // Fall through to per-module analysis
    }
  }

  // Fallback: analyze each module individually
  if (typeof escomplex.analyzeModule === 'function') {
    for (const source of sources) {
      if (signal.aborted) return null;
      try {
        const moduleResult = escomplex.analyzeModule(source.code);
        if (moduleResult.maintainability != null) {
          aggregateMaintainability += moduleResult.maintainability;
          analyzedCount++;
        }
        const methods = moduleResult.methods || moduleResult.functions || [];
        for (const method of methods) {
          const complexity = method.cyclomatic || method.complexity?.cyclomatic || 0;
          if (complexity > maxComplexity) {
            maxComplexity = complexity;
          }
        }
        if (moduleResult.aggregate && moduleResult.aggregate.cyclomatic > maxComplexity) {
          maxComplexity = moduleResult.aggregate.cyclomatic;
        }
      } catch {
        // Skip files that fail to parse (e.g., JSX, decorators)
        continue;
      }
    }

    if (analyzedCount > 0) {
      const avgMaintainability = Math.round((aggregateMaintainability / analyzedCount) * 10) / 10;
      return { maintainability: avgMaintainability, maxComplexity };
    }
  }

  return null;
}

// Cache for escomplex analysis results to avoid running analysis twice
// (collectMaintainability and collectMaxComplexity both need it)
let _escomplexCache = { path: null, result: null };

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectMaintainability(worktreePath, signal) {
  let result;
  if (_escomplexCache.path === worktreePath && _escomplexCache.result != null) {
    result = _escomplexCache.result;
  } else {
    result = await runEscomplexAnalysis(worktreePath, signal);
    _escomplexCache = { path: worktreePath, result };
  }
  if (result == null) return null;
  return result.maintainability;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectMaxComplexity(worktreePath, signal) {
  let result;
  if (_escomplexCache.path === worktreePath && _escomplexCache.result != null) {
    result = _escomplexCache.result;
  } else {
    result = await runEscomplexAnalysis(worktreePath, signal);
    _escomplexCache = { path: worktreePath, result };
  }
  if (result == null) return null;
  return result.maxComplexity;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectDuplication(worktreePath, signal) {
  const srcDir = join(worktreePath, 'src');
  if (!existsSync(srcDir)) return null;

  // Create a temp directory for jscpd JSON output
  const tmpDir = mkdtempSync(join(tmpdir(), 'jscpd-'));

  try {
    // Run jscpd as a child process with JSON reporter
    await new Promise((resolvePromise, reject) => {
      const args = ['--reporters', 'json', '--output', tmpDir, srcDir];
      execFile('jscpd', args, {
        cwd: worktreePath,
        signal,
        maxBuffer: 5 * 1024 * 1024,
      }, (error, stdout, stderr) => {
        // jscpd may exit non-zero if duplication exceeds threshold
        // We still want to parse the JSON report file
        if (error && !existsSync(join(tmpDir, 'jscpd-report.json'))) {
          reject(error);
        } else {
          resolvePromise(stdout);
        }
      });
    });

    // Parse the JSON report
    const reportPath = join(tmpDir, 'jscpd-report.json');
    if (!existsSync(reportPath)) return null;

    const reportContent = readFileSync(reportPath, 'utf-8');
    const report = JSON.parse(reportContent);

    // jscpd JSON report structure: { statistics: { total: { percentage: X } } }
    if (report.statistics && report.statistics.total && typeof report.statistics.total.percentage === 'number') {
      return Math.round(report.statistics.total.percentage * 10) / 10;
    }

    // Alternative structure for newer jscpd versions
    if (report.statistics && typeof report.statistics.percentage === 'number') {
      return Math.round(report.statistics.percentage * 10) / 10;
    }

    return null;
  } finally {
    // Clean up temp directory
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ---------------------------------------------------------------------------
// Remaining Metric Helpers (Tasks 1.4 - 1.6)
// ---------------------------------------------------------------------------

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectSecurityIssues(worktreePath, signal) {
  const stdout = await execShell('npm audit --json', worktreePath, signal);
  const audit = JSON.parse(stdout);

  // Prefer metadata.vulnerabilities (npm v7+) which has severity counts
  if (audit.metadata && audit.metadata.vulnerabilities) {
    const vulns = audit.metadata.vulnerabilities;
    const total = Object.values(vulns).reduce((sum, count) => sum + count, 0);
    return total;
  }

  // Fallback: count entries in the vulnerabilities object (npm v6)
  if (audit.vulnerabilities && typeof audit.vulnerabilities === 'object') {
    return Object.keys(audit.vulnerabilities).length;
  }

  return 0;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectTsErrors(worktreePath, signal) {
  const tsconfigPath = join(worktreePath, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return 0;

  const stdout = await execShell(
    'npx tsc --noEmit --strict 2>&1 | grep -c "error TS" || true',
    worktreePath,
    signal,
  );

  const count = parseInt(stdout.trim(), 10);
  return isNaN(count) ? 0 : count;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectUnusedExports(worktreePath, signal) {
  const srcDir = join(worktreePath, 'src');
  if (!existsSync(srcDir)) return 0;

  const exportsStdout = await execShell(
    'grep -r "^export" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l',
    worktreePath,
    signal,
  );

  const importsStdout = await execShell(
    `grep -r "from ['\\"]\\./" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l`,
    worktreePath,
    signal,
  );

  const exports = parseInt(exportsStdout.trim(), 10);
  const imports = parseInt(importsStdout.trim(), 10);

  if (isNaN(exports) || isNaN(imports)) return null;
  return Math.max(0, exports - imports);
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectCommits(worktreePath, signal) {
  const stdout = await execShell('git log --oneline | wc -l', worktreePath, signal);
  const count = parseInt(stdout.trim(), 10);
  return isNaN(count) ? null : count;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectChurn(worktreePath, signal) {
  const stdout = await execShell(
    `git log --pretty=format: --numstat | awk '{s+=$1+$2}END{print s}'`,
    worktreePath,
    signal,
  );

  const value = parseInt(stdout.trim(), 10);
  return isNaN(value) ? null : value;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectCoverage(worktreePath, signal) {
  const coveragePath = join(worktreePath, 'coverage', 'coverage-summary.json');
  if (!existsSync(coveragePath)) return null;

  const content = readFileSync(coveragePath, 'utf-8');
  const json = JSON.parse(content);

  const pct = json?.total?.lines?.pct;
  if (pct == null || isNaN(pct)) return null;
  return pct;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectLighthouseA11y(worktreePath, signal) {
  const indexPath = join(worktreePath, 'dist', 'index.html');
  if (!existsSync(indexPath)) return null;

  const html = readFileSync(indexPath, 'utf-8');
  let score = 0;

  // Does it have <html lang="...">? (+20)
  if (/<html[^>]+lang\s*=\s*["'][^"']+["']/i.test(html)) {
    score += 20;
  }

  // Does it have a <title>? (+15)
  if (/<title[^>]*>.+<\/title>/i.test(html)) {
    score += 15;
  }

  // Does it have <meta name="viewport">? (+15)
  if (/<meta[^>]+name\s*=\s*["']viewport["']/i.test(html)) {
    score += 15;
  }

  // Count <img tags without alt attribute, deduct 5 per instance (min 0 for this check)
  const imgTags = html.match(/<img[^>]*>/gi) || [];
  let imgsWithoutAlt = 0;
  for (const img of imgTags) {
    if (!/alt\s*=/i.test(img)) {
      imgsWithoutAlt++;
    }
  }
  score -= imgsWithoutAlt * 5;
  if (score < 0) score = 0;

  // Does it have <main> or role="main"? (+15)
  if (/<main[\s>]/i.test(html) || /role\s*=\s*["']main["']/i.test(html)) {
    score += 15;
  }

  // Does it have <h1>? (+10)
  if (/<h1[\s>]/i.test(html)) {
    score += 10;
  }

  // Are there any <button> or <a> tags? (+10)
  if (/<button[\s>]/i.test(html) || /<a[\s>]/i.test(html)) {
    score += 10;
  }

  // Does it have ARIA attributes (aria-)? (+15)
  if (/aria-/i.test(html)) {
    score += 15;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectDepCount(worktreePath, signal) {
  const pkgPath = join(worktreePath, 'package.json');
  if (!existsSync(pkgPath)) return null;

  const content = readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(content);

  const deps = pkg.dependencies ? Object.keys(pkg.dependencies).length : 0;
  const devDeps = pkg.devDependencies ? Object.keys(pkg.devDependencies).length : 0;

  return deps + devDeps;
}

/** @param {string} worktreePath @param {AbortSignal} signal */
async function collectBundleWeight(worktreePath, signal) {
  const distDir = join(worktreePath, 'dist');
  if (!existsSync(distDir)) return null;

  let totalBytes = 0;
  const entries = readdirSync(distDir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && /\.js$/.test(entry.name)) {
      const filePath = join(entry.parentPath || entry.path, entry.name);
      const stat = statSync(filePath);
      totalBytes += stat.size;
    }
  }

  // Convert to KB, rounded to nearest integer
  return Math.round(totalBytes / 1024);
}

// ---------------------------------------------------------------------------
// Ordered list of metric collectors.
// Executed sequentially to avoid resource contention on CI runners.
// ---------------------------------------------------------------------------

const METRIC_COLLECTORS = [
  { key: 'sloc', name: 'SLoC', fn: collectSloc },
  { key: 'fileCount', name: 'File Count', fn: collectFileCount },
  { key: 'avgFileSize', name: 'Avg File Size', fn: collectAvgFileSize },
  { key: 'bundleSize', name: 'Bundle Size', fn: collectBundleSize },
  { key: 'maintainability', name: 'Maintainability', fn: collectMaintainability },
  { key: 'maxComplexity', name: 'Max Complexity', fn: collectMaxComplexity },
  { key: 'duplication', name: 'Duplication', fn: collectDuplication },
  { key: 'securityIssues', name: 'Security Issues', fn: collectSecurityIssues },
  { key: 'tsErrors', name: 'TS Errors', fn: collectTsErrors },
  { key: 'unusedExports', name: 'Unused Exports', fn: collectUnusedExports },
  { key: 'commits', name: 'Commits', fn: collectCommits },
  { key: 'churn', name: 'Churn', fn: collectChurn },
  { key: 'coverage', name: 'Coverage', fn: collectCoverage },
  { key: 'lighthouseA11y', name: 'Lighthouse A11y', fn: collectLighthouseA11y },
  { key: 'depCount', name: 'Dep Count', fn: collectDepCount },
  { key: 'bundleWeight', name: 'Bundle Weight', fn: collectBundleWeight },
];

/**
 * Collects all code quality metrics for a branch worktree.
 *
 * Metrics are gathered sequentially with per-metric 30s timeouts and a global
 * 120s circuit breaker. Any metric that fails or times out records null.
 *
 * @param {string} worktreePath - Absolute path to the branch worktree
 * @param {{ sourceRef: string, deployBranch: string, label: string }} branchMeta - Branch metadata
 * @returns {Promise<MetricsResult>}
 */
export async function collectMetrics(worktreePath, branchMeta) {
  const resolvedPath = resolve(worktreePath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Worktree path does not exist: ${resolvedPath}`);
  }

  console.log(`[collect-metrics] Starting collection for ${branchMeta.label} at ${resolvedPath}`);

  const result = createNullMetrics();

  // Global circuit breaker: abort everything after 120 seconds
  const globalController = new AbortController();
  const globalSignal = globalController.signal;

  const globalTimeout = setTimeout(() => {
    console.warn(`[collect-metrics] Global timeout (${GLOBAL_TIMEOUT_MS}ms) reached for ${branchMeta.label}. Aborting remaining metrics.`);
    globalController.abort();
  }, GLOBAL_TIMEOUT_MS);

  try {
    // Run metric helpers sequentially
    for (const collector of METRIC_COLLECTORS) {
      if (globalSignal.aborted) {
        console.warn(`[collect-metrics] Skipping ${collector.name} - global timeout exceeded.`);
        break;
      }

      const value = await runWithTimeout(
        collector.name,
        (signal) => collector.fn(resolvedPath, signal),
        globalSignal,
      );

      result[collector.key] = value;
    }
  } finally {
    clearTimeout(globalTimeout);
  }

  console.log(`[collect-metrics] Collection complete for ${branchMeta.label}`);
  return result;
}
