import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App.jsx";
import "./styles.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#235c64",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#b6405b",
    },
    success: {
      main: "#247a5a",
    },
    warning: {
      main: "#e0a100",
    },
    error: {
      main: "#c74435",
    },
    background: {
      default: "#f4f7fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#172026",
      secondary: "#52606d",
    },
  },
  typography: {
    fontFamily:
      '"Inter", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontSize: "1.5rem",
      fontWeight: 800,
      letterSpacing: 0,
    },
    h2: {
      fontSize: "1.05rem",
      fontWeight: 800,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 800,
      letterSpacing: 0,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
    },
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
