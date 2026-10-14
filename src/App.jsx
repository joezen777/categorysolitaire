import { useState } from 'react';
import Board from './components/Board';
import { cards } from './deck';
import { dealGame } from './game/deal';
import { drawCard, recycleDraft } from './game/draw';

export default function App() {
  const [game, setGame] = useState(() => dealGame(cards));
  return (
    <Board
      game={game}
      onDraw={() => setGame(drawCard)}
      onRecycle={() => setGame(recycleDraft)}
    />
  );
}
