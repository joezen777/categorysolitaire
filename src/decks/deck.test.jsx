import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import starterDeck from './starterDeck.json';
import { buildDeck, validateDeckData, CARD_KIND } from './deck.js';
import Card from '../components/Card.jsx';

function renderDeck(data) {
  const { cards } = buildDeck(data);
  return render(<div>{cards.map((c) => <Card key={c.id} card={c} />)}</div>);
}

const EXPECTED = [
  ['King', ['Scepter', 'Orb', 'Throne']],
  ['Chimera', ['Goat', 'Lion', 'Snake']],
  ['Ceramic', ['Vase', 'Mug', 'Plate', 'Tile', 'Bowl']],
  ['Jupiter', ['Io', 'Ganymedes', 'Callisto', 'Europa']],
  ['Think', ['Consider', 'Suppose', 'Imagine', 'Ponder', 'Suggestion']],
  ['Smell', ['Nose', 'Odor', 'Perfume', 'Bouquet', 'Aroma', 'Scent']],
  ['Winds', ['Vendavel', 'Mistral', 'Bora', 'Breeze', 'Piteraq', 'Chinook', 'Zephyr', 'Sirocco']],
  ['Refuge', ['Den', 'Hideout', 'Hideaway', 'Safety', 'Lair', 'Security', 'Shelter']],
  ['Beds', ['Bunk', 'Crib', 'Cradle', 'Berth', 'Sofa bed', 'Futon', 'Cot', 'Hammock']],
  ['Wine', ['Riesling', 'Prosecco', 'Merlot', 'Cabernet', 'Rose', 'Cava']],
  ['Neck', ['Bowtie', 'Dress Shirt', 'Scarf', 'Tie']],
  ['Pirate', ['Rum', 'Pegleg', 'Treasure', 'Cannon', 'Cutlass', 'Parrot']],
  ['Aviation', ['Jet', 'Runway', 'Flight', 'Airport', 'Pilot', 'Fuselage', 'Airline', 'Airship']],
];

afterEach(cleanup);

describe('starter deck data', () => {
  it('uses only id, categoryTitle and itemName fields', () => {
    for (const entry of starterDeck) {
      expect(Object.keys(entry).sort()).toEqual(['categoryTitle', 'id', 'itemName']);
    }
  });

  it('has 13 titles, 73 items, 86 unique ids', () => {
    const { cards } = buildDeck(starterDeck);
    expect(cards).toHaveLength(86);
    expect(cards.filter((c) => c.kind === CARD_KIND.TITLE)).toHaveLength(13);
    expect(cards.filter((c) => c.kind === CARD_KIND.ITEM)).toHaveLength(73);
    expect(new Set(cards.map((c) => c.id)).size).toBe(86);
  });

  it('matches the exact starter categories and spellings', () => {
    const { cards, categories } = buildDeck(starterDeck);
    expect(Object.keys(categories)).toEqual(EXPECTED.map(([t]) => t));
    for (const [title, items] of EXPECTED) {
      expect(categories[title]).toBe(items.length);
      expect(cards.filter((c) => c.kind === CARD_KIND.ITEM && c.categoryTitle === title).map((c) => c.itemName)).toEqual(items);
      expect(cards.find((c) => c.kind === CARD_KIND.TITLE && c.categoryTitle === title).itemCount).toBe(items.length);
    }
  });

  it('rejects malformed decks', () => {
    expect(() => validateDeckData([{ id: 'a', categoryTitle: 'X', itemName: 'y' }])).toThrow(/no title/);
    expect(() => validateDeckData([{ id: 'a', categoryTitle: 'X', itemName: null }])).toThrow(/no items/);
    expect(() =>
      validateDeckData([
        { id: 'a', categoryTitle: 'X', itemName: null },
        { id: 'a', categoryTitle: 'X', itemName: 'y' },
      ]),
    ).toThrow(/Duplicate card id/);
  });
});

describe('deck rendering', () => {
  it('displays title counts that agree with the data', () => {
    renderDeck(starterDeck);
    const titles = screen.getAllByTestId('title-card');
    expect(titles).toHaveLength(13);
    expect(screen.getAllByTestId('item-card')).toHaveLength(73);
    for (const [title, items] of EXPECTED) {
      const el = titles.find((t) => t.textContent.startsWith(title));
      expect(el.textContent).toBe(`${title}${items.length} cards`);
    }
  });

  it('renders an alternate deck without code changes', () => {
    const alt = [
      { id: 't', categoryTitle: 'Fruit', itemName: null },
      { id: 'a', categoryTitle: 'Fruit', itemName: 'Apple' },
      { id: 'b', categoryTitle: 'Fruit', itemName: 'Banana' },
    ];
    renderDeck(alt);
    expect(screen.getByTestId('title-card').textContent).toBe('Fruit2 cards');
    expect(screen.getAllByTestId('item-card').map((e) => e.textContent)).toEqual(['Apple', 'Banana']);
  });
});
