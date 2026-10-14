import { Box } from '@mui/material';

const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const reach = 34 + ((i * 37) % 28);
  return {
    left: `${10 + ((i * 53) % 80)}%`,
    top: `${10 + ((i * 29) % 80)}%`,
    dx: `${Math.round(Math.cos(angle) * reach)}px`,
    dy: `${Math.round(Math.sin(angle) * reach)}px`,
    delay: `${(i % 5) * 0.12}s`,
    color: ['#fff59d', '#ffd54f', '#ffffff', '#80deea'][i % 4],
  };
});

/** Decorative sparkle burst; the status text carries the real information. */
export function Glitter() {
  return (
    <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
      {SPARKS.map((s, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: 10,
            height: 10,
            background: s.color,
            clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)',
            '--dx': s.dx,
            '--dy': s.dy,
            opacity: 0,
            animation: `cs-sparkle 1.1s ${s.delay} ease-out both`,
          }}
        />
      ))}
    </Box>
  );
}
