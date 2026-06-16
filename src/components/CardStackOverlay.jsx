import { Box } from "@mui/material";
import CardView from "./CardView.jsx";

export default function CardStackOverlay({ cards }) {
  if (!cards?.length) {
    return null;
  }

  return (
    <Box className="drag-overlay-stack">
      {cards.map((card, index) => (
        <CardView
          key={card.id}
          card={card}
          compact={cards.length > 1}
          style={{ top: index * 28 }}
        />
      ))}
    </Box>
  );
}
