# Mothlight — A Nocturne in Four Parts

A self-contained Canvas game about carrying a last light through a garden that remembers the dark. Open `index.html` in a modern browser—there is no build step or package installation.

## How to play

- Move with **WASD** or the **arrow keys**. On a touch screen, tap the garden to move.
- Find each garden's lights and bring them to its lantern. Four short gardens introduce different moths and hazards.
- The world is nearly black beyond your glow. Distant lights appear as faint glimmers; gathering lights widens your signal, which also helps moths find you.
- **Gold** lights build a collection streak. **Green** lights restore vital glow, **blue** lights slow moths, and carrying a **hot** light attracts moths from farther away.
- A hit costs vital glow and drops one carried light. If you fall, the rest scatter at your location and remain there when you retry.
- Drifters, chasers, dashers, orbiters, and the final garden's larger stalker have distinct behaviors. Moths telegraph attacks before lunging.
- **Moon Pulse** stuns nearby moths and reveals nearby lights; it shares a recovery timer with **Shift**/**Dash**. Every third recovered light offers one of three persistent run upgrades.
- Water slows and pushes you. Reeds conceal you briefly, but moths search your last known position and flush you out if you stay too long.
- Three marks require a no-hit garden under 2:10; taking a hit scatters light. A clean Moonless run earns an exclusive star.
- Press **P** or **Escape** to pause. Choose Quiet, Wanderer, or Moonless difficulty, adjust music and effects, or restart the current garden. Mode, volume, and sound settings persist in the browser.

The garden, characters, particles, and effects are drawn in Canvas, with a darkness mask and audio generated in the browser. Local best times are saved in the browser. The game has no external image or audio assets. Its Canvas implementation follows the [MDN Canvas API tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial).
