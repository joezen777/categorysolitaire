// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { cards, CARD_TYPE } from './deck';
import * as deal from './game/deal';

// Fake Web Audio: counts oscillators started, so we can tell whether a sound played.
let started;
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; }
  createOscillator() {
    return {
      type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {}, start() { started += 1; }, stop() {},
    };
  }
  createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
}

beforeEach(() => {
  started = 0;
  globalThis.AudioContext = FakeAudioContext;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete globalThis.AudioContext;
});

const item = (cat, name) => ({ type: 'item', id: `${cat}-${name}`, categoryTitle: cat, itemName: name });
const title = (cat, n) => ({ type: 'title', id: `title:${cat}`, categoryTitle: cat, itemCount: n });
const fresh = () => ({
  tableau: [[item('King', 'Throne')], [title('Wine', 1)], [title('King', 1)], [item('Wine', 'Rose')], []],
  faceUpCounts: [1, 1, 1, 1, 0],
  source: [item('Ceramic', 'Vase')], draft: [], foundations: [[], [], [], [], []], score: 0, cleared: [],
});
const column = (i) => screen.getAllByTestId('tableau-column')[i];
const click = (el) => fireEvent.click(el);
const cardIn = (el, text) => [...el.querySelectorAll('[data-testid="card-face"]')].find((n) => n.textContent.includes(text));
const slot0 = () => screen.getAllByTestId('foundation')[0];
const openMenu = () => click(screen.getByTestId('menu-button'));

describe('sound', () => {
  it('plays on illegal moves and on completion, and mute suppresses everything', () => {
    vi.spyOn(deal, 'dealGame').mockReturnValue(fresh());
    render(<App />);
    click(cardIn(column(3), 'Rose')); // item, illegal onto a title column
    click(column(2));
    expect(started).toBe(2); // warning beeps
    started = 0;
    click(cardIn(column(2), 'King')); // title cannot go onto a title
    click(column(1));
    expect(started).toBe(1); // error buzz
    started = 0;
    click(cardIn(column(2), 'King')); click(slot0());
    click(cardIn(column(0), 'Throne')); click(slot0()); // completes King
    expect(screen.getByTestId('score').textContent).toBe('Score: 100');
    expect(started).toBe(5); // success arpeggio

    openMenu();
    click(screen.getByText('Turn sound off'));
    started = 0;
    click(cardIn(column(3), 'Rose')); click(column(1)); // illegal while muted
    expect(screen.getByTestId('illegal-move')).toBeTruthy();
    expect(started).toBe(0);
  });
});

describe('menu', () => {
  it('restart deals a fresh game with score zero', () => {
    vi.spyOn(deal, 'dealGame').mockReturnValueOnce(fresh()).mockImplementation((c) => ({
      ...fresh(), score: 0, source: c.slice(0, 3),
    }));
    render(<App />);
    click(cardIn(column(2), 'King')); click(slot0());
    click(cardIn(column(0), 'Throne')); click(slot0());
    expect(screen.getByTestId('score').textContent).toBe('Score: 100');
    openMenu();
    click(screen.getByText('Restart'));
    expect(screen.getByTestId('score').textContent).toBe('Score: 0');
    expect(screen.getByTestId('source').dataset.count).toBe('3');
    expect(slot0().dataset.count).toBe('0');
  });

  it('quit ends active play and offers a new game', () => {
    vi.spyOn(deal, 'dealGame').mockReturnValue(fresh());
    render(<App />);
    openMenu();
    click(screen.getByText('Quit'));
    expect(screen.getByTestId('quit-screen')).toBeTruthy();
    expect(screen.queryByTestId('tableau')).toBeNull();
    click(screen.getByText('Start New Game'));
    expect(screen.getByTestId('tableau')).toBeTruthy();
    expect(screen.getByTestId('score').textContent).toBe('Score: 0');
  });
});

describe('win modal', () => {
  it('appears only when everything is cleared, shows the score, and Play Again resets', async () => {
    // Only King (1 item) remains; the other 85 cards are already cleared.
    const titleCards = cards.filter((c) => c.type === CARD_TYPE.TITLE);
    const rest = cards.filter((c) => c.id !== 'title:King' && c.id !== 'king-3');
    const g = {
      tableau: [[item('King', 'Throne')], [], [title('King', 1)], [], []],
      faceUpCounts: [1, 0, 1, 0, 0], source: [], draft: [], foundations: [[], [], [], [], []],
      score: 1200, cleared: rest,
    };
    expect(titleCards).toHaveLength(13);
    vi.spyOn(deal, 'dealGame').mockReturnValueOnce(g).mockReturnValue(fresh());
    render(<App />);
    expect(screen.queryByText('Game Over - You Win!')).toBeNull();
    click(cardIn(column(2), 'King')); click(slot0());
    expect(screen.queryByText('Game Over - You Win!')).toBeNull(); // title alone is not a win
    click(cardIn(column(0), 'Throne')); click(slot0());
    expect(screen.getByText('Game Over - You Win!')).toBeTruthy();
    expect(screen.getByTestId('final-score').textContent).toBe('Final score: 1300');
    click(screen.getByText('Play Again'));
    await waitFor(() => expect(screen.queryByText('Game Over - You Win!')).toBeNull()); // dialog exit transition
    expect(screen.getByTestId('score').textContent).toBe('Score: 0');
  });
});
