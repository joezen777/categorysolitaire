import { forwardRef } from 'react';
import { Box } from '@mui/material';

const baseSx = {
  position: 'relative',
  boxSizing: 'border-box',
  width: 'var(--card-w)',
  height: 'var(--card-h)',
  borderRadius: 'var(--card-radius)',
  padding: 0,
  margin: 0,
  font: 'inherit',
  overflow: 'hidden',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  boxShadow: '0 1px 3px rgba(0,0,0,0.55)',
  '&:focus-visible': { outline: '3px solid #fff', outlineOffset: '2px', zIndex: 30 },
};

const backSx = {
  border: '2px solid #e3f2fd',
  background:
    'repeating-linear-gradient(45deg, #1a3c8f 0 6px, #274fb5 6px 12px)',
  '&::after': {
    content: '"✦"',
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    color: '#e3f2fd',
    fontSize: 'calc(var(--card-w) * 0.35)',
    opacity: 0.8,
  },
};

const frontSx = (role) => ({
  border: role === 'title' ? '2px solid #ffd54f' : '1px solid #8a8a8a',
  background: role === 'title' ? '#283593' : '#fffdf7',
  color: role === 'title' ? '#fff' : '#1b1b1d',
  textAlign: 'center',
  cursor: 'pointer',
  // <button> centres content vertically by default; peeking labels must sit at the top.
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
});

function Face({ card, categoryTotal, peek }) {
  const isTitle = card.role === 'title';
  if (peek) {
    return (
      <Box
        component="span"
        sx={{
          display: 'block',
          px: '3px',
          pt: '3px',
          fontSize: 'calc(var(--card-w) * 0.15)',
          lineHeight: 1.25,
          fontWeight: isTitle ? 700 : 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {card.label}
      </Box>
    );
  }
  return (
    <Box
      component="span"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
        height: '100%',
        px: '3px',
        overflowWrap: 'break-word',
        hyphens: 'auto',
      }}
    >
      {isTitle && (
        <Box component="span" sx={{ fontSize: 'calc(var(--card-w) * 0.12)', letterSpacing: 0.6, opacity: 0.85 }}>
          CATEGORY
        </Box>
      )}
      <Box
        component="span"
        sx={{
          fontSize: 'calc(var(--card-w) * 0.165)',
          lineHeight: 1.15,
          fontWeight: isTitle ? 800 : 600,
        }}
      >
        {card.label}
      </Box>
      {isTitle && (
        <Box component="span" sx={{ fontSize: 'calc(var(--card-w) * 0.14)' }}>
          {categoryTotal} cards
        </Box>
      )}
    </Box>
  );
}

/**
 * A single card. Face-down cards render the generic back and are never
 * interactive. `onActivate` makes a face-up card a semantic button.
 */
export const Card = forwardRef(function Card(
  {
    card,
    categoryTotal,
    faceUp = true,
    peek = false,
    selected = false,
    ghost = false,
    interactive = false,
    sx,
    style,
    ...rest
  },
  ref,
) {
  if (!faceUp) {
    return (
      <Box
        ref={ref}
        component={interactive ? 'button' : 'div'}
        type={interactive ? 'button' : undefined}
        aria-hidden={interactive ? undefined : 'true'}
        sx={{ ...baseSx, ...backSx, cursor: interactive ? 'pointer' : 'default', ...sx }}
        style={style}
        {...rest}
      />
    );
  }
  const label = card.role === 'title' ? `${card.label} category, ${categoryTotal} cards` : card.label;
  return (
    <Box
      ref={ref}
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      aria-label={interactive ? label : undefined}
      aria-pressed={interactive ? selected : undefined}
      title={card.label}
      sx={{
        ...baseSx,
        ...frontSx(card.role),
        opacity: ghost ? 0.35 : 1,
        ...(selected && {
          outline: '3px solid #ff9800',
          outlineOffset: '1px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
          zIndex: 20,
        }),
        ...sx,
      }}
      style={style}
      {...rest}
    >
      <Face card={card} categoryTotal={categoryTotal} peek={peek} />
    </Box>
  );
});

/** Empty card-shaped placeholder; becomes a button when `onClick` is given. */
export const Slot = forwardRef(function Slot(
  { label, legal = false, shake = false, children, sx, onClick, ...rest },
  ref,
) {
  const interactive = Boolean(onClick);
  return (
    <Box
      ref={ref}
      component={interactive ? 'button' : 'div'}
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      aria-label={label}
      sx={{
        ...baseSx,
        boxShadow: 'none',
        border: '2px dashed rgba(255,255,255,0.45)',
        background: 'rgba(0,0,0,0.18)',
        color: 'rgba(255,255,255,0.75)',
        cursor: interactive ? 'pointer' : 'default',
        display: 'grid',
        placeItems: 'center',
        fontSize: 'calc(var(--card-w) * 0.13)',
        overflow: 'visible',
        ...(legal && {
          border: '3px dashed #00e5ff',
          animation: 'cs-pulse 1.2s ease-in-out infinite',
        }),
        ...(shake && { animation: 'cs-shake 0.4s', border: '3px solid #ff5252' }),
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
});
