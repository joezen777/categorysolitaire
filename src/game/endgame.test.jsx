import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import starterDeck from '../decks/starterDeck.json';
import { buildDeck } from '../decks/deck.js';
import { drawCard, isWon } from './state.js';
import { moveCards } from './rules.js';
import { createSoundPlayer } from '../audio/sounds.js';
import App from '../App.jsx';

afterEach(cleanup);

function fakeAudioContext() {
  const ctx = {
    state: 'running',
    currentTime: 0,
    destination: {},
    oscillators: 0,
    createOscillator() {
      ctx.oscillators += 1;
      const param = { setValueAtTime() {}, linearRampToValueAtTime() {} };
      return { type: '', frequency: param, connect() {}, start() {}, stop() {} };
    },
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    },
  };
  return ctx;
}

describe('procedural sound player', () => {
  it('generates oscillator notes for each effect and nothing when disabled', () => {
    const ctx = fakeAudioContext();
    const factory = vi.fn(() => ctx);
    const player = createSoundPlayer(factory);
    expect(factory).not.toHaveBeenCalled(); // lazy until first play
    expect(player.play('error')).toBe(true);
    expect(player.play('warning')).toBe(true);
    expect(player.play('success')).toBe(true);
    expect(ctx.oscillators).toBe(2 + 2 + 4);
    player.setEnabled(false);
    for (const name of ['error', 'warning', 'success']) expect(player.play(name)).toBe(false);
    expect(ctx.oscillators).toBe(8);
    expect(factory).toHaveBeenCalledTimes(1);
    player.setEnabled(true);
    expect(player.play('success')).toBe(true);
    expect(player.play('unknown')).toBe(false);
  });
});

describe('win condition', () => {
  const { cards, categories } = buildDeck(starterDeck);
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));

  it('clears all 13 starter categories for 1300 and wins only at the very end', () => {
    // Source ordered so draws come out category by category, title first.
    const sequence = Object.keys(categories).flatMap((title) => [
      cards.find((c) => c.categoryTitle === title && c.itemName === null),
      ...cards.filter((c) => c.categoryTitle === title && c.itemName !== null),
    ]);
    let s = {
      source: [...sequence].reverse().map(({ id }) => ({ id, faceUp: false })),
      draft: [],
      foundations: [null, null, null, null, null],
      tableau: [[], [], [], [], []],
      score: 0,
    };
    let completions = 0;
    for (let i = 0; i < sequence.length; i += 1) {
      expect(isWon(s)).toBe(false);
      s = drawCard(s);
      expect(isWon(s)).toBe(false); // card in draft
      const r = moveCards(s, byId, { type: 'draft' }, { type: 'foundation', slot: 0 });
      expect(r.ok).toBe(true);
      if (r.completed) completions += 1;
      s = r.state;
    }
    expect(completions).toBe(13);
    expect(s.score).toBe(1300);
    expect(isWon(s)).toBe(true);
  });

  it('does not win with cards left anywhere', () => {
    const empty = { source: [], draft: [], foundations: [null, null, null, null, null], tableau: [[], [], [], [], []], score: 0 };
    const card = { id: 'king--orb', faceUp: true };
    expect(isWon(empty)).toBe(true);
    expect(isWon({ ...empty, source: [card] })).toBe(false);
    expect(isWon({ ...empty, draft: [card] })).toBe(false);
    expect(isWon({ ...empty, tableau: [[card], [], [], [], []] })).toBe(false);
    expect(isWon({ ...empty, foundations: [{ categoryTitle: 'King', cards: [card] }, null, null, null, null] })).toBe(false);
  });
});

