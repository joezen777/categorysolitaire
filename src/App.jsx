import { useState } from 'react';
import Board from './components/Board';
import { cards } from './deck';
import { dealGame } from './game/deal';

export default function App() {
  const [game] = useState(() => dealGame(cards));
  return <Board game={game} />;
}
