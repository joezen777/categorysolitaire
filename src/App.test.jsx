// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';

afterEach(cleanup);
const count = (id) => Number(screen.getByTestId(id).dataset.count);

describe('source/draft UI', () => {
  it('draws one card per click, shows empty source slot, and recycles', () => {
    render(<App />);
    expect([count('source'), count('draft')]).toEqual([56, 0]);
    expect(screen.queryByTestId('draft').querySelector('[data-testid="card-face"]')).toBeNull();

    fireEvent.click(screen.getByTestId('source'));
    expect([count('source'), count('draft')]).toEqual([55, 1]);
    fireEvent.click(screen.getByTestId('source'));
    expect([count('source'), count('draft')]).toEqual([54, 2]);

    for (let i = 0; i < 54; i++) fireEvent.click(screen.getByTestId('source'));
    expect([count('source'), count('draft')]).toEqual([0, 56]);
    expect(screen.getByTestId('source').querySelector('[data-testid="card-back"]')).toBeNull();

    fireEvent.click(screen.getByTestId('source'));
    expect([count('source'), count('draft')]).toEqual([56, 0]);
    expect(screen.getByTestId('source').querySelector('[data-testid="card-back"]')).not.toBeNull();
  });
});
