(() => {
  "use strict";

  const canvas = document.querySelector("#world");
  const ctx = canvas.getContext("2d", { alpha: false });
  const overlay = document.querySelector("#overlay");
  const startButton = document.querySelector("#start-button");
  const pauseButton = document.querySelector("#pause-button");
  const soundButton = document.querySelector("#sound-button");
  const pulseButton = document.querySelector("#pulse-button");
  const countLabel = document.querySelector("#light-count");
  const totalLabel = document.querySelector("#light-total");
  const progressFill = document.querySelector("#progress-fill");
  const livesLabel = document.querySelector("#lives");
  const objectiveText = document.querySelector("#objective-text");
  const toast = document.querySelector("#toast");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");

  const WORLD = { width: 2200, height: 1500 };
  const TOTAL_LIGHTS = 10;
  const keys = new Set();
  const lights = [];
  const moths = [];
  const motes = [];
  const reeds = [];
  const flowers = [];
  const stars = [];
  const trees = [];
  const lilyPads = [];
  const shrubs = [];
  const bloomSpots = [];
  const pointer = { active: false, x: 0, y: 0 };
  const shrine = { x: 1100, y: 170 };
  const player = { x: 1100, y: 790, vx: 0, vy: 0, radius: 15, facing: 0 };

  let viewWidth = innerWidth;
  let viewHeight = innerHeight;
  let dpr = 1;
  let started = false;
  let paused = false;
  let finished = false;
  let soundOn = true;
  let audioContext;
  let lives = 3;
  let found = 0;
  let pulseTime = 0;
  let pulseCooldown = 0;
  let hitFlash = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let toastTimer = 0;
  let camera = { x: 0, y: 0 };
  let rngSeed = 62831;

  function random() {
    rngSeed = (rngSeed * 16807) % 2147483647;
    return (rngSeed - 1) / 2147483646;
  }

  function resize() {
    viewWidth = innerWidth;
    viewHeight = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewWidth * dpr);
    canvas.height = Math.round(viewHeight * dpr);
    canvas.style.width = `${viewWidth}px`;
    canvas.style.height = `${viewHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedWorld() {
    const placements = [
      [460, 330], [790, 245], [1440, 300], [1780, 470], [370, 750],
      [740, 1030], [1170, 1080], [1610, 920], [1900, 1190], [1110, 510]
    ];
    placements.forEach(([x, y], index) => lights.push({
      x, y, phase: random() * Math.PI * 2, collected: false, hue: index % 4
    }));

    const mothSpawns = [[600, 540], [1510, 680], [1020, 1190], [1850, 720]];
    mothSpawns.forEach(([x, y], index) => moths.push({
      x, y, vx: 0, vy: 0, homeX: x, homeY: y, phase: random() * 8,
      speed: 48 + index * 5, stunned: 0, turn: random() * 6
    }));

    [
      [90, 90, 1.3], [350, 110, .9], [710, 75, 1.2], [1110, 90, 1.35], [1510, 95, .95], [2050, 130, 1.35],
      [80, 370, .9], [2090, 440, 1.1], [100, 920, 1.2], [2080, 1040, 1.1],
      [110, 1340, 1.35], [440, 1400, .9], [810, 1380, 1.1], [1310, 1400, .9], [1690, 1370, 1.3], [2090, 1370, 1]
    ].forEach(([x, y, scale]) => trees.push({ x, y, scale, shade: random() }));

    for (let i = 0; i < 21; i++) {
      const x = 90 + random() * (WORLD.width - 180);
      const y = 700 + 135 * Math.sin((x - 200) / 385) + (random() - .5) * 120;
      lilyPads.push({ x, y, size: 5 + random() * 9, phase: random() * 6 });
    }

    for (let i = 0; i < 66; i++) {
      const x = 55 + random() * (WORLD.width - 110);
      const shoreY = 700 + 135 * Math.sin((x - 200) / 385);
      const side = random() < .5 ? -1 : 1;
      const y = shoreY + side * (132 + random() * 260);
      const tooClose = [...lights, { x: player.x, y: player.y }, shrine, ...mothSpawns.map(([mx, my]) => ({ x: mx, y: my }))]
        .some(point => Math.hypot(point.x - x, point.y - y) < 105);
      if (!tooClose && y > 55 && y < WORLD.height - 55) {
        shrubs.push({ x, y, scale: .7 + random() * .85, tint: random() });
      }
    }

    for (let i = 0; i < 52; i++) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      if (Math.abs(y - (700 + 135 * Math.sin((x - 200) / 385))) < 105) continue;
      bloomSpots.push({ x, y, size: 2 + random() * 2, phase: random() * 6, tint: random() });
    }

    for (let i = 0; i < 570; i++) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      const shore = 700 + 135 * Math.sin((x - 200) / 385);
      if (Math.abs(y - shore) < 100 || Math.hypot(x - shrine.x, y - shrine.y) < 95) continue;
      reeds.push({ x, y, height: 8 + random() * 19, bend: (random() - .5) * 12, phase: random() * 6, tint: Math.floor(random() * 3) });
    }

    for (let i = 0; i < 215; i++) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      if (Math.abs(y - (700 + 135 * Math.sin((x - 200) / 385))) < 90) continue;
      flowers.push({ x, y, size: 1.4 + random() * 2.3, phase: random() * 6, tint: random() });
    }

    for (let i = 0; i < 145; i++) {
      stars.push({ x: random() * WORLD.width, y: random() * WORLD.height, size: .5 + random() * 1.5, phase: random() * 7 });
    }
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function drawWorld(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, "#263b43");
    sky.addColorStop(.38, "#30433e");
    sky.addColorStop(1, "#172d2d");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.save();
    ctx.globalAlpha = .35;
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const shine = .45 + .45 * Math.sin(time * .55 + star.phase);
      ctx.fillStyle = `rgba(230, 219, 179, ${shine})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const moonGlow = ctx.createRadialGradient(1810, 230, 35, 1810, 230, 540);
    moonGlow.addColorStop(0, "rgba(213, 206, 157, .16)");
    moonGlow.addColorStop(1, "rgba(213, 206, 157, 0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(1200, 0, 1000, 800);

    ctx.save();
    ctx.shadowColor = "rgba(233, 223, 178, .48)";
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#ded7ad";
    ctx.beginPath();
    ctx.arc(1810, 230, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(167, 168, 139, .4)";
    ctx.beginPath();
    ctx.arc(1801, 221, 5, 0, Math.PI * 2);
    ctx.arc(1820, 239, 3.5, 0, Math.PI * 2);
    ctx.arc(1805, 239, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const shore = [];
    for (let x = -100; x <= WORLD.width + 100; x += 45) {
      shore.push({ x, y: 700 + 135 * Math.sin((x - 200) / 385) });
    }
    ctx.beginPath();
    shore.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = "rgba(10, 28, 35, .45)";
    ctx.lineWidth = 222;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.strokeStyle = "rgba(9, 32, 43, .66)";
    ctx.lineWidth = 195;
    ctx.stroke();
    ctx.strokeStyle = "rgba(98, 152, 153, .22)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = .45;
    ctx.strokeStyle = "rgba(174, 204, 183, .28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 30; i++) {
      const x = 80 + i * 74;
      const y = 700 + 135 * Math.sin((x - 200) / 385) + Math.sin(i * 17 + time * .35) * 13;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 18 + Math.sin(i) * 12, y - 1);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (const pad of lilyPads) {
      const drift = Math.sin(time * .5 + pad.phase) * 2;
      ctx.fillStyle = "rgba(115, 157, 122, .65)";
      ctx.beginPath();
      ctx.ellipse(pad.x + drift, pad.y, pad.size, pad.size * .58, .16, .35, Math.PI * 2 - .35);
      ctx.lineTo(pad.x + drift, pad.y);
      ctx.fill();
      ctx.strokeStyle = "rgba(192, 205, 158, .25)";
      ctx.lineWidth = .8;
      ctx.beginPath();
      ctx.moveTo(pad.x + drift, pad.y);
      ctx.lineTo(pad.x + drift + pad.size * .65, pad.y - pad.size * .3);
      ctx.stroke();
    }

    const clearing = ctx.createRadialGradient(1100, 790, 30, 1100, 790, 500);
    clearing.addColorStop(0, "rgba(185, 157, 99, .13)");
    clearing.addColorStop(1, "rgba(185, 157, 99, 0)");
    ctx.fillStyle = clearing;
    ctx.fillRect(550, 250, 1100, 1000);

    for (const reed of reeds) {
      const sway = Math.sin(time * .8 + reed.phase) * 3;
      ctx.strokeStyle = ["rgba(158, 179, 119, .32)", "rgba(115, 161, 128, .34)", "rgba(194, 174, 116, .25)"][reed.tint];
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(reed.x, reed.y);
      ctx.quadraticCurveTo(reed.x + sway, reed.y - reed.height * .55, reed.x + reed.bend + sway, reed.y - reed.height);
      ctx.stroke();
    }

    for (const flower of flowers) {
      const pulse = .82 + .18 * Math.sin(time * .75 + flower.phase);
      const hue = flower.tint > .8 ? "224, 192, 130" : flower.tint > .53 ? "174, 191, 151" : "180, 178, 198";
      ctx.fillStyle = `rgba(${hue}, ${.53 * pulse})`;
      ctx.beginPath();
      ctx.arc(flower.x, flower.y, flower.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const shrub of shrubs) drawShrub(shrub);
    for (const bloom of bloomSpots) drawBloom(bloom, time);
    for (const tree of trees) drawTree(tree);
    drawShrine(time);
  }

  function drawShrub(shrub) {
    const { x, y, scale, tint } = shrub;
    const colors = tint > .65
      ? ["#354c40", "#496044", "#62704b"]
      : tint > .3 ? ["#314b43", "#405b4b", "#52664c"] : ["#3b493d", "#525a43", "#696346"];
    ctx.fillStyle = "rgba(8, 19, 19, .23)";
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 5 * scale, 24 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.ellipse(x - 8 * scale, y, 12 * scale, 9 * scale, -.25, 0, Math.PI * 2);
    ctx.ellipse(x + 5 * scale, y - 3 * scale, 14 * scale, 10 * scale, .15, 0, Math.PI * 2);
    ctx.ellipse(x + 15 * scale, y + 1 * scale, 10 * scale, 7 * scale, .4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors[1];
    ctx.beginPath();
    ctx.ellipse(x - 3 * scale, y - 5 * scale, 9 * scale, 6 * scale, -.3, 0, Math.PI * 2);
    ctx.ellipse(x + 9 * scale, y - 5 * scale, 8 * scale, 5 * scale, .2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(194, 188, 126, .35)";
    ctx.beginPath();
    ctx.arc(x - 3 * scale, y - 7 * scale, 1.2 * scale, 0, Math.PI * 2);
    ctx.arc(x + 8 * scale, y - 6 * scale, 1 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBloom(bloom, time) {
    const shimmer = .72 + .28 * Math.sin(time * 1.1 + bloom.phase);
    const color = bloom.tint > .66 ? "244, 207, 142" : bloom.tint > .33 ? "195, 215, 172" : "205, 194, 228";
    ctx.fillStyle = `rgba(${color}, ${.55 * shimmer})`;
    for (let petal = 0; petal < 5; petal++) {
      const angle = petal * Math.PI * 2 / 5;
      ctx.beginPath();
      ctx.arc(
        bloom.x + Math.cos(angle) * bloom.size * .9,
        bloom.y + Math.sin(angle) * bloom.size * .9,
        bloom.size * .58, 0, Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = `rgba(255, 233, 176, ${.76 * shimmer})`;
    ctx.beginPath();
    ctx.arc(bloom.x, bloom.y, bloom.size * .4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTree(tree) {
    const { x, y, scale, shade } = tree;
    ctx.fillStyle = "rgba(8, 20, 20, .25)";
    ctx.beginPath();
    ctx.ellipse(x + 5 * scale, y + 8 * scale, 27 * scale, 11 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#465043";
    roundedRect(x - 3 * scale, y - 19 * scale, 7 * scale, 24 * scale, 3 * scale);
    ctx.fill();
    const colors = shade > .65 ? ["#34473c", "#42533e", "#526044"] : ["#30473d", "#3c5141", "#4a5d43"];
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.arc(x, y - 27 * scale, 24 * scale, 0, Math.PI * 2);
    ctx.arc(x - 14 * scale, y - 20 * scale, 17 * scale, 0, Math.PI * 2);
    ctx.arc(x + 15 * scale, y - 19 * scale, 18 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors[1];
    ctx.beginPath();
    ctx.arc(x - 7 * scale, y - 32 * scale, 15 * scale, 0, Math.PI * 2);
    ctx.arc(x + 11 * scale, y - 30 * scale, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(172, 181, 126, .22)";
    ctx.beginPath();
    ctx.arc(x - 8 * scale, y - 36 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.arc(x + 10 * scale, y - 25 * scale, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShrine(time) {
    const active = found === TOTAL_LIGHTS;
    const glow = ctx.createRadialGradient(shrine.x, shrine.y - 8, 5, shrine.x, shrine.y - 8, active ? 140 : 70);
    glow.addColorStop(0, active ? "rgba(255, 222, 142, .4)" : "rgba(240, 205, 133, .2)");
    glow.addColorStop(1, "rgba(240, 205, 133, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(shrine.x, shrine.y - 8, active ? 140 : 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#24342f";
    ctx.beginPath();
    ctx.ellipse(shrine.x, shrine.y + 7, 40, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#746b50";
    roundedRect(shrine.x - 23, shrine.y - 11, 46, 25, 5);
    ctx.fill();
    ctx.fillStyle = "#c5a968";
    roundedRect(shrine.x - 18, shrine.y - 24, 36, 29, 7);
    ctx.fill();
    ctx.fillStyle = "#43594d";
    roundedRect(shrine.x - 12, shrine.y - 20, 24, 23, 5);
    ctx.fill();
    ctx.fillStyle = active ? "#fff0b2" : "#f2cd80";
    ctx.shadowColor = "#f9d686";
    ctx.shadowBlur = active ? 34 : 18 + Math.sin(time * 2) * 5;
    ctx.beginPath();
    ctx.arc(shrine.x, shrine.y - 9, active ? 8 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    for (let i = 0; i < 5; i++) {
      const angle = time * .35 + i * Math.PI * 2 / 5;
      const x = shrine.x + Math.cos(angle) * 31;
      const y = shrine.y - 22 + Math.sin(angle) * 13;
      ctx.fillStyle = "rgba(250, 222, 155, .66)";
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLight(light, time) {
    if (light.collected) return;
    const bob = Math.sin(time * 1.8 + light.phase) * 5;
    const x = light.x;
    const y = light.y + bob;
    const color = ["255, 221, 146", "202, 232, 192", "217, 212, 249", "246, 191, 150"][light.hue];
    const aura = ctx.createRadialGradient(x, y, 1, x, y, 38);
    aura.addColorStop(0, `rgba(${color}, .3)`);
    aura.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${color}, .24)`;
    ctx.beginPath();
    ctx.arc(x, y, 11 + Math.sin(time * 2 + light.phase) * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${color}, .95)`;
    ctx.shadowColor = `rgb(${color})`;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y, 4 + Math.sin(time * 2.2 + light.phase) * .7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 249, 219, .8)";
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMoth(moth, time) {
    const flap = Math.sin(time * 13 + moth.phase) * .38;
    const bob = Math.sin(time * 3 + moth.phase) * 3;
    ctx.save();
    ctx.translate(moth.x, moth.y + bob);
    ctx.rotate(Math.atan2(moth.vy, moth.vx) * .2);
    const alpha = moth.stunned > 0 ? .38 : .94;
    ctx.globalAlpha = alpha;
    const wingColor = moth.stunned > 0 ? "rgba(187, 195, 177, .45)" : "rgba(184, 169, 202, .83)";
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    ctx.ellipse(-5, -3, 10, 6 + flap * 4, -.4, 0, Math.PI * 2);
    ctx.ellipse(5, -3, 10, 6 - flap * 4, .4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#57556c";
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.2, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4d88b";
    ctx.shadowColor = "#f1cb81";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, -1, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawPlayer(time) {
    const bob = Math.sin(time * 8) * 2;
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.rotate(player.facing * .13);
    if (hitFlash > 0 && Math.floor(time * 15) % 2 === 0) ctx.globalAlpha = .38;

    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 62);
    halo.addColorStop(0, "rgba(255, 220, 140, .23)");
    halo.addColorStop(1, "rgba(255, 220, 140, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(9, 18, 21, .32)";
    ctx.beginPath();
    ctx.ellipse(0, 13, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#afad89";
    ctx.beginPath();
    ctx.ellipse(0, 1, 9, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ded2ad";
    ctx.beginPath();
    ctx.ellipse(-1, -5, 8, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#485348";
    ctx.beginPath();
    ctx.ellipse(-1, -10, 10, 4, -.2, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ece1c1";
    ctx.beginPath();
    ctx.arc(-5, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#303a34";
    ctx.beginPath();
    ctx.arc(-3, -7, 1.3, 0, Math.PI * 2);
    ctx.arc(1, -7, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e9bb75";
    ctx.shadowColor = "#f7d283";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(10, -4, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawMotes(dt) {
    for (let i = motes.length - 1; i >= 0; i--) {
      const mote = motes[i];
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.life -= dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, mote.life / .45));
      ctx.fillStyle = mote.color;
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.size * Math.max(.25, mote.life), 0, Math.PI * 2);
      ctx.fill();
      if (mote.life <= 0) motes.splice(i, 1);
    }
    ctx.globalAlpha = 1;
  }

  function burst(x, y, color, amount = 13) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 24 + Math.random() * 110;
      motes.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: .4 + Math.random() * .52, size: 1.3 + Math.random() * 2.5, color
      });
    }
  }

  function drawPulse() {
    if (pulseTime <= 0) return;
    const progress = 1 - pulseTime / .65;
    ctx.strokeStyle = `rgba(255, 225, 164, ${.68 * (1 - progress)})`;
    ctx.lineWidth = 3 * (1 - progress) + .5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, progress * 205, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(214, 236, 208, ${.23 * (1 - progress)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(player.x, player.y, progress * 190, 0, Math.PI * 2);
    ctx.stroke();
  }

  function frame(timestamp) {
    const dt = Math.min((timestamp - lastFrame) / 1000 || 0, .035);
    lastFrame = timestamp;
    if (started && !paused && !finished) update(dt);
    elapsed += dt;

    camera.x = Math.max(0, Math.min(WORLD.width - viewWidth, player.x - viewWidth / 2));
    camera.y = Math.max(0, Math.min(WORLD.height - viewHeight, player.y - viewHeight / 2));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawWorld(elapsed);
    for (const light of lights) drawLight(light, elapsed);
    for (const moth of moths) drawMoth(moth, elapsed);
    drawPulse();
    drawPlayer(elapsed);
    drawMotes(dt);
    ctx.restore();

    if (hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 190, 160, ${Math.min(.12, hitFlash * .08)})`;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
    requestAnimationFrame(frame);
  }

  function update(dt) {
    pulseCooldown = Math.max(0, pulseCooldown - dt);
    pulseTime = Math.max(0, pulseTime - dt);
    hitFlash = Math.max(0, hitFlash - dt);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toast.classList.remove("visible");
    }
    pulseButton.disabled = pulseCooldown > 0;
    pulseButton.innerHTML = pulseCooldown > 0
      ? `✧ <span>RECHARGING ${pulseCooldown.toFixed(1)}s</span><kbd>SPACE</kbd>`
      : `✧ <span>MOON PULSE</span><kbd>SPACE</kbd>`;

    let ax = 0;
    let ay = 0;
    if (keys.has("arrowleft") || keys.has("a")) ax -= 1;
    if (keys.has("arrowright") || keys.has("d")) ax += 1;
    if (keys.has("arrowup") || keys.has("w")) ay -= 1;
    if (keys.has("arrowdown") || keys.has("s")) ay += 1;
    if (pointer.active && Math.hypot(pointer.x - player.x, pointer.y - player.y) > 12) {
      const angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);
      ax += Math.cos(angle);
      ay += Math.sin(angle);
    } else if (pointer.active) {
      pointer.active = false;
    }
    const magnitude = Math.hypot(ax, ay);
    if (magnitude > 0) {
      ax /= magnitude;
      ay /= magnitude;
      player.facing = ax;
    }
    const speed = 205;
    const blend = 1 - Math.exp(-8 * dt);
    player.vx += (ax * speed - player.vx) * blend;
    player.vy += (ay * speed - player.vy) * blend;
    if (magnitude === 0) {
      player.vx *= Math.exp(-6 * dt);
      player.vy *= Math.exp(-6 * dt);
    }
    player.x = Math.max(28, Math.min(WORLD.width - 28, player.x + player.vx * dt));
    player.y = Math.max(28, Math.min(WORLD.height - 28, player.y + player.vy * dt));

    for (const light of lights) {
      if (!light.collected && Math.hypot(player.x - light.x, player.y - light.y) < 27) collect(light);
    }

    for (const moth of moths) {
      moth.stunned = Math.max(0, moth.stunned - dt);
      const distance = Math.hypot(player.x - moth.x, player.y - moth.y);
      let tx = moth.homeX + Math.cos(elapsed * .7 + moth.phase) * 70;
      let ty = moth.homeY + Math.sin(elapsed * .8 + moth.phase) * 55;
      if (distance < 290 && moth.stunned <= 0) {
        tx = player.x;
        ty = player.y;
      }
      if (pulseTime > 0 && distance < 205) {
        const push = Math.atan2(moth.y - player.y, moth.x - player.x);
        moth.vx += Math.cos(push) * 520 * dt;
        moth.vy += Math.sin(push) * 520 * dt;
      }
      const direction = Math.atan2(ty - moth.y, tx - moth.x);
      const chase = moth.stunned > 0 ? 0 : moth.speed * (distance < 290 ? 1.3 : .7);
      moth.vx += (Math.cos(direction) * chase - moth.vx) * Math.min(1, dt * 1.8);
      moth.vy += (Math.sin(direction) * chase - moth.vy) * Math.min(1, dt * 1.8);
      moth.x += moth.vx * dt;
      moth.y += moth.vy * dt;
      if (distance < 27 && hitFlash <= 0 && moth.stunned <= 0) takeHit(moth);
    }

    if (found === TOTAL_LIGHTS && Math.hypot(player.x - shrine.x, player.y - shrine.y) < 52) finishGame();
  }

  function collect(light) {
    light.collected = true;
    found++;
    countLabel.textContent = found;
    progressFill.style.width = `${found / TOTAL_LIGHTS * 100}%`;
    burst(light.x, light.y, ["#ffdf91", "#c8e8c0", "#dad5f5", "#f6bf96"][light.hue], 19);
    playTone(610 + found * 34, .16, "sine", .055);
    if (found === TOTAL_LIGHTS) {
      objectiveText.textContent = "The old lantern is waiting";
      showToast("Every little light remembers the way home.");
      playTone(920, .45, "sine", .07);
    } else {
      showToast(["A light found its way back.", "The garden feels a little warmer.", "One more little star for the lantern."][found % 3]);
    }
  }

  function takeHit(moth) {
    lives--;
    hitFlash = 1.15;
    moth.stunned = 1.8;
    const angle = Math.atan2(player.y - moth.y, player.x - moth.x);
    player.vx += Math.cos(angle) * 185;
    player.vy += Math.sin(angle) * 185;
    burst(player.x, player.y, "#e6b7a3", 12);
    renderLives();
    playTone(180, .2, "triangle", .06);
    showToast(lives ? "A moth gave you a little fright." : "The night got a little too dark.");
    if (lives <= 0) endGame(false);
  }

  function renderLives() {
    livesLabel.innerHTML = `${"♥ ".repeat(lives)}<span class="empty">${"♥ ".repeat(3 - lives)}</span>`;
    livesLabel.setAttribute("aria-label", `${lives} ${lives === 1 ? "life" : "lives"}`);
  }

  function activatePulse() {
    if (!started || paused || finished || pulseCooldown > 0) return;
    pulseTime = .65;
    pulseCooldown = 4.2;
    playTone(350, .2, "sine", .045);
    for (const moth of moths) {
      if (Math.hypot(player.x - moth.x, player.y - moth.y) < 205) {
        moth.stunned = 2.2;
        const angle = Math.atan2(moth.y - player.y, moth.x - player.x);
        moth.vx += Math.cos(angle) * 185;
        moth.vy += Math.sin(angle) * 185;
        burst(moth.x, moth.y, "#e7d4a0", 7);
      }
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = 2.15;
  }

  function playTone(frequency, duration, type, volume) {
    if (!soundOn) return;
    try {
      audioContext ??= new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * .72, audioContext.currentTime + duration);
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      console.warn("Audio could not be started in this browser.", error);
      soundOn = false;
      updateSoundButton();
    }
  }

  function updateSoundButton() {
    soundButton.textContent = soundOn ? "♫" : "♪";
    soundButton.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
    soundButton.title = soundOn ? "Turn sound off" : "Turn sound on";
  }

  function startGame() {
    if (finished) resetGame();
    started = true;
    paused = false;
    overlay.classList.add("hidden");
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", "Pause game");
    lastFrame = performance.now();
  }

  function togglePause() {
    if (!started || finished) return;
    paused = !paused;
    overlayTitle.textContent = paused ? "Take a breath" : "Mothlight";
    overlayCopy.innerHTML = paused
      ? "The little lights will wait.<br>The garden isn't going anywhere."
      : "The moon has misplaced its little lights.<br>Wander the garden, gather them up, and<br>bring their glow back to the old lantern.";
    startButton.querySelector("span:first-child").textContent = paused ? "Back to wandering" : "Begin wandering";
    overlay.classList.toggle("hidden", !paused);
    pauseButton.textContent = paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", paused ? "Resume game" : "Pause game");
    if (!paused) lastFrame = performance.now();
  }

  function finishGame() {
    finished = true;
    endGame(true);
  }

  function endGame(won) {
    finished = true;
    paused = false;
    overlayTitle.textContent = won ? "Home, at last" : "The moths win this round";
    overlayCopy.innerHTML = won
      ? `You gathered every little light and brought it home.<br>The whole garden is glowing because of you.`
      : `The garden is still here, and so are its lights.<br>Take a breath. You can always try again.`;
    startButton.querySelector("span:first-child").textContent = "Wander again";
    overlay.classList.remove("hidden");
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", "Pause game");
    if (won) {
      objectiveText.textContent = "A little light goes a long way";
      burst(shrine.x, shrine.y, "#ffe4a1", 60);
      playTone(780, .75, "sine", .07);
    }
  }

  function resetGame() {
    lives = 3;
    found = 0;
    pulseTime = 0;
    pulseCooldown = 0;
    hitFlash = 0;
    finished = false;
    player.x = 1100;
    player.y = 790;
    player.vx = 0;
    player.vy = 0;
    lights.forEach(light => { light.collected = false; });
    moths.forEach(moth => {
      moth.x = moth.homeX; moth.y = moth.homeY; moth.vx = 0; moth.vy = 0; moth.stunned = 0;
    });
    motes.length = 0;
    countLabel.textContent = "0";
    progressFill.style.width = "0";
    objectiveText.textContent = "Find the scattered lights";
    overlayTitle.innerHTML = "Moth<span>light</span>";
    renderLives();
    startGame();
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left + camera.x, y: event.clientY - bounds.top + camera.y };
  }

  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    if (key === "escape" || key === "p") {
      togglePause();
      return;
    }
    if (key === " ") {
      activatePulse();
      return;
    }
    pointer.active = false;
    keys.add(key);
  });
  window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());
  canvas.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const point = canvasPoint(event);
    pointer.x = point.x;
    pointer.y = point.y;
    pointer.active = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (pointer.active) {
      const point = canvasPoint(event);
      pointer.x = point.x;
      pointer.y = point.y;
    }
  });
  window.addEventListener("resize", resize);
  startButton.addEventListener("click", startGame);
  pauseButton.addEventListener("click", togglePause);
  pulseButton.addEventListener("click", activatePulse);
  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    updateSoundButton();
    if (soundOn) playTone(520, .1, "sine", .035);
  });

  totalLabel.textContent = TOTAL_LIGHTS;
  seedWorld();
  resize();
  updateSoundButton();
  requestAnimationFrame(frame);
})();
