import { Box } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import CardView from "./CardView.jsx";
import EmptySlot from "./EmptySlot.jsx";
import { canStartMove } from "../game/rules.js";

const STACK_GAP = 31;

export default function TableauColumn({
  game,
  column,
  columnIndex,
  selection,
  activeDragSource,
  invalidCardId,
  onCardTap,
  onColumnTap,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tableau:${columnIndex}`,
    data: { destination: { type: "tableau", columnIndex } },
  });
  const activeFromColumn =
    activeDragSource?.type === "tableau" && activeDragSource.columnIndex === columnIndex;
  const columnHeight = Math.max(164, 148 + Math.max(column.length - 1, 0) * STACK_GAP);

  return (
    <Box
      ref={setNodeRef}
      className={`tableau-column ${isOver ? "drop-hover" : ""}`}
      onClick={() => onColumnTap(columnIndex)}
      style={{ minHeight: columnHeight }}
    >
      {column.length === 0 ? (
        <EmptySlot label="Column" active={Boolean(selection)} />
      ) : (
        column.map((card, cardIndex) => {
          const source = {
            type: "tableau",
            columnIndex,
            cardIndex,
          };
          const isSelected =
            selection?.type === "tableau" &&
            selection.columnIndex === columnIndex &&
            selection.cardIndex === cardIndex;
          const isGhost =
            activeFromColumn &&
            activeDragSource.cardIndex <= cardIndex &&
            card.faceUp;

          return (
            <CardView
              key={card.id}
              card={card}
              source={source}
              draggable={canStartMove(game, source)}
              selected={isSelected}
              ghost={isGhost}
              shaking={invalidCardId === card.id}
              style={{ top: cardIndex * STACK_GAP, zIndex: cardIndex + 1 }}
              onTap={() => onCardTap(source)}
            />
          );
        })
      )}
    </Box>
  );
}
