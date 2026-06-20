#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectMetrics, createNullMetrics } from './collect-metrics.mjs';

const config = {
  appName: process.env.AMPLIFY_APP_NAME || 'categorysolitaire-vibe-board',
  customDomain: process.env.AMPLIFY_CUSTOM_DOMAIN || 'solitaire.cardbrdbx.com',
  dashboardBranch: 'dashboard',
  region: process.env.AWS_REGION,
  branches: [
    { sourceRef: 'origin/claude.vibe', deployBranch: 'claude-vibe', label: 'Claude Vibe' },
    { sourceRef: 'origin/codex.vibe', deployBranch: 'codex-vibe', label: 'Codex Vibe' },
    { sourceRef: 'origin/cerebras.vibe', deployBranch: 'cerebras-vibe', label: 'Cerebras Vibe' },
    { sourceRef: 'origin/develop.kiro.vibe', deployBranch: 'develop-kiro-vibe', label: 'Develop Kiro Vibe' },
  ],
};

const rootDir = resolve(dirname(new URL(import.meta.url).pathname), '..');
const worktreeDir = join(rootDir, '.amplify-worktrees');
const artifactDir = join(rootDir, '.amplify-artifacts');
const binDir = join(rootDir, 'node_modules', '.bin');
const scriptPath = process.argv[1] ? resolve(process.argv[1]) : '';
const scriptArgs = process.argv.slice(2);
const skipAws = scriptArgs.includes('--skip-aws');
const skipBuild = scriptArgs.includes('--skip-build');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    env: {
      ...process.env,
      PATH: existsSync(binDir) ? `${binDir}:${process.env.PATH}` : process.env.PATH,
    },
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stderr || result.stdout}` : '';
    throw new Error(`Command failed: ${command} ${args.join(' ')}${detail}`);
  }

  return options.capture ? result.stdout.trim() : '';
}

function aws(args, options = {}) {
  const fullArgs = [
    'amplify',
    ...args,
    '--region',
    config.region,
    '--output',
    'json',
    '--no-cli-pager',
  ];
  return run('aws', fullArgs, { ...options, capture: true });
}

function awsJson(args) {
  return JSON.parse(aws(args));
}

function getGitOutput(args) {
  return run('git', args, { capture: true });
}

function getBranchMeta(sourceRef) {
  return {
    commit: getGitOutput(['rev-parse', '--short=12', sourceRef]),
    message: getGitOutput(['log', '-1', '--format=%s', sourceRef]),
  };
}

function ensureCleanWorkingTree() {
  const dirty = getGitOutput(['status', '--porcelain']);
  if (dirty) {
    throw new Error(`Working tree has uncommitted changes. Commit or stash them before deploying.\n${dirty}`);
  }
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function cleanDir(path) {
  rmSync(path, { force: true, recursive: true });
  ensureDir(path);
}

function zipDirectory(sourceDir, zipPath) {
  rmSync(zipPath, { force: true });
  run('zip', ['-qr', zipPath, '.'], { cwd: sourceDir });
}

async function uploadFile(url, filePath) {
  run(
    'curl',
    [
      '--fail',
      '--silent',
      '--show-error',
      '--request',
      'PUT',
      '--header',
      'content-type: application/zip',
      '--upload-file',
      filePath,
      url,
    ],
    { capture: true },
  );
}

function delay(ms) {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}

function findExistingApp() {
  const apps = awsJson(['list-apps']).apps || [];
  return apps.find((app) => app.name === config.appName);
}

function createApp() {
  const customRules = JSON.stringify([{ source: '/<*>', target: '/index.html', status: '404-200' }]);
  return awsJson([
    'create-app',
    '--name',
    config.appName,
    '--description',
    'Manual Amplify board for Category Solitaire branch variants.',
    '--platform',
    'WEB',
    '--custom-rules',
    customRules,
    '--tags',
    'Project=categorysolitaire,ManagedBy=scripts/deploy-amplify-board.mjs',
  ]).app;
}

function ensureApp() {
  const existing = findExistingApp();
  if (existing) {
    console.log(`Using existing Amplify app ${existing.appId} (${existing.defaultDomain})`);
    return existing;
  }

  const created = createApp();
  console.log(`Created Amplify app ${created.appId} (${created.defaultDomain})`);
  return created;
}

function branchExists(appId, branchName) {
  const result = spawnSync(
    'aws',
    [
      'amplify',
      'get-branch',
      '--app-id',
      appId,
      '--branch-name',
      branchName,
      '--region',
      config.region,
      '--output',
      'json',
      '--no-cli-pager',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return result.status === 0;
}

function ensureBranch(appId, branchName, displayName = branchName, stage = 'EXPERIMENTAL') {
  if (branchExists(appId, branchName)) {
    console.log(`Using existing branch ${branchName}`);
    return;
  }

  aws([
    'create-branch',
    '--app-id',
    appId,
    '--branch-name',
    branchName,
    '--display-name',
    displayName,
    '--stage',
    stage,
    '--framework',
    'React',
    '--no-enable-auto-build',
    '--ttl',
    '60',
  ]);
  console.log(`Created branch ${branchName}`);
}

function waitForJob(appId, branchName, jobId) {
  const terminal = new Set(['SUCCEED', 'FAILED', 'CANCELLED']);
  for (;;) {
    const job = awsJson(['get-job', '--app-id', appId, '--branch-name', branchName, '--job-id', jobId]).job.summary;
    const status = job.status;
    console.log(`  ${branchName} job ${jobId}: ${status}`);
    if (terminal.has(status)) {
      if (status !== 'SUCCEED') {
        throw new Error(`${branchName} deployment ended with ${status}`);
      }
      return;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
}

function settlePreviousJobs(appId, branchName) {
  const jobs = awsJson(['list-jobs', '--app-id', appId, '--branch-name', branchName]).jobSummaries || [];
  const cancellable = new Set(['CREATED', 'PENDING']);
  const waitable = new Set(['PROVISIONING', 'RUNNING']);

  for (const job of jobs) {
    if (cancellable.has(job.status)) {
      console.log(`  stopping stale ${branchName} job ${job.jobId}: ${job.status}`);
      awsJson(['stop-job', '--app-id', appId, '--branch-name', branchName, '--job-id', job.jobId]);
    } else if (waitable.has(job.status)) {
      console.log(`  waiting for active ${branchName} job ${job.jobId}: ${job.status}`);
      waitForJob(appId, branchName, job.jobId);
    }
  }
}

async function deployZip(appId, branchName, zipPath) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      settlePreviousJobs(appId, branchName);
      const deployment = awsJson(['create-deployment', '--app-id', appId, '--branch-name', branchName]);
      console.log(`Uploading ${branchName} artifact${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
      await uploadFile(deployment.zipUploadUrl, zipPath);
      const job = awsJson([
        'start-deployment',
        '--app-id',
        appId,
        '--branch-name',
        branchName,
        '--job-id',
        deployment.jobId,
      ]).jobSummary;
      waitForJob(appId, branchName, job.jobId);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      console.warn(`  ${branchName} upload/deploy attempt ${attempt} failed: ${error.message}`);
      await delay(3000 * attempt);
    }
  }
}

