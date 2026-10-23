(() => {
  "use strict";

  const canvas = document.querySelector("#world");
  const screenContext = canvas.getContext("2d", { alpha: false });
  const backgroundCanvas = document.createElement("canvas");
  const darknessCanvas = document.createElement("canvas");
  const darknessContext = darknessCanvas.getContext("2d");
  backgroundCanvas.width = 2200;
  backgroundCanvas.height = 1500;
  const backgroundContext = backgroundCanvas.getContext("2d", { alpha: false });
  let ctx = screenContext;
  const overlay = document.querySelector("#overlay");
  const startButton = document.querySelector("#start-button");
  const pauseButton = document.querySelector("#pause-button");
  const soundButton = document.querySelector("#sound-button");
  const pulseButton = document.querySelector("#pulse-button");
  const dashButton = document.querySelector("#dash-button");
  const restartButton = document.querySelector("#restart-button");
  const difficultySelect = document.querySelector("#difficulty");
  const musicVolume = document.querySelector("#music-volume");
  const sfxVolume = document.querySelector("#sfx-volume");
  const countLabel = document.querySelector("#light-count");
  const totalLabel = document.querySelector("#light-total");
  const progressFill = document.querySelector("#progress-fill");
  const livesLabel = document.querySelector("#lives");
  const objectiveText = document.querySelector("#objective-text");
  const toast = document.querySelector("#toast");
  const overlayTitle = document.querySelector("#overlay-title");
  const overlayCopy = document.querySelector("#overlay-copy");
  const levelLesson = document.querySelector("#level-lesson");
  const starRule = document.querySelector("#star-rule");
  const levelLabel = document.querySelector("#level-label");
  const upgradePicker = document.querySelector("#upgrade-picker");

  const WORLD = { width: 2200, height: 1500 };
  const LEVELS = [
    { name: "The Quiet Garden", objective: "Find the scattered lights", lesson: "The lamps went dark here first. Drifters wake when you draw near.", lights: [[1000, 700, "gold"], [1250, 560, "gold"], [780, 1000, "gold"], [1400, 1050, "gold"]], moths: [["drifter", 600, 480]] },
    { name: "The Long Way Home", objective: "Follow the lantern trail", lesson: "Something remembers the light you carry. Blue light slows its wings.", lights: [[370, 750, "gold"], [1440, 300, "gold"], [1780, 470, "blue"], [1610, 920, "gold"], [1110, 510, "gold"]], moths: [["drifter", 530, 470], ["chaser", 1460, 650]] },
    { name: "River of Dreams", objective: "Cross the river for the lights", lesson: "The current carries sound. The reeds hide you only until they move.", lights: [[370, 750, "gold"], [740, 1030, "blue"], [1170, 1080, "gold"], [1610, 920, "gold"], [1900, 1190, "green"], [1440, 300, "gold"]], moths: [["drifter", 500, 480], ["chaser", 1490, 680], ["drifter", 1840, 900]] },
    { name: "The Mothlight Nest", objective: "Break the nest's moonlit guard", lesson: "Dashers flash before they strike. Orbiters guard the nest; something larger waits beyond it.", lights: [[460, 330, "gold"], [790, 245, "blue"], [1440, 300, "gold"], [1780, 470, "hot"], [370, 750, "gold"], [1610, 920, "green"], [1900, 1190, "gold"]], moths: [["chaser", 1510, 680], ["dasher", 1020, 1190], ["orbiter", 1780, 470], ["stalker", 600, 540]] }
  ];
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
  const FIXED_STEP = 1 / 60;
  const upgradeState = { glow: 0, pulse: 0, dash: 0 };

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
  let levelIndex = 0;
  let levelElapsed = 0;
  let levelHitCount = 0;
  let streak = 0;
  let score = 0;
  let checkpointScore = 0;
  let lastCollectAt = 0;
  let dashTime = 0;
  let invulnerability = 0;
  let hitShake = 0;
  let collectFreeze = 0;
  let playerHidden = false;
  let mothSlowTime = 0;
  let bushHiddenTime = 0;
  let bushRevealTime = 0;
  let hitSources = { drifter: 0, chaser: 0, dasher: 0, orbiter: 0 };
  let levelMaxFound = 0;
  let nextUpgradeAt = 3;
  let upgradePending = false;
  let heartbeatTime = 0;
  let heartbeatSecondBeat = false;
  let abilityCooldown = 0;
  let shownSlowSecond = -1;
  let resultWon = false;
  let musicGain;
  let ambienceOscillators = [];
  let sfxLevel = .65;
  let ambienceLevel = .18;
  let bestTimes = {};
  let pulseTime = 0;
  let hitFlash = 0;
  let elapsed = 0;
  let lastFrame = 0;
  let accumulator = 0;
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
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(viewWidth * dpr);
    canvas.height = Math.round(viewHeight * dpr);
    darknessCanvas.width = canvas.width;
    darknessCanvas.height = canvas.height;
    canvas.style.width = `${viewWidth}px`;
    canvas.style.height = `${viewHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedWorld() {
    const mothSpawns = [[600, 540], [1510, 680], [1020, 1190], [1850, 720]];

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

    for (let i = 0; i < 42; i++) {
      const x = 55 + random() * (WORLD.width - 110);
      const shoreY = 700 + 135 * Math.sin((x - 200) / 385);
      const side = random() < .5 ? -1 : 1;
      const y = shoreY + side * (132 + random() * 260);
      const levelLights = LEVELS.flatMap(level => level.lights.map(([lightX, lightY]) => ({ x: lightX, y: lightY })));
      const tooClose = [...levelLights, { x: player.x, y: player.y }, shrine, ...mothSpawns.map(([mx, my]) => ({ x: mx, y: my }))]
        .some(point => Math.hypot(point.x - x, point.y - y) < 105);
      if (!tooClose && y > 55 && y < WORLD.height - 55) {
        shrubs.push({ x, y, scale: .7 + random() * .85, tint: random() });
      }
    }

    for (let i = 0; i < 32; i++) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      if (Math.abs(y - (700 + 135 * Math.sin((x - 200) / 385))) < 105) continue;
      bloomSpots.push({ x, y, size: 2 + random() * 2, phase: random() * 6, tint: random() });
    }

    for (let i = 0; i < 360; i++) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      const shore = 700 + 135 * Math.sin((x - 200) / 385);
      if (Math.abs(y - shore) < 100 || Math.hypot(x - shrine.x, y - shrine.y) < 95) continue;
      reeds.push({ x, y, height: 8 + random() * 19, bend: (random() - .5) * 12, phase: random() * 6, tint: Math.floor(random() * 3) });
    }

    for (let i = 0; i < 145; i++) {
      const x = random() * WORLD.width;
      const y = random() * WORLD.height;
      if (Math.abs(y - (700 + 135 * Math.sin((x - 200) / 385))) < 90) continue;
      flowers.push({ x, y, size: 1.4 + random() * 2.3, phase: random() * 6, tint: random() });
    }

    for (let i = 0; i < 100; i++) {
      stars.push({ x: random() * WORLD.width, y: random() * WORLD.height, size: .5 + random() * 1.5, phase: random() * 7 });
    }
  }

  function initializeLevel(index) {
    levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    const level = LEVELS[levelIndex];
    lights.length = 0;
    const palette = { gold: "255, 221, 146", green: "167, 230, 185", blue: "152, 196, 255", hot: "255, 154, 100" };
    level.lights.forEach(([x, y, type], itemIndex) => lights.push({
      x, y, type, color: palette[type], phase: random() * Math.PI * 2,
      collected: false, revealed: 0, itemIndex
    }));
    player.x = 1100;
    player.y = 790;
    player.vx = 0;
    player.vy = 0;
    spawnMoths();
    found = 0;
    streak = 0;
    lastCollectAt = 0;
    levelElapsed = 0;
    levelHitCount = 0;
    levelMaxFound = 0;
    nextUpgradeAt = 3;
    lives = difficultySelect.value === "cozy" ? 5 : difficultySelect.value === "moonless" ? 1 : 3;
    dashTime = 0;
    invulnerability = 0;
    hitFlash = 0;
    hitShake = 0;
    collectFreeze = 0;
    mothSlowTime = 0;
    shownSlowSecond = -1;
    bushHiddenTime = 0;
    bushRevealTime = 0;
    abilityCooldown = 0;
    heartbeatTime = 0;
    heartbeatSecondBeat = false;
    hitSources = { drifter: 0, chaser: 0, dasher: 0, orbiter: 0, stalker: 0 };
    playerHidden = false;
    resultWon = false;
    upgradePending = false;
    keys.clear();
    pointer.active = false;
    finished = false;
    countLabel.textContent = "0";
    totalLabel.textContent = lights.length;
    progressFill.style.width = "0";
    levelLabel.textContent = `LEVEL ${levelIndex + 1} · ${level.name.toUpperCase()}`;
    objectiveText.textContent = level.objective;
    levelLesson.textContent = level.lesson;
    starRule.textContent = difficultySelect.value === "moonless"
      ? "Moonless vow: finish without a hit to earn the exclusive Moonless Star."
      : "Three marks: no wounds, under 2:10. Each hit scatters a light.";
    renderLives();
    pulseButton.disabled = false;
    dashButton.disabled = false;
  }

  function spawnMoths() {
    moths.length = 0;
    const level = LEVELS[levelIndex];
    const speedScale = difficultySelect.value === "cozy" ? .76 : difficultySelect.value === "moonless" ? 1.26 : 1;
    level.moths.forEach(([type, x, y], index) => {
      const targetLight = type === "orbiter"
        ? lights.reduce((nearest, light) => Math.hypot(light.x - x, light.y - y) < Math.hypot(nearest.x - x, nearest.y - y) ? light : nearest, lights[0])
        : null;
      moths.push({
        type, x, y, vx: 0, vy: 0, homeX: x, homeY: y, phase: random() * 8,
        speed: (type === "stalker" ? 37 : type === "dasher" ? 78 : type === "chaser" ? 49 : type === "orbiter" ? 60 : 52) * speedScale,
        stunned: 0, targetLight, wanderX: x, wanderY: y, wanderTimer: 0,
        state: "idle", stateTime: 0, attackX: 0, attackY: 0, turn: random() * 6 + index,
        lastKnownX: player.x, lastKnownY: player.y, searchTime: 0, alertTime: 0
      });
    });
  }

  function roundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function visibleInWorld(x, y, margin = 48) {
    return x >= camera.x - margin && x <= camera.x + viewWidth + margin
      && y >= camera.y - margin && y <= camera.y + viewHeight + margin;
  }

  function prepareBackground() {
    ctx = backgroundContext;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawWorld(0);
    ctx = screenContext;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWorld(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, "#101d2c");
    sky.addColorStop(.38, "#12232b");
    sky.addColorStop(1, "#07141b");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.save();
    ctx.globalAlpha = .35;
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      if (!visibleInWorld(star.x, star.y)) continue;
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
      if (!visibleInWorld(pad.x, pad.y, 24)) continue;
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
      if (!visibleInWorld(reed.x, reed.y, reed.height + 12)) continue;
      const sway = Math.sin(time * .8 + reed.phase) * 3;
      ctx.strokeStyle = ["rgba(158, 179, 119, .32)", "rgba(115, 161, 128, .34)", "rgba(194, 174, 116, .25)"][reed.tint];
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(reed.x, reed.y);
      ctx.quadraticCurveTo(reed.x + sway, reed.y - reed.height * .55, reed.x + reed.bend + sway, reed.y - reed.height);
      ctx.stroke();
    }

    for (const flower of flowers) {
      if (!visibleInWorld(flower.x, flower.y, 8)) continue;
      const pulse = .82 + .18 * Math.sin(time * .75 + flower.phase);
      const hue = flower.tint > .8 ? "224, 192, 130" : flower.tint > .53 ? "174, 191, 151" : "180, 178, 198";
      ctx.fillStyle = `rgba(${hue}, ${.53 * pulse})`;
      ctx.beginPath();
      ctx.arc(flower.x, flower.y, flower.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const shrub of shrubs) {
      if (visibleInWorld(shrub.x, shrub.y, 35 * shrub.scale)) drawShrub(shrub);
    }
    for (const bloom of bloomSpots) {
      if (visibleInWorld(bloom.x, bloom.y, 6)) drawBloom(bloom, time);
    }
    for (const tree of trees) {
      if (visibleInWorld(tree.x, tree.y, 45 * tree.scale)) drawTree(tree);
    }
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
    const active = found === lights.length;
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
    const distance = Math.hypot(player.x - light.x, player.y - light.y);
    const glowRange = 230 + Math.min(found, 8) * 25;
    if (distance > glowRange && light.revealed <= 0) {
      if (distance > 580) return;
      const shimmer = .14 + .12 * Math.sin(time * 1.7 + light.phase);
      ctx.fillStyle = `rgba(${light.color}, ${shimmer})`;
      ctx.shadowColor = `rgb(${light.color})`;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }
    const bob = Math.sin(time * 1.8 + light.phase) * 5;
    const x = light.x;
    const y = light.y + bob;
    const color = light.color;
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
    ctx.shadowBlur = light.type === "hot" ? 24 : 15;
    if (light.type === "green") {
      ctx.fillRect(x - 4, y - 4, 8, 8);
    } else if (light.type === "blue") {
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 5, y);
      ctx.closePath();
      ctx.fill();
    } else if (light.type === "hot") {
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x + 5, y + 4);
      ctx.lineTo(x - 5, y + 4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 4 + Math.sin(time * 2.2 + light.phase) * .7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 249, 219, .8)";
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMoth(moth, time) {
    const flapSpeed = moth.state === "windup" || moth.state === "dash" ? 28 : 13;
    const flap = Math.sin(time * flapSpeed + moth.phase) * (moth.state === "windup" ? .75 : .38);
    const bob = Math.sin(time * 3 + moth.phase) * 3;
    const scale = moth.type === "stalker" ? 1.9 : 1.2;
    ctx.save();
    ctx.translate(moth.x, moth.y + bob);
    ctx.scale(scale, scale);
    ctx.rotate(Math.atan2(moth.vy, moth.vx) * .2);
    if (moth.alertTime > 0) {
      ctx.strokeStyle = `rgba(255, 151, 105, ${.26 + .24 * Math.sin(time * 7)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, moth.type === "stalker" ? 25 : 17, 0, Math.PI * 2);
      ctx.stroke();
    }
    const alpha = moth.stunned > 0 ? .38 : .94;
    ctx.globalAlpha = alpha;
    if (moth.state === "windup") {
      const warning = .45 + .4 * Math.sin(time * 23);
      ctx.strokeStyle = `rgba(255, 166, 125, ${warning})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, (moth.type === "stalker" ? 24 : 17) + warning * 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    const wingColor = moth.stunned > 0 ? "rgba(133, 155, 166, .55)"
      : moth.type === "dasher" ? "rgba(99, 54, 61, .96)"
        : moth.type === "chaser" ? "rgba(57, 58, 78, .97)"
          : moth.type === "orbiter" ? "rgba(91, 73, 45, .97)"
            : moth.type === "stalker" ? "rgba(22, 28, 40, .99)"
              : "rgba(46, 67, 75, .94)";
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(-8, -8 - flap * 4);
    ctx.lineTo(-18, -12 - flap * 6);
    ctx.lineTo(-15, -2);
    ctx.lineTo(-21, 8 + flap * 3);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.moveTo(2, -2);
    ctx.lineTo(8, -8 + flap * 4);
    ctx.lineTo(18, -12 + flap * 6);
    ctx.lineTo(15, -2);
    ctx.lineTo(21, 8 - flap * 3);
    ctx.lineTo(7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = moth.type === "stalker" ? "rgba(129, 145, 157, .48)" : "rgba(160, 170, 175, .35)";
    ctx.lineWidth = .8;
    ctx.stroke();
    ctx.fillStyle = "#151923";
    ctx.beginPath();
    ctx.ellipse(0, 0, moth.type === "stalker" ? 4 : 3, moth.type === "stalker" ? 8 : 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(175, 186, 195, .5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.quadraticCurveTo(-8, -15, -11, -16);
    ctx.moveTo(2, -5);
    ctx.quadraticCurveTo(8, -15, 11, -16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = moth.type === "stalker" || moth.type === "dasher" ? "#dc887d" : "#d4c17e";
    ctx.shadowColor = moth.type === "stalker" ? "#da7772" : "#e2bd71";
    ctx.shadowBlur = moth.type === "stalker" ? 12 : 7;
    ctx.beginPath();
    ctx.arc(-2, -2, moth.type === "stalker" ? 1.8 : 1.3, 0, Math.PI * 2);
    ctx.arc(2, -2, moth.type === "stalker" ? 1.8 : 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawPlayer(time) {
    const bob = Math.sin(time * 8) * 2;
    const carryingHot = lights.some(light => light.type === "hot" && light.collected);
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.rotate(player.facing * .13);
    if (invulnerability > 0 && Math.floor(time * 17) % 2 === 0) ctx.globalAlpha = .38;

    const glowRadius = (142 + Math.min(found, 8) * 11 + upgradeState.glow * 24) * (carryingHot ? 1.18 : 1);
    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, glowRadius);
    halo.addColorStop(0, carryingHot ? "rgba(255, 126, 82, .43)" : lives <= 1 ? "rgba(255, 145, 135, .3)" : `rgba(255, 220, 140, ${.23 + found * .028})`);
    halo.addColorStop(1, "rgba(255, 220, 140, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    if (carryingHot) {
      ctx.strokeStyle = `rgba(255, 155, 91, ${.28 + .12 * Math.sin(time * 5)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = dashTime > 0 ? "rgba(238, 224, 181, .82)" : "rgba(166, 167, 143, .72)";
    ctx.beginPath();
    ctx.ellipse(-11, 2, 10 + (dashTime > 0 ? 4 : 0), 5, -.45, 0, Math.PI * 2);
    ctx.ellipse(11, 2, 10 + (dashTime > 0 ? 4 : 0), 5, .45, 0, Math.PI * 2);
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
    ctx.fillStyle = lives <= 1 ? "#f19084" : "#e9bb75";
    ctx.shadowColor = lives <= 1 ? "#f18a7e" : "#f7d283";
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
    const progress = 1 - pulseTime / (.65 + .15 * upgradeState.pulse);
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

  function drawDarkness() {
    darknessContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    darknessContext.clearRect(0, 0, viewWidth, viewHeight);
    darknessContext.globalCompositeOperation = "source-over";
    darknessContext.fillStyle = "rgba(1, 5, 13, .91)";
    darknessContext.fillRect(0, 0, viewWidth, viewHeight);
    darknessContext.globalCompositeOperation = "destination-out";

    const reveal = (x, y, radius) => {
      const gradient = darknessContext.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
      gradient.addColorStop(.62, "rgba(0, 0, 0, .88)");
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      darknessContext.fillStyle = gradient;
      darknessContext.beginPath();
      darknessContext.arc(x, y, radius, 0, Math.PI * 2);
      darknessContext.fill();
    };

    const glowRadius = 205 + Math.min(found, 8) * 17 + upgradeState.glow * 38;
    reveal(player.x - camera.x, player.y - camera.y, glowRadius);
    for (const light of lights) {
      if (light.collected) continue;
      const distance = Math.hypot(player.x - light.x, player.y - light.y);
      if (distance < 580 || light.revealed > 0) {
        reveal(light.x - camera.x, light.y - camera.y, light.revealed > 0 ? 118 : 48);
      }
    }
    for (const moth of moths) {
      if (Math.hypot(player.x - moth.x, player.y - moth.y) < 390 || moth.state === "windup") {
        reveal(moth.x - camera.x, moth.y - camera.y, moth.type === "stalker" ? 74 : 48);
      }
    }

    darknessContext.globalCompositeOperation = "source-over";
    ctx.drawImage(darknessCanvas, 0, 0, viewWidth, viewHeight);
  }

  function frame(timestamp) {
    const dt = Math.min((timestamp - lastFrame) / 1000 || 0, .1);
    lastFrame = timestamp;
    if (started && !paused && !finished) {
      accumulator += dt;
      let steps = 0;
      while (accumulator >= FIXED_STEP && steps < 6 && !paused && !finished) {
        update(FIXED_STEP);
        accumulator -= FIXED_STEP;
        steps++;
      }
      if (steps === 6) accumulator = 0;
    }
    elapsed += dt;

    camera.x = Math.max(0, Math.min(WORLD.width - viewWidth, player.x - viewWidth / 2));
    camera.y = Math.max(0, Math.min(WORLD.height - viewHeight, player.y - viewHeight / 2));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    ctx.save();
    const shakeX = hitShake > 0 ? (Math.random() - .5) * hitShake * 14 : 0;
    const shakeY = hitShake > 0 ? (Math.random() - .5) * hitShake * 14 : 0;
    ctx.translate(-camera.x + shakeX, -camera.y + shakeY);
    ctx.drawImage(backgroundCanvas, 0, 0);
    for (const light of lights) {
      if (visibleInWorld(light.x, light.y, 45)) drawLight(light, elapsed);
    }
    for (const moth of moths) {
      if (visibleInWorld(moth.x, moth.y, 35)) drawMoth(moth, elapsed);
    }
    drawPulse();
    drawPlayer(elapsed);
    drawMotes(dt);
    ctx.restore();

    drawDarkness();
    drawCompass();
    if (lives <= 1) {
      const vignette = ctx.createRadialGradient(viewWidth / 2, viewHeight / 2, Math.min(viewWidth, viewHeight) * .3, viewWidth / 2, viewHeight / 2, Math.max(viewWidth, viewHeight) * .72);
      vignette.addColorStop(0, "rgba(144, 58, 68, 0)");
      vignette.addColorStop(1, `rgba(144, 58, 68, ${.22 + .06 * Math.sin(elapsed * 2)})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
    if (hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 190, 160, ${Math.min(.12, hitFlash * .08)})`;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
    hitShake = Math.max(0, hitShake - dt * 3.4);
    requestAnimationFrame(frame);
  }

  function drawCompass() {
    if (found < lights.length - 2 && levelElapsed - lastCollectAt < 30) return;
    const target = lights.filter(light => !light.collected)
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
    if (!target) return;
    const x = target.x - camera.x;
    const y = target.y - camera.y;
    if (x >= 18 && x <= viewWidth - 18 && y >= 18 && y <= viewHeight - 18) return;
    const angle = Math.atan2(y - viewHeight / 2, x - viewWidth / 2);
    const padding = 27;
    const distanceToEdge = Math.min(
      Math.abs((viewWidth / 2 - padding) / Math.cos(angle)),
      Math.abs((viewHeight / 2 - padding) / Math.sin(angle))
    );
    const arrowX = viewWidth / 2 + Math.cos(angle) * distanceToEdge;
    const arrowY = viewHeight / 2 + Math.sin(angle) * distanceToEdge;
    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(255, 225, 164, .82)";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function update(dt) {
    abilityCooldown = Math.max(0, abilityCooldown - dt);
    dashTime = Math.max(0, dashTime - dt);
    invulnerability = Math.max(0, invulnerability - dt);
    mothSlowTime = Math.max(0, mothSlowTime - dt);
    bushRevealTime = Math.max(0, bushRevealTime - dt);
    hitFlash = Math.max(0, hitFlash - dt);
    if (lives <= 1) {
      heartbeatTime -= dt;
      if (heartbeatTime <= 0) {
        playTone(heartbeatSecondBeat ? 54 : 66, .2, "sine", .11);
        heartbeatSecondBeat = !heartbeatSecondBeat;
        heartbeatTime = heartbeatSecondBeat ? .17 : .78;
      }
    } else {
      heartbeatTime = 0;
      heartbeatSecondBeat = false;
    }
    if (collectFreeze > 0) {
      collectFreeze -= dt;
      return;
    }
    levelElapsed += dt;
    pulseTime = Math.max(0, pulseTime - dt);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toast.classList.remove("visible");
    }
    pulseButton.disabled = abilityCooldown > 0 || !started;
    pulseButton.innerHTML = abilityCooldown > 0
      ? `✧ <span>READY IN ${abilityCooldown.toFixed(1)}s</span><kbd>SPACE</kbd>`
      : `✧ <span>MOON PULSE</span><kbd>SPACE</kbd>`;
    dashButton.disabled = abilityCooldown > 0 || !started;
    dashButton.innerHTML = abilityCooldown > 0
      ? `➜ <span>READY IN ${abilityCooldown.toFixed(1)}s</span><kbd>SHIFT</kbd>`
      : `➜ <span>DASH</span><kbd>SHIFT</kbd>`;

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
      player.facing = Math.atan2(ay, ax);
    }

    const playerInRiver = Math.abs(player.y - riverY(player.x)) < 100;
    const insideBush = shrubs.some(shrub => Math.hypot((player.x - shrub.x) / 1.5, (player.y - shrub.y) / 1.1) < 21 * shrub.scale);
    if (insideBush && !playerHidden) showToast("The reeds swallow your signal.");
    bushHiddenTime = insideBush ? bushHiddenTime + dt : 0;
    if (!insideBush) bushRevealTime = 0;
    if (insideBush && bushHiddenTime >= 3.2 && bushRevealTime <= 0) {
      bushRevealTime = 2;
      bushHiddenTime = 0;
      showToast("The moths flush your hiding place!");
      playTone(260, .14, "triangle", .04);
    }
    playerHidden = insideBush && bushRevealTime <= 0;
    const carryingHot = lights.some(light => light.type === "hot" && light.collected);
    const detectionRadius = 270 + found * 15 + upgradeState.glow * 30 + (carryingHot ? 160 : 0);
    const slowSecond = Math.ceil(mothSlowTime);
    if (slowSecond !== shownSlowSecond) {
      shownSlowSecond = slowSecond;
      objectiveText.textContent = mothSlowTime > 0
        ? `Moths slowed ${slowSecond}s · ${LEVELS[levelIndex].objective}`
        : carryingHot
          ? "HOT LIGHT · moths are drawn to you"
          : found === lights.length
            ? "The old lantern is waiting"
            : LEVELS[levelIndex].objective;
    }

    const speed = 205 * (playerInRiver ? .64 : 1);
    const blend = 1 - Math.exp(-(dashTime > 0 ? 15 : 8) * dt);
    if (dashTime > 0) {
      player.vx += (player.dashX * 465 - player.vx) * blend;
      player.vy += (player.dashY * 465 - player.vy) * blend;
    } else {
      player.vx += (ax * speed - player.vx) * blend;
      player.vy += (ay * speed - player.vy) * blend;
      if (magnitude === 0) {
        player.vx *= Math.exp(-6 * dt);
        player.vy *= Math.exp(-6 * dt);
      }
      if (playerInRiver) {
        const slope = 135 / 385 * Math.cos((player.x - 200) / 385);
        const length = Math.hypot(1, slope);
        player.vx += 25 / length * dt;
        player.vy += 25 * slope / length * dt;
      }
    }
    player.x = Math.max(28, Math.min(WORLD.width - 28, player.x + player.vx * dt));
    player.y = Math.max(28, Math.min(WORLD.height - 28, player.y + player.vy * dt));

    for (const light of lights) {
      light.revealed = Math.max(0, light.revealed - dt);
      if (!light.collected && Math.hypot(player.x - light.x, player.y - light.y) < 29) collect(light);
    }

    for (const moth of moths) {
      moth.stunned = Math.max(0, moth.stunned - dt);
      moth.alertTime = Math.max(0, moth.alertTime - dt);
      const distance = Math.hypot(player.x - moth.x, player.y - moth.y);
      if (carryingHot && distance < detectionRadius) moth.alertTime = Math.max(moth.alertTime, .35);
      moth.wanderTimer -= dt;
      if (moth.stunned > 0) {
        moth.vx *= Math.exp(-3 * dt);
        moth.vy *= Math.exp(-3 * dt);
        moth.x += moth.vx * dt;
        moth.y += moth.vy * dt;
        continue;
      }
      if (pulseTime > 0 && distance < 205) {
        const push = Math.atan2(moth.y - player.y, moth.x - player.x);
        moth.vx += Math.cos(push) * 520 * dt;
        moth.vy += Math.sin(push) * 520 * dt;
      }

      if (moth.state === "windup") {
        moth.stateTime -= dt;
        moth.vx *= Math.exp(-8 * dt);
        moth.vy *= Math.exp(-8 * dt);
        if (moth.stateTime <= 0) {
          moth.state = "dash";
          moth.stateTime = moth.type === "stalker" ? .48 : moth.type === "dasher" ? .46 : .3;
          const speed = (moth.type === "stalker" ? 345 : moth.type === "dasher" ? 390 : 285) * (mothSlowTime > 0 ? .48 : 1);
          moth.vx = moth.attackX * speed;
          moth.vy = moth.attackY * speed;
          playTone(moth.type === "stalker" ? 145 : moth.type === "dasher" ? 280 : 220, .12, "triangle", .025);
        }
      } else if (moth.state === "dash") {
        moth.stateTime -= dt;
        moth.x += moth.vx * dt;
        moth.y += moth.vy * dt;
        if (moth.stateTime <= 0) {
          moth.state = "recover";
          moth.stateTime = .72;
          moth.vx *= .3;
          moth.vy *= .3;
        }
      } else if (moth.state === "recover") {
        moth.stateTime -= dt;
        moth.vx *= Math.exp(-3 * dt);
        moth.vy *= Math.exp(-3 * dt);
        moth.x += moth.vx * dt;
        moth.y += moth.vy * dt;
        if (moth.stateTime <= 0) moth.state = "idle";
      } else {
        let targetX = moth.homeX + Math.cos(elapsed * .55 + moth.phase) * 45;
        let targetY = moth.homeY + Math.sin(elapsed * .62 + moth.phase) * 40;
        const canSee = !playerHidden && distance < detectionRadius;
        if (canSee) {
          moth.lastKnownX = player.x;
          moth.lastKnownY = player.y;
          moth.searchTime = 4;
        } else if (moth.searchTime > 0) {
          moth.searchTime = Math.max(0, moth.searchTime - dt);
        }
        const searching = playerHidden && moth.searchTime > 0;
        if (moth.type === "orbiter" && moth.targetLight) {
          targetX = moth.targetLight.x + Math.cos(elapsed * 1.2 + moth.phase) * 58;
          targetY = moth.targetLight.y + Math.sin(elapsed * 1.2 + moth.phase) * 42;
          if (canSee && distance < 265) {
            targetX = player.x;
            targetY = player.y;
            if (distance < 170) beginAttack(moth);
          } else if (searching) {
            targetX = moth.lastKnownX;
            targetY = moth.lastKnownY;
          }
        } else if (moth.type === "drifter") {
          if (moth.wanderTimer <= 0 || Math.hypot(moth.x - moth.wanderX, moth.y - moth.wanderY) < 18) {
            moth.wanderX = Math.max(80, Math.min(WORLD.width - 80, moth.homeX + (Math.random() - .5) * 310));
            moth.wanderY = Math.max(80, Math.min(WORLD.height - 80, moth.homeY + (Math.random() - .5) * 260));
            moth.wanderTimer = 2 + Math.random() * 2;
          }
          targetX = moth.wanderX;
          targetY = moth.wanderY;
          if (canSee && distance < 112) beginAttack(moth);
          else if (canSee && distance < detectionRadius) {
            const away = Math.atan2(moth.y - player.y, moth.x - player.x);
            targetX = moth.x + Math.cos(away) * 110;
            targetY = moth.y + Math.sin(away) * 110;
          } else if (searching) {
            targetX = moth.lastKnownX;
            targetY = moth.lastKnownY;
          }
        } else if (moth.type === "dasher") {
          if (canSee && distance < 410 && distance > 76) beginAttack(moth);
          else if (canSee && distance <= 76) {
            const away = Math.atan2(moth.y - player.y, moth.x - player.x);
            targetX = moth.x + Math.cos(away) * 130;
            targetY = moth.y + Math.sin(away) * 130;
          } else if (searching) {
            targetX = moth.lastKnownX;
            targetY = moth.lastKnownY;
          }
        } else if (moth.type === "stalker") {
          if (canSee && distance < 285) beginAttack(moth);
          else if (canSee) {
            targetX = player.x;
            targetY = player.y;
          } else if (searching) {
            targetX = moth.lastKnownX;
            targetY = moth.lastKnownY;
          }
        } else if (canSee) {
          targetX = player.x;
          targetY = player.y;
          if (distance < 164) beginAttack(moth);
        } else if (searching) {
          targetX = moth.lastKnownX;
          targetY = moth.lastKnownY;
        }
        if (moth.state === "idle") {
          const angle = Math.atan2(targetY - moth.y, targetX - moth.x);
          const chaseSpeed = (moth.type === "drifter" ? moth.speed * .7 : moth.type === "chaser" ? moth.speed * .78 : moth.speed * .64) * (mothSlowTime > 0 ? .48 : 1);
          moth.vx += (Math.cos(angle) * chaseSpeed - moth.vx) * Math.min(1, dt * 1.7);
          moth.vy += (Math.sin(angle) * chaseSpeed - moth.vy) * Math.min(1, dt * 1.7);
          moth.x += moth.vx * dt;
          moth.y += moth.vy * dt;
        }
      }
      moth.x = Math.max(20, Math.min(WORLD.width - 20, moth.x));
      moth.y = Math.max(20, Math.min(WORLD.height - 20, moth.y));
      const contact = Math.hypot(player.x - moth.x, player.y - moth.y) < (moth.type === "stalker" ? 38 : 25);
      if (contact && moth.state === "dash" && invulnerability <= 0 && !playerHidden) {
        takeHit(moth);
        if (finished) return;
      }
    }

    if (found === lights.length && Math.hypot(player.x - shrine.x, player.y - shrine.y) < 52) finishGame();
  }

  function beginAttack(moth) {
    if (moth.state !== "idle") return;
    moth.state = "windup";
    moth.stateTime = moth.type === "stalker" ? 1.05 : moth.type === "dasher" ? .82 : .62;
    const targetX = playerHidden ? moth.lastKnownX : player.x;
    const targetY = playerHidden ? moth.lastKnownY : player.y;
    const aim = Math.atan2(targetY - moth.y, targetX - moth.x);
    moth.attackX = Math.cos(aim);
    moth.attackY = Math.sin(aim);
  }

  function riverY(x) {
    return 700 + 135 * Math.sin((x - 200) / 385);
  }

  function collect(light) {
    light.collected = true;
    found++;
    const now = levelElapsed;
    streak = now - lastCollectAt < 7 ? streak + 1 : 1;
    lastCollectAt = now;
    const bonus = 100 * streak;
    score += bonus;
    collectFreeze = .05;
    countLabel.textContent = found;
    progressFill.style.width = `${found / lights.length * 100}%`;
    levelMaxFound = Math.max(levelMaxFound, found);
    burst(light.x, light.y, `rgb(${light.color})`, 24);
    playTone(550 + found * 56 + streak * 26, .2, "sine", .06);
    if (light.type === "green") {
      const maxLives = difficultySelect.value === "cozy" ? 5 : difficultySelect.value === "moonless" ? 1 : 3;
      if (lives < maxLives) {
        lives++;
        renderLives();
        showToast("Green light restores your vital glow.");
      } else {
        showToast("A green firefly glows warmly. Life is already full.");
      }
    } else if (light.type === "blue") {
      mothSlowTime = 5;
      shownSlowSecond = -1;
      showToast("Blue light slows moths for 5 seconds. Your abilities recharge normally.");
    } else if (light.type === "hot") {
      shownSlowSecond = -1;
      showToast("HOT LIGHT! Your orange glow draws moths from farther away.");
      playTone(760, .18, "sawtooth", .04);
      playTone(520, .2, "triangle", .035);
    } else {
      showToast(streak > 1 ? `Light streak x${streak} · +${bonus}` : `A light found its way back · +${bonus}`);
    }
    if (found === lights.length) {
      objectiveText.textContent = "The old lantern is waiting";
      showToast("Every recovered light remembers the lantern.");
      playTone(920, .45, "sine", .07);
    }
    if (levelMaxFound >= nextUpgradeAt && nextUpgradeAt <= lights.length) {
      nextUpgradeAt += 3;
      openUpgradePicker();
    }
  }

  function openUpgradePicker() {
    if (upgradePending) return;
    upgradePending = true;
    paused = true;
    overlayTitle.textContent = "A choice in the dark";
    overlayCopy.textContent = "Three lights returned. Choose what survives the crossing.";
    levelLesson.textContent = "";
    starRule.textContent = "The wings are listening.";
    overlay.classList.remove("hidden", "settings-visible");
    overlay.classList.add("upgrade-active");
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", "Upgrade choice required");
    upgradePicker.querySelector("button")?.focus();
  }

  function chooseUpgrade(choice) {
    if (!upgradePending) return;
    if (choice === "glow") upgradeState.glow++;
    else if (choice === "pulse") upgradeState.pulse++;
    else if (choice === "dash") upgradeState.dash++;
    else return;

    upgradePending = false;
    paused = false;
    overlay.classList.remove("upgrade-active");
    overlay.classList.add("hidden");
    showToast({
      glow: "Your signal widens. The dark can see it too.",
      pulse: "The pulse holds the dark back longer.",
      dash: "Your next dash carries farther."
    }[choice]);
    lastFrame = performance.now();
    accumulator = 0;
  }

  function takeHit(moth) {
    lives--;
    levelHitCount++;
    hitSources[moth.type] = (hitSources[moth.type] || 0) + 1;
    hitFlash = .22;
    invulnerability = 1.2;
    hitShake = 1;
    moth.state = "recover";
    moth.stateTime = 1;
    const angle = Math.atan2(player.y - moth.y, player.x - moth.x);
    player.vx += Math.cos(angle) * 230;
    player.vy += Math.sin(angle) * 230;
    burst(player.x, player.y, "#e6b7a3", 12);
    dropCarriedLight();
    renderLives();
    playTone(180, .2, "triangle", .06);
    showToast(lives ? "Your light slips free. Recover it before moving on." : "The last glow is gone.");
    if (lives <= 0) endGame(false);
  }

  function dropCarriedLight() {
    const light = [...lights].reverse().find(item => item.collected);
    if (!light) return;
    light.collected = false;
    light.x = Math.max(35, Math.min(WORLD.width - 35, player.x + (random() - .5) * 54));
    light.y = Math.max(35, Math.min(WORLD.height - 35, player.y + (random() - .5) * 54));
    light.phase = random() * Math.PI * 2;
    found = Math.max(0, found - 1);
    countLabel.textContent = found;
    progressFill.style.width = `${found / lights.length * 100}%`;
  }

  function scatterCarriedLights() {
    const carried = lights.filter(light => light.collected);
    carried.forEach((light, index) => {
      const angle = index * Math.PI * 2 / Math.max(1, carried.length);
      light.collected = false;
      light.x = Math.max(35, Math.min(WORLD.width - 35, player.x + Math.cos(angle) * (24 + index * 7)));
      light.y = Math.max(35, Math.min(WORLD.height - 35, player.y + Math.sin(angle) * (24 + index * 7)));
      light.phase = random() * Math.PI * 2;
    });
    found = 0;
    countLabel.textContent = "0";
    progressFill.style.width = "0";
  }

  function renderLives() {
    const maxLives = difficultySelect.value === "cozy" ? 5 : difficultySelect.value === "moonless" ? 1 : 3;
    livesLabel.innerHTML = `${"✦ ".repeat(lives)}<span class="empty">${"✧ ".repeat(Math.max(0, maxLives - lives))}</span>`;
    livesLabel.setAttribute("aria-label", `${lives} ${lives === 1 ? "light remains" : "lights remain"}`);
  }

  function activatePulse() {
    if (!started || paused || finished || abilityCooldown > 0) return;
    pulseTime = .65 + .15 * upgradeState.pulse;
    abilityCooldown = 5;
    playTone(350, .2, "sine", .045);
    for (const light of lights) {
      if (!light.collected && Math.hypot(player.x - light.x, player.y - light.y) < 430) light.revealed = 5;
    }
    for (const moth of moths) {
      if (Math.hypot(player.x - moth.x, player.y - moth.y) < 205) {
        moth.stunned = 2.2 + .65 * upgradeState.pulse;
        moth.state = "recover";
        moth.stateTime = 1.25;
        const angle = Math.atan2(moth.y - player.y, moth.x - player.x);
        moth.vx += Math.cos(angle) * 185;
        moth.vy += Math.sin(angle) * 185;
        burst(moth.x, moth.y, "#e7d4a0", 7);
      }
    }
  }

  function activateDash() {
    if (!started || paused || finished || abilityCooldown > 0) return;
    let dx = player.vx;
    let dy = player.vy;
    if (Math.hypot(dx, dy) < 15) {
      dx = Math.cos(player.facing);
      dy = Math.sin(player.facing);
    }
    const length = Math.hypot(dx, dy) || 1;
    player.dashX = dx / length;
    player.dashY = dy / length;
    player.facing = Math.atan2(player.dashY, player.dashX);
    dashTime = .22 + .08 * upgradeState.dash;
    abilityCooldown = 6;
    playTone(410, .12, "sawtooth", .025);
    burst(player.x, player.y, "#e8d9a7", 5);
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
      gain.gain.setValueAtTime(volume * sfxLevel, audioContext.currentTime);
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

  function updateAudioLevels() {
    ambienceLevel = Number(musicVolume.value) / 100;
    sfxLevel = Number(sfxVolume.value) / 100;
    if (musicGain && audioContext) {
      musicGain.gain.setTargetAtTime(soundOn ? ambienceLevel * .035 : 0, audioContext.currentTime, .12);
    }
    saveSettings();
  }

  function saveSettings() {
    try {
      localStorage.setItem("mothlight-settings", JSON.stringify({
        difficulty: difficultySelect.value,
        music: musicVolume.value,
        sfx: sfxVolume.value,
        sound: soundOn
      }));
    } catch (error) {
      console.warn("Could not save game settings.", error);
    }
  }

  function loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem("mothlight-settings") || "{}");
      if (["cozy", "normal", "moonless"].includes(settings.difficulty)) difficultySelect.value = settings.difficulty;
      if (Number.isFinite(Number(settings.music))) musicVolume.value = String(Math.max(0, Math.min(100, Number(settings.music))));
      if (Number.isFinite(Number(settings.sfx))) sfxVolume.value = String(Math.max(0, Math.min(100, Number(settings.sfx))));
      if (typeof settings.sound === "boolean") soundOn = settings.sound;
      bestTimes = JSON.parse(localStorage.getItem("mothlight-best-times") || "{}");
      if (!bestTimes || typeof bestTimes !== "object" || Array.isArray(bestTimes)) bestTimes = {};
    } catch (error) {
      console.warn("Could not load saved game settings.", error);
    }
  }

  function startAmbience() {
    if (!soundOn) return;
    try {
      audioContext ??= new AudioContext();
      if (audioContext.state === "suspended") audioContext.resume();
      if (ambienceOscillators.length) return;
      musicGain = audioContext.createGain();
      musicGain.gain.value = ambienceLevel * .035;
      musicGain.connect(audioContext.destination);
      for (const [frequency, volume] of [[55, 1], [82.41, .38]]) {
        const oscillator = audioContext.createOscillator();
        const partialGain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        partialGain.gain.value = volume;
        oscillator.connect(partialGain);
        partialGain.connect(musicGain);
        oscillator.start();
        ambienceOscillators.push(oscillator);
      }
    } catch (error) {
      console.warn("Ambient music could not be started in this browser.", error);
      soundOn = false;
      updateSoundButton();
    }
  }

  function startGame() {
    if (upgradePending) return;
    if (finished) {
      if (resultWon && levelIndex < LEVELS.length - 1) {
        initializeLevel(levelIndex + 1);
      } else if (resultWon) {
        levelIndex = 0;
        score = 0;
        checkpointScore = 0;
        upgradeState.glow = 0;
        upgradeState.pulse = 0;
        upgradeState.dash = 0;
        initializeLevel(0);
      } else {
        recoverFromDeath();
      }
    }
    startAmbience();
    started = true;
    paused = false;
    overlay.classList.add("hidden");
    overlay.classList.remove("settings-visible", "upgrade-active");
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", "Pause game");
    lastFrame = performance.now();
    accumulator = 0;
  }

  function togglePause() {
    if (!started || finished || upgradePending) return;
    paused = !paused;
    overlayTitle.textContent = paused ? "The garden waits" : "MOTHLIGHT";
    overlayCopy.innerHTML = paused
      ? "The wings do not sleep.<br>Choose a mood, change the sound, or return to the dark."
      : "The garden went dark the night the lamps were taken.<br>Carry what remains. The wings have learned your name.";
    startButton.querySelector("span:first-child").textContent = paused ? "Return to the garden" : "Enter the garden";
    overlay.classList.toggle("hidden", !paused);
    overlay.classList.toggle("settings-visible", paused);
    pauseButton.textContent = paused ? "▶" : "Ⅱ";
    pauseButton.setAttribute("aria-label", paused ? "Resume game" : "Pause game");
    if (!paused) {
      lastFrame = performance.now();
      accumulator = 0;
    }
  }

  function finishGame() {
    endGame(true);
  }

  function endGame(won) {
    if (!won) scatterCarriedLights();
    finished = true;
    paused = false;
    resultWon = won;
    const isFinalLevel = levelIndex === LEVELS.length - 1;
    const starsEarned = levelHitCount === 0 && levelElapsed < 130 ? 3 : levelHitCount <= 1 ? 2 : 1;
    if (won) {
      score += starsEarned * 250;
      recordBestTime();
      checkpointScore = score;
    }
    overlayTitle.textContent = won
      ? isFinalLevel ? "The light remembers" : `${LEVELS[levelIndex].name} · survived`
      : "Light, scattered";
    const moonlessReward = won && difficultySelect.value === "moonless" && levelHitCount === 0
      ? "<br>MOONLESS VOW · EXCLUSIVE STAR"
      : "";
    const recap = Object.entries(hitSources)
      .filter(([, hits]) => hits > 0)
      .map(([type, hits]) => `${hits} ${type}${hits === 1 ? "" : "s"}`)
      .join(", ") || "No moth hits";
    overlayCopy.innerHTML = won
      ? `${isFinalLevel ? "The lantern burns. Something stirs beyond it." : "The lantern holds. The dark has not let go."}<br>${"★".repeat(starsEarned)}${"☆".repeat(3 - starsEarned)} · ${formatTime(levelElapsed)} · ${score.toLocaleString()} gathered<br>Best ${formatTime(bestTimes[String(levelIndex)] || levelElapsed)}${moonlessReward}`
      : `Your carried lights fell where you fell.<br>They will remain there when you return.<br>Last cause: ${recap}.`;
    levelLesson.textContent = won ? "" : LEVELS[levelIndex].lesson;
    starRule.textContent = won
      ? "The lantern will remember your best time in this browser."
      : difficultySelect.value === "moonless"
        ? "Moonless vow: finish without a hit to earn the exclusive Moonless Star."
        : "Three marks: no wounds, under 2:10. Each hit scatters a light.";
    startButton.querySelector("span:first-child").textContent = won
      ? isFinalLevel ? "Enter again" : "Continue onward"
      : "Recover your light";
    overlay.classList.remove("hidden");
    overlay.classList.add("settings-visible");
    overlay.classList.remove("upgrade-active");
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", "Pause game");
    if (won) {
      objectiveText.textContent = "The lantern is awake";
      burst(shrine.x, shrine.y, "#ffe4a1", 60);
      playTone(780, .75, "sine", .07);
    }
  }

  function resetGame() {
    pulseTime = 0;
    hitFlash = 0;
    invulnerability = 0;
    dashTime = 0;
    score = checkpointScore;
    motes.length = 0;
    initializeLevel(levelIndex);
    startGame();
  }

  function recoverFromDeath() {
    finished = false;
    resultWon = false;
    paused = false;
    score = checkpointScore;
    levelElapsed = 0;
    levelHitCount = 0;
    streak = 0;
    lastCollectAt = 0;
    lives = difficultySelect.value === "cozy" ? 5 : difficultySelect.value === "moonless" ? 1 : 3;
    hitSources = { drifter: 0, chaser: 0, dasher: 0, orbiter: 0, stalker: 0 };
    player.x = 1100;
    player.y = 790;
    player.vx = 0;
    player.vy = 0;
    dashTime = 0;
    invulnerability = 0;
    hitFlash = 0;
    hitShake = 0;
    mothSlowTime = 0;
    abilityCooldown = 0;
    pulseTime = 0;
    spawnMoths();
    renderLives();
    objectiveText.textContent = LEVELS[levelIndex].objective;
    showToast("The scattered light remains. The moths have returned to their posts.");
  }

  function recordBestTime() {
    try {
      bestTimes = JSON.parse(localStorage.getItem("mothlight-best-times") || "{}");
      const key = String(levelIndex);
      if (!bestTimes[key] || levelElapsed < bestTimes[key]) {
        bestTimes[key] = levelElapsed;
        localStorage.setItem("mothlight-best-times", JSON.stringify(bestTimes));
      }
    } catch (error) {
      console.warn("Could not save the local best time.", error);
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
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
      if (event.repeat) return;
      activatePulse();
      return;
    }
    if (key === "shift") {
      if (!event.repeat) activateDash();
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
  upgradePicker.addEventListener("click", event => {
    const button = event.target.closest("[data-upgrade]");
    if (button) chooseUpgrade(button.dataset.upgrade);
  });
  pauseButton.addEventListener("click", togglePause);
  pulseButton.addEventListener("click", activatePulse);
  dashButton.addEventListener("click", activateDash);
  restartButton.addEventListener("click", resetGame);
  difficultySelect.addEventListener("change", () => {
    saveSettings();
    if (!started) initializeLevel(levelIndex);
    else if (paused) showToast("Mood changes apply when you restart this garden.");
  });
  musicVolume.addEventListener("input", updateAudioLevels);
  sfxVolume.addEventListener("input", updateAudioLevels);
  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    updateSoundButton();
    updateAudioLevels();
    if (soundOn) startAmbience();
    if (soundOn) playTone(520, .1, "sine", .035);
  });

  loadSettings();
  seedWorld();
  initializeLevel(0);
  overlay.classList.add("settings-visible");
  resize();
  prepareBackground();
  updateAudioLevels();
  updateSoundButton();
  requestAnimationFrame(frame);
})();
