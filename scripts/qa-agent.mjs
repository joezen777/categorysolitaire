#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGifFromRun } from './make-qa-agent-gif.mjs';

export const BRANCH_URLS = {
  dashboard: 'https://solitaire.cardbrdbx.com/',
  'claude-vibe': 'https://claude-vibe-solitaire.cardbrdbx.com/',
  'codex-vibe': 'https://codex-vibe-solitaire.cardbrdbx.com/',
  'cerebras-vibe': 'https://cerebras-vibe-solitaire.cardbrdbx.com/',
  'develop-kiro-vibe': 'https://develop-kiro-vibe-solitaire.cardbrdbx.com/',
};

export const RULE_SUMMARY = `
Category Solitaire rules:
- Stock/source deck deals one face-up card at a time to the draft/waste pile.
- When stock is empty, tapping/clicking its empty slot recycles the draft pile back into stock in reverse order.
- Only face-up cards can move.
- The foundation has five holder slots. A category title card may move into an empty foundation slot.
- Foundation item cards may move only onto their matching category title or matching category item stack.
- A finished foundation category glitters, scores 100 points, disappears, and frees the slot.
- A category title in the tableau may move to an empty tableau column, onto a same-category item card, or into an empty foundation slot.
- A category item in the tableau may move onto a same-category item card or an empty tableau column.
- Correct same-category item sequences may move together as one unit.
- Illegal moves should warn/error and return to their starting visual location.
- The game is won when all stock, draft, tableau, and foundation cards are cleared.
`.trim();

const DEFAULT_CONFIG = {
  branch: 'codex-vibe',
  mode: 'solve',
  provider: 'auto',
  model: 'qwen2.5vl:7b',
  episodes: 1,
  maxSteps: 1000,
  epsilon: 0.22,
  learningRate: 0.35,
  gamma: 0.86,
  width: 1280,
  height: 900,
  headed: false,
  mobile: false,
  dryRun: false,
  verbose: false,
  settleMs: 650,
  slowMo: 0,
  dragSteps: 16,
  navigationTimeoutMs: 45_000,
  modelTimeoutMs: 90_000,
  policyFile: '.qa-agent-policy.json',
  artifactDir: '.qa-agent-artifacts',
  reportDir: '.qa-agent-reports',
  gif: true,
  gifDelayMs: 650,
  gifMaxWidth: 720,
  gifMaxFrames: 240,
  gifInclude: 'all',
  deckCyclesWithoutProgress: 2,
  noValidMoveConfirmations: 2,
  seed: 'category-solitaire-qa',
};

const VALID_MODES = new Set(['mechanics', 'solve', 'train']);
const VALID_PROVIDERS = new Set(['auto', 'none', 'openai', 'ollama']);

