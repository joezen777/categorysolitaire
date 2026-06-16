#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const config = {
  appName: process.env.AMPLIFY_APP_NAME || 'categorysolitaire-vibe-board',
  profile: process.env.AWS_PROFILE || 'opensearchdev',
  region: process.env.AWS_REGION || 'us-east-1',
  dashboardBranch: 'dashboard',
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
    '--profile',
    config.profile,
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
    run('npm', ['run', 'build'], { cwd: worktree });
  }
}

function buildBranch(branch) {
  const worktree = addWorktree(branch.sourceRef, branch.deployBranch);
  try {
    console.log(`Building ${branch.sourceRef}`);
    runBranchBuild(worktree);
    const distDir = join(worktree, 'dist');
    if (!existsSync(join(distDir, 'index.html'))) {
      throw new Error(`${branch.sourceRef} did not produce dist/index.html`);
    }
    const zipPath = join(artifactDir, `${branch.deployBranch}.zip`);
    zipDirectory(distDir, zipPath);
    return zipPath;
  } finally {
    removeWorktree(worktree);
  }
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderDashboard(app, deployedBranches) {
  const cards = deployedBranches
    .map(
      (branch) => `
        <article class="branch-card">
          <div>
            <p class="eyebrow">${htmlEscape(branch.deployBranch)}</p>
            <h2>${htmlEscape(branch.label)}</h2>
            <p>${htmlEscape(branch.message)}</p>
          </div>
          <dl>
            <div><dt>Source</dt><dd>${htmlEscape(branch.sourceRef.replace('origin/', ''))}</dd></div>
            <div><dt>Commit</dt><dd>${htmlEscape(branch.commit)}</dd></div>
          </dl>
          <a href="${branch.url}" target="_blank" rel="noreferrer">Open app</a>
        </article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Category Solitaire Branch Board</title>
    <style>
      :root {
        color: #162019;
        background: #f8faf6;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(120deg, rgba(28, 121, 94, 0.12), transparent 42%),
          linear-gradient(250deg, rgba(210, 68, 52, 0.12), transparent 38%),
          #f8faf6;
      }

      main {
        width: min(1180px, calc(100vw - 40px));
        margin: 0 auto;
        padding: 48px 0;
      }

      header {
        display: grid;
        gap: 14px;
        margin-bottom: 28px;
      }

      .eyebrow {
        margin: 0;
        color: #597064;
        font-size: 0.77rem;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1 {
        max-width: 820px;
        margin: 0;
        font-size: clamp(2.2rem, 6vw, 4.6rem);
        line-height: 0.98;
        letter-spacing: 0;
      }

      header p {
        max-width: 680px;
        margin: 0;
        color: #4c5f54;
        font-size: 1.02rem;
        line-height: 1.6;
      }

      .board {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .branch-card {
        min-height: 360px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 24px;
        padding: 22px;
        border: 1px solid rgba(22, 32, 25, 0.16);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 18px 50px rgba(27, 50, 36, 0.08);
      }

      h2 {
        margin: 10px 0 12px;
        font-size: 1.35rem;
        letter-spacing: 0;
      }

      .branch-card p:not(.eyebrow) {
        margin: 0;
        color: #52645a;
        line-height: 1.45;
      }

      dl {
        display: grid;
        gap: 10px;
        margin: 0;
      }

      dt {
        color: #718076;
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      dd {
        margin: 3px 0 0;
        overflow-wrap: anywhere;
        color: #17251c;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.84rem;
      }

      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 6px;
        background: #1a6c53;
        color: white;
        font-weight: 800;
        text-decoration: none;
      }

      a:hover {
        background: #14533f;
      }

      footer {
        margin-top: 26px;
        color: #66766b;
        font-size: 0.88rem;
      }

      @media (max-width: 980px) {
        .board {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 620px) {
        main {
          width: min(100vw - 28px, 1180px);
          padding: 30px 0;
        }

        .board {
          grid-template-columns: 1fr;
        }

        .branch-card {
          min-height: 300px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">Amplify branch board</p>
        <h1>Category Solitaire variants</h1>
        <p>Four deployed branch builds from this repository, collected in one board for quick comparison.</p>
      </header>
      <section class="board" aria-label="Deployed branch apps">
        ${cards}
      </section>
      <footer>Amplify app ${htmlEscape(app.appId)} · ${htmlEscape(new Date().toISOString())}</footer>
    </main>
  </body>
</html>
`;
}

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
    const zipPath = skipBuild ? join(artifactDir, `${branch.deployBranch}.zip`) : buildBranch(branch);
    const url = `https://${branch.deployBranch}.${app.defaultDomain}/`;
    deployedBranches.push({ ...branch, url });

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

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
