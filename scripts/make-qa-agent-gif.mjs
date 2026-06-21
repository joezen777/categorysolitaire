#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pngjs from 'pngjs';

const require = createRequire(import.meta.url);
const gifenc = require('gifenc');
const { GIFEncoder, applyPalette, quantize } = gifenc;
const { PNG } = pngjs;

const DEFAULTS = {
  artifactDir: '.qa-agent-artifacts',
  delayMs: 650,
  maxWidth: 720,
  maxFrames: 240,
  include: 'all',
  colors: 128,
};

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

export function parseFrameName(fileName) {
  const match = basename(fileName).match(/^episode-(\d+)-step-(\d+)-(before|after)\.png$/);
  if (!match) return null;
  return {
    episode: Number.parseInt(match[1], 10),
    step: Number.parseInt(match[2], 10),
    tag: match[3],
    tagOrder: match[3] === 'before' ? 0 : 1,
  };
}

export function findLatestRunDir(artifactDir = DEFAULTS.artifactDir) {
  const root = resolve(artifactDir);
  if (!existsSync(root)) return null;
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const path = join(root, entry.name);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  return dirs[0]?.path || null;
}

function readRunDirFromReport(reportPath) {
  const report = JSON.parse(readFileSync(resolve(reportPath), 'utf8'));
  if (!report.runDir) {
    throw new Error(`Report does not contain runDir: ${reportPath}`);
  }
  return report.runDir;
}

export function sampleFramesEvenly(frames, maxFrames = DEFAULTS.maxFrames) {
  if (!maxFrames || frames.length <= maxFrames) return frames;
  if (maxFrames === 1) return [frames[frames.length - 1]];

  const sampled = [];
  const lastIndex = frames.length - 1;
  for (let i = 0; i < maxFrames; i += 1) {
    const sourceIndex = Math.round((i * lastIndex) / (maxFrames - 1));
    sampled.push(frames[sourceIndex]);
  }
  return sampled;
}

export function collectRunFrames({ runDir, include = DEFAULTS.include, maxFrames = DEFAULTS.maxFrames } = {}) {
  if (!runDir) throw new Error('runDir is required to collect QA agent GIF frames.');
  const resolvedRunDir = resolve(runDir);
  if (!existsSync(resolvedRunDir)) throw new Error(`Run directory does not exist: ${resolvedRunDir}`);

  const includeSet = include === 'all'
    ? new Set(['before', 'after'])
    : new Set([include]);

  const frames = readdirSync(resolvedRunDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const parsed = parseFrameName(entry.name);
      return parsed ? { ...parsed, path: join(resolvedRunDir, entry.name) } : null;
    })
    .filter((frame) => frame && includeSet.has(frame.tag))
    .sort((left, right) => (
      left.episode - right.episode
      || left.step - right.step
      || left.tagOrder - right.tagOrder
    ));

  return sampleFramesEvenly(frames, maxFrames);
}

export function targetSize(width, height, maxWidth = DEFAULTS.maxWidth) {
  const scale = Math.min(1, maxWidth / width);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function resizeNearestRgba(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  if (sourceWidth === targetWidth && sourceHeight === targetHeight) {
    return new Uint8Array(source);
  }

  const output = new Uint8Array(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y * sourceHeight) / targetHeight));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x * sourceWidth) / targetWidth));
      const sourceOffset = (sourceY * sourceWidth + sourceX) * 4;
      const outputOffset = (y * targetWidth + x) * 4;
      output[outputOffset] = source[sourceOffset];
      output[outputOffset + 1] = source[sourceOffset + 1];
      output[outputOffset + 2] = source[sourceOffset + 2];
      output[outputOffset + 3] = source[sourceOffset + 3];
    }
  }
  return output;
}

