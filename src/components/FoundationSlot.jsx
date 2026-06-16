import { Box, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import CardView from "./CardView.jsx";
import EmptySlot from "./EmptySlot.jsx";

export default function FoundationSlot({
  foundation,
  index,
  hasSelection,
  onTap,
  isOverInvalid,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `foundation:${index}`,
    data: { destination: { type: "foundation", slotIndex: index } },
  });

  const topCard = foundation?.cards.at(-1);

  return (
    <Box
      ref={setNodeRef}
      className={`foundation-slot ${isOver ? "drop-hover" : ""} ${
        isOverInvalid ? "drop-denied" : ""
      } ${foundation?.completing ? "glitter-complete" : ""}`}
      onClick={onTap}
    >
      <Box className="foundation-counter">
        <Typography>
          {foundation ? `${foundation.categoryTitle} ${foundation.itemCount}/${foundation.totalItems}` : "Open"}
        </Typography>
      </Box>
      {topCard ? (
        <CardView card={topCard} compact onTap={hasSelection ? onTap : undefined} />
      ) : (
        <EmptySlot label="Foundation" active={hasSelection} />
      )}
    </Box>
  );
}
