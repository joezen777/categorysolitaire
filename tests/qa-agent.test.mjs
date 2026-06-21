import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  BRANCH_URLS,
  EpisodeStopTracker,
  VisualPolicy,
  actionKey,
  bufferDifferenceRatio,
  chooseMechanicsAction,
  computeReward,
  didMakeCardProgress,
  extractJsonObject,
  normalizeAction,
  normalizePlan,
  parseArgs,
  resolveTargetUrl,
} from '../scripts/qa-agent.mjs';

describe('qa-agent CLI parsing', () => {
  it('resolves known deployed branch URLs', () => {
    const config = parseArgs(['--branch', 'claude.vibe', '--mode', 'mechanics'], {});
    expect(config.branch).toBe('claude-vibe');
    expect(config.url).toBe(BRANCH_URLS['claude-vibe']);
    expect(resolveTargetUrl({ branch: 'codex.vibe' })).toBe(BRANCH_URLS['codex-vibe']);
  });

  it('allows an explicit local URL to override the branch map', () => {
    const config = parseArgs(['--url', 'http://localhost:5173', '--branch', 'dashboard'], {});
    expect(config.url).toBe('http://localhost:5173');
  });
});

describe('vision response parsing', () => {
  it('extracts strict JSON from fenced model output', () => {
    const parsed = extractJsonObject('```json\n{"phase":"playing","candidate_actions":[]}\n```');
    expect(parsed.phase).toBe('playing');
  });

  it('normalizes candidate action aliases and clamps coordinates', () => {
    const action = normalizeAction({
      type: 'drag_and_drop',
      from: [-20, 50],
      to: [9000, 100],
      intent: 'move visible card',
      expectedResult: 'legal-progress',
    }, { width: 300, height: 200 });

    expect(action.type).toBe('drag');
    expect(action.from).toEqual([0, 50]);
    expect(action.to).toEqual([299, 100]);
    expect(actionKey(action)).toContain('drag');
  });

  it('keeps normalized actions inside the viewport for arbitrary points', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: -10_000, max: 10_000 }),
        (x1, y1, x2, y2) => {
          const action = normalizeAction({ type: 'drag', from: [x1, y1], to: [x2, y2] }, { width: 640, height: 480 });
          expect(action.from[0]).toBeGreaterThanOrEqual(0);
          expect(action.from[0]).toBeLessThan(640);
          expect(action.from[1]).toBeGreaterThanOrEqual(0);
          expect(action.from[1]).toBeLessThan(480);
          expect(action.to[0]).toBeGreaterThanOrEqual(0);
          expect(action.to[0]).toBeLessThan(640);
          expect(action.to[1]).toBeGreaterThanOrEqual(0);
          expect(action.to[1]).toBeLessThan(480);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('policy and reward', () => {
  it('rewards an expected illegal mechanics probe when the screen is unchanged', () => {
    const before = normalizePlan({ phase: 'playing', progress: {} });
    const after = normalizePlan({ phase: 'playing', progress: {} });
    const image = Buffer.from([1, 2, 3, 4, 5, 6]);
    const reward = computeReward({
      beforePlan: before,
      afterPlan: after,
      beforeImage: image,
      afterImage: Buffer.from(image),
      action: { type: 'drag', expectedResult: 'illegal-bounce', intent: 'probe invalid move' },
      mode: 'mechanics',
    });

    expect(reward).toBeGreaterThan(0);
    expect(bufferDifferenceRatio(image, Buffer.from(image))).toBe(0);
  });

  it('updates Q values toward rewarded visual actions', () => {
    const policy = new VisualPolicy({
      file: '.qa-agent-policy-test.json',
      epsilon: 0,
      learningRate: 0.5,
      gamma: 0,
      rng: () => 0.9,
    });
    const action = { type: 'tap', point: [10, 20], intent: 'draw source', expectedResult: 'legal-draw', confidence: 0.8 };
    const nextQ = policy.update('state-a', action, 10, 'state-b', []);
    expect(nextQ).toBe(5);

    const choice = policy.choose('state-a', [action]);
    expect(choice.action).toEqual(action);
    expect(choice.q).toBe(5);
  });

  it('selects staged mechanics actions from visual planner candidates', () => {
    const actions = [
      { type: 'tap', point: [10, 10], intent: 'draw from stock', expectedResult: 'legal-draw' },
      { type: 'drag', from: [10, 10], to: [20, 20], intent: 'illegal probe', expectedResult: 'illegal-bounce' },
      { type: 'drag', from: [30, 30], to: [40, 40], intent: 'legal foundation move', expectedResult: 'legal-progress' },
    ];

    expect(chooseMechanicsAction(0, actions)).toBe(actions[0]);
    expect(chooseMechanicsAction(1, actions)).toBe(actions[1]);
    expect(chooseMechanicsAction(2, actions)).toBe(actions[2]);
  });

  it('stops after two deck recycles without card progress', () => {
    const tracker = new EpisodeStopTracker({ deckCyclesWithoutProgress: 2, noValidMoveConfirmations: 2 });
    const before = normalizePlan({ phase: 'playing', progress: { stock_cards: 0, waste_cards: 10 } });
    const after = normalizePlan({ phase: 'playing', progress: { stock_cards: 10, waste_cards: 0 } });
    const recycle = { type: 'tap', point: [10, 10], intent: 'recycle stock from waste', expectedResult: 'legal-recycle' };

    expect(tracker.recordOutcome({ beforePlan: before, afterPlan: after, reward: 1, action: recycle }).done).toBe(false);
    expect(tracker.recordOutcome({ beforePlan: before, afterPlan: after, reward: 1, action: recycle })).toMatchObject({
      done: true,
      reason: 'deck_cycles_without_card_progress',
    });
  });

  it('resets deck-cycle blocking after a successful card move', () => {
    const tracker = new EpisodeStopTracker({ deckCyclesWithoutProgress: 2, noValidMoveConfirmations: 2 });
    const noProgressBefore = normalizePlan({ phase: 'playing', progress: { stock_cards: 0, waste_cards: 10 } });
    const noProgressAfter = normalizePlan({ phase: 'playing', progress: { stock_cards: 10, waste_cards: 0 } });
    const recycle = { type: 'tap', point: [10, 10], intent: 'recycle stock from waste', expectedResult: 'legal-recycle' };
    const move = { type: 'drag', from: [10, 20], to: [30, 40], intent: 'move item to foundation', expectedResult: 'legal-progress' };
    const progressBefore = normalizePlan({ phase: 'playing', progress: { foundation_cards: 1 } });
    const progressAfter = normalizePlan({ phase: 'playing', progress: { foundation_cards: 2 } });

    tracker.recordOutcome({ beforePlan: noProgressBefore, afterPlan: noProgressAfter, reward: 1, action: recycle });
    expect(didMakeCardProgress({ beforePlan: progressBefore, afterPlan: progressAfter, reward: 20, action: move })).toBe(true);
    tracker.recordOutcome({ beforePlan: progressBefore, afterPlan: progressAfter, reward: 20, action: move });
    expect(tracker.recordOutcome({ beforePlan: noProgressBefore, afterPlan: noProgressAfter, reward: 1, action: recycle }).done).toBe(false);
  });

  it('stops when the visual planner reports no valid moves', () => {
    const tracker = new EpisodeStopTracker({ noValidMoveConfirmations: 2 });
    const blocked = normalizePlan({ phase: 'no_valid_moves', candidate_actions: [] });
    expect(tracker.observePlan(blocked)).toMatchObject({
      done: true,
      reason: 'no_valid_moves',
    });
  });
});