function nowStamp(date = new Date()) {
  return date.toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function hashValue(value) {
  const text = typeof value === 'string' || Buffer.isBuffer(value)
    ? value
    : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex');
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function clamp01(value, fallback = 0.5) {
  return clamp(value ?? fallback, 0, 1);
}

function readJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function parseBoolean(value) {
  if (value === true || value === 'true' || value === '1' || value === 'yes') return true;
  if (value === false || value === 'false' || value === '0' || value === 'no') return false;
  return Boolean(value);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseCliValue(argv, index) {
  const arg = argv[index];
  const eqIndex = arg.indexOf('=');
  if (eqIndex > -1) {
    return { key: arg.slice(0, eqIndex), value: arg.slice(eqIndex + 1), consumed: 1 };
  }
  const next = argv[index + 1];
  if (!next || next.startsWith('--')) {
    return { key: arg, value: true, consumed: 1 };
  }
  return { key: arg, value: next, consumed: 2 };
}

export function normalizeBranchName(branch) {
  const value = String(branch || '').trim();
  if (!value) return DEFAULT_CONFIG.branch;
  const normalized = value
    .replace(/^origin\//, '')
    .replace(/^https?:\/\//, '')
    .replaceAll('.', '-')
    .replace(/-solitaire-cardbrdbx-com\/?$/, '')
    .toLowerCase();

  if (normalized === 'claude-vibe') return 'claude-vibe';
  if (normalized === 'codex-vibe') return 'codex-vibe';
  if (normalized === 'cerebras-vibe') return 'cerebras-vibe';
  if (normalized === 'develop-kiro-vibe' || normalized === 'develop-kiro') return 'develop-kiro-vibe';
  if (normalized === 'dashboard' || normalized === 'solitaire-cardbrdbx-com') return 'dashboard';
  return value;
}

export function resolveTargetUrl({ branch, url } = {}) {
  if (url) return String(url);
  const normalized = normalizeBranchName(branch);
  return BRANCH_URLS[normalized] || normalized;
}

export function parseArgs(argv = process.argv.slice(2), env = process.env) {
  const config = {
    ...DEFAULT_CONFIG,
    provider: env.QA_VISION_PROVIDER || env.VISION_PROVIDER || DEFAULT_CONFIG.provider,
    model: env.QA_VISION_MODEL || env.VISION_MODEL || DEFAULT_CONFIG.model,
    modelUrl: env.QA_VISION_URL || env.VISION_API_URL || '',
    apiKey: env.QA_VISION_API_KEY || env.OPENAI_API_KEY || '',
  };

  for (let i = 0; i < argv.length;) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      config.help = true;
      i += 1;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const { key, value, consumed } = parseCliValue(argv, i);
    i += consumed;

    switch (key) {
      case '--url':
        config.url = String(value);
        break;
      case '--branch':
        config.branch = normalizeBranchName(value);
        break;
      case '--mode':
        config.mode = String(value);
        break;
      case '--provider':
        config.provider = String(value);
        break;
      case '--model':
        config.model = String(value);
        break;
      case '--model-url':
      case '--vision-url':
        config.modelUrl = String(value);
        break;
      case '--api-key':
        config.apiKey = String(value);
        break;
      case '--episodes':
        config.episodes = parsePositiveInt(value, config.episodes);
        break;
      case '--max-steps':
        config.maxSteps = parsePositiveInt(value, config.maxSteps);
        break;
      case '--epsilon':
        config.epsilon = clamp01(value, config.epsilon);
        break;
      case '--learning-rate':
        config.learningRate = clamp01(value, config.learningRate);
        break;
      case '--gamma':
        config.gamma = clamp01(value, config.gamma);
        break;
      case '--width':
        config.width = parsePositiveInt(value, config.width);
        break;
      case '--height':
        config.height = parsePositiveInt(value, config.height);
        break;
      case '--headed':
        config.headed = parseBoolean(value);
        break;
      case '--mobile':
        config.mobile = parseBoolean(value);
        if (config.mobile && !config.width) config.width = 390;
        if (config.mobile && !config.height) config.height = 844;
        break;
      case '--dry-run':
        config.dryRun = parseBoolean(value);
        break;
      case '--verbose':
        config.verbose = parseBoolean(value);
        break;
      case '--settle-ms':
        config.settleMs = parsePositiveInt(value, config.settleMs);
        break;
      case '--slow-mo':
        config.slowMo = parseNumber(value, config.slowMo);
        break;
      case '--drag-steps':
        config.dragSteps = parsePositiveInt(value, config.dragSteps);
        break;
      case '--model-timeout-ms':
        config.modelTimeoutMs = parsePositiveInt(value, config.modelTimeoutMs);
        break;
      case '--policy-file':
        config.policyFile = String(value);
        break;
      case '--artifact-dir':
        config.artifactDir = String(value);
        break;
      case '--report-dir':
        config.reportDir = String(value);
        break;
      case '--gif':
        config.gif = parseBoolean(value);
        break;
      case '--no-gif':
        config.gif = false;
        break;
      case '--gif-delay-ms':
        config.gifDelayMs = parsePositiveInt(value, config.gifDelayMs);
        break;
      case '--gif-max-width':
        config.gifMaxWidth = parsePositiveInt(value, config.gifMaxWidth);
        break;
      case '--gif-max-frames':
        config.gifMaxFrames = parsePositiveInt(value, config.gifMaxFrames);
        break;
      case '--gif-include':
        config.gifInclude = String(value);
        break;
      case '--deck-cycles-without-progress':
        config.deckCyclesWithoutProgress = parsePositiveInt(value, config.deckCyclesWithoutProgress);
        break;
      case '--no-valid-move-confirmations':
        config.noValidMoveConfirmations = parsePositiveInt(value, config.noValidMoveConfirmations);
        break;
      case '--seed':
        config.seed = String(value);
        break;
      default:
        throw new Error(`Unknown option: ${key}`);
    }
  }

  config.branch = normalizeBranchName(config.branch);
  config.url = resolveTargetUrl(config);
  config.provider = String(config.provider).toLowerCase();
  config.mode = String(config.mode).toLowerCase();

  if (!VALID_MODES.has(config.mode)) {
    throw new Error(`Invalid mode "${config.mode}". Use mechanics, solve, or train.`);
  }
  if (!VALID_PROVIDERS.has(config.provider)) {
    throw new Error(`Invalid provider "${config.provider}". Use auto, none, openai, or ollama.`);
  }
  if (!['all', 'before', 'after'].includes(config.gifInclude)) {
    throw new Error('Invalid --gif-include value. Use all, before, or after.');
  }

  return config;
}

export function usage() {
  return `
Visual Category Solitaire QA agent

Usage:
  npm run qa:agent -- --branch codex-vibe --mode solve
  npm run qa:agent -- --branch claude-vibe --mode mechanics --headed
  npm run qa:agent -- --url http://localhost:5173 --mode train --episodes 5

Stop behavior:
  Runs until win, no valid visual moves, or two stock recycles without card progress.
  --max-steps remains a safety guard, default ${DEFAULT_CONFIG.maxSteps}
  --deck-cycles-without-progress 2
  --no-valid-move-confirmations 2

Vision model:
  --provider ollama --model qwen2.5vl:7b
  --provider openai --model <local-vlm> --model-url http://127.0.0.1:8000/v1/chat/completions

Useful env vars:
  QA_VISION_PROVIDER=ollama
  QA_VISION_MODEL=qwen2.5vl:7b
  QA_VISION_URL=http://127.0.0.1:11434/api/chat
  QA_VISION_API_KEY=<only for providers that require it>

GIF output:
  Enabled by default at .qa-agent-artifacts/<run-id>/playthrough.gif
  Disable with --no-gif, or adjust with --gif-max-width, --gif-delay-ms, --gif-include
`.trim();
}

export function createSeededRandom(seedText) {
  let state = 0x811c9dc5;
  for (const char of String(seedText || 'seed')) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  return function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function normalizePoint(value, viewport = {}) {
  if (!value) return null;
  let x;
  let y;

  if (Array.isArray(value)) {
    [x, y] = value;
  } else if (typeof value === 'object') {
    if (Array.isArray(value.center)) return normalizePoint(value.center, viewport);
    if (Array.isArray(value.point)) return normalizePoint(value.point, viewport);
    if (Array.isArray(value.bbox)) return centerOfBox(value.bbox, viewport);
    x = value.x ?? value.left;
    y = value.y ?? value.top;
  }

  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
  const width = viewport.width || 4096;
  const height = viewport.height || 4096;
  return [
    Math.round(clamp(x, 0, Math.max(1, width - 1))),
    Math.round(clamp(y, 0, Math.max(1, height - 1))),
  ];
}

export function normalizeBox(value, viewport = {}) {
  if (!value) return null;
  let left;
  let top;
  let width;
  let height;

  if (Array.isArray(value)) {
    [left, top, width, height] = value;
  } else if (typeof value === 'object') {
    left = value.left ?? value.x;
    top = value.top ?? value.y;
    width = value.width ?? value.w;
    height = value.height ?? value.h;
  }

  if (![left, top, width, height].every((n) => Number.isFinite(Number(n)))) return null;
  const viewportWidth = viewport.width || 4096;
  const viewportHeight = viewport.height || 4096;
  return [
    Math.round(clamp(left, 0, viewportWidth)),
    Math.round(clamp(top, 0, viewportHeight)),
    Math.round(clamp(width, 1, viewportWidth)),
    Math.round(clamp(height, 1, viewportHeight)),
  ];
}

export function centerOfBox(value, viewport = {}) {
  const box = normalizeBox(value, viewport);
  if (!box) return null;
  return normalizePoint([box[0] + box[2] / 2, box[1] + box[3] / 2], viewport);
}

function normalizeType(value) {
  const text = String(value || '').toLowerCase().replaceAll('-', '_');
  if (['click', 'press'].includes(text)) return 'tap';
  if (['tap_then_tap', 'tap_to_move', 'select_then_drop'].includes(text)) return 'tap_tap';
  if (['dragdrop', 'drag_and_drop', 'drag_drop'].includes(text)) return 'drag';
  if (['wait', 'noop', 'observe'].includes(text)) return 'wait';
  return text || 'wait';
}

export function normalizeAction(raw, viewport = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const type = normalizeType(raw.type || raw.actionType || raw.kind);
  const confidence = clamp01(raw.confidence ?? raw.legalConfidence ?? raw.score, 0.5);
  const intent = String(raw.intent || raw.reason || raw.description || type);
  const expectedResult = String(raw.expectedResult || raw.expected || raw.expectation || 'unknown');

  if (type === 'wait') {
    return { type, intent, expectedResult, confidence };
  }

  if (type === 'tap') {
    const point = normalizePoint(raw.point || raw.at || raw.to || raw.target || raw.center || raw.bbox, viewport);
    if (!point) return null;
    return { type, point, intent, expectedResult, confidence };
  }

  if (type === 'tap_tap') {
    const from = normalizePoint(raw.from || raw.source || raw.card || raw.start || raw.from_bbox, viewport)
      || centerOfBox(raw.fromBox || raw.sourceBox || raw.source_bbox, viewport);
    const to = normalizePoint(raw.to || raw.target || raw.destination || raw.end || raw.to_bbox, viewport)
      || centerOfBox(raw.toBox || raw.targetBox || raw.destinationBox || raw.target_bbox, viewport);
    if (!from || !to) return null;
    return { type, from, to, intent, expectedResult, confidence };
  }

  if (type === 'drag') {
    const from = normalizePoint(raw.from || raw.source || raw.card || raw.start || raw.from_bbox, viewport)
      || centerOfBox(raw.fromBox || raw.sourceBox || raw.source_bbox, viewport);
    const to = normalizePoint(raw.to || raw.target || raw.destination || raw.end || raw.to_bbox, viewport)
      || centerOfBox(raw.toBox || raw.targetBox || raw.destinationBox || raw.target_bbox, viewport);
    if (!from || !to) return null;
    return { type, from, to, intent, expectedResult, confidence };
  }

  return null;
}

function normalizeCard(raw, viewport) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    label: String(raw.label || raw.text || raw.itemName || raw.categoryTitle || '').trim(),
    kind: String(raw.kind || raw.type || 'unknown').toLowerCase(),
    category: raw.category == null ? null : String(raw.category),
    bbox: normalizeBox(raw.bbox || raw.box || raw.bounds, viewport),
    confidence: clamp01(raw.confidence, 0.5),
  };
}

function normalizeTarget(raw, viewport) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    label: String(raw.label || raw.text || raw.kind || '').trim(),
    kind: String(raw.kind || raw.type || 'unknown').toLowerCase(),
    bbox: normalizeBox(raw.bbox || raw.box || raw.bounds, viewport),
    confidence: clamp01(raw.confidence, 0.5),
  };
}

function normalizeProgress(raw) {
  const value = raw && typeof raw === 'object' ? raw : {};
  return {
    score: Number.isFinite(Number(value.score)) ? Number(value.score) : null,
    completedCategories: Number.isFinite(Number(value.completed_categories ?? value.completedCategories))
      ? Number(value.completed_categories ?? value.completedCategories)
      : null,
    foundationCards: Number.isFinite(Number(value.foundation_cards ?? value.foundationCards))
      ? Number(value.foundation_cards ?? value.foundationCards)
      : null,
    faceUpCards: Number.isFinite(Number(value.face_up_cards ?? value.faceUpCards))
      ? Number(value.face_up_cards ?? value.faceUpCards)
      : null,
    tableauCards: Number.isFinite(Number(value.tableau_cards ?? value.tableauCards))
      ? Number(value.tableau_cards ?? value.tableauCards)
      : null,
    stockCards: Number.isFinite(Number(value.stock_cards ?? value.stockCards))
      ? Number(value.stock_cards ?? value.stockCards)
      : null,
    wasteCards: Number.isFinite(Number(value.waste_cards ?? value.wasteCards))
      ? Number(value.waste_cards ?? value.wasteCards)
      : null,
  };
}

export function actionKey(action) {
  if (!action) return 'none';
  const qPoint = (point) => point ? point.map((n) => Math.round(n / 40) * 40).join(',') : '';
  return [
    action.type,
    qPoint(action.point),
    qPoint(action.from),
    qPoint(action.to),
    String(action.intent || '').toLowerCase().slice(0, 80),
    String(action.expectedResult || '').toLowerCase().slice(0, 40),
  ].join('|');
}

export function extractJsonObject(text) {
  const value = String(text || '').trim();
  if (!value) {
    throw new Error('Vision model returned an empty response.');
  }

  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1].trim() : value;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Vision model did not return a JSON object: ${candidate.slice(0, 160)}`);
    }
    return JSON.parse(candidate.slice(start, end + 1));
  }
}

export function normalizePlan(rawPlan, viewport = {}) {
  const raw = rawPlan && typeof rawPlan === 'object' ? rawPlan : {};
  const phase = String(raw.phase || raw.status || 'playing').toLowerCase();
  const rawActions = [
    ...(Array.isArray(raw.candidate_actions) ? raw.candidate_actions : []),
    ...(Array.isArray(raw.candidateActions) ? raw.candidateActions : []),
    ...(Array.isArray(raw.actions) ? raw.actions : []),
    raw.action,
  ].filter(Boolean);

  const seen = new Set();
  const candidateActions = [];
  for (const rawAction of rawActions) {
    const action = normalizeAction(rawAction, viewport);
    if (!action) continue;
    const key = actionKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    candidateActions.push(action);
  }

  return {
    raw,
    phase,
    isWin: Boolean(raw.is_win || raw.isWin || /win|won|complete|cleared/.test(phase)),
    progress: normalizeProgress(raw.progress),
    visibleCards: (raw.visible_cards || raw.visibleCards || raw.cards || [])
      .map((card) => normalizeCard(card, viewport))
      .filter(Boolean),
    dropTargets: (raw.drop_targets || raw.dropTargets || raw.targets || [])
      .map((target) => normalizeTarget(target, viewport))
      .filter(Boolean),
    candidateActions,
    notes: String(raw.notes || raw.summary || ''),
  };
}

export function buildStateKey(plan) {
  const compact = {
    phase: plan.phase,
    isWin: plan.isWin,
    progress: plan.progress,
    cards: plan.visibleCards.slice(0, 32).map((card) => ({
      label: card.label.toLowerCase(),
      kind: card.kind,
      category: card.category ? card.category.toLowerCase() : null,
      box: card.bbox ? card.bbox.map((n) => Math.round(n / 25) * 25) : null,
    })),
    targets: plan.dropTargets.slice(0, 16).map((target) => ({
      kind: target.kind,
      label: target.label.toLowerCase(),
      box: target.bbox ? target.bbox.map((n) => Math.round(n / 40) * 40) : null,
    })),
  };
  return hashValue(compact).slice(0, 24);
}

export function bufferDifferenceRatio(left, right, samples = 4096) {
  if (!left || !right || left.length === 0 || right.length === 0) return null;
  const length = Math.min(left.length, right.length);
  const stride = Math.max(1, Math.floor(length / samples));
  let compared = 0;
  let changed = 0;
  for (let i = 0; i < length; i += stride) {
    compared += 1;
    if (left[i] !== right[i]) changed += 1;
  }
  return compared === 0 ? null : changed / compared;
}

function progressDelta(before, after, key) {
  const left = before?.progress?.[key];
  const right = after?.progress?.[key];
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return right - left;
}

export function computeReward({ beforePlan, afterPlan, beforeImage, afterImage, action, mode = 'solve' }) {
  let reward = -1;
  const diff = bufferDifferenceRatio(beforeImage, afterImage);
  const expected = String(action?.expectedResult || '').toLowerCase();
  const phase = String(afterPlan?.phase || '').toLowerCase();

  if (afterPlan?.isWin && !beforePlan?.isWin) reward += 500;
  if (/error|invalid|warning|rejected/.test(phase)) reward -= 12;

  const scoreGain = progressDelta(beforePlan, afterPlan, 'score');
  if (scoreGain > 0) reward += Math.min(250, scoreGain * 1.5);

  const completedGain = progressDelta(beforePlan, afterPlan, 'completedCategories');
  if (completedGain > 0) reward += completedGain * 120;

  const foundationGain = progressDelta(beforePlan, afterPlan, 'foundationCards');
  if (foundationGain > 0) reward += foundationGain * 18;

  const faceUpGain = progressDelta(beforePlan, afterPlan, 'faceUpCards');
  if (faceUpGain > 0) reward += faceUpGain * 6;

  const stockDrop = -progressDelta(beforePlan, afterPlan, 'stockCards');
  if (stockDrop > 0 && /draw|stock|source/.test(String(action?.intent || '').toLowerCase())) {
    reward += 3;
  }

  if (diff != null) {
    if (diff < 0.004) reward -= 4;
    if (diff > 0.015) reward += 2;
  }

  if (/illegal|bounce|reject/.test(expected)) {
    if (mode === 'mechanics') {
      reward += diff != null && diff < 0.012 ? 28 : -8;
    } else {
      reward -= 8;
    }
  }

  if (/legal|progress|complete|draw|recycle/.test(expected)) {
    reward += 2;
  }

  return Math.round(reward * 100) / 100;
}

function actionText(action) {
  return `${action?.type || ''} ${action?.intent || ''} ${action?.expectedResult || ''}`.toLowerCase();
}

export function isIllegalAction(action) {
  return /illegal|invalid|bounce|reject|error|warning/.test(actionText(action));
}

export function isDeckRecycleAction(action, beforePlan, afterPlan) {
  const text = actionText(action);
  if (/recycle|reshuffle|reset stock|restore stock|flip.*draft|flip.*waste/.test(text)) return true;

  const beforeStock = beforePlan?.progress?.stockCards;
  const afterStock = afterPlan?.progress?.stockCards;
  const beforeWaste = beforePlan?.progress?.wasteCards;
  const afterWaste = afterPlan?.progress?.wasteCards;
  return Number.isFinite(beforeStock)
    && Number.isFinite(afterStock)
    && Number.isFinite(beforeWaste)
    && Number.isFinite(afterWaste)
    && afterStock > beforeStock
    && afterWaste < beforeWaste;
}

export function isDeckDrawAction(action, beforePlan, afterPlan) {
  const text = actionText(action);
  if (/draw|stock|source deck|deal|waste|draft/.test(text) && !isDeckRecycleAction(action, beforePlan, afterPlan)) {
    return true;
  }

  const beforeStock = beforePlan?.progress?.stockCards;
  const afterStock = afterPlan?.progress?.stockCards;
  const beforeWaste = beforePlan?.progress?.wasteCards;
  const afterWaste = afterPlan?.progress?.wasteCards;
  return Number.isFinite(beforeStock)
    && Number.isFinite(afterStock)
    && Number.isFinite(beforeWaste)
    && Number.isFinite(afterWaste)
    && afterStock < beforeStock
    && afterWaste > beforeWaste;
}

export function isActionableGameplayAction(action) {
  if (!action || action.type === 'wait') return false;
  if (isIllegalAction(action)) return false;
  return true;
}

export function hasValidGameplayAction(plan) {
  return plan?.candidateActions?.some((action) => isActionableGameplayAction(action)) || false;
}

export function didMakeCardProgress({ beforePlan, afterPlan, reward, action } = {}) {
  if (!action || isIllegalAction(action)) return false;
  if (isDeckDrawAction(action, beforePlan, afterPlan) || isDeckRecycleAction(action, beforePlan, afterPlan)) {
    return false;
  }

  const scoreGain = progressDelta(beforePlan, afterPlan, 'score');
  const completedGain = progressDelta(beforePlan, afterPlan, 'completedCategories');
  const foundationGain = progressDelta(beforePlan, afterPlan, 'foundationCards');
  const faceUpGain = progressDelta(beforePlan, afterPlan, 'faceUpCards');
  if (scoreGain > 0 || completedGain > 0 || foundationGain > 0 || faceUpGain > 0) return true;

  const text = actionText(action);
  if (/(progress|complete|foundation|tableau|reveal|valid move|legal move)/.test(text) && reward > 0) {
    return true;
  }
  return (action.type === 'drag' || action.type === 'tap_tap') && reward > 1;
}

export class EpisodeStopTracker {
  constructor({
    deckCyclesWithoutProgress = DEFAULT_CONFIG.deckCyclesWithoutProgress,
    noValidMoveConfirmations = DEFAULT_CONFIG.noValidMoveConfirmations,
  } = {}) {
    this.maxDeckCyclesWithoutProgress = deckCyclesWithoutProgress;
    this.maxNoValidMoveConfirmations = noValidMoveConfirmations;
    this.deckCyclesWithoutProgress = 0;
    this.cardProgressSinceDeckCycle = false;
    this.noValidMoveObservations = 0;
    this.lastDecision = null;
  }

  recordOutcome({ beforePlan, afterPlan, reward, action } = {}) {
    if (didMakeCardProgress({ beforePlan, afterPlan, reward, action })) {
      this.cardProgressSinceDeckCycle = true;
      this.deckCyclesWithoutProgress = 0;
    }

    if (isDeckRecycleAction(action, beforePlan, afterPlan)) {
      if (this.cardProgressSinceDeckCycle) {
        this.deckCyclesWithoutProgress = 0;
      } else {
        this.deckCyclesWithoutProgress += 1;
      }
      this.cardProgressSinceDeckCycle = false;

      if (this.deckCyclesWithoutProgress >= this.maxDeckCyclesWithoutProgress) {
        this.lastDecision = {
          done: true,
          reason: 'deck_cycles_without_card_progress',
          detail: `Recycled the deck ${this.deckCyclesWithoutProgress} times without a successful card move.`,
        };
        return this.lastDecision;
      }
    }

    return { done: false };
  }

  observePlan(plan) {
    const phase = String(plan?.phase || '').toLowerCase();
    if (plan?.isWin) return { done: false };

    if (/blocked|no[_ -]?valid|dead[_ -]?end|stuck|unsolvable/.test(phase)) {
      this.lastDecision = {
        done: true,
        reason: 'no_valid_moves',
        detail: `Visual planner reported terminal phase: ${phase}.`,
      };
      return this.lastDecision;
    }

    if (hasValidGameplayAction(plan)) {
      this.noValidMoveObservations = 0;
      return { done: false };
    }

    this.noValidMoveObservations += 1;
    if (this.noValidMoveObservations >= this.maxNoValidMoveConfirmations) {
      this.lastDecision = {
        done: true,
        reason: 'no_valid_moves',
        detail: `No valid visual gameplay actions for ${this.noValidMoveObservations} consecutive observations.`,
      };
      return this.lastDecision;
    }

    return { done: false };
  }

  snapshot() {
    return {
      deckCyclesWithoutProgress: this.deckCyclesWithoutProgress,
      cardProgressSinceDeckCycle: this.cardProgressSinceDeckCycle,
      noValidMoveObservations: this.noValidMoveObservations,
      lastDecision: this.lastDecision,
    };
  }
}

export class VisualPolicy {
  constructor({
    file,
    epsilon = DEFAULT_CONFIG.epsilon,
    learningRate = DEFAULT_CONFIG.learningRate,
    gamma = DEFAULT_CONFIG.gamma,
    rng = Math.random,
  } = {}) {
    this.file = file ? resolve(file) : resolve(DEFAULT_CONFIG.policyFile);
    this.epsilon = epsilon;
    this.learningRate = learningRate;
    this.gamma = gamma;
    this.rng = rng;
    this.data = {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      q: {},
      episodes: [],
    };
  }

  load() {
    const existing = readJsonFile(this.file, null);
    if (existing && typeof existing === 'object' && existing.q) {
      this.data = {
        version: 1,
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: existing.updatedAt || new Date().toISOString(),
        q: existing.q || {},
        episodes: Array.isArray(existing.episodes) ? existing.episodes : [],
      };
    }
    return this;
  }

  save() {
    this.data.updatedAt = new Date().toISOString();
    this.data.episodes = this.data.episodes.slice(-100);
    writeJsonFile(this.file, this.data);
  }

  getQ(stateKey, key) {
    return Number(this.data.q?.[stateKey]?.[key] || 0);
  }

  setQ(stateKey, key, value) {
    this.data.q[stateKey] ||= {};
    this.data.q[stateKey][key] = Math.round(value * 10000) / 10000;
  }

  choose(stateKey, candidateActions = []) {
    const actions = candidateActions.filter(Boolean);
    if (actions.length === 0) {
      return { action: { type: 'wait', intent: 'No candidate actions returned by visual planner.', expectedResult: 'unknown', confidence: 0 }, actionKey: 'wait', q: 0, explored: false };
    }

    if (this.rng() < this.epsilon) {
      const action = actions[Math.floor(this.rng() * actions.length)];
      return { action, actionKey: actionKey(action), q: this.getQ(stateKey, actionKey(action)), explored: true };
    }

    let best = null;
    for (const action of actions) {
      const key = actionKey(action);
      const q = this.getQ(stateKey, key);
      const modelBias = (action.confidence || 0) * 0.1;
      const value = q + modelBias;
      if (!best || value > best.value) {
        best = { action, actionKey: key, q, value, explored: false };
      }
    }
    return best;
  }

  update(stateKey, action, reward, nextStateKey, nextActions = []) {
    if (!stateKey || !action) return 0;
    const key = actionKey(action);
    const current = this.getQ(stateKey, key);
    const future = nextActions.length
      ? Math.max(...nextActions.map((nextAction) => this.getQ(nextStateKey, actionKey(nextAction))))
      : 0;
    const target = reward + this.gamma * future;
    const next = current + this.learningRate * (target - current);
    this.setQ(stateKey, key, next);
    return next;
  }

  recordEpisode(summary) {
    this.data.episodes.push({
      ...summary,
      recordedAt: new Date().toISOString(),
    });
  }
}

function includesAny(text, words) {
  const lower = String(text || '').toLowerCase();
  return words.some((word) => lower.includes(word));
}

export function chooseMechanicsAction(stage, candidateActions = []) {
  const actions = candidateActions.filter(Boolean);
  if (stage === 0) {
    return actions.find((action) => action.type === 'tap' && includesAny(action.intent, ['draw', 'stock', 'source', 'deck']))
      || actions.find((action) => includesAny(action.expectedResult, ['draw', 'recycle']));
  }
  if (stage === 1) {
    return actions.find((action) => includesAny(action.expectedResult, ['illegal', 'bounce', 'reject']))
      || actions.find((action) => includesAny(action.intent, ['illegal', 'invalid', 'probe']));
  }
  if (stage === 2) {
    return actions.find((action) => includesAny(action.expectedResult, ['progress', 'complete']))
      || actions.find((action) => includesAny(action.expectedResult, ['legal']) && !includesAny(action.expectedResult, ['draw', 'recycle']))
      || actions.find((action) => action.type === 'drag' || action.type === 'tap_tap');
  }
  return null;
}

export function buildVisionPrompt({ mode, episode, step, lastAction, recentRewards = [] } = {}) {
  const mechanicsInstructions = mode === 'mechanics'
    ? `
For mechanics mode, include candidate actions that can verify the rules visually:
- one draw/recycle or harmless tap action if visible,
- one intentionally illegal move expected to bounce back if visible,
- one legal progress move if visible.
Mark expectedResult as "illegal-bounce", "legal-progress", "legal-draw", "legal-recycle", or "unknown".
`
    : '';

  return `
You are the visual planner for a local Category Solitaire QA agent. You see only the screenshot. Do not rely on source code, hidden state, or deterministic deck order. Use visible text, card positions, counters, animations, and modal text only.

${RULE_SUMMARY}

Current run:
- mode: ${mode}
- episode: ${episode}
- step: ${step}
- last action: ${lastAction ? JSON.stringify(lastAction).slice(0, 800) : 'none'}
- recent rewards: ${recentRewards.slice(-6).join(', ') || 'none'}

Return exactly one JSON object matching this schema:
{
  "phase": "playing|won|blocked|no_valid_moves|needs_draw|needs_recycle|animating|unknown",
  "is_win": false,
  "progress": {
    "score": null,
    "completed_categories": null,
    "foundation_cards": null,
    "face_up_cards": null,
    "tableau_cards": null,
    "stock_cards": null,
    "waste_cards": null
  },
  "visible_cards": [
    {"label":"visible card text", "kind":"title|item|back|empty|unknown", "category":"category if inferable", "bbox":[left,top,width,height], "confidence":0.0}
  ],
  "drop_targets": [
    {"label":"foundation slot 1 or tableau column 3", "kind":"foundation|tableau|stock|waste|modal|unknown", "bbox":[left,top,width,height], "confidence":0.0}
  ],
  "candidate_actions": [
    {
      "type":"drag|tap|tap_tap|wait",
      "from":[x,y],
      "to":[x,y],
      "point":[x,y],
      "intent":"short visual reason",
      "expectedResult":"legal-progress|legal-draw|legal-recycle|illegal-bounce|unknown",
      "confidence":0.0
    }
  ],
  "notes":"short observation"
}

Coordinate rules:
- Coordinates are screenshot pixels, origin at top-left.
- For drag and tap_tap actions, use the center of the visible source card and center of the destination target.
- For tap actions, use point only.
- Include 3 to 8 candidate_actions when possible.
- Prefer moves that group matching category cards into foundations, then reveal tableau cards, then draw/recycle stock.
- If any legal card move is visible, include it as "legal-progress".
- If no legal card move is visible but stock/draft can be advanced, include "legal-draw" or "legal-recycle".
- If no legal card move, draw, or recycle action is visible, return phase "no_valid_moves" and no candidate_actions.
${mechanicsInstructions}
`.trim();
}

export function heuristicPlan(observation, reason = 'No vision model configured.') {
  const width = observation.viewport?.width || DEFAULT_CONFIG.width;
  const height = observation.viewport?.height || DEFAULT_CONFIG.height;
  return normalizePlan({
    phase: 'needs_model',
    progress: {},
    candidate_actions: [
      {
        type: 'tap',
        point: [Math.round(width * 0.28), Math.round(height * 0.11)],
        intent: 'Heuristic tap near the source deck area.',
        expectedResult: 'legal-draw',
        confidence: 0.15,
      },
      {
        type: 'tap',
        point: [Math.round(width * 0.50), Math.round(height * 0.11)],
        intent: 'Heuristic tap near the draft/waste pile area.',
        expectedResult: 'unknown',
        confidence: 0.08,
      },
      {
        type: 'wait',
        intent: reason,
        expectedResult: 'unknown',
        confidence: 0.05,
      },
    ],
    notes: reason,
  }, observation.viewport);
}

function normalizeUrl(value) {
  if (!value) return '';
  const text = String(value).trim();
  if (/^https?:\/\//i.test(text)) return text.replace(/\/$/, '');
  return `http://${text}`.replace(/\/$/, '');
}