describe('sounds, menu, win and replay in the app', () => {
  // Identity deal: col0 [a1↓, b2↓, b1↓, At↑], col1 [Bt↑].
  const DECK = [
    ['a1', 'A', 'a1'], ['b2', 'B', 'b2'], ['b1', 'B', 'b1'], ['At', 'A', null], ['Bt', 'B', null],
  ].map(([id, categoryTitle, itemName]) => ({ id, categoryTitle, itemName }));
  const identity = () => 0.999999;
  const mockPlayer = () => ({ play: vi.fn(() => true), setEnabled: vi.fn(), isEnabled: () => true });
  const card = (id) => document.querySelector(`[data-card-id="${id}"][data-face-up]`);
  const tap = (el) => fireEvent.click(el);
  const deselect = () => {
    const sel = document.querySelector('[data-selected="true"]');
    if (sel) tap(sel);
  };
  const menu = (item) => {
    tap(screen.getByTestId('menu-cog'));
    tap(screen.getByTestId(item));
  };
  const score = () => screen.getByTestId('score').textContent;

  function playToWin(player) {
    tap(card('At'));
    tap(card('Bt')); // title onto a title: illegal -> error
    deselect();
    tap(card('At'));
    tap(screen.getByTestId('foundation-0'));
    tap(card('b1'));
    tap(screen.getByTestId('foundation-1')); // item into empty slot: illegal -> warning
    deselect();
    tap(card('Bt'));
    tap(screen.getByTestId('foundation-1'));
    tap(card('b1'));
    tap(screen.getByTestId('foundation-1'));
    expect(screen.queryByText('Game Over - You Win!')).toBeNull();
    tap(card('b2'));
    tap(screen.getByTestId('foundation-1')); // B complete -> success
    expect(score()).toBe('Score: 100');
    expect(screen.queryByText('Game Over - You Win!')).toBeNull(); // incomplete game
    tap(card('a1'));
    tap(screen.getByTestId('foundation-0')); // A complete -> success, all cleared
    return player;
  }

  it('plays error, warning and success effects and shows the win modal; play again resets', async () => {
    const player = mockPlayer();
    render(<App deckData={DECK} rng={identity} soundPlayer={player} />);
    playToWin(player);
    expect(player.play.mock.calls.map((c) => c[0])).toEqual(['error', 'warning', 'success', 'success']);
    expect(screen.getByText('Game Over - You Win!')).toBeTruthy();
    expect(screen.getByTestId('final-score').textContent).toBe('Final score: 200');
    tap(screen.getByTestId('play-again'));
    await waitFor(() => expect(screen.queryByText('Game Over - You Win!')).toBeNull());
    expect(score()).toBe('Score: 0');
    expect(screen.getByTestId('tableau-column-0').dataset.count).toBe('4');
    expect(screen.getByTestId('tableau-column-1').dataset.count).toBe('1');
    expect(screen.getByTestId('foundation-0').dataset.empty).toBe('true');
  });

  it('mute suppresses every sound', () => {
    const player = mockPlayer();
    render(<App deckData={DECK} rng={identity} soundPlayer={player} />);
    expect(screen.queryByTestId('menu-sound')).toBeNull();
    menu('menu-sound');
    expect(player.setEnabled).toHaveBeenCalledWith(false);
    playToWin(player);
    expect(player.play).not.toHaveBeenCalled();
    expect(screen.getByText('Game Over - You Win!')).toBeTruthy();
  });

  it('restart deals a fresh game and resets score and piles', () => {
    render(<App deckData={DECK} rng={identity} soundPlayer={mockPlayer()} />);
    tap(card('Bt'));
    tap(screen.getByTestId('foundation-0'));
    tap(card('At'));
    tap(screen.getByTestId('foundation-1'));
    expect(screen.getByTestId('foundation-0').dataset.category).toBe('B');
    menu('menu-restart');
    expect(score()).toBe('Score: 0');
    expect(screen.getByTestId('foundation-0').dataset.empty).toBe('true');
    expect(screen.getByTestId('foundation-1').dataset.empty).toBe('true');
    expect(screen.getByTestId('tableau-column-0').dataset.count).toBe('4');
    expect(screen.getByTestId('tableau-column-1').dataset.count).toBe('1');
  });

  it('quit leaves active play for an end screen; new game starts fresh', () => {
    render(<App deckData={DECK} rng={identity} soundPlayer={mockPlayer()} />);
    tap(card('Bt'));
    tap(screen.getByTestId('foundation-0'));
    menu('menu-quit');
    expect(screen.getByTestId('quit-screen')).toBeTruthy();
    expect(screen.queryByTestId('tableau')).toBeNull();
    expect(screen.queryByText('Game Over - You Win!')).toBeNull();
    tap(screen.getByTestId('new-game'));
    expect(screen.queryByTestId('quit-screen')).toBeNull();
    expect(score()).toBe('Score: 0');
    expect(screen.getByTestId('foundation-0').dataset.empty).toBe('true');
  });
});
