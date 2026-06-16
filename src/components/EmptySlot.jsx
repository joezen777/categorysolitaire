import { Box, Typography } from "@mui/material";

export default function EmptySlot({ label, active = false, onClick, className = "" }) {
  return (
    <Box
      className={`empty-slot ${active ? "empty-slot-active" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <Typography>{label}</Typography>
    </Box>
  );
}
