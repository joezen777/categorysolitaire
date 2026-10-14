import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f5c542' },
    secondary: { main: '#4fc3f7' },
    background: { default: '#0b5d3b', paper: '#123d2b' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
});

export default theme;
