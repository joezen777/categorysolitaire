import Box from '@mui/material/Box';
import type { Card } from '../deck';
import { useMetrics } from './metrics';
import { palette } from './theme';

interface CardViewProps {
  card: Card | null;
  faceUp: boolean;
  /** Number of items in the category (shown on title cards). */
  itemCount?: number;
  selected?: boolean;
  shake?: boolean;
  dimmed?: boolean;
  /** Draw a raised shadow (e.g. while dragging). */
  lifted?: boolean;
}

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;

/** Purely visual card. Interaction is added by the wrapping component. */
export function CardView({ card, faceUp, itemCount, selected, shake, dimmed, lifted }: CardViewProps) {
  const m = useMetrics();
  const isTitle = card?.role === 'title';
  const showFace = faceUp && card;

  return (
    <Box
      sx={{
        width: m.cardW,
        height: m.cardH,
        borderRadius: '8px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        opacity: dimmed ? 0.35 : 1,
        transform: selected ? 'translateY(-4px)' : undefined,
        transition: 'transform 120ms ease, opacity 120ms ease',
        animation: shake ? 'cs-shake 360ms ease' : undefined,
        boxShadow: lifted
          ? '0 12px 24px rgba(0,0,0,0.5)'
          : selected
            ? `0 0 0 3px ${palette.selected}, 0 6px 14px rgba(0,0,0,0.45)`
            : '0 1px 3px rgba(0,0,0,0.45)',
        outline: shake ? `3px solid ${palette.invalid}` : undefined,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' },
        ...(showFace
          ? isTitle
            ? { bgcolor: palette.titleFace, color: palette.titleText, border: `2px solid ${palette.titleAccent}` }
            : { bgcolor: palette.itemFace, color: palette.itemText, border: `1px solid ${palette.itemBorder}` }
          : {
              border: '2px solid #e8eef7',
              backgroundColor: palette.back,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.13) 0 4px, transparent 4px 10px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.1) 0 4px, transparent 4px 10px)',
            }),
      }}
    >
      {showFace && (
        <>
          <Box
            sx={{
              px: '5px',
              height: m.upOffset,
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: m.labelFont,
              fontWeight: 700,
              lineHeight: 1.1,
              borderBottom: isTitle ? `1px solid ${palette.titleAccent}` : '1px solid #e4dfd2',
              bgcolor: isTitle ? 'rgba(0,0,0,0.25)' : '#f3efe3',
            }}
          >
            {isTitle && (
              <Box component="span" aria-hidden sx={{ color: palette.titleAccent, flexShrink: 0 }}>
                ★
              </Box>
            )}
            <Box component="span" sx={ellipsis}>
              {card.label}
            </Box>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: `${m.upOffset}px 4px 4px 4px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '4px',
            }}
          >
            {isTitle && (
              <Box sx={{ fontSize: Math.max(9, m.labelFont - 1.5), letterSpacing: '0.08em', textTransform: 'uppercase', color: palette.titleAccent, fontWeight: 700 }}>
                Category
              </Box>
            )}
            <Box
              sx={{
                fontSize: m.faceFont,
                fontWeight: isTitle ? 800 : 600,
                lineHeight: 1.15,
                overflowWrap: 'anywhere',
                hyphens: 'auto',
              }}
            >
              {card.label}
            </Box>
            {isTitle && itemCount !== undefined && (
              <Box sx={{ fontSize: m.labelFont, fontWeight: 600 }}>{itemCount} cards</Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

/** Accessible description of a card for screen readers. */
export function describeCard(card: Card, itemCount?: number): string {
  return card.role === 'title' ? `${card.label} category title card, ${itemCount ?? '?'} items` : `${card.label} item card`;
}
