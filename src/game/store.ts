import { applyMove, drawCard, recycleWaste, type GameState, type MoveSource, type MoveTarget } from './engine';

export type FeedbackKind = 'error' | 'warning' | 'success' | 'info';

export interface Feedback {
  /** Monotonic id so repeated identical messages still trigger effects. */
  id: number;
  kind: FeedbackKind;
  message: string;
  /** Cards to flag as rejected (invalid-move shake). */
  rejectedIds?: string[];
  /** Present when a category was just completed (drives glitter). */
  completion?: { category: string; slot: number; cardIds: string[] };
}

export interface Store {
  /** Changes on every deal so effects from a previous game can be discarded. */
  gameId: number;
  game: GameState;
  status: 'playing' | 'quit';
  selected: MoveSource | null;
  feedback: Feedback | null;
}

export type Action =
  | { type: 'newGame'; game: GameState }
  | { type: 'quit' }
  | { type: 'stock' }
  | { type: 'select'; source: MoveSource | null }
  | { type: 'reject'; message: string; rejectedIds?: string[] }
  | { type: 'move'; source: MoveSource; target: MoveTarget };

export function initStore(game: GameState): Store {
  return { gameId: 1, game, status: 'playing', selected: null, feedback: null };
}

function feedback(store: Store, kind: FeedbackKind, message: string, extra: Partial<Feedback> = {}): Feedback {
  return { id: (store.feedback?.id ?? 0) + 1, kind, message, ...extra };
}

export function reducer(store: Store, action: Action): Store {
  if (action.type === 'newGame') {
    return { gameId: store.gameId + 1, game: action.game, status: 'playing', selected: null, feedback: feedback(store, 'info', 'New game dealt.') };
  }
  if (store.status !== 'playing') return store;

  switch (action.type) {
    case 'quit':
      return { ...store, status: 'quit', selected: null, feedback: feedback(store, 'info', 'Game ended.') };

    case 'stock': {
      const { game } = store;
      if (game.stock.length > 0) return { ...store, game: drawCard(game), selected: null };
      if (game.waste.length > 0) {
        return { ...store, game: recycleWaste(game), selected: null, feedback: feedback(store, 'info', 'Draft pile turned over into the source deck.') };
      }
      return { ...store, selected: null, feedback: feedback(store, 'info', 'No cards left to draw.') };
    }

    case 'select':
      return { ...store, selected: action.source };

    case 'reject':
      return { ...store, selected: null, feedback: feedback(store, 'error', action.message, { rejectedIds: action.rejectedIds }) };

    case 'move': {
      const result = applyMove(store.game, action.source, action.target);
      if (!result.ok) {
        const kind = action.target.kind === 'foundation' ? 'warning' : 'error';
        return { ...store, selected: null, feedback: feedback(store, kind, result.reason, { rejectedIds: [action.source.cardId] }) };
      }
      const { state, completedCategory, movedIds } = result;
      if (completedCategory && action.target.kind === 'foundation') {
        const slotCards = [...store.game.foundations[action.target.slot].cardIds, ...movedIds];
        return {
          ...store,
          game: state,
          selected: null,
          feedback: feedback(store, 'success', `${completedCategory} complete! +100 points.`, {
            completion: { category: completedCategory, slot: action.target.slot, cardIds: slotCards },
          }),
        };
      }
      return { ...store, game: state, selected: null };
    }
  }
}
