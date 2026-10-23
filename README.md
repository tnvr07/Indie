# Mothlight — A Nocturne in Four Parts

Mothlight is a self-contained browser game built with HTML, CSS, and Canvas. You carry the last light through a dark garden while moths hunt the glow, collecting scattered lights and returning them to a lantern before the night closes in.

It is designed to be played instantly: no build step, no dependency install, and no external art or audio assets.

## Play locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Press the start button or use the in-game menu to choose a difficulty.

The game stores its best times and settings in the browser, so you can keep playing without a backend.

## Controls

| Action | Input |
| --- | --- |
| Move | `W`, `A`, `S`, `D` or arrow keys |
| Dash | `Shift` |
| Moon Pulse | `Space` |
| Pause | `P` or `Esc` |
| Touch move | Tap the garden |

## Gameplay loop

- Explore each of the four gardens and recover every scattered light.
- Bring the lights to the lantern to clear the area.
- Avoid moths: drifters, chasers, dashers, orbiters, and the final stalker each attack differently.
- The world outside your glow is nearly black, so gathering lights expands your visibility and increases your risk.
- Gold lights build a streak, green lights restore glow, blue lights slow moths, and hot lights pull attention from farther away.
- A hit costs glow and drops a carried light. If you fall, scattered lights remain in place when you retry.
- Water slows and pushes you, while reeds briefly hide you but can also leave you exposed if you stay too long.
- Every third recovered light grants a persistent upgrade.
- Moon Pulse stuns nearby moths and reveals nearby lights, and it shares its recovery timer with Dash.

## Difficulty and progression

- Quiet: a relaxed introduction to the game.
- Wanderer: the default balanced run.
- Moonless: a stricter challenge that rewards a no-hit finish.

Three marks are tied to a no-hit garden under 2:10. A clean Moonless run unlocks an exclusive star.

## Project structure

- `index.html` — game shell and UI overlays
- `style.css` — visual styling and layout
- `game.js` — gameplay logic, rendering, hazards, audio generation, and progression
- `README.md` — project overview and instructions

## Notes

The game renders its world, particles, darkness mask, and effects directly in Canvas. Audio is synthesized in-browser rather than pulled from external files. The implementation follows the Canvas API tutorials from MDN and is intended to be lightweight and portable.
