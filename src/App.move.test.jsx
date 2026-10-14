// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import * as deal from './game/deal';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const item = (cat, name) => ({ type: 'item', id: `${cat}-${name}`, categoryTitle: cat, itemName: name });
const title = (cat, n) => ({ type: 'title', id: `title:${cat}`, categoryTitle: cat, itemCount: n });

function setup(game) {
  vi.spyOn(deal, 'dealGame').mockReturnValue(game);
  return render(<App />);
}
const column = (i) => screen.getAllByTestId('tableau-column')[i];
const cardIn = (el, text) => [...el.querySelectorAll('[data-testid="card-face"]')].find((n) => n.textContent.includes(text));

describe('click-to-move', () => {
  const game = () => ({
    tableau: [[item('Pirate', 'Rum'), item('Wine', 'Merlot')], [item('Wine', 'Cava')], [title('Wine', 6)], [], []],
    faceUpCounts: [1, 1, 1, 0, 0],
    source: [],
    draft: [item('King', 'Orb'), item('Wine', 'Rose')],
    foundations: [[], [], [], [], []],
    score: 0,
  });

  it('moves a valid card, reveals the vacated bottom, and rejects illegal moves without change', () => {
    setup(game());
    // illegal: Wine item onto a title
    fireEvent.click(cardIn(column(0), 'Merlot'));
    fireEvent.click(cardIn(column(2), 'Wine'));
    expect(screen.getByTestId('illegal-move')).toBeTruthy();
    expect(column(0).dataset.count).toBe('2');
    expect(cardIn(column(0), 'Rum')).toBeUndefined();

    // legal: Merlot onto Cava, reveals Rum
    fireEvent.click(cardIn(column(0), 'Merlot'));
    fireEvent.click(cardIn(column(1), 'Cava'));
    expect(column(1).dataset.count).toBe('2');
    expect(cardIn(column(0), 'Rum')).toBeDefined();

    // title to a foundation, then the draft's top (Wine Rose) to that slot
    fireEvent.click(cardIn(column(2), 'Wine'));
    fireEvent.click(screen.getAllByTestId('foundation')[0]);
    expect(screen.getAllByTestId('foundation')[0].dataset.count).toBe('1');
    fireEvent.click(cardIn(screen.getByTestId('draft'), 'Rose'));
    fireEvent.click(screen.getAllByTestId('foundation')[0]);
    expect(screen.getAllByTestId('foundation-progress')[0].textContent).toBe('Wine 1/6');
    // next draft top exposed
    expect(cardIn(screen.getByTestId('draft'), 'Orb')).toBeDefined();
  });

  it('moves a same-category stack together onto an empty column', () => {
    const g = game();
    g.tableau[0] = [item('Wine', 'Merlot'), item('Wine', 'Rose')];
    g.faceUpCounts[0] = 2;
    setup(g);
    fireEvent.click(cardIn(column(0), 'Merlot'));
    fireEvent.click(column(3));
    expect(column(3).dataset.count).toBe('2');
    expect(column(0).dataset.count).toBe('0');
  });
});

describe('category completion in the UI', () => {
  it('clears a finished category with glitter, scores 100 each, and reuses the slot', () => {
    setup({
      tableau: [[item('King', 'Throne')], [title('Wine', 1)], [title('King', 1)], [item('Wine', 'Rose')], []],
      faceUpCounts: [1, 1, 1, 1, 0],
      source: [],
      draft: [],
      foundations: [[], [], [], [], []],
      score: 0,
      cleared: [],
    });
    const slot0 = () => screen.getAllByTestId('foundation')[0];
    const progress = () => screen.getAllByTestId('foundation-progress')[0].textContent;

    fireEvent.click(cardIn(column(2), 'King')); // King title (1 item) to slot 0
    fireEvent.click(slot0());
    expect(progress()).toBe('King 0/1');
    expect(screen.getByTestId('score').textContent).toBe('Score: 0');

    // wrong-category item is rejected: no progress, no score
    fireEvent.click(cardIn(column(3), 'Rose'));
    fireEvent.click(slot0());
    expect(screen.getByTestId('illegal-move')).toBeTruthy();
    expect(progress()).toBe('King 0/1');
    expect(screen.getByTestId('score').textContent).toBe('Score: 0');

    fireEvent.click(cardIn(column(0), 'Throne'));
    fireEvent.click(slot0());
    expect(screen.getByTestId('score').textContent).toBe('Score: 100');
    expect(slot0().dataset.count).toBe('0');
    expect(screen.getByTestId('glitter')).toBeTruthy();

    // reuse slot 0 for Wine
    fireEvent.click(cardIn(column(1), 'Wine'));
    fireEvent.click(slot0());
    expect(progress()).toBe('Wine 0/1');
    fireEvent.click(cardIn(column(3), 'Rose'));
    fireEvent.click(slot0());
    expect(screen.getByTestId('score').textContent).toBe('Score: 200');
    expect(slot0().dataset.count).toBe('0');
  });
});
