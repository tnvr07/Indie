# Mothlight

A self-contained, moonlit-garden adventure. Open `index.html` in a modern browser—there is no build step or package installation.

## How to play

- Move with **WASD** or the **arrow keys**. On a touch screen, tap the garden to wander.
- Gather each garden's lights and bring them to its lantern. Four short gardens introduce different moths and challenges.
- **Gold** lights build a collection streak. **Green** lights restore a heart, **blue** lights slow moths, and carrying a **hot** light attracts moths from farther away.
- Moths telegraph their lunges before attacking. **Moon Pulse** stuns nearby moths and reveals nearby lights; it shares a recovery timer with **Shift**/**Dash**, so choose which ability to use.
- Water slows your steps and pushes you along; bushes conceal you temporarily, but moths search your last known position and flush you out if you stay too long.
- Carrying a hot light visibly warms your glow and attracts moths from farther away. A blue light slows moths for five seconds without slowing you or changing ability recharge.
- A hit knocks you back and briefly protects you from another hit. The title screen explains the star rule: three stars for a no-hit garden under 2:10, two for one hit, and one for completing it. A clean Moonless run earns an exclusive star.
- Each garden has a short introduction describing its new mechanic. Press **P** or **Escape** to pause. Choose Cozy, Wanderer, or Moonless difficulty, adjust music and effects, or restart from the current garden checkpoint. Mode, volume, and sound settings persist in the browser.

The garden, characters, particles, and effects are drawn in Canvas, with ambient music and chime sounds generated in the browser. Local best times are saved in the browser. The game has no external image or audio assets. Its Canvas implementation follows the [MDN Canvas API tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial).
