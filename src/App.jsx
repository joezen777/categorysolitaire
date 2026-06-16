import { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import ReplayIcon from "@mui/icons-material/Replay";
import TollIcon from "@mui/icons-material/Toll";
import { starterDeckItems } from "./data/starterDeck.js";
import CardView from "./components/CardView.jsx";
import CardStackOverlay from "./components/CardStackOverlay.jsx";
import EmptySlot from "./components/EmptySlot.jsx";
import FoundationSlot from "./components/FoundationSlot.jsx";
import GameMenu from "./components/GameMenu.jsx";
import TableauColumn from "./components/TableauColumn.jsx";
import WinModal from "./components/WinModal.jsx";
import { createTonePlayer } from "./game/audio.js";
import { createInitialGame } from "./game/state.js";
import {
  applyMove,
  canStartMove,
  completeFoundationSlot,
  dealFromSource,
  getMoveCards,
  isWon,
} from "./game/rules.js";

export default function App() {
  const [game, setGame] = useState(() => createInitialGame(starterDeckItems));
  const [selection, setSelection] = useState(null);
  const [activeDragSource, setActiveDragSource] = useState(null);
  const [invalidCardId, setInvalidCardId] = useState(null);
  const [muted, setMuted] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [won, setWon] = useState(false);
  const playToneRef = useRef(createTonePlayer());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 140, tolerance: 8 },
    }),
  );

  const activeCards = useMemo(
    () => getMoveCards(game, activeDragSource),
    [activeDragSource, game],
  );

  const playTone = (type) => playToneRef.current(type, muted);

  const restartGame = () => {
    setGame(createInitialGame(starterDeckItems));
    setSelection(null);
    setActiveDragSource(null);
    setInvalidCardId(null);
    setWon(false);
    setQuitOpen(false);
  };

  const dealOrRecycle = () => {
    setSelection(null);
    setGame((currentGame) => {
      const result = dealFromSource(currentGame);
      if (!result.ok) {
        playTone(result.tone);
        return currentGame;
      }

      return result.game;
    });
  };

  const handleInvalidMove = (currentGame, source, tone) => {
    const [card] = getMoveCards(currentGame, source);
    setInvalidCardId(card?.id || null);
    playTone(tone);
    window.setTimeout(() => setInvalidCardId(null), 420);
  };

  const finishCompletionIfNeeded = (result) => {
    if (!result.completedCategoryId) {
      setWon(isWon(result.game));
      return result.game;
    }

    playTone("success");
    window.setTimeout(() => {
      setGame((latestGame) => {
        const completedGame = completeFoundationSlot(
          latestGame,
          result.completedSlotIndex,
          result.completedCategoryId,
        );
        setWon(isWon(completedGame));
        return completedGame;
      });
    }, 900);

    return result.game;
  };

  const attemptMove = (source, destination) => {
    setGame((currentGame) => {
      const result = applyMove(currentGame, source, destination);
      if (!result.ok) {
        handleInvalidMove(currentGame, source, result.tone);
        setSelection(null);
        return currentGame;
      }

      setSelection(null);
      return finishCompletionIfNeeded(result);
    });
  };

  const handleCardTap = (source) => {
    if (selection) {
      if (
        selection.type === source.type &&
        selection.columnIndex === source.columnIndex &&
        selection.cardIndex === source.cardIndex
      ) {
        setSelection(null);
        return;
      }

      if (source.type === "tableau") {
        attemptMove(selection, {
          type: "tableau",
          columnIndex: source.columnIndex,
        });
        return;
      }
    }

    if (canStartMove(game, source)) {
      setSelection(source);
    } else {
      handleInvalidMove(game, source, "warning");
    }
  };

  const handleColumnTap = (columnIndex) => {
    if (!selection) {
      return;
    }

    attemptMove(selection, { type: "tableau", columnIndex });
  };

  const handleFoundationTap = (slotIndex) => {
    if (!selection) {
      return;
    }

    attemptMove(selection, { type: "foundation", slotIndex });
  };

  const handleDragStart = (event) => {
    const source = event.active.data.current?.source;
    if (!source || !canStartMove(game, source)) {
      return;
    }

    setSelection(null);
    setActiveDragSource(source);
  };

  const handleDragEnd = (event) => {
    const source = event.active.data.current?.source;
    const destination = event.over?.data.current?.destination;
    setActiveDragSource(null);

    if (!source || !destination) {
      if (source) {
        handleInvalidMove(game, source, "warning");
      }
      return;
    }

    attemptMove(source, destination);
  };

  const handleDragCancel = () => {
    setActiveDragSource(null);
  };

  const draftTop = game.draft.at(-1);
  const selectedCards = getMoveCards(game, selection);

  return (
    <Box className="app-shell">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Paper className="game-surface" elevation={0}>
          <Box className="top-bar">
            <Chip
              className="score-chip"
              icon={<TollIcon />}
              label={`Score ${game.score}`}
              color="primary"
            />
            <Box className="game-title">
              <Typography component="h1">Category Solitaire</Typography>
              <Typography component="p">
                {game.clearedCategoryIds.length}/{game.categories.length} categories cleared
              </Typography>
            </Box>
            <GameMenu
              muted={muted}
              onRestart={restartGame}
              onQuit={() => setQuitOpen(true)}
              onToggleMute={() => setMuted((value) => !value)}
            />
          </Box>

          <Box className="stock-row">
            <Box className="pile-wrap">
              <Typography className="pile-label">Source</Typography>
              {game.source.length > 0 ? (
                <Box onClick={dealOrRecycle} className="pile-button">
                  <CardView
                    card={{
                      id: "stock-back",
                      faceUp: false,
                    }}
                  />
                  <Chip className="pile-count" label={game.source.length} size="small" />
                </Box>
              ) : (
                <EmptySlot
                  label={game.draft.length ? "Recycle" : "Empty"}
                  active={game.draft.length > 0}
                  onClick={dealOrRecycle}
                  className="stock-empty"
                />
              )}
            </Box>

            <Box className="pile-wrap">
              <Typography className="pile-label">Draft</Typography>
              {draftTop ? (
                <Box className="draft-stack">
                  {game.draft.slice(-3).map((card, visibleIndex, visibleCards) => {
                    const isTop = visibleIndex === visibleCards.length - 1;
                    return (
                      <CardView
                        key={card.id}
                        card={card}
                        source={isTop ? { type: "draft" } : null}
                        draggable={isTop}
                        selected={selection?.type === "draft"}
                        ghost={activeDragSource?.type === "draft" && isTop}
                        shaking={invalidCardId === card.id}
                        compact={!isTop}
                        style={{
                          left: visibleIndex * 12,
                          top: visibleIndex * 4,
                          zIndex: visibleIndex,
                        }}
                        onTap={isTop ? () => handleCardTap({ type: "draft" }) : undefined}
                      />
                    );
                  })}
                  <Chip className="pile-count draft-count" label={game.draft.length} size="small" />
                </Box>
              ) : (
                <EmptySlot label="Draft" active={selectedCards.length > 0} />
              )}
            </Box>
          </Box>

          <Box className="foundation-row" aria-label="Foundation">
            {game.foundations.map((foundation, index) => (
              <FoundationSlot
                key={`foundation-${index}`}
                foundation={foundation}
                index={index}
                hasSelection={Boolean(selection)}
                onTap={() => handleFoundationTap(index)}
              />
            ))}
          </Box>

          <Box className="tableau-row" aria-label="Tableau">
            {game.tableau.map((column, index) => (
              <TableauColumn
                key={`tableau-${index}`}
                game={game}
                column={column}
                columnIndex={index}
                selection={selection}
                activeDragSource={activeDragSource}
                invalidCardId={invalidCardId}
                onCardTap={handleCardTap}
                onColumnTap={handleColumnTap}
              />
            ))}
          </Box>
        </Paper>

        <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
          <CardStackOverlay cards={activeCards} />
        </DragOverlay>
      </DndContext>

      <WinModal open={won} score={game.score} onRestart={restartGame} />

      <Dialog open={quitOpen} onClose={() => setQuitOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Quit game?</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            <Typography>
              Your current score is {game.score}. Starting again will reshuffle the deck.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuitOpen(false)}>Resume</Button>
          <Button variant="contained" startIcon={<ReplayIcon />} onClick={restartGame}>
            New game
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
