import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useDraggable } from "@dnd-kit/core";
import ClassIcon from "@mui/icons-material/Class";
import StyleIcon from "@mui/icons-material/Style";

export default function CardView({
  card,
  source,
  selected = false,
  draggable = false,
  ghost = false,
  shaking = false,
  compact = false,
  style,
  onTap,
}) {
  const dragId = useMemo(() => {
    if (!source) {
      return undefined;
    }

    if (source.type === "draft") {
      return "draft:top";
    }

    return `tableau:${source.columnIndex}:${source.cardIndex}:${card.id}`;
  }, [card.id, source]);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId || `static:${card.id}`,
    data: { source },
    disabled: !draggable,
  });

  const dragStyle =
    transform && draggable
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

  if (!card.faceUp) {
    return (
      <Box
        ref={setNodeRef}
        className={`playing-card card-back ${compact ? "card-compact" : ""} ${
          shaking ? "shake" : ""
        }`}
        style={{ ...style, ...dragStyle }}
        aria-label="Face down card"
        {...attributes}
        {...listeners}
      >
        <Box className="back-pattern" />
        <Typography className="card-back-title">Category</Typography>
        <Typography className="card-back-mark">Solitaire</Typography>
      </Box>
    );
  }

  const isTitle = card.type === "title";

  return (
    <Box
      ref={setNodeRef}
      className={`playing-card card-face ${isTitle ? "title-card" : "item-card"} ${
        compact ? "card-compact" : ""
      } ${selected ? "selected" : ""} ${ghost || isDragging ? "ghost-card" : ""} ${
        shaking ? "shake" : ""
      }`}
      style={{
        ...style,
        ...dragStyle,
        "--category-color": card.color,
      }}
      role="button"
      tabIndex={0}
      aria-label={`${card.categoryTitle} ${isTitle ? "category title" : card.itemName}`}
      onClick={(event) => {
        event.stopPropagation();
        onTap?.();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap?.();
        }
      }}
      {...attributes}
      {...listeners}
    >
      <Box className="card-stripe" />
      <Box className="card-kicker">
        {isTitle ? <ClassIcon fontSize="inherit" /> : <StyleIcon fontSize="inherit" />}
        <Typography component="span">{card.categoryTitle}</Typography>
      </Box>
      <Box className="card-body">
        <Typography className="card-main-text">
          {isTitle ? card.categoryTitle : card.itemName}
        </Typography>
        <Typography className="card-sub-text">
          {isTitle ? `${card.totalItems} item cards` : "Category item"}
        </Typography>
      </Box>
    </Box>
  );
}