export function resolveVisionProvider(config, env = process.env) {
  let provider = String(config.provider || 'auto').toLowerCase();
  const explicitUrl = config.modelUrl || env.QA_VISION_URL || env.VISION_API_URL || '';

  if (provider === 'auto') {
    if (explicitUrl) {
      provider = /\/api\/chat\b/.test(explicitUrl) ? 'ollama' : 'openai';
    } else if (env.OPENAI_BASE_URL) {
      provider = 'openai';
    } else if (env.OLLAMA_HOST || env.OLLAMA_URL) {
      provider = 'ollama';
    } else {
      provider = 'none';
    }
  }

  if (provider === 'none') {
    return { provider: 'none', endpoint: '', baseUrl: '', model: config.model };
  }

  if (provider === 'ollama') {
    const baseUrl = normalizeUrl(
      explicitUrl && !/\/api\/chat\b/.test(explicitUrl) ? explicitUrl : env.OLLAMA_URL || env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    );
    const endpoint = explicitUrl && /\/api\/chat\b/.test(explicitUrl)
      ? explicitUrl
      : `${baseUrl}/api/chat`;
    return { provider, endpoint, baseUrl, model: config.model };
  }

  const baseUrl = normalizeUrl(env.OPENAI_BASE_URL || 'http://127.0.0.1:8000');
  const endpoint = explicitUrl || `${baseUrl}/v1/chat/completions`;
  return { provider: 'openai', endpoint, baseUrl, model: config.model };
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}: ${text.slice(0, 400)}`);
    }
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeout);
  }
}

export class VisionPlanner {
  constructor(config, env = process.env) {
    this.config = config;
    this.provider = resolveVisionProvider(config, env);
    this.recentRewards = [];
  }

  rememberReward(reward) {
    if (Number.isFinite(reward)) {
      this.recentRewards.push(reward);
      this.recentRewards = this.recentRewards.slice(-12);
    }
  }

  async plan(observation, meta = {}) {
    if (this.provider.provider === 'none') {
      return heuristicPlan(observation);
    }

    const prompt = buildVisionPrompt({
      mode: this.config.mode,
      episode: meta.episode,
      step: meta.step,
      lastAction: meta.lastAction,
      recentRewards: this.recentRewards,
    });

    try {
      const raw = this.provider.provider === 'ollama'
        ? await this.callOllama(observation, prompt)
        : await this.callOpenAICompatible(observation, prompt);
      return normalizePlan(raw, observation.viewport);
    } catch (error) {
      if (this.config.verbose) {
        console.warn(`[qa-agent] vision planner failed: ${error.message}`);
      }
      return heuristicPlan(observation, `Vision planner failed: ${error.message}`);
    }
  }

  async callOllama(observation, prompt) {
    const data = await fetchJsonWithTimeout(this.provider.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.provider.model,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: 'Return strict JSON only. You are controlling a browser by screenshot coordinates.' },
          { role: 'user', content: prompt, images: [observation.screenshotBase64] },
        ],
      }),
    }, this.config.modelTimeoutMs);

    const content = data.message?.content || data.response || '';
    return extractJsonObject(content);
  }

  async callOpenAICompatible(observation, prompt) {
    const headers = { 'content-type': 'application/json' };
    if (this.config.apiKey) headers.authorization = `Bearer ${this.config.apiKey}`;

    const data = await fetchJsonWithTimeout(this.provider.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.provider.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return strict JSON only. You are controlling a browser by screenshot coordinates.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${observation.screenshotBase64}` } },
            ],
          },
        ],
      }),
    }, this.config.modelTimeoutMs);

    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.text || '';
    return extractJsonObject(content);
  }
}

