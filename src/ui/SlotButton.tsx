import ButtonBase from '@mui/material/ButtonBase';
import type { ReactNode } from 'react';
import { useMetrics } from './metrics';
import { palette } from './theme';

interface SlotButtonProps {
  label: string;
  onClick: () => void;
  children?: ReactNode;
  disabled?: boolean;
}

/** An empty card-sized placeholder that is still an activatable control. */
export function SlotButton({ label, onClick, children, disabled }: SlotButtonProps) {
  const m = useMetrics();
  return (
    <ButtonBase
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      sx={{
        width: m.cardW,
        height: m.cardH,
        borderRadius: '8px',
        border: `2px dashed ${palette.slotBorder}`,
        color: 'rgba(255,255,255,0.8)',
        fontSize: m.labelFont,
        fontWeight: 600,
        textAlign: 'center',
        p: '4px',
        bgcolor: 'rgba(0,0,0,0.15)',
        '&.Mui-focusVisible, &:focus-visible': { outline: `3px solid ${palette.titleText}`, outlineOffset: '2px' },
      }}
    >
      {children}
    </ButtonBase>
  );
}
