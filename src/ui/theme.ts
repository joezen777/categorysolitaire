import { createTheme } from '@mui/material/styles';

export const palette = {
  felt: '#0b3d2e',
  feltDark: '#072a20',
  itemFace: '#fffdf7',
  itemText: '#1b1b1b',
  itemBorder: '#b9b2a0',
  titleFace: '#3a2468',
  titleText: '#ffffff',
  titleAccent: '#ffd54f',
  back: '#1d4f8c',
  selected: '#ffd54f',
  legal: '#7cf2a4',
  invalid: '#ff6b6b',
  slotBorder: 'rgba(255,255,255,0.45)',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: palette.felt, paper: '#173d33' },
    primary: { main: palette.titleAccent },
  },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.felt,
          backgroundImage: `radial-gradient(circle at 50% 0%, #11573f 0%, ${palette.felt} 55%, ${palette.feltDark} 100%)`,
          backgroundAttachment: 'fixed',
          minHeight: '100dvh',
          overflowX: 'hidden',
        },
        '@keyframes cs-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        '@keyframes cs-glitter-out': {
          '0%': { opacity: 1, transform: 'scale(1)', filter: 'brightness(1)' },
          '40%': { opacity: 1, transform: 'scale(1.08)', filter: 'brightness(1.6)' },
          '100%': { opacity: 0, transform: 'scale(0.6) translateY(-20px)', filter: 'brightness(2)' },
        },
        '@keyframes cs-sparkle': {
          '0%': { opacity: 0, transform: 'scale(0.2) rotate(0deg)' },
          '30%': { opacity: 1, transform: 'scale(1.2) rotate(45deg)' },
          '100%': { opacity: 0, transform: 'scale(0.4) rotate(120deg)' },
        },
      },
    },
  },
});