export function createGifFromFrames(framePaths, {
  outPath,
  delayMs = DEFAULTS.delayMs,
  maxWidth = DEFAULTS.maxWidth,
  colors = DEFAULTS.colors,
} = {}) {
  if (!framePaths.length) {
    throw new Error('No PNG frames were found for the QA agent GIF.');
  }

  const first = PNG.sync.read(readFileSync(framePaths[0]));
  const size = targetSize(first.width, first.height, maxWidth);
  const gif = GIFEncoder();

  framePaths.forEach((framePath) => {
    const png = PNG.sync.read(readFileSync(framePath));
    const rgba = resizeNearestRgba(png.data, png.width, png.height, size.width, size.height);
    const palette = quantize(rgba, Math.max(2, Math.min(256, colors)));
    const indexed = applyPalette(rgba, palette);
    gif.writeFrame(indexed, size.width, size.height, {
      palette,
      delay: delayMs,
      repeat: 0,
    });
  });

  gif.finish();
  ensureDir(dirname(outPath));
  writeFileSync(outPath, gif.bytes());
  return {
    outPath,
    frameCount: framePaths.length,
    width: size.width,
    height: size.height,
  };
}

export function createGifFromRun({
  runDir,
  outPath,
  include = DEFAULTS.include,
  delayMs = DEFAULTS.delayMs,
  maxWidth = DEFAULTS.maxWidth,
  maxFrames = DEFAULTS.maxFrames,
  colors = DEFAULTS.colors,
} = {}) {
  const resolvedRunDir = resolve(runDir);
  const frames = collectRunFrames({ runDir: resolvedRunDir, include, maxFrames });
  const output = outPath ? resolve(outPath) : join(resolvedRunDir, 'playthrough.gif');
  return createGifFromFrames(frames.map((frame) => frame.path), {
    outPath: output,
    delayMs,
    maxWidth,
    colors,
  });
}

export function parseGifArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };

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
      case '--run-dir':
        config.runDir = String(value);
        break;
      case '--report':
        config.report = String(value);
        break;
      case '--out':
        config.outPath = String(value);
        break;
      case '--artifact-dir':
        config.artifactDir = String(value);
        break;
      case '--delay-ms':
        config.delayMs = parsePositiveInt(value, config.delayMs);
        break;
      case '--max-width':
        config.maxWidth = parsePositiveInt(value, config.maxWidth);
        break;
      case '--max-frames':
        config.maxFrames = parsePositiveInt(value, config.maxFrames);
        break;
      case '--colors':
        config.colors = parsePositiveInt(value, config.colors);
        break;
      case '--include':
        config.include = String(value);
        break;
      default:
        throw new Error(`Unknown option: ${key}`);
    }
  }

  if (!['all', 'before', 'after'].includes(config.include)) {
    throw new Error('--include must be all, before, or after.');
  }

  if (config.report && !config.runDir) {
    config.runDir = readRunDirFromReport(config.report);
  }
  if (!config.runDir) {
    config.runDir = findLatestRunDir(config.artifactDir);
  }
  if (!config.runDir && !config.help) {
    throw new Error(`No QA agent run directory found under ${resolve(config.artifactDir)}.`);
  }

  return config;
}

export function usage() {
  return `
Create an animated GIF from QA agent screenshots.

Usage:
  npm run qa:agent:gif
  npm run qa:agent:gif -- --run-dir .qa-agent-artifacts/2026-06-20T22-37-57Z
  npm run qa:agent:gif -- --report .qa-agent-reports/category-solitaire-qa-2026-06-20T22-37-57Z.json --max-width 540 --delay-ms 500

Options:
  --include all|before|after   Frame selection, default all.
  --max-width 720              Downscale large screenshots for smaller GIFs.
  --max-frames 240             Evenly sample long runs.
  --out path/to/playthrough.gif
`.trim();
}

const scriptPath = fileURLToPath(import.meta.url);
const isDirectExecution = process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath);

if (isDirectExecution) {
  try {
    const config = parseGifArgs();
    if (config.help) {
      console.log(usage());
      process.exit(0);
    }
    const result = createGifFromRun(config);
    console.log(`[qa-agent:gif] wrote ${result.outPath}`);
    console.log(`[qa-agent:gif] frames=${result.frameCount} size=${result.width}x${result.height}`);
  } catch (error) {
    console.error(`[qa-agent:gif] ${error.stack || error.message}`);
    process.exit(1);
  }
}