async function captureObservation(page, config, runDir, episode, step, tag = 'before') {
  await page.waitForTimeout(config.settleMs);
  const viewport = page.viewportSize() || { width: config.width, height: config.height };
  const imageBytes = await page.screenshot({ fullPage: false, type: 'png' });
  const screenshotPath = join(runDir, `episode-${String(episode).padStart(2, '0')}-step-${String(step).padStart(4, '0')}-${tag}.png`);
  writeFileSync(screenshotPath, imageBytes);
  return {
    viewport,
    screenshotPath,
    screenshotBase64: imageBytes.toString('base64'),
    imageBytes,
    imageHash: hashValue(imageBytes).slice(0, 24),
    url: page.url(),
  };
}

async function performAction(page, action, config) {
  if (config.dryRun) {
    await page.waitForTimeout(config.settleMs);
    return;
  }

  if (action.type === 'wait') {
    await page.waitForTimeout(Math.max(config.settleMs, 1000));
    return;
  }

  if (action.type === 'tap') {
    const [x, y] = action.point;
    if (config.mobile) {
      await page.touchscreen.tap(x, y);
    } else {
      await page.mouse.click(x, y);
    }
    return;
  }

  if (action.type === 'tap_tap') {
    const click = async ([x, y]) => {
      if (config.mobile) await page.touchscreen.tap(x, y);
      else await page.mouse.click(x, y);
      await page.waitForTimeout(180);
    };
    await click(action.from);
    await click(action.to);
    return;
  }

  if (action.type === 'drag') {
    const [fromX, fromY] = action.from;
    const [toX, toY] = action.to;
    await page.mouse.move(fromX, fromY);
    await page.waitForTimeout(70);
    await page.mouse.down();
    for (let i = 1; i <= config.dragSteps; i += 1) {
      const t = i / config.dragSteps;
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t;
      await page.mouse.move(x, y);
      await page.waitForTimeout(12);
    }
    await page.mouse.up();
  }
}

