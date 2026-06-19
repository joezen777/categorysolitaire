#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { collectMetrics, createNullMetrics } from './collect-metrics.mjs';

const config = {
  appName: process.env.AMPLIFY_APP_NAME || 'categorysolitaire-vibe-board',
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
      '--profile',
      config.profile,
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
    { key: 'sloc', abbr: 'SLoC', label: 'Source Lines of Code', desc: 'Total non-blank, non-comment lines of source code.' },
    { key: 'fileCount', abbr: 'Files', label: 'File Count', desc: 'Number of source files in the project.' },
    { key: 'avgFileSize', abbr: 'Avg', label: 'Average File Size', desc: 'Mean number of lines per source file.' },
    { key: 'bundleSize', abbr: 'Bndl', label: 'Bundle Size (KB)', desc: 'Total size of the production build output.' },
  ],
  Quality: [
    { key: 'maintainability', abbr: 'MI', label: 'Maintainability Index', desc: 'Composite score (0-100) indicating how maintainable the code is.' },
    { key: 'maxComplexity', abbr: 'Cplx', label: 'Max Cyclomatic Complexity', desc: 'Highest complexity score of any single function.' },
    { key: 'duplication', abbr: 'Dup%', label: 'Duplication Percentage', desc: 'Percentage of code that appears in more than one location.' },
  ],
  Health: [
    { key: 'securityIssues', abbr: 'SecI', label: 'Security Issues', desc: 'Number of known vulnerabilities in dependencies.' },
    { key: 'tsErrors', abbr: 'TSE', label: 'TypeScript Errors', desc: 'Compilation errors under strict TypeScript mode.' },
    { key: 'unusedExports', abbr: 'UExp', label: 'Unused Exports', desc: 'Exported symbols not imported anywhere in the project.' },
  ],
  Process: [
    { key: 'commits', abbr: 'Cmts', label: 'Commit Count', desc: 'Total number of git commits on the branch.' },
    { key: 'churn', abbr: 'Chrn', label: 'Code Churn', desc: 'Sum of lines added and deleted across all commits.' },
    { key: 'coverage', abbr: 'Cov%', label: 'Test Coverage', desc: 'Percentage of source lines exercised by tests.' },
  ],
  UX: [
    { key: 'lighthouseA11y', abbr: 'LhA', label: 'Lighthouse Accessibility', desc: 'Automated accessibility audit score (0-100).' },
  ],
  Dependencies: [
    { key: 'depCount', abbr: 'Deps', label: 'Dependency Count', desc: 'Total number of runtime and dev dependencies.' },
    { key: 'bundleWeight', abbr: 'Bwt', label: 'Bundle Weight (KB)', desc: 'Total JavaScript bundle size shipped to browser.' },
  ],
};

// 8-bit pixel-art SVG logos (inline, max 25% card width)
const CLAUDE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="card-logo"><rect x="4" y="4" width="24" height="24" rx="4" fill="#D97757"/><rect x="8" y="10" width="4" height="4" fill="#fff"/><rect x="20" y="10" width="4" height="4" fill="#fff"/><rect x="10" y="18" width="12" height="3" rx="1" fill="#fff"/><rect x="12" y="8" width="8" height="2" fill="#fff" opacity="0.5"/></svg>`;

const CODEX_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="card-logo"><rect x="4" y="4" width="24" height="24" rx="4" fill="#10A37F"/><rect x="8" y="8" width="6" height="6" fill="#fff"/><rect x="18" y="8" width="6" height="6" fill="#fff"/><rect x="8" y="18" width="16" height="6" rx="2" fill="#fff"/><rect x="14" y="12" width="4" height="4" fill="#10A37F"/></svg>`;

const CEREBRAS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="card-logo"><rect x="4" y="4" width="24" height="24" rx="4" fill="#007ACC"/><rect x="8" y="8" width="4" height="16" fill="#fff"/><rect x="12" y="8" width="4" height="4" fill="#fff"/><rect x="12" y="14" width="4" height="4" fill="#fff"/><rect x="16" y="8" width="4" height="4" fill="#fff"/><rect x="20" y="8" width="4" height="16" fill="#fff"/></svg>`;

const KIRO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" class="card-logo"><rect x="4" y="4" width="24" height="24" rx="4" fill="#FF9900"/><rect x="8" y="8" width="4" height="16" fill="#fff"/><rect x="14" y="8" width="4" height="4" fill="#fff"/><rect x="14" y="14" width="4" height="4" fill="#fff"/><rect x="18" y="8" width="6" height="4" fill="#fff"/><rect x="18" y="20" width="6" height="4" fill="#fff"/><rect x="20" y="12" width="4" height="8" fill="#fff"/></svg>`;

