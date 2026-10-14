// @vitest-environment jsdom
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import * as deal from './game/deal';

let dnd;
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    DndContext: (props) => {
      dnd = props;
      return createElement(actual.DndContext, props);
    },
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const item = (cat, name) => ({ type: 'item', id: `${cat}-${name}`, categoryTitle: cat, itemName: name });
const makeGame = () => ({
  tableau: [[item('Wine', 'Merlot'), item('Wine', 'Rose')], [item('Wine', 'Cava')], [item('Beds', 'Cot'), item('Pirate', 'Rum')], [], []],
  faceUpCounts: [2, 1, 1, 0, 0],
  source: [],
  draft: [],
  foundations: [[], [], [], [], []],
  score: 0,
  cleared: [],
});
const counts = () => screen.getAllByTestId('tableau-column').map((c) => c.dataset.count);
const drop = (from, to) => {
  const event = { active: { data: { current: { from } }, rect: { current: { initial: { width: 70 } } } }, over: to ? { data: { current: { to } } } : null };
  act(() => dnd.onDragStart(event));
  act(() => dnd.onDragEnd(event));
};
const col = (c) => ({ type: 'tableau', col: c });

describe('drag and drop uses the same rules as tapping', () => {
  it('moves a stack as a unit, and rejects invalid drops leaving state unchanged', () => {
    vi.spyOn(deal, 'dealGame').mockReturnValue(makeGame());
    render(<App />);
    drop({ type: 'tableau', col: 2, index: 1 }, col(1)); // Rum onto Wine
    expect(screen.getByTestId('illegal-move')).toBeTruthy();
    expect(counts()).toEqual(['2', '1', '2', '0', '0']);
    drop({ type: 'tableau', col: 2, index: 0 }, col(3)); // face-down Cot
    expect(counts()).toEqual(['2', '1', '2', '0', '0']);
    drop({ type: 'tableau', col: 0, index: 0 }, null); // dropped on nothing
    expect(counts()).toEqual(['2', '1', '2', '0', '0']);
    drop({ type: 'tableau', col: 0, index: 0 }, { type: 'foundation', slot: 0 }); // stack to foundation
    expect(counts()).toEqual(['2', '1', '2', '0', '0']);
    drop({ type: 'tableau', col: 0, index: 0 }, col(1)); // Merlot+Rose onto Cava
    expect(counts()).toEqual(['0', '3', '2', '0', '0']);
  });

  it('only legal sources are draggable and covered labels stay in absolutely-positioned stacks', () => {
    vi.spyOn(deal, 'dealGame').mockReturnValue(makeGame());
    render(<App />);
    const cards = [...screen.getAllByTestId('tableau-column')[0].querySelectorAll('[data-testid="tableau-card"]')];
    expect(cards.map((c) => c.getAttribute('aria-roledescription'))).toEqual(['draggable', 'draggable']);
    const cot = screen.getAllByTestId('tableau-column')[2].querySelectorAll('[data-testid="tableau-card"]')[0];
    expect(cot.getAttribute('aria-roledescription')).toBeNull(); // face-down: not draggable
    expect(cards[0].textContent).toContain('Merlot'); // covered label still rendered
    fireEvent.click(cot);
    expect(screen.getByTestId('illegal-move')).toBeTruthy();
  });
});