function sanitizeConfigForReport(config, planner) {
  const { apiKey, ...safeConfig } = config;
  return {
    ...safeConfig,
    apiKey: apiKey ? '<redacted>' : '',
    resolvedVisionProvider: planner.provider,
  };
}

function shortAction(action) {
  if (!action) return null;
  return {
    type: action.type,
    from: action.from,
    to: action.to,
    point: action.point,
    intent: action.intent,
    expectedResult: action.expectedResult,
    confidence: action.confidence,
  };
}

function reportPlan(plan) {
  return {
    phase: plan.phase,
    isWin: plan.isWin,
    progress: plan.progress,
    visibleCardCount: plan.visibleCards.length,
    dropTargetCount: plan.dropTargets.length,
    candidateActionCount: plan.candidateActions.length,
    notes: plan.notes,
  };
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (error) {
    throw new Error(`Playwright is not installed. Run "npm install" and then "npm run qa:agent:install". Original error: ${error.message}`);
  }
}

export async function runAgent(inputConfig) {
  const config = { ...DEFAULT_CONFIG, ...inputConfig };
  const startedAt = new Date();
  const runId = nowStamp(startedAt);
  const artifactRoot = resolve(config.artifactDir);
  const reportRoot = resolve(config.reportDir);
  const runDir = join(artifactRoot, runId);
  ensureDir(runDir);
  ensureDir(reportRoot);

  const rng = createSeededRandom(`${config.seed}:${runId}`);
  const policy = new VisualPolicy({
    file: config.policyFile,
    epsilon: config.mode === 'train' ? Math.max(config.epsilon, 0.3) : config.epsilon,
    learningRate: config.learningRate,
    gamma: config.gamma,
    rng,
  }).load();
  const planner = new VisionPlanner(config);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: !config.headed, slowMo: config.slowMo });
  const context = await browser.newContext({
    viewport: { width: config.width, height: config.height },
    deviceScaleFactor: 1,
    isMobile: config.mobile,
    hasTouch: config.mobile,
  });
  const page = await context.newPage();

  const report = {
    version: 1,
    startedAt: startedAt.toISOString(),
    endedAt: null,
    target: { branch: config.branch, url: config.url },
    config: sanitizeConfigForReport(config, planner),
    runDir,
    gifPath: null,
    gifError: null,
    policyFile: resolve(config.policyFile),
    episodes: [],
    summary: {
      won: false,
      blocked: false,
      endedReason: null,
      totalReward: 0,
      totalSteps: 0,
    },
  };

  try {
    await page.goto(config.url, { waitUntil: 'networkidle', timeout: config.navigationTimeoutMs });

    for (let episode = 0; episode < config.episodes; episode += 1) {
      if (episode > 0) {
        await page.reload({ waitUntil: 'networkidle', timeout: config.navigationTimeoutMs });
      }

      const episodeReport = {
        episode,
        startedAt: new Date().toISOString(),
        endedAt: null,
        won: false,
        blocked: false,
        endedReason: null,
        stopDetail: null,
        totalReward: 0,
        stopTracker: null,
        steps: [],
      };
      report.episodes.push(episodeReport);

      let pending = null;
      let lastAction = null;
      let mechanicsStage = 0;
      const stopTracker = new EpisodeStopTracker({
        deckCyclesWithoutProgress: config.deckCyclesWithoutProgress,
        noValidMoveConfirmations: config.noValidMoveConfirmations,
      });

      for (let step = 0; step < config.maxSteps; step += 1) {
        const observation = await captureObservation(page, config, runDir, episode, step, 'before');
        const plan = await planner.plan(observation, { episode, step, lastAction });
        const stateKey = buildStateKey(plan);

        if (pending) {
          const reward = computeReward({
            beforePlan: pending.plan,
            afterPlan: plan,
            beforeImage: pending.observation.imageBytes,
            afterImage: observation.imageBytes,
            action: pending.action,
            mode: config.mode,
          });
          planner.rememberReward(reward);
          const q = policy.update(pending.stateKey, pending.action, reward, stateKey, plan.candidateActions);
          pending.stepRecord.reward = reward;
          pending.stepRecord.nextQ = q;
          pending.stepRecord.after = reportPlan(plan);
          pending.stepRecord.afterScreenshot = observation.screenshotPath;
          episodeReport.totalReward += reward;
          report.summary.totalReward += reward;

          const stopDecision = stopTracker.recordOutcome({
            beforePlan: pending.plan,
            afterPlan: plan,
            reward,
            action: pending.action,
          });
          pending.stepRecord.stopTracker = stopTracker.snapshot();
          pending = null;

          if (stopDecision.done) {
            episodeReport.blocked = true;
            episodeReport.endedReason = stopDecision.reason;
            episodeReport.stopDetail = stopDecision.detail;
            report.summary.blocked = true;
            report.summary.endedReason ||= stopDecision.reason;
            break;
          }
        }

        if (plan.isWin) {
          episodeReport.won = true;
          episodeReport.endedReason = 'won';
          report.summary.won = true;
          report.summary.endedReason ||= 'won';
          pending = null;
          break;
        }

        const planStopDecision = stopTracker.observePlan(plan);
        if (planStopDecision.done) {
          episodeReport.blocked = true;
          episodeReport.endedReason = planStopDecision.reason;
          episodeReport.stopDetail = planStopDecision.detail;
          report.summary.blocked = true;
          report.summary.endedReason ||= planStopDecision.reason;
          pending = null;
          break;
        }

        let choice;
        if (config.mode === 'mechanics') {
          const mechanicsAction = chooseMechanicsAction(mechanicsStage, plan.candidateActions);
          if (mechanicsAction) {
            choice = {
              action: mechanicsAction,
              actionKey: actionKey(mechanicsAction),
              q: policy.getQ(stateKey, actionKey(mechanicsAction)),
              explored: false,
              mechanicsStage,
            };
            mechanicsStage += 1;
          }
        }
        choice ||= policy.choose(stateKey, plan.candidateActions);

        const stepRecord = {
          step,
          stateKey,
          screenshot: observation.screenshotPath,
          before: reportPlan(plan),
          action: shortAction(choice.action),
          actionKey: choice.actionKey,
          q: choice.q,
          explored: choice.explored,
          mechanicsStage: choice.mechanicsStage,
          reward: null,
          nextQ: null,
          after: null,
          stopTracker: stopTracker.snapshot(),
        };
        episodeReport.steps.push(stepRecord);
        report.summary.totalSteps += 1;

        if (config.verbose) {
          console.log(`[qa-agent] episode ${episode} step ${step}: ${choice.action.type} | ${choice.action.intent}`);
        }

        await performAction(page, choice.action, config);
        pending = { observation, plan, stateKey, action: choice.action, stepRecord };
        lastAction = shortAction(choice.action);
      }

      if (pending) {
        const finalObservation = await captureObservation(page, config, runDir, episode, episodeReport.steps.length, 'after');
        const finalPlan = await planner.plan(finalObservation, {
          episode,
          step: episodeReport.steps.length,
          lastAction,
        });
        const finalStateKey = buildStateKey(finalPlan);
        const reward = computeReward({
          beforePlan: pending.plan,
          afterPlan: finalPlan,
          beforeImage: pending.observation.imageBytes,
          afterImage: finalObservation.imageBytes,
          action: pending.action,
          mode: config.mode,
        });
        planner.rememberReward(reward);
        const q = policy.update(pending.stateKey, pending.action, reward, finalStateKey, finalPlan.candidateActions);
        const stopDecision = stopTracker.recordOutcome({
          beforePlan: pending.plan,
          afterPlan: finalPlan,
          reward,
          action: pending.action,
        });
        pending.stepRecord.reward = reward;
        pending.stepRecord.nextQ = q;
        pending.stepRecord.after = reportPlan(finalPlan);
        pending.stepRecord.afterScreenshot = finalObservation.screenshotPath;
        pending.stepRecord.stopTracker = stopTracker.snapshot();
        episodeReport.totalReward += reward;
        report.summary.totalReward += reward;
        if (finalPlan.isWin) {
          episodeReport.won = true;
          episodeReport.endedReason = 'won';
          report.summary.won = true;
          report.summary.endedReason ||= 'won';
        } else if (stopDecision.done) {
          episodeReport.blocked = true;
          episodeReport.endedReason = stopDecision.reason;
          episodeReport.stopDetail = stopDecision.detail;
          report.summary.blocked = true;
          report.summary.endedReason ||= stopDecision.reason;
        }
        pending = null;
      }

      if (!episodeReport.endedReason) {
        episodeReport.endedReason = episodeReport.won ? 'won' : 'max_steps';
        report.summary.endedReason ||= episodeReport.endedReason;
      }
      episodeReport.stopTracker = stopTracker.snapshot();
      episodeReport.endedAt = new Date().toISOString();
      policy.recordEpisode({
        branch: config.branch,
        url: config.url,
        mode: config.mode,
        episode,
        won: episodeReport.won,
        blocked: episodeReport.blocked,
        endedReason: episodeReport.endedReason,
        steps: episodeReport.steps.length,
        totalReward: episodeReport.totalReward,
      });

      if (episodeReport.won && config.mode !== 'train') break;
      if (episodeReport.blocked && config.mode !== 'train') break;
    }
  } finally {
    await browser.close();
    policy.save();
    if (config.gif) {
      try {
        const gif = createGifFromRun({
          runDir,
          delayMs: config.gifDelayMs,
          maxWidth: config.gifMaxWidth,
          maxFrames: config.gifMaxFrames,
          include: config.gifInclude,
        });
        report.gifPath = gif.outPath;
        report.gif = gif;
      } catch (error) {
        report.gifError = error.message;
        console.warn(`[qa-agent] gif generation failed: ${error.message}`);
      }
    }
    report.endedAt = new Date().toISOString();
    report.summary.totalReward = Math.round(report.summary.totalReward * 100) / 100;
    const reportPath = join(reportRoot, `category-solitaire-qa-${runId}.json`);
    writeJsonFile(reportPath, report);
    report.reportPath = reportPath;
  }

  return report;
}

const scriptPath = fileURLToPath(import.meta.url);
const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath);

if (isDirectExecution) {
  let config;
  try {
    config = parseArgs();
    if (config.help) {
      console.log(usage());
      process.exit(0);
    }
    console.log(`[qa-agent] target ${config.url}`);
    console.log(`[qa-agent] mode=${config.mode} provider=${config.provider} model=${config.model}`);
    const report = await runAgent(config);
    console.log(`[qa-agent] report ${report.reportPath}`);
    console.log(`[qa-agent] artifacts ${report.runDir}`);
    console.log(`[qa-agent] won=${report.summary.won} steps=${report.summary.totalSteps} reward=${report.summary.totalReward}`);
  } catch (error) {
    console.error(`[qa-agent] ${error.stack || error.message}`);
    process.exit(1);
  }
}