const BRANCH_CONFIG = {
  'claude-vibe': { llm: 'Claude', paradigm: 'Vibe', ide: 'Claude CLI', logo: CLAUDE_SVG },
  'codex-vibe': { llm: 'Codex', paradigm: 'Vibe', ide: 'Codex', logo: CODEX_SVG },
  'cerebras-vibe': { llm: 'Cerebras', paradigm: 'Vibe', ide: 'VSCode Extension', logo: CEREBRAS_SVG },
  'develop-kiro-vibe': { llm: 'Kiro', paradigm: 'Vibe', ide: 'Kiro', logo: KIRO_SVG },
};

/**
 * Formats a metric value for display; null renders as "—" (dash).
 */
function formatMetric(value) {
  if (value === null || value === undefined) return '—';
  return String(value);
}

/**
 * Renders the stat groups for a card as HTML.
 */
function renderStatGroups(metrics, cardIndex) {
  const groups = Object.entries(STAT_GROUPS).map(([groupName, stats]) => {
    const statItems = stats.map(stat => {
      const value = metrics ? metrics[stat.key] : null;
      const tipId = `tip-${cardIndex}-${stat.key}`;
      return `
            <div class="stat-item">
              <button class="stat-label" aria-describedby="${tipId}" data-tip="${tipId}">${htmlEscape(stat.abbr)}</button>
              <div id="${tipId}" role="tooltip" class="stat-tooltip" aria-hidden="true">
                <strong>${htmlEscape(stat.label)}</strong>
                <span>${htmlEscape(stat.desc)}</span>
              </div>
              <span class="stat-value">${formatMetric(value)}</span>
            </div>`;
    }).join('');

    return `
          <div class="stat-group">
            <h3 class="stat-group-heading">${htmlEscape(groupName)}</h3>
            ${statItems}
          </div>`;
  }).join('');

  return groups;
}

/**
 * Renders the full baseball card dashboard as a self-contained HTML string.
 * No external stylesheets, scripts, images, or fetch calls.
 */
