# Explicit perception fixtures

These three original 1440×900 screenshots came from the controlled fixture's desktop-drag reference run. They contain no live-user data. The expected facts in `scripts/qa-calibrate-vision.mjs` are specified independently from the public deterministic deal and rendered frames; DOM observations are not used as expected vision answers.

- `0000.png`: score 0; five empty foundations; exposed cards King, Chimera, Vase, Io, Imagine; hidden backs remain unidentified; stock 56.
- `4-settled.png`: King completed after title/Scepter/Orb/Throne moves; score 100; first column empty; other exposed cards exactly Chimera, Vase, Io, Imagine. Names of covered cards must not be hallucinated from the supplied deck.
- `142-settled.png`: score 1300, You win!, all foundation/tableau placeholders empty, empty stock with Recycle control, empty waste.

Source rectangle: x530..602, y52..152. Foundation rectangles: x530+76*i ..602+76*i, y170..270. Coordinate assertions require points to land inside the intended rectangles, not merely to be in the viewport. These are task-author-reviewed fixtures, not independent human adjudication or cross-layout calibration. A passing case certifies only its explicit assertions.
