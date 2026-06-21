import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import pngjs from 'pngjs';
import {
  collectRunFrames,
  createGifFromRun,
  parseFrameName,
  sampleFramesEvenly,
  targetSize,
} from '../scripts/make-qa-agent-gif.mjs';

const { PNG } = pngjs;
const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'qa-agent-gif-'));
  tempDirs.push(dir);
  return dir;
}

function writePng(path, color) {
  const png = new PNG({ width: 3, height: 2 });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = color[0];
    png.data[i + 1] = color[1];
    png.data[i + 2] = color[2];
    png.data[i + 3] = 255;
  }
  writeFileSync(path, PNG.sync.write(png));
}

describe('qa-agent GIF generation', () => {
  it('parses and orders QA screenshot frames', () => {
    expect(parseFrameName('episode-02-step-0010-before.png')).toEqual({
      episode: 2,
      step: 10,
      tag: 'before',
      tagOrder: 0,
    });

    const runDir = makeTempDir();
    writePng(join(runDir, 'episode-00-step-0001-before.png'), [255, 0, 0]);
    writePng(join(runDir, 'episode-00-step-0000-before.png'), [0, 255, 0]);
    writePng(join(runDir, 'episode-00-step-0001-after.png'), [0, 0, 255]);

    const frames = collectRunFrames({ runDir, include: 'all' });
    expect(frames.map((frame) => frame.tag)).toEqual(['before', 'before', 'after']);
    expect(frames.map((frame) => frame.step)).toEqual([0, 1, 1]);
  });

  it('samples long runs while preserving the first and last frame', () => {
    const frames = Array.from({ length: 10 }, (_, index) => ({ index }));
    const sampled = sampleFramesEvenly(frames, 4);
    expect(sampled[0]).toBe(frames[0]);
    expect(sampled[sampled.length - 1]).toBe(frames[9]);
    expect(sampled).toHaveLength(4);
  });

  it('creates a playable GIF from run screenshots', () => {
    const runDir = makeTempDir();
    writePng(join(runDir, 'episode-00-step-0000-before.png'), [255, 0, 0]);
    writePng(join(runDir, 'episode-00-step-0001-after.png'), [0, 0, 255]);

    const outPath = join(runDir, 'playthrough.gif');
    const result = createGifFromRun({ runDir, outPath, maxWidth: 2, delayMs: 100 });
    const bytes = readFileSync(outPath);

    expect(result.frameCount).toBe(2);
    expect(targetSize(3, 2, 2)).toEqual({ width: 2, height: 1 });
    expect(bytes.subarray(0, 6).toString('ascii')).toBe('GIF89a');
  });
});