function renderDashboard(app, deployedBranches) {
  const cards = deployedBranches.map((branch, index) => {
    const branchConfig = BRANCH_CONFIG[branch.deployBranch] || {
      llm: branch.label || branch.deployBranch,
      paradigm: 'Vibe',
      ide: 'Unknown',
      logo: KIRO_SVG,
    };

    const statGroupsHtml = renderStatGroups(branch.metrics, index);

    return `
      <article class="baseball-card" data-card-index="${index}">
        <div class="card-header">
          <div class="card-logo-container">
            ${branchConfig.logo}
          </div>
          <div class="card-info">
            <h2 class="card-llm-name">${htmlEscape(branchConfig.llm)}</h2>
            <p class="card-paradigm">${htmlEscape(branchConfig.paradigm)}</p>
            <p class="card-ide">${htmlEscape(branchConfig.ide)}</p>
          </div>
        </div>
        <div class="card-stats">
          ${statGroupsHtml}
        </div>
        <div class="card-footer">
          <a href="${htmlEscape(branch.url || '#')}" target="_blank" rel="noreferrer">Open App</a>
        </div>
      </article>`;
  }).join('\n');

  const dotIndicators = deployedBranches.length > 1
    ? `<div class="carousel-dots" aria-label="Card navigation">${deployedBranches.map((_, i) =>
        `<svg class="dot${i === 0 ? ' active' : ''}" data-dot="${i}" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="${i === 0 ? '#4a3728' : '#ccc'}"/></svg>`
      ).join('')}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Category Solitaire - AI Baseball Cards</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --card-bg-claude:#FFF5F0;
  --card-bg-codex:#F0FFF8;
  --card-bg-cerebras:#F0F6FF;
  --card-bg-kiro:#FFFBF0;
  --card-border:#4a3728;
  --pixel-font:"Courier New",Courier,monospace;
  --body-font:system-ui,-apple-system,sans-serif;
}
body{
  font-family:var(--body-font);
  background:#f5f0e8;
  min-height:100vh;
  padding:24px;
  background-image:
    repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(74,55,40,0.03) 19px,rgba(74,55,40,0.03) 20px),
    repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(74,55,40,0.03) 19px,rgba(74,55,40,0.03) 20px);
}
main{max-width:1200px;margin:0 auto}
header{text-align:center;margin-bottom:32px}
h1{
  font-family:var(--pixel-font);
  font-size:clamp(1.8rem,4vw,3rem);
  color:#4a3728;
  letter-spacing:2px;
  text-transform:uppercase;
  margin-bottom:8px;
}
header p{color:#6b5744;font-size:1rem}
.board{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
  gap:20px;
}
.baseball-card{
  border:3px solid var(--card-border);
  border-radius:12px;
  padding:20px;
  background:var(--card-bg-kiro);
  box-shadow:4px 4px 0 rgba(74,55,40,0.2);
  display:flex;
  flex-direction:column;
  gap:16px;
  position:relative;
  overflow:hidden;
}
.baseball-card::before{
  content:"";
  position:absolute;
  top:0;left:0;right:0;
  height:6px;
  background:repeating-linear-gradient(90deg,#c4452b 0,#c4452b 10px,#fff 10px,#fff 20px,#1a4b8c 20px,#1a4b8c 30px,#fff 30px,#fff 40px);
}
.baseball-card::after{
  content:"";
  position:absolute;
  bottom:0;left:0;right:0;
  height:6px;
  background:repeating-linear-gradient(90deg,#c4452b 0,#c4452b 10px,#fff 10px,#fff 20px,#1a4b8c 20px,#1a4b8c 30px,#fff 30px,#fff 40px);
}
.baseball-card:nth-child(1){background:var(--card-bg-claude)}
.baseball-card:nth-child(2){background:var(--card-bg-codex)}
.baseball-card:nth-child(3){background:var(--card-bg-cerebras)}
.baseball-card:nth-child(4){background:var(--card-bg-kiro)}
.card-header{display:flex;gap:12px;align-items:center;padding-top:8px}
.card-logo-container{width:25%;max-width:80px;flex-shrink:0}
.card-logo{width:100%;height:auto;display:block}
.card-info{flex:1}
.card-llm-name{
  font-family:var(--pixel-font);
  font-size:1.4rem;
  color:#4a3728;
  letter-spacing:1px;
}
.card-paradigm{
  font-family:var(--pixel-font);
  font-size:0.85rem;
  color:#8b6f47;
  text-transform:uppercase;
  letter-spacing:1px;
  margin-top:4px;
}
.card-ide{
  font-size:0.8rem;
  color:#6b5744;
  margin-top:2px;
  font-style:italic;
}
.card-stats{display:flex;flex-direction:column;gap:12px;flex:1}
.stat-group{border-top:1px dashed rgba(74,55,40,0.3);padding-top:8px}
.stat-group-heading{
  font-family:var(--pixel-font);
  font-size:0.75rem;
  color:#8b6f47;
  text-transform:uppercase;
  letter-spacing:1px;
  margin-bottom:6px;
}
.stat-item{display:flex;align-items:center;gap:6px;margin-bottom:4px;position:relative}
.stat-label{
  background:none;
  border:1px solid rgba(74,55,40,0.3);
  border-radius:3px;
  font-family:var(--pixel-font);
  font-size:12px;
  color:#4a3728;
  cursor:help;
  padding:1px 4px;
  min-width:40px;
  text-align:center;
  line-height:1.4;
}
.stat-label:hover,.stat-label:focus{
  background:rgba(74,55,40,0.1);
  outline:2px solid #4a3728;
  outline-offset:1px;
}
.stat-value{
  font-family:var(--pixel-font);
  font-size:14px;
  font-weight:bold;
  color:#2d1f14;
}
.stat-tooltip{
  display:none;
  position:absolute;
  left:0;
  bottom:calc(100% + 6px);
  background:#4a3728;
  color:#fff;
  padding:8px 10px;
  border-radius:4px;
  font-size:12px;
  min-width:180px;
  max-width:260px;
  z-index:100;
  box-shadow:2px 2px 6px rgba(0,0,0,0.3);
  transition:opacity 200ms ease;
}
.stat-tooltip.visible{display:block}
.stat-tooltip strong{display:block;margin-bottom:3px;font-size:13px}
.stat-tooltip span{display:block;opacity:0.9;line-height:1.3}
.card-footer{margin-top:auto;padding-top:8px}
.card-footer a{
  display:inline-block;
  background:#4a3728;
  color:#fff;
  padding:8px 16px;
  border-radius:4px;
  text-decoration:none;
  font-family:var(--pixel-font);
  font-size:13px;
  letter-spacing:0.5px;
}
.card-footer a:hover{background:#6b5744}
footer{text-align:center;margin-top:32px;color:#8b6f47;font-size:0.85rem}

/* Carousel styles for mobile */
.carousel-dots{
  display:none;
  justify-content:center;
  gap:8px;
  margin-top:16px;
}
.dot{cursor:pointer;transition:opacity 200ms}
.dot:not(.active){opacity:0.5}

@media(max-width:768px){
  body{padding:12px}
  .board{
    display:flex;
    overflow:hidden;
    gap:0;
    position:relative;
  }
  .baseball-card{
    min-width:90vw;
    flex-shrink:0;
    margin:0 5vw 0 0;
  }
  .board{
    transition:transform 300ms ease;
  }
  .carousel-dots{display:flex}
}
</style>
</head>
<body>
<main>
  <header>
    <h1>AI Baseball Cards</h1>
    <p>Category Solitaire branch variants compared side-by-side</p>
  </header>
  <section class="board" aria-label="AI Baseball Cards" id="card-board">
    ${cards}
  </section>
  ${dotIndicators}
  <footer>Amplify app ${htmlEscape(app.appId)} &middot; ${htmlEscape(new Date().toISOString())}</footer>
</main>
<script>
(function(){
  // Tooltip system
  var activeTooltip=null;
  function showTooltip(el){
    hideAllTooltips();
    var tipId=el.getAttribute('data-tip');
    var tip=document.getElementById(tipId);
    if(tip){tip.classList.add('visible');tip.setAttribute('aria-hidden','false');activeTooltip=tip;}
  }
  function hideAllTooltips(){
    if(activeTooltip){activeTooltip.classList.remove('visible');activeTooltip.setAttribute('aria-hidden','true');activeTooltip=null;}
  }
  var labels=document.querySelectorAll('.stat-label');
  for(var i=0;i<labels.length;i++){
    labels[i].addEventListener('mouseenter',function(){showTooltip(this);});
    labels[i].addEventListener('focus',function(){showTooltip(this);});
    labels[i].addEventListener('mouseleave',function(){hideAllTooltips();});
    labels[i].addEventListener('blur',function(){hideAllTooltips();});
    labels[i].addEventListener('touchstart',function(e){
      e.preventDefault();
      var tipId=this.getAttribute('data-tip');
      var tip=document.getElementById(tipId);
      if(tip&&tip.classList.contains('visible')){hideAllTooltips();}
      else{showTooltip(this);}
    },{passive:false});
  }
  document.addEventListener('touchstart',function(e){
    if(!e.target.classList.contains('stat-label')){hideAllTooltips();}
  });

  // Carousel system (mobile only)
  var board=document.getElementById('card-board');
  var cards=board?board.querySelectorAll('.baseball-card'):[];
  var dots=document.querySelectorAll('.dot');
  var pos=0;
  var startX=0,startY=0,startTime=0,tracking=false;

  function updateCarousel(){
    if(!board||cards.length<=1)return;
    var cardWidth=cards[0].offsetWidth+parseFloat(getComputedStyle(cards[0]).marginRight||0);
    board.style.transform='translateX(-'+(pos*cardWidth)+'px)';
    for(var i=0;i<dots.length;i++){
      dots[i].classList.toggle('active',i===pos);
      var circle=dots[i].querySelector('circle');
      if(circle)circle.setAttribute('fill',i===pos?'#4a3728':'#ccc');
    }
  }

  if(cards.length>1&&'ontouchstart' in window){
    board.addEventListener('touchstart',function(e){
      startX=e.touches[0].clientX;
      startY=e.touches[0].clientY;
      startTime=Date.now();
      tracking=true;
    },{passive:true});
    board.addEventListener('touchmove',function(e){
      if(!tracking)return;
      var dy=Math.abs(e.touches[0].clientY-startY);
      if(dy>30)tracking=false;
    },{passive:true});
    board.addEventListener('touchend',function(e){
      if(!tracking)return;
      var dx=e.changedTouches[0].clientX-startX;
      var dt=Date.now()-startTime;
      if(Math.abs(dx)>50&&dt<300){
        if(dx<0){pos=Math.min(pos+1,cards.length-1);}
        else{pos=Math.max(pos-1,0);}
        updateCarousel();
      }
      tracking=false;
    },{passive:true});
  }

  for(var d=0;d<dots.length;d++){
    dots[d].addEventListener('click',(function(idx){return function(){pos=idx;updateCarousel();};})(d));
  }
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

    const url = `https://${branch.deployBranch}.${app.defaultDomain}/`;
    deployedBranches.push({ ...branch, url, metrics });

    if (!skipAws) {
      ensureBranch(app.appId, branch.deployBranch, branch.deployBranch);
      await deployZip(app.appId, branch.deployBranch, zipPath);
    }
  }

  const dashboardUrl = `https://${config.dashboardBranch}.${app.defaultDomain}/`;
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
