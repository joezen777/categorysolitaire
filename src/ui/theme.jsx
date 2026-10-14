import { GlobalStyles, createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ffd54f' },
    background: { default: '#14463a', paper: '#1f2a30' },
  },
  typography: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
});

/** Card geometry is driven by CSS variables so absolute offsets scale with the viewport. */
export function BoardGlobals() {
  return (
    <GlobalStyles
      styles={{
        ':root': {
          '--pad': '8px',
          '--gap': '6px',
          '--card-w': 'min(104px, calc((100vw - 2 * var(--pad) - 4 * var(--gap)) / 5))',
          '--card-h': 'calc(var(--card-w) * 1.4)',
          '--peek-up': 'max(22px, calc(var(--card-w) * 0.34))',
          '--peek-down': 'calc(var(--card-w) * 0.16)',
          '--board-w': 'calc(5 * var(--card-w) + 4 * var(--gap))',
          '--card-radius': 'calc(var(--card-w) * 0.08)',
        },
        'html, body': { margin: 0, overflowX: 'hidden' },
        body: {
          background: 'radial-gradient(circle at 50% 0%, #1f6b58 0%, #14463a 60%, #0d2f27 100%)',
          minHeight: '100vh',
        },
        '@keyframes cs-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        '@keyframes cs-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 229, 255, 0.7)' },
          '50%': { boxShadow: '0 0 0 5px rgba(0, 229, 255, 0)' },
        },
        '@keyframes cs-sparkle': {
          '0%': { opacity: 0, transform: 'translate(0, 0) scale(0.2) rotate(0deg)' },
          '30%': { opacity: 1 },
          '100%': {
            opacity: 0,
            transform: 'translate(var(--dx), var(--dy)) scale(1.1) rotate(180deg)',
          },
        },
        '@keyframes cs-fade': {
          '0%, 60%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.001ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.001ms !important',
          },
        },
      }}
    />
  );
}