function addWorktree(sourceRef, name) {
  const path = join(worktreeDir, name);
  rmSync(path, { force: true, recursive: true });
  run('git', ['worktree', 'add', '--detach', path, sourceRef]);
  return path;
}

function removeWorktree(path) {
  run('git', ['worktree', 'remove', '--force', path]);
}

function runBranchBuild(worktree) {
  try {
    run('npm', ['run', 'build'], { cwd: worktree });
  } catch (error) {
    console.warn(`Build failed with shared dependencies: ${error.message}`);
    console.warn('Installing branch-local dependencies and retrying build.');
    run('npm', ['install', '--no-audit', '--no-fund'], { cwd: worktree });
    try {
      run('npm', ['run', 'build'], { cwd: worktree });
    } catch (checkedBuildError) {
      console.warn(`Checked build failed: ${checkedBuildError.message}`);
      console.warn('Attempting Vite bundle directly without TypeScript checking.');
      run('npm', ['exec', 'vite', '--', 'build'], { cwd: worktree });
    }
  }
}

function buildBranch(branch) {
  const worktree = addWorktree(branch.sourceRef, branch.deployBranch);
  console.log(`Building ${branch.sourceRef}`);
  runBranchBuild(worktree);
  const distDir = join(worktree, 'dist');
  if (!existsSync(join(distDir, 'index.html'))) {
    removeWorktree(worktree);
    throw new Error(`${branch.sourceRef} did not produce dist/index.html`);
  }
  const zipPath = join(artifactDir, `${branch.deployBranch}.zip`);
  zipDirectory(distDir, zipPath);
  return { zipPath, worktreePath: worktree };
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ---------------------------------------------------------------------------
// Baseball Card Configuration
// ---------------------------------------------------------------------------

const STAT_GROUPS = {
  Code: [
    { key: 'sloc', abbr: 'Source Lines of Code', label: 'Source Lines of Code', desc: 'Total non-blank, non-comment lines of source code.' },
    { key: 'fileCount', abbr: 'Source File Count', label: 'File Count', desc: 'Number of source files in the project.' },
    { key: 'avgFileSize', abbr: 'Avg Lines per File', label: 'Average File Size', desc: 'Mean number of lines per source file.' },
    { key: 'bundleSize', abbr: 'Bundle Size (KB)', label: 'Bundle Size (KB)', desc: 'Total size of the production build output.' },
  ],
  Quality: [
    { key: 'maintainability', abbr: 'Maintainability Index', label: 'Maintainability Index', desc: 'Composite score (0-100) indicating how maintainable the code is.' },
    { key: 'maxComplexity', abbr: 'Max Cyclomatic Complexity', label: 'Max Cyclomatic Complexity', desc: 'Highest complexity score of any single function.' },
    { key: 'duplication', abbr: 'Duplication %', label: 'Duplication Percentage', desc: 'Percentage of code that appears in more than one location.' },
  ],
  Health: [
    { key: 'securityIssues', abbr: 'Security Vulnerabilities', label: 'Security Issues', desc: 'Number of known vulnerabilities in dependencies.' },
    { key: 'tsErrors', abbr: 'TypeScript Errors', label: 'TypeScript Errors', desc: 'Compilation errors under strict TypeScript mode.' },
    { key: 'unusedExports', abbr: 'Unused Exports', label: 'Unused Exports', desc: 'Exported symbols not imported anywhere in the project.' },
  ],
  Process: [
    { key: 'commits', abbr: 'Total Commits', label: 'Commit Count', desc: 'Total number of git commits on the branch.' },
    { key: 'churn', abbr: 'Code Churn (lines)', label: 'Code Churn', desc: 'Sum of lines added and deleted across all commits.' },
    { key: 'coverage', abbr: 'Test Coverage %', label: 'Test Coverage', desc: 'Percentage of source lines exercised by tests.' },
  ],
  UX: [
    { key: 'lighthouseA11y', abbr: 'Accessibility Score', label: 'Lighthouse Accessibility', desc: 'Automated accessibility audit score (0-100).' },
  ],
  Dependencies: [
    { key: 'depCount', abbr: 'Dependency Count', label: 'Dependency Count', desc: 'Total number of runtime and dev dependencies.' },
    { key: 'bundleWeight', abbr: 'JS Bundle Weight (KB)', label: 'Bundle Weight (KB)', desc: 'Total JavaScript bundle size shipped to browser.' },
  ],
};

// Two-tone mascot SVG logos (inline, 1980s card-back style)
const CLAUDE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" class="card-logo mascot claude-mascot" aria-hidden="true"><path fill="#0b2c48" d="M23 30h50l8 12v30L68 84H28L15 72V42z"/><path fill="#d8b64b" d="M28 26h40l9 12H19zM30 42h36v30H30z"/><path fill="#0b2c48" d="M36 50h8v8h-8zM54 50h8v8h-8zM40 66h18v4H40zM56 35h18v5H56z"/><circle cx="72" cy="52" r="10" fill="none" stroke="#0b2c48" stroke-width="5"/><path fill="#0b2c48" d="M72 50h15v4H72zM24 20h18v6H24z"/></svg>`;

const CODEX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" class="card-logo mascot codex-mascot" aria-hidden="true"><path fill="#0b2c48" d="M17 40h62v32L68 84H28L17 72z"/><path fill="#d8b64b" d="M20 35h56l-8-17H34zM29 45h38v26H29z"/><path fill="#0b2c48" d="M34 51h8v8h-8zM54 51h8v8h-8zM40 66h16v4H40zM22 34l-10 8 6 7 11-10zM68 35l13 8-6 7-12-10z"/><path fill="#d8b64b" d="M43 19l8-10 8 10z"/></svg>`;

const CEREBRAS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" class="card-logo mascot cerebras-mascot" aria-hidden="true"><path fill="#0b2c48" d="M48 12l29 18v32L48 85 19 62V30z"/><path fill="#d8b64b" d="M48 20l22 14v24L48 76 26 58V34z"/><path fill="#0b2c48" d="M32 35h32v9H32zM36 48h9v9h-9zM51 48h9v9h-9zM38 63h20v5H38zM16 27l18 8-7 9-16-10zM80 27L62 35l7 9 16-10z"/></svg>`;

const KIRO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" class="card-logo mascot kiro-mascot" aria-hidden="true"><path fill="#0b2c48" d="M20 35c0-16 12-25 28-25s28 9 28 25v45l-10-7-9 8-9-8-9 8-9-8-10 7z"/><path fill="#d8b64b" d="M28 36c0-12 8-18 20-18s20 6 20 18v28l-7-5-7 6-6-6-6 6-7-6-7 5z"/><path fill="#0b2c48" d="M35 39h8v9h-8zM53 39h8v9h-8zM39 56h18v5H39zM22 30h-9v-8h15zM74 30h9v-8H68z"/></svg>`;

const BRANCH_CONFIG = {
  'claude-vibe': {
    llm: 'Claude 4 Sonnet', shortName: 'Claude', paradigm: 'Vibe Mode', ide: 'Claude CLI', language: 'TypeScript', logo: CLAUDE_SVG,
    report: 'Measured and deliberate, Claude tends to trade flash for steady structure. Its old-soul mascot checks the branch like a tiny code librarian with a monocle.',
    traits: { built: 'Careful', tests: 'Steady', lint: 'Polite', security: 'Cautious', vibe: 'Gentle' },
  },
  'codex-vibe': {
    llm: 'Codex', shortName: 'Codex', paradigm: 'Vibe Mode', ide: 'Codex', language: 'TypeScript', logo: CODEX_SVG,
    report: 'Codex likes fast iteration and suspiciously tidy diffs when the clues line up. Detective Cat sniffs for broken flows before the trail goes cold.',
    traits: { built: 'Swift', tests: 'Sleuthy', lint: 'Sharp', security: 'Watchful', vibe: 'Noir' },
  },
  'cerebras-vibe': {
    llm: 'Cerebras', shortName: 'Cerebras', paradigm: 'Vibe Mode', ide: 'VSCode Extension', language: 'TypeScript', logo: CEREBRAS_SVG,
    report: 'Cerebras brings big-chip energy and favors high-throughput changes. The neon ninja mascot moves like a build cache in parachute pants.',
    traits: { built: 'Rapid', tests: 'Kinetic', lint: 'Bright', security: 'Guarded', vibe: 'Turbo' },
  },
  'develop-kiro-vibe': {
    llm: 'Kiro', shortName: 'Kiro', paradigm: 'Vibe Mode', ide: 'Kiro', language: 'TypeScript', logo: KIRO_SVG,
    report: 'Kiro leans spec-first and haunts the branch with product-shaped intent. Its friendly 80s ghost keeps requirements rattling around the attic.',
    traits: { built: 'Spec', tests: 'Eerie', lint: 'Orderly', security: 'Wary', vibe: 'Ghost' },
  },
};

/**
 * Formats a metric value for display; null renders as "—" (dash).
 */
function formatMetric(value) {
  if (value === null || value === undefined) return '—';
  return String(value);
}

/**
 * Renders the stat groups for a card as compact four-square score boxes.
 */
function renderStatGroups(metrics, cardIndex) {
  return `<div class="stat-grid">${Object.entries(STAT_GROUPS).map(([groupName, stats]) => {
    const rows = stats.map(stat => {
      const value = metrics ? metrics[stat.key] : null;
      const tipId = `tip-${cardIndex}-${stat.key}`;
      return `<div class="stat-row">
        <span class="stat-abbr" data-tip="${tipId}" tabindex="0" aria-describedby="${tipId}">${htmlEscape(stat.abbr)}<span class="leader-line" aria-hidden="true"></span><div id="${tipId}" role="tooltip" class="stat-tooltip" aria-hidden="true"><strong>${htmlEscape(stat.label)}</strong><span>${htmlEscape(stat.desc)}</span></div></span>
        <span class="stat-value">${formatMetric(value)}</span>
      </div>`;
    }).join('');
    return `<section class="stat-box"><div class="stat-head"><strong>${htmlEscape(groupName)}</strong><span>Value</span></div>${rows}</section>`;
  }).join('')}</div>`;
}

function renderTraitFooter(traits) {
  return Object.entries(traits).map(([key, value]) => `<span><b>${htmlEscape(key)}:</b> ${htmlEscape(value)}</span>`).join('');
}

/**
 * Renders the full baseball card dashboard as a self-contained HTML string.
 * No external stylesheets, scripts, images, or fetch calls.
 */
function renderDashboard(app, deployedBranches) {
  const cards = deployedBranches.map((branch, index) => {
    const branchConfig = BRANCH_CONFIG[branch.deployBranch] || {
      llm: branch.label || branch.deployBranch,
      shortName: branch.label || branch.deployBranch,
      paradigm: 'Vibe Mode',
      ide: 'Unknown',
      language: 'TypeScript',
      logo: KIRO_SVG,
      report: 'This branch has mysterious arcade energy and enough metrics to make a spreadsheet wear sunglasses.',
      traits: { built: 'Unknown', tests: 'Pending', lint: 'Unknown', security: 'Unknown', vibe: 'Odd' },
    };

    const statGroupsHtml = renderStatGroups(branch.metrics, index);
    const shortCommit = (branch.commit || 'local-preview').slice(0, 7);
    const repoName = (branch.sourceRef || '').replace(/^origin\//, '') || branch.deployBranch;
    const displayUrl = branch.url || `https://${branch.deployBranch}.${config.customDomain}/`;

    return `
      <div class="card-slide" data-card-index="${index}">
        <article class="baseball-card">
          <div class="top-banner">
            <div class="commit-tag">${htmlEscape(shortCommit)}</div>
            <div class="title-stack">
              <div class="card-title"><span>${htmlEscape(branchConfig.llm)}</span><i>•</i><b>${htmlEscape(branchConfig.paradigm)}</b></div>
            </div>
          </div>
          <div class="micro-meta" aria-label="Branch metadata">
            <span>ide: ${htmlEscape(branchConfig.ide)}</span>
            <span>url: ${htmlEscape(displayUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</span>
            <span>branch: ${htmlEscape(repoName)}</span>
            <span>lang: ${htmlEscape(branchConfig.language)}</span>
          </div>
          ${statGroupsHtml}
          <section class="scouting-report">
            <div class="mascot-wrap">${branchConfig.logo}</div>
            <div class="report-copy">
              <h2>Scouting Report</h2>
              <p>${htmlEscape(branchConfig.report)}</p>
            </div>
          </section>
          <footer class="bottom-panel">
            <div class="trait-strip">${renderTraitFooter(branchConfig.traits)}</div>
            <div class="domain-mark" aria-label="cardbrdbx.com"><span class="globe"></span><strong>CARDBRDBX</strong><em>.com</em></div>
          </footer>
        </article>
        <a class="open-app-button" href="${htmlEscape(branch.url || '#')}" target="_blank" rel="noreferrer">OPEN APP &#x2192;</a>
      </div>`;
  }).join('\n');

  const dotIndicators = deployedBranches.length > 1
    ? `<div class="carousel-dots" aria-label="Card navigation">${deployedBranches.map((_, i) =>
        `<button class="dot${i === 0 ? ' active' : ''}" data-dot="${i}" aria-label="Show card ${i + 1}"></button>`
      ).join('')}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Category Solitaire - Branch Variants</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--paper:#efe7cf;--navy:#092b47;--navy2:#061d31;--gold:#d6ad38;--gold2:#e7c85d;--ink:#120f0a;--cream:#f7e8b8;--rust:#b9482c;--shadow:#453014;--pixel-font:"Courier New",Courier,monospace;--pixel:var(--pixel-font);--header-text:#fff;--card-bg-claude:#f3df9e;--card-bg-codex:#d8c46b;--card-bg-cerebras:#dfbf6d;--card-bg-kiro:#e2b852;--condensed:Impact,"Arial Narrow",var(--pixel)}
body{font-family:var(--pixel);background:radial-gradient(circle at 25% 8%,#fff8dc,transparent 28%),linear-gradient(180deg,#f4efd9,#e7dcc0);min-height:100vh;padding:20px 12px;color:var(--ink)}
main{max-width:1220px;margin:0 auto}header{text-align:center;margin-bottom:14px}h1{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#5d4930}header p{display:none}.board{display:grid;grid-template-columns:repeat(4,minmax(250px,1fr));gap:14px;align-items:start}.card-slide{display:flex;flex-direction:column;gap:10px;min-width:0}.baseball-card{position:relative;overflow:visible;min-height:0;border:3px solid var(--navy);color:var(--ink);padding:12px 14px;background:radial-gradient(circle at 14% 22%,rgba(69,48,20,.2) 0 1px,transparent 1px 8px),radial-gradient(circle at 82% 16%,rgba(255,255,255,.22) 0 1px,transparent 1px 7px),repeating-linear-gradient(0deg,rgba(9,43,71,.045) 0 1px,transparent 1px 5px),linear-gradient(135deg,#f3df9e,#d5b657 20%,#efd690 56%,#c99f2e);box-shadow:inset 0 0 0 5px var(--gold),inset 0 0 0 9px #f7e8b8,5px 6px 0 rgba(6,29,49,.38)}
.baseball-card:before{content:"";position:absolute;inset:9px;border:2px solid var(--navy);clip-path:polygon(4% 0,96% 0,100% 4%,100% 96%,96% 100%,4% 100%,0 96%,0 4%);pointer-events:none}.baseball-card:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,247,206,.24),transparent 20% 75%,rgba(20,39,70,.2));mix-blend-mode:multiply;pointer-events:none}.baseball-card>*{position:relative;z-index:1}.top-banner{display:grid;grid-template-columns:78px 1fr;align-items:stretch;background:var(--navy);clip-path:polygon(4% 0,96% 0,100% 50%,96% 100%,4% 100%,0 50%);border:3px solid var(--navy2);min-height:70px;margin-bottom:10px}.commit-tag{display:flex;align-items:center;justify-content:center;background:var(--gold);color:#050505;font-family:var(--condensed);font-size:28px;letter-spacing:1px;font-weight:900;clip-path:polygon(0 0,88% 0,100% 50%,88% 100%,0 100%);text-transform:lowercase}.title-stack{display:flex;align-items:center;min-width:0;padding:6px 12px 6px 18px}.card-title{font-family:var(--condensed);font-size:clamp(26px,3.2vw,42px);line-height:.95;text-transform:uppercase;letter-spacing:2px;color:#f3e2b0;text-shadow:2px 2px 0 rgba(0,0,0,.28);white-space:normal}.card-title i{font-style:normal;color:var(--gold);margin:0 10px}.card-title b{color:var(--gold);font-weight:900}.micro-meta{display:grid;grid-template-columns:.8fr 1.4fr 1fr .8fr;gap:8px;border-top:3px solid var(--navy);border-bottom:3px solid var(--navy);padding:7px 8px;margin-bottom:10px;font-size:10px;font-weight:900;text-transform:lowercase;color:#111;background:rgba(232,198,89,.45)}.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.stat-box{border:2px solid var(--navy);background:rgba(247,232,184,.42);min-height:148px}.stat-head{display:flex;justify-content:space-between;align-items:center;background:var(--navy);color:var(--gold2);padding:5px 7px;font-family:var(--condensed);font-size:19px;text-transform:uppercase;letter-spacing:1.3px}.stat-head span{font-family:var(--pixel);font-size:9px;color:#f7e8b8}.stat-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;align-items:center;padding:6px 7px}.stat-abbr{display:flex;align-items:flex-end;min-width:0;font-weight:900;font-size:10px;line-height:1.1;cursor:help;position:relative;white-space:normal}.leader-line{height:1px;flex:1;border-bottom:2px dotted var(--ink);margin:0 3px 2px;opacity:.8}.stat-value{display:inline-flex;min-width:42px;min-height:28px;align-items:center;justify-content:center;border:2px solid var(--navy);background:linear-gradient(#f3d365,var(--gold));box-shadow:inset 0 0 0 1px #fff2b8,1px 1px 0 var(--shadow);font-size:13px;font-weight:900;color:var(--navy)}.stat-tooltip{display:none;position:absolute;left:0;bottom:100%;background:#111;color:#fff;padding:5px 7px;font-size:9px;min-width:150px;max-width:220px;z-index:100;line-height:1.3}.stat-tooltip.visible{display:block}.stat-tooltip strong{display:block;color:var(--gold2);margin-bottom:2px}.scouting-report{display:grid;grid-template-columns:92px 1fr;gap:12px;margin-top:12px;border:2px solid var(--navy);border-radius:14px;padding:10px;background:rgba(247,232,184,.42)}.mascot-wrap{align-self:center;width:25%}.scouting-report .mascot-wrap{width:auto}.card-logo{display:block;width:100%;height:auto;filter:drop-shadow(3px 4px 0 rgba(9,43,71,.25))}.report-copy h2{display:inline-block;background:var(--navy);color:var(--gold2);font-family:var(--condensed);font-size:20px;letter-spacing:1.2px;text-transform:uppercase;padding:2px 8px;margin-bottom:6px}.report-copy p{font-size:12px;font-weight:900;line-height:1.38;font-style:italic}.bottom-panel{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;margin-top:12px}.trait-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 10px;background:rgba(214,173,56,.7);border:2px solid var(--navy);padding:7px;font-size:10px;text-transform:uppercase;font-weight:900}.trait-strip b{color:var(--navy)}.domain-mark{display:grid;justify-items:center;color:#f3e2b0;text-shadow:2px 2px 0 var(--navy);font-family:var(--condensed);font-size:20px;letter-spacing:1px;min-width:106px}.domain-mark em{font-family:var(--pixel);font-size:9px;color:var(--gold2);font-style:normal}.globe{width:78px;height:36px;border:2px solid #f3e2b0;border-radius:50%;display:block;margin-bottom:-24px;background:repeating-radial-gradient(circle,transparent 0 7px,rgba(243,226,176,.55) 8px 9px),linear-gradient(90deg,transparent 48%,#f3e2b0 49% 51%,transparent 52%)}.open-app-button{display:block;align-self:center;width:70%;border:3px solid var(--ink);background:#c7472e;color:var(--header-text);text-align:center;text-decoration:none;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;padding:9px 10px;box-shadow:3px 3px 0 rgba(0,0,0,.2)}.open-app-button:visited{color:#fff}.open-app-button:hover,.open-app-button:focus{background:var(--navy);outline:2px solid var(--gold);outline-offset:2px}.carousel-dots{display:none;justify-content:center;gap:8px;margin:12px 0}.dot{width:12px;height:12px;border:2px solid var(--navy);background:#d7c9a4;transform:rotate(45deg)}.dot.active{background:var(--gold)}footer.page-footer{text-align:center;margin-top:12px;color:#5d4930;font-size:9px;letter-spacing:.5px}
@media(max-width:1120px){.board{grid-template-columns:repeat(2,minmax(270px,1fr))}.baseball-card{min-height:720px}}
@media(max-width:700px){body{padding:8px}.board{display:flex;overflow-x:auto;overflow-y:visible;gap:0;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}.board::-webkit-scrollbar{display:none}.card-slide{flex:0 0 calc(100vw - 16px);max-width:calc(100vw - 16px);padding:0 8px;scroll-snap-align:start}.baseball-card{min-height:auto;padding:10px}.top-banner{grid-template-columns:86px 1fr}.card-title{font-size:30px}.micro-meta{grid-template-columns:1fr;font-size:10px}.stat-grid{grid-template-columns:1fr}.stat-box{min-height:0}.scouting-report{grid-template-columns:78px 1fr}.bottom-panel{grid-template-columns:1fr}.domain-mark{justify-self:end}.carousel-dots{display:flex}.open-app-button{width:78%}}
</style>
</head>
<body>
<main>
  <header>
    <h1>Category Solitaire &middot; Branch Variants</h1>
  </header>
  <section class="board" aria-label="AI Baseball Cards" id="card-board">
    ${cards}
  </section>
  ${dotIndicators}
  <footer class="page-footer">Data as of ${htmlEscape(new Date().toISOString().slice(0,10))}</footer>
</main>
<script>
(function(){
  var activeTooltip=null;
  function show(el){hide();var tipId=el.getAttribute('data-tip');var tip=document.getElementById(tipId);if(tip){tip.classList.add('visible');tip.setAttribute('aria-hidden','false');activeTooltip=tip;}}
  function hide(){if(activeTooltip){activeTooltip.classList.remove('visible');activeTooltip.setAttribute('aria-hidden','true');activeTooltip=null;}}
  var cells=document.querySelectorAll('.stat-abbr');
  for(var i=0;i<cells.length;i++){cells[i].addEventListener('mouseenter',function(){show(this);});cells[i].addEventListener('focus',function(){show(this);});cells[i].addEventListener('mouseleave',hide);cells[i].addEventListener('blur',hide);cells[i].addEventListener('touchstart',function(e){var tipId=this.getAttribute('data-tip');var tip=document.getElementById(tipId);if(tip&&tip.classList.contains('visible')){hide();}else{show(this);}}, {passive:true});}
  document.addEventListener('touchstart',function(e){if(!e.target.closest||!e.target.closest('.stat-abbr'))hide();},{passive:true});
  var board=document.getElementById('card-board');var cards=board?board.querySelectorAll('.card-slide'):[];var dots=document.querySelectorAll('.dot');
  function setDot(idx){for(var i=0;i<dots.length;i++)dots[i].classList.toggle('active',i===idx);}
  function scrollToCard(idx){if(!board||!cards[idx])return;board.scrollTo({left:cards[idx].offsetLeft-board.offsetLeft,behavior:'smooth'});setDot(idx);}
  for(var d=0;d<dots.length;d++)dots[d].addEventListener('click',(function(idx){return function(){scrollToCard(idx);};})(d));
  if(board&&cards.length>1){board.addEventListener('scroll',function(){var idx=Math.round(board.scrollLeft/Math.max(1,cards[0].offsetWidth));setDot(Math.max(0,Math.min(cards.length-1,idx)));},{passive:true});}
})();
</script>
</body>
</html>`;
}

// Export for testing
export { renderDashboard, STAT_GROUPS, BRANCH_CONFIG, formatMetric, htmlEscape };

function buildDashboard(app, deployedBranches) {
  const dashboardDir = join(artifactDir, 'dashboard');
  cleanDir(dashboardDir);
  writeFileSync(join(dashboardDir, 'index.html'), renderDashboard(app, deployedBranches));
  const zipPath = join(artifactDir, 'dashboard.zip');
  zipDirectory(dashboardDir, zipPath);
  return zipPath;
}

async function main() {
  ensureCleanWorkingTree();
  ensureDir(worktreeDir);
  cleanDir(artifactDir);

  const metadata = config.branches.map((branch) => ({
    ...branch,
    ...getBranchMeta(branch.sourceRef),
  }));

  if (skipAws) {
    console.log('Skipping AWS deployment because --skip-aws was provided.');
  }

  const app = skipAws
    ? { appId: 'local-preview', defaultDomain: 'local-preview.amplifyapp.com' }
    : ensureApp();

  const deployedBranches = [];
  for (const branch of metadata) {
    let zipPath;
    let metrics = null;

    if (skipBuild) {
      zipPath = join(artifactDir, `${branch.deployBranch}.zip`);
      // When --skip-build is active, skip metrics collection entirely
      metrics = createNullMetrics();
    } else {
      const buildResult = buildBranch(branch);
      zipPath = buildResult.zipPath;

      // Collect metrics after build, before worktree removal.
      // Wrap in try/catch with 120s Promise.race timeout for resilience.
      try {
        const METRICS_TIMEOUT_MS = 120_000;
        metrics = await Promise.race([
          collectMetrics(buildResult.worktreePath, branch),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Metrics collection timed out (120s)')), METRICS_TIMEOUT_MS)
          ),
        ]);
      } catch (metricsError) {
        console.warn(`[deploy] Metrics collection failed for ${branch.label}: ${metricsError.message}`);
        metrics = createNullMetrics();
      }

      removeWorktree(buildResult.worktreePath);
    }

    const url = `https://${branch.deployBranch}.${config.customDomain}/`;
    deployedBranches.push({ ...branch, url, metrics });

    if (!skipAws) {
      ensureBranch(app.appId, branch.deployBranch, branch.deployBranch);
      await deployZip(app.appId, branch.deployBranch, zipPath);
    }
  }

  const dashboardUrl = `https://${config.customDomain}/`;
  const dashboardZip = buildDashboard(app, deployedBranches);
  if (!skipAws) {
    ensureBranch(app.appId, config.dashboardBranch, config.dashboardBranch, 'PRODUCTION');
    await deployZip(app.appId, config.dashboardBranch, dashboardZip);
  }

  console.log('\nDeployment board');
  console.log(`Dashboard: ${dashboardUrl}`);
  for (const branch of deployedBranches) {
    console.log(`${branch.label}: ${branch.url}`);
  }
}

// Only run main() when this script is executed directly, not when imported
const isDirectExecution = process.argv[1] && (
  process.argv[1].endsWith('deploy-amplify-board.mjs') ||
  process.argv[1].includes('deploy-amplify-board')
);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
