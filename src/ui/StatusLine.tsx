import Box from '@mui/material/Box';
import type { Feedback } from '../game/store';
import { palette } from './theme';

const ICONS: Record<Feedback['kind'], string> = { error: '✕', warning: '⚠', success: '✓', info: 'ℹ' };
const COLORS: Record<Feedback['kind'], string> = {
  error: palette.invalid,
  warning: '#ffb74d',
  success: palette.legal,
  info: '#ffffff',
};

/** Visible, screen-reader-announced line describing the latest event or selection. */
export function StatusLine({ feedback, selectionText }: { feedback: Feedback | null; selectionText: string | null }) {
  const kind = selectionText ? 'info' : (feedback?.kind ?? 'info');
  const text = selectionText ?? feedback?.message ?? 'Tap a face-up card, then tap where it should go — or drag it.';
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        minHeight: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.5,
        my: 1,
        borderRadius: 1,
        bgcolor: 'rgba(0,0,0,0.3)',
        borderLeft: `4px solid ${COLORS[kind]}`,
        fontSize: 14,
      }}
    >
      <Box component="span" aria-hidden sx={{ color: COLORS[kind], fontWeight: 800 }}>
        {ICONS[kind]}
      </Box>
      <span>{text}</span>
    </Box>
  );
}
