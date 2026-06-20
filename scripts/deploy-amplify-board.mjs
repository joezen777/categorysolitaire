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
 * Renders the stat groups for a card as an HTML table matching 1987 Topps back style.
 */
function renderStatGroups(metrics, cardIndex) {
  const groups = Object.entries(STAT_GROUPS).map(([groupName, stats]) => {
    const rows = stats.map(stat => {
      const value = metrics ? metrics[stat.key] : null;
      const tipId = `tip-${cardIndex}-${stat.key}`;
      return `<tr>
<td class="stat-abbr" data-tip="${tipId}" tabindex="0" aria-describedby="${tipId}">${htmlEscape(stat.abbr)}<div id="${tipId}" role="tooltip" class="stat-tooltip" aria-hidden="true"><strong>${htmlEscape(stat.label)}</strong><span>${htmlEscape(stat.desc)}</span></div></td>
<td class="stat-val"><span class="stat-value">${formatMetric(value)}</span></td>
</tr>`;
    }).join('');

    return `<tr class="group-header"><th colspan="2">${htmlEscape(groupName)}</th></tr>${rows}`;
  }).join('');

  return `<table class="stat-table">${groups}</table>`;
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
      <div class="card-slide" data-card-index="${index}">
        <article class="baseball-card">
          <div class="card-banner">
            <div class="card-logo-container">${branchConfig.logo}</div>
            <div class="card-name">
              <span class="card-llm">${htmlEscape(branchConfig.llm)}</span>
              <span class="card-meta">${htmlEscape(branchConfig.paradigm)} &middot; ${htmlEscape(branchConfig.ide)}</span>
            </div>
          </div>
          ${statGroupsHtml}
        </article>
        <a class="open-app-button" href="${htmlEscape(branch.url || '#')}" target="_blank" rel="noreferrer">Open App</a>
      </div>`;
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
  --cream:#f5f0dc;
  --tan:#e8dfc8;
  --ink:#1a1a1a;
  --rule:#8b7355;
  --header-bg:#c4452b;
  --header-text:#fff;
  --pixel-font:"Courier New",Courier,monospace;
  --card-bg-claude:#FFF8F4;
  --card-bg-codex:#F4FFF9;
  --card-bg-cerebras:#F4F8FF;
  --card-bg-kiro:#FFFCF4;
}
body{
  font-family:var(--pixel-font);
  background:var(--cream);
  min-height:100vh;
  padding:16px;
}
main{max-width:1100px;margin:0 auto}
header{text-align:center;margin-bottom:16px}
h1{font-size:14px;color:var(--ink);letter-spacing:2px;text-transform:uppercase;margin-bottom:2px}
header p{color:var(--rule);font-size:10px;text-transform:uppercase;letter-spacing:1px}
.board{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
  gap:12px;
}
.card-slide{
  display:flex;
  flex-direction:column;
  gap:8px;
}
.baseball-card{
  border:3px solid var(--ink);
  background:var(--cream);
  display:flex;
  flex-direction:column;
  position:relative;
  overflow:hidden;
}
.card-slide:nth-child(1) .baseball-card{background:var(--card-bg-claude)}
.card-slide:nth-child(2) .baseball-card{background:var(--card-bg-codex)}
.card-slide:nth-child(3) .baseball-card{background:var(--card-bg-cerebras)}
.card-slide:nth-child(4) .baseball-card{background:var(--card-bg-kiro)}
.card-banner{
  background:var(--header-bg);
  color:var(--header-text);
  display:flex;
  align-items:center;
  gap:6px;
  padding:4px 8px;
}
.card-logo-container{width:25%;max-width:24px;flex-shrink:0}
.card-logo{width:100%;height:auto;display:block}
.card-name{display:flex;flex-direction:column;line-height:1.1}
.card-llm{font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}
.card-meta{font-size:9px;opacity:0.85;text-transform:uppercase;letter-spacing:0.5px}
.stat-table{
  width:100%;
  border-collapse:collapse;
  font-size:10px;
  line-height:1.2;
}
.stat-table tr.group-header th{
  background:var(--tan);
  border-top:1px solid var(--rule);
  border-bottom:1px solid var(--rule);
  font-size:9px;
  font-weight:bold;
  text-transform:uppercase;
  letter-spacing:1px;
  text-align:left;
  padding:2px 6px;
  color:var(--ink);
}
.stat-table td{
  padding:1px 6px;
  border-bottom:1px solid rgba(139,115,85,0.2);
  vertical-align:middle;
}
.stat-table td.stat-abbr{
  color:var(--rule);
  font-size:9px;
  cursor:help;
  position:relative;
  white-space:nowrap;
}
.stat-table td.stat-val{
  text-align:right;
}
.stat-value{
  font-family:var(--pixel-font);
  font-weight:bold;
  color:var(--ink);
  font-size:11px;
}
.stat-table td.stat-abbr:hover,.stat-table td.stat-abbr:focus{
  background:rgba(139,115,85,0.1);
  outline:1px solid var(--rule);
}
.stat-tooltip{
  display:none;
  position:absolute;
  left:0;bottom:100%;
  background:var(--ink);
  color:#fff;
  padding:4px 6px;
  font-size:9px;
  min-width:140px;
  max-width:200px;
  z-index:100;
  line-height:1.3;
}
.stat-tooltip.visible{display:block}
.stat-tooltip strong{display:block;font-size:10px;margin-bottom:1px}
.stat-tooltip span{opacity:0.85}
.open-app-button{
  align-self:center;
  display:block;
  width:100%;
  max-width:180px;
  border:2px solid var(--ink);
  background:var(--header-bg);
  color:var(--header-text);
  padding:6px 10px;
  text-align:center;
  text-decoration:none;
  font-size:10px;
  font-weight:bold;
  text-transform:uppercase;
  letter-spacing:1px;
}
.open-app-button:hover,.open-app-button:focus{
  background:var(--ink);
  outline:2px solid var(--rule);
  outline-offset:2px;
}
footer{text-align:center;margin-top:12px;color:var(--rule);font-size:9px;letter-spacing:0.5px}

.carousel-dots{display:none;justify-content:center;gap:6px;margin-top:8px}
.dot{cursor:pointer;transition:opacity 150ms}
.dot:not(.active){opacity:0.4}

@media(max-width:600px){
  body{padding:8px}
  .board{display:flex;overflow:hidden;gap:0;position:relative}
  .card-slide{min-width:92vw;flex-shrink:0;margin:0 4vw 0 0}
  .board{transition:transform 250ms ease}
  .carousel-dots{display:flex}
}
</style>
</head>
<body>
<main>
  <header>
    <h1>AI Baseball Cards</h1>
    <p>Category Solitaire &middot; Branch Variants</p>
  </header>
  <section class="board" aria-label="AI Baseball Cards" id="card-board">
    ${cards}
  </section>
  ${dotIndicators}
  <footer>${htmlEscape(new Date().toISOString().slice(0,10))}</footer>
</main>
<script>
(function(){
  var activeTooltip=null;
  function show(el){
    hide();
    var tipId=el.getAttribute('data-tip');
    var tip=document.getElementById(tipId);
    if(tip){tip.classList.add('visible');tip.setAttribute('aria-hidden','false');activeTooltip=tip;}
  }
  function hide(){
    if(activeTooltip){activeTooltip.classList.remove('visible');activeTooltip.setAttribute('aria-hidden','true');activeTooltip=null;}
  }
  var cells=document.querySelectorAll('.stat-abbr');
  for(var i=0;i<cells.length;i++){
    cells[i].addEventListener('mouseenter',function(){show(this);});
    cells[i].addEventListener('focus',function(){show(this);});
    cells[i].addEventListener('mouseleave',function(){hide();});
    cells[i].addEventListener('blur',function(){hide();});
    cells[i].addEventListener('touchstart',function(e){
      e.preventDefault();
      var tipId=this.getAttribute('data-tip');
      var tip=document.getElementById(tipId);
      if(tip&&tip.classList.contains('visible')){hide();}else{show(this);}
    },{passive:false});
  }
  document.addEventListener('touchstart',function(e){if(!e.target.classList.contains('stat-abbr'))hide();});
  var board=document.getElementById('card-board');
  var cards=board?board.querySelectorAll('.card-slide'):[];
  var dots=document.querySelectorAll('.dot');
  var pos=0,startX=0,startY=0,startTime=0,tracking=false;
  function updateCarousel(){
    if(!board||cards.length<=1)return;
    var w=cards[0].offsetWidth+parseFloat(getComputedStyle(cards[0]).marginRight||0);
    board.style.transform='translateX(-'+(pos*w)+'px)';
    for(var i=0;i<dots.length;i++){
      dots[i].classList.toggle('active',i===pos);
      var c=dots[i].querySelector('circle');
      if(c)c.setAttribute('fill',i===pos?'#1a1a1a':'#ccc');
    }
  }
  if(cards.length>1&&'ontouchstart' in window){
    board.addEventListener('touchstart',function(e){startX=e.touches[0].clientX;startY=e.touches[0].clientY;startTime=Date.now();tracking=true;},{passive:true});
    board.addEventListener('touchmove',function(e){if(!tracking)return;if(Math.abs(e.touches[0].clientY-startY)>30)tracking=false;},{passive:true});
    board.addEventListener('touchend',function(e){if(!tracking)return;var dx=e.changedTouches[0].clientX-startX;if(Math.abs(dx)>50&&Date.now()-startTime<300){if(dx<0)pos=Math.min(pos+1,cards.length-1);else pos=Math.max(pos-1,0);updateCarousel();}tracking=false;},{passive:true});
  }
  for(var d=0;d<dots.length;d++)dots[d].addEventListener('click',(function(idx){return function(){pos=idx;updateCarousel();};})(d));
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
