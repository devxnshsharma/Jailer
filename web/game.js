/*
 * Mass Metro web runtime.
 *
 * This file intentionally uses only browser Canvas 2D and Web APIs. It does
 * not import Three.js, Vite, a renderer library, or a game framework. The
 * gameplay vocabulary follows the native demo reference: its inventory,
 * scenario progression, vehicle categories, rain, explosions, wanted-style
 * pressure, and arcade mission loop are represented here with original
 * browser-safe drawing primitives.
 */

const canvas = document.querySelector('#world');
const ctx = canvas.getContext('2d', { alpha: false });
const shell = document.querySelector('#game');
if (!canvas || !ctx || !shell) throw new Error('Mass Metro web runtime could not start.');

const TAU = Math.PI * 2;
const WORLD = { width: 2200, height: 1400 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const pick = (array) => array[Math.floor(Math.random() * array.length)];
const formatNumber = (value, digits = 6) => String(Math.max(0, Math.floor(value))).padStart(digits, '0');

const WEAPONS = [
  { id: 'colt45', demoName: 'Colt45', label: 'COLT .45', short: '45', mode: 'hitscan', mag: 12, reserve: 72, damage: 28, rate: 0.22, range: 560, color: '#f4bf4f' },
  { id: 'shotgun', demoName: 'Shotgun', label: 'SHOTGUN', short: 'SG', mode: 'spread', mag: 6, reserve: 36, damage: 15, pellets: 7, rate: 0.72, range: 390, color: '#fa7a61' },
  { id: 'm16', demoName: 'M16', label: 'M16', short: 'M16', mode: 'hitscan', mag: 30, reserve: 120, damage: 15, rate: 0.08, range: 700, color: '#56d8e8' },
  { id: 'unarmed', demoName: 'Unarmed', label: 'UNARMED', short: 'FIST', mode: 'melee', mag: Infinity, reserve: Infinity, damage: 19, rate: 0.32, range: 58, color: '#ffefd0' },
  { id: 'baseballBat', demoName: 'BaseballBat', label: 'BASEBALL BAT', short: 'BAT', mode: 'melee', mag: Infinity, reserve: Infinity, damage: 46, rate: 0.63, range: 82, color: '#f4bf4f' },
  { id: 'uzi', demoName: 'Uzi', label: 'UZI', short: 'UZI', mode: 'hitscan', mag: 32, reserve: 192, damage: 11, rate: 0.07, range: 430, color: '#f879d3' },
  { id: 'ak47', demoName: 'AK47', label: 'AK-47', short: 'AK', mode: 'hitscan', mag: 30, reserve: 180, damage: 18, rate: 0.12, range: 600, color: '#ff9c5a' },
  { id: 'sniperRifle', demoName: 'SniperRifle', label: 'SNIPER RIFLE', short: 'SNIPE', mode: 'hitscan', mag: 6, reserve: 30, damage: 135, rate: 0.95, range: 1100, color: '#9fc8ff' },
  { id: 'rocketLauncher', demoName: 'RocketLauncher', label: 'ROCKET LAUNCHER', short: 'RPG', mode: 'rocket', mag: 1, reserve: 12, damage: 145, rate: 1.2, range: 900, speed: 420, radius: 120, color: '#f4d46e' },
  { id: 'flamethrower', demoName: 'FlameThrower', label: 'FLAMETHROWER', short: 'FLAME', mode: 'flame', mag: 100, reserve: 300, damage: 8, rate: 0.055, range: 250, radius: 42, color: '#ff6039' },
  { id: 'molotov', demoName: 'Molotov', label: 'MOLOTOV', short: 'MOLO', mode: 'grenade', mag: 1, reserve: 8, damage: 90, rate: 0.9, range: 440, speed: 270, radius: 92, color: '#ffb83d' },
  { id: 'grenade', demoName: 'Grenade', label: 'GRENADE', short: 'GRENADE', mode: 'grenade', mag: 1, reserve: 8, damage: 110, rate: 0.9, range: 480, speed: 310, radius: 115, color: '#91dc78' },
  { id: 'detonator', demoName: 'Detonator', label: 'DETONATOR', short: 'DETONATE', mode: 'detonator', mag: 1, reserve: 4, damage: 135, rate: 0.6, range: 600, radius: 135, color: '#b995ff' },
  { id: 'heliCannon', demoName: 'HeliCannon', label: 'HELI CANNON', short: 'HELI', mode: 'heli', mag: 30, reserve: 120, damage: 78, rate: 0.18, range: 1050, speed: 620, radius: 72, color: '#5ce1cf' },
];

const MISSIONS = [
  { id: 'bazaar', title: 'NEON BAZAAR', subtitle: 'Kovil Street · tea steam · rain on the temple road', objective: 'Clear the temple-market Black Lotus squad', target: 5, center: { x: 1040, y: 760 }, kinds: ['bruiser', 'lookout'], reward: 450 },
  { id: 'rooftops', title: 'ROOFTOP RECKONING', subtitle: 'Bus wires and courier routes above Muthu Nagar', objective: 'Silence the rooftop courier crew', target: 7, center: { x: 1570, y: 390 }, kinds: ['blade', 'lookout', 'bruiser'], reward: 800 },
  { id: 'harbour', title: 'IRON HIDEOUT', subtitle: 'Salt air · freight steel · the harbour crane', objective: 'Crack the harbour-yard guard line', target: 9, center: { x: 520, y: 1030 }, kinds: ['enforcer', 'bruiser', 'blade'], reward: 1250 },
  { id: 'bell', title: 'THE LAST BELL', subtitle: 'The old temple yard has one final door', objective: 'Break the syndicate and bring Nila home', target: 1, center: { x: 1110, y: 260 }, kinds: ['boss'], reward: 3000, boss: true },
];

const COLORS = {
  road: '#182536', roadLine: '#d7a94b', asphalt: '#0b121c', building: '#182438', buildingAlt: '#202b40', teal: '#56d8e8', pink: '#fa4d79', gold: '#f4bf4f', purple: '#b995ff', green: '#86da82', sand: '#8f6f4b', skin: '#9b604e', dark: '#070b11', white: '#edf1f8', red: '#ff5b61', blue: '#6f9fff', leaf: '#39765e', trunk: '#654734', rust: '#914d45', steel: '#657288', yellow: '#d8b14f',
};

const state = {
  phase: 'menu',
  missionIndex: 0,
  progress: 0,
  score: 0,
  cred: 0,
  highScore: Number(localStorage.getItem('mass-metro-raw-high-score') || 0),
  sound: true,
  time: 0,
  camera: { x: 0, y: 0 },
  player: { x: 1100, y: 850, angle: -Math.PI / 2, health: 100, meter: 38, invulnerable: 0, fireCooldown: 0, reloadTimer: 0, reloadDuration: 0, weaponIndex: 0, combo: 0, comboTimer: 0, dodge: 0, wanted: 0 },
  enemies: [],
  projectiles: [],
  particles: [],
  vehicles: [],
  pickups: [],
  rain: [],
  abilityTimers: { massEntry: 0, auraStrike: 0, timeVeil: 0, finalBell: 0 },
  slowTimer: 0,
  toastTimer: 0,
  toastText: '',
  mouse: { x: 0, y: 0, down: false },
  keys: new Set(),
  lastFrame: performance.now(),
};

const ui = {
  screen: document.querySelector('[data-screen]'),
  card: document.querySelector('[data-screen-card]'),
  score: document.querySelector('[data-score]'),
  cred: document.querySelector('[data-cred]'),
  missionTitle: document.querySelector('[data-mission-title]'),
  missionObjective: document.querySelector('[data-mission-objective]'),
  missionProgress: document.querySelector('[data-mission-progress]'),
  weaponShort: document.querySelector('[data-weapon-short]'),
  weaponName: document.querySelector('[data-weapon-name]'),
  ammo: document.querySelector('[data-ammo]'),
  reserve: document.querySelector('[data-reserve]'),
  reload: document.querySelector('[data-reload]'),
  weaponGrid: document.querySelector('[data-weapon-grid]'),
  health: document.querySelector('[data-health]'),
  meter: document.querySelector('[data-meter]'),
  healthLabel: document.querySelector('[data-health-label]'),
  meterLabel: document.querySelector('[data-meter-label]'),
  toast: document.querySelector('[data-toast]'),
};

function activeMission() { return MISSIONS[state.missionIndex]; }
function activeWeapon() { return WEAPONS[state.player.weaponIndex]; }
function worldFromScreen(x, y) { return { x: x + state.camera.x, y: y + state.camera.y }; }
function isPlaying() { return state.phase === 'playing'; }

function showToast(message, color = COLORS.gold) {
  state.toastText = message;
  state.toastTimer = 2.1;
  ui.toast.textContent = message;
  ui.toast.style.borderColor = color;
  ui.toast.classList.add('show');
}

function hideScreen() { ui.screen.classList.add('hidden'); }

function showScreen(markup) {
  ui.card.innerHTML = markup;
  ui.screen.classList.remove('hidden');
}

function setButtonAction(selector, action) {
  const button = ui.card.querySelector(selector);
  if (button) button.addEventListener('click', action, { once: true });
}

function showMenu() {
  state.phase = 'menu';
  showScreen(`<span class="stamp">NATIVE DEMO WEB RUNTIME · NO ENGINE DEPENDENCIES</span>
    <h1>MASS<br><em>METRO</em></h1>
    <p class="sub">SHADOW OF MUTHU NAGAR</p>
    <p class="copy">A raw browser runtime built from Canvas 2D and the native demo's gameplay vocabulary: full weapon inventory, mission flow, rain, Tamil street landmarks, vehicles, projectiles, fire, and explosions.</p>
    <div class="objective"><span>PLAYER PROFILE</span><b>VETRI VARMAN · CITY FIXER</b></div>
    <div class="screen-actions"><button class="primary" data-start>BEGIN THE ENTRY</button><button data-sound>${state.sound ? 'SOUND: ON' : 'SOUND: OFF'}</button></div>
    <div class="screen-meta"><span>HIGH SCORE ${formatNumber(state.highScore)}</span><span>CANVAS 2D · STATIC WEB</span></div>`);
  setButtonAction('[data-start]', startRun);
  const sound = ui.card.querySelector('[data-sound]');
  sound?.addEventListener('click', () => { state.sound = !state.sound; sound.textContent = state.sound ? 'SOUND: ON' : 'SOUND: OFF'; });
}

function showBriefing() {
  const mission = activeMission();
  const final = mission.boss;
  state.phase = 'briefing';
  showScreen(`<span class="stamp">SCENARIO ${String(state.missionIndex + 1).padStart(2, '0')} / ${final ? 'FINAL' : MISSIONS.length}</span>
    <h2>${mission.title}</h2>
    <p class="sub">${mission.subtitle}</p>
    <div class="objective"><span>OBJECTIVE</span><b>${mission.objective}</b></div>
    <p class="copy">${final ? 'Rathna Veyil has locked the final street under the old bell. Break the line and bring Nila home.' : mission.id === 'bazaar' ? 'The emergency frequency cuts through the tea stalls. The first squad is waiting by the gopuram.' : mission.id === 'rooftops' ? 'The courier has the route to Nila. Follow the bus wires before the signal goes dark.' : 'The hideout is a salt-stained freight yard. Every locked container is another piece of the city.'}</p>
    <div class="screen-actions"><button class="primary" data-enter>${final ? 'ENTER THE ARENA' : 'STEP INTO THE STREET'}</button><button data-title>RETURN TO TITLE</button></div>`);
  setButtonAction('[data-enter]', beginMission);
  setButtonAction('[data-title]', showMenu);
}

function showPause() {
  state.phase = 'paused';
  showScreen(`<span class="stamp">THE CITY HOLDS ITS BREATH</span><h2>PAUSED</h2><p class="copy">The raw web runtime keeps the whole scenario in memory. Resume when you are ready.</p><div class="screen-actions"><button class="primary" data-resume>RESUME</button><button data-title>QUIT TO TITLE</button></div>`);
  setButtonAction('[data-resume]', () => { state.phase = 'playing'; hideScreen(); });
  setButtonAction('[data-title]', showMenu);
}

function showMissionComplete() {
  const mission = activeMission();
  state.phase = 'missionComplete';
  showScreen(`<span class="stamp">STREET CLEARED</span><h2>${mission.title}</h2><p class="sub">The Black Lotus line lost another link.</p><div class="objective"><span>REWARD</span><b>+${mission.reward} CRED · ${formatNumber(state.score)} SCORE</b></div><div class="screen-actions"><button class="primary" data-next>${state.missionIndex === MISSIONS.length - 2 ? 'ENTER THE LAST BELL' : 'NEXT SCENARIO'}</button><button data-title>RETURN TO TITLE</button></div>`);
  setButtonAction('[data-next]', () => { state.missionIndex += 1; showBriefing(); });
  setButtonAction('[data-title]', showMenu);
}

function showGameOver() {
  state.phase = 'gameOver';
  if (state.score > state.highScore) { state.highScore = Math.floor(state.score); localStorage.setItem('mass-metro-raw-high-score', String(state.highScore)); }
  showScreen(`<span class="stamp">SIGNAL LOST</span><h2>NOT YET.</h2><p class="sub">The street is still yours to reclaim.</p><div class="objective"><span>RUN SCORE</span><b>${formatNumber(state.score)} · BEST ${formatNumber(state.highScore)}</b></div><div class="screen-actions"><button class="primary" data-restart>RESTART RUN</button><button data-title>RETURN TO TITLE</button></div>`);
  setButtonAction('[data-restart]', startRun);
  setButtonAction('[data-title]', showMenu);
}

function showVictory() {
  state.phase = 'victory';
  if (state.score > state.highScore) { state.highScore = Math.floor(state.score); localStorage.setItem('mass-metro-raw-high-score', String(state.highScore)); }
  showScreen(`<span class="stamp">MUTHU NAGAR · SAFE</span><h2>ENTRY<br><em>COMPLETE.</em></h2><p class="sub">Nila is coming home. The city knows your name.</p><div class="objective"><span>FINAL SCORE</span><b>${formatNumber(state.score)} · BEST ${formatNumber(state.highScore)}</b></div><div class="screen-actions"><button class="primary" data-restart>PLAY AGAIN</button><button data-title>RETURN TO TITLE</button></div>`);
  setButtonAction('[data-restart]', startRun);
  setButtonAction('[data-title]', showMenu);
}

function resetRun() {
  state.missionIndex = 0;
  state.progress = 0;
  state.score = 0;
  state.cred = 0;
  state.time = 0;
  state.player = { x: 1100, y: 850, angle: -Math.PI / 2, health: 100, meter: 38, invulnerable: 0, fireCooldown: 0, reloadTimer: 0, reloadDuration: 0, weaponIndex: 0, combo: 0, comboTimer: 0, dodge: 0, wanted: 0, ammoStore: Object.fromEntries(WEAPONS.filter((weapon) => Number.isFinite(weapon.mag)).map((weapon) => [weapon.id, { ammo: weapon.mag, reserve: weapon.reserve }])) };
  state.enemies = [];
  state.projectiles = [];
  state.particles = [];
  state.pickups = [];
  state.abilityTimers = { massEntry: 0, auraStrike: 0, timeVeil: 0, finalBell: 0 };
  state.slowTimer = 0;
}

function startRun() { resetRun(); showBriefing(); }

function beginMission() {
  const mission = activeMission();
  state.phase = 'playing';
  state.progress = 0;
  state.player.x = mission.center.x;
  state.player.y = mission.center.y + 130;
  state.player.health = 100;
  state.player.meter = Math.max(38, state.player.meter);
  state.enemies = [];
  state.projectiles = [];
  state.pickups = [];
  const count = mission.boss ? 0 : mission.target;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * TAU + .25;
    const radius = 170 + (index % 3) * 70;
    spawnEnemy(mission.kinds[index % mission.kinds.length], mission.center.x + Math.cos(angle) * radius, mission.center.y + Math.sin(angle) * radius);
  }
  if (mission.boss) spawnBoss(mission.center.x, mission.center.y - 40);
  for (let index = 0; index < 3; index += 1) {
    const angle = index / 3 * TAU;
    state.pickups.push({ x: mission.center.x + Math.cos(angle) * 120, y: mission.center.y + Math.sin(angle) * 120, life: 50, bob: Math.random() * TAU });
  }
  hideScreen();
  showToast(`${mission.title} · MAKE AN ENTRY`, COLORS.pink);
}

function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * ratio);
  canvas.height = Math.floor(canvas.clientHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (!state.mouse.x && !state.mouse.y) {
    state.mouse.x = canvas.clientWidth / 2;
    state.mouse.y = canvas.clientHeight / 2;
  }
}

function worldToScreen(point) { return { x: point.x - state.camera.x, y: point.y - state.camera.y }; }

function updateCamera() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  state.camera.x = lerp(state.camera.x, clamp(state.player.x - width * .5, 0, WORLD.width - width), .1);
  state.camera.y = lerp(state.camera.y, clamp(state.player.y - height * .5, 0, WORLD.height - height), .1);
}

function randomEdgePosition() {
  const edge = Math.floor(Math.random() * 4);
  return edge === 0 ? { x: 120 + Math.random() * 1960, y: 80 }
    : edge === 1 ? { x: 2120, y: 80 + Math.random() * 1240 }
      : edge === 2 ? { x: 120 + Math.random() * 1960, y: 1320 }
        : { x: 80, y: 80 + Math.random() * 1240 };
}

function spawnEnemy(kind, x, y) {
  const definitions = {
    bruiser: { health: 75, speed: 80, damage: 9, range: 58, cooldown: 1.3, color: COLORS.pink, size: 23 },
    lookout: { health: 48, speed: 62, damage: 8, range: 360, cooldown: 1.8, color: COLORS.cyan, size: 20 },
    blade: { health: 55, speed: 135, damage: 12, range: 58, cooldown: 1, color: COLORS.gold, size: 20 },
    enforcer: { health: 160, speed: 48, damage: 18, range: 66, cooldown: 1.7, color: COLORS.purple, size: 28 },
  };
  const stats = definitions[kind] || definitions.bruiser;
  state.enemies.push({ kind, x, y, angle: 0, health: stats.health, maxHealth: stats.health, attackTimer: .4 + Math.random(), stun: 0, knockX: 0, knockY: 0, ...stats, alive: true, deathTimer: 0 });
}

function spawnBoss(x, y) {
  state.enemies.push({ kind: 'boss', x, y, angle: 0, health: 520, maxHealth: 520, speed: 52, damage: 28, range: 88, cooldown: 1.5, attackTimer: 1.2, stun: 0, knockX: 0, knockY: 0, color: COLORS.red, size: 42, alive: true, deathTimer: 0, phase: 1 });
}

function spawnVehicle(kind, x, y, angle, color, label) {
  state.vehicles.push({ kind, x, y, angle, color, label, speed: kind === 'bus' ? 22 : kind === 'train' ? 42 : 28, phase: Math.random() * TAU });
}

function seedVehicles() {
  state.vehicles = [
    { kind: 'auto', x: 770, y: 675, angle: .05, color: '#178c70', label: 'AUTO', speed: 20, phase: 0 },
    { kind: 'auto', x: 1380, y: 740, angle: Math.PI, color: '#d29f37', label: 'AUTO', speed: 23, phase: 1 },
    { kind: 'bus', x: 1550, y: 670, angle: Math.PI / 2, color: '#365f7b', label: 'MTC', speed: 14, phase: 2 },
    { kind: 'bus', x: 560, y: 520, angle: -Math.PI / 2, color: '#7b3e4c', label: 'MTC', speed: 12, phase: 3 },
    { kind: 'car', x: 1040, y: 640, angle: 0, color: '#a95055', label: 'SEDAN', speed: 18, phase: 4 },
    { kind: 'car', x: 1210, y: 1040, angle: Math.PI / 2, color: '#5e7194', label: 'SEDAN', speed: 16, phase: 5 },
    { kind: 'train', x: 300, y: 200, angle: 0, color: '#68768a', label: 'METRO', speed: 8, phase: 6 },
  ];
}

function seedRain() {
  state.rain = Array.from({ length: 280 }, () => ({ x: Math.random() * WORLD.width, y: Math.random() * WORLD.height, speed: 500 + Math.random() * 260, length: 10 + Math.random() * 18 }));
}

function equip(index) {
  state.player.weaponIndex = (index + WEAPONS.length) % WEAPONS.length;
  state.player.reloadTimer = 0;
  const weapon = activeWeapon();
  showToast(`${weapon.label} EQUIPPED`, weapon.color);
}

function equipNext(direction = 1) { equip(state.player.weaponIndex + direction); }

function startReload() {
  const weapon = activeWeapon();
  const ammo = getAmmo(weapon);
  if (!Number.isFinite(weapon.mag) || state.player.reloadTimer > 0 || ammo.reserve <= 0 || ammo.ammo >= weapon.mag) return;
  state.player.reloadDuration = weapon.id === 'sniperRifle' ? 2.2 : weapon.mode === 'rocket' ? 1.9 : 1.25;
  state.player.reloadTimer = state.player.reloadDuration;
  showToast(`RELOADING ${weapon.short}`, COLORS.gold);
}

function weaponKeyIndex(key) {
  const keys = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', ';', "'", '[', ']'];
  return keys.indexOf(key.toLowerCase());
}

function handleKeyDown(event) {
  const key = event.key;
  if ([' ', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) event.preventDefault();
  if (key === 'Tab') { equipNext(event.shiftKey ? -1 : 1); return; }
  if (key === 'Escape') { if (state.phase === 'playing') showPause(); else if (state.phase === 'paused') { state.phase = 'playing'; hideScreen(); } return; }
  if (key.toLowerCase() === 'r') { startReload(); return; }
  if (key.toLowerCase() === 'q') { dodge(); return; }
  if (key === ' ') { if (state.phase === 'playing') useAbility('massEntry'); return; }
  if (/^[1-4]$/.test(key)) { useAbility(['massEntry', 'auraStrike', 'timeVeil', 'finalBell'][Number(key) - 1]); return; }
  const index = weaponKeyIndex(key);
  if (index >= 0) { equip(index); return; }
  state.keys.add(key.toLowerCase());
}

function handleKeyUp(event) { state.keys.delete(event.key.toLowerCase()); }

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = event.clientX - rect.left;
  state.mouse.y = event.clientY - rect.top;
}

function handlePointerDown(event) {
  updatePointer(event);
  if (event.button === 0) state.mouse.down = true;
  if (event.button === 2) state.mouse.aim = true;
  canvas.setPointerCapture?.(event.pointerId);
}

function handlePointerUp(event) {
  if (event.button === 0) state.mouse.down = false;
  if (event.button === 2) state.mouse.aim = false;
}

function handleWheel(event) { equipNext(event.deltaY > 0 ? 1 : -1); }

window.addEventListener('resize', resize);
window.addEventListener('keydown', handleKeyDown, { passive: false });
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', () => { state.keys.clear(); state.mouse.down = false; });
canvas.addEventListener('pointermove', updatePointer);
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointercancel', handlePointerUp);
canvas.addEventListener('contextmenu', (event) => event.preventDefault());
canvas.addEventListener('wheel', handleWheel, { passive: true });

WEAPONS.forEach((weapon, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = weapon.short;
  button.title = `${weapon.label} · ${weapon.demoName}`;
  button.dataset.weaponId = weapon.id;
  button.addEventListener('click', () => equip(index));
  ui.weaponGrid.append(button);
});

document.querySelectorAll('[data-ability]').forEach((button) => button.addEventListener('click', () => useAbility(button.dataset.ability)));

resize();
seedRain();
seedVehicles();

function getAimPoint() { return worldFromScreen(state.mouse.x, state.mouse.y); }

function updatePlayer(delta) {
  const player = state.player;
  const movement = { x: 0, y: 0 };
  if (state.keys.has('w') || state.keys.has('arrowup')) movement.y -= 1;
  if (state.keys.has('s') || state.keys.has('arrowdown')) movement.y += 1;
  if (state.keys.has('a') || state.keys.has('arrowleft')) movement.x -= 1;
  if (state.keys.has('d') || state.keys.has('arrowright')) movement.x += 1;
  const magnitude = Math.hypot(movement.x, movement.y) || 1;
  const sprint = state.keys.has('shift');
  const speed = sprint ? 285 : state.mouse.aim ? 125 : 205;
  if (movement.x || movement.y) {
    player.x += movement.x / magnitude * speed * delta;
    player.y += movement.y / magnitude * speed * delta;
  }
  if (player.dodge > 0) {
    player.dodge -= delta;
    player.x += Math.cos(player.angle) * 420 * delta;
    player.y += Math.sin(player.angle) * 420 * delta;
  }
  player.x = clamp(player.x, 45, WORLD.width - 45);
  player.y = clamp(player.y, 45, WORLD.height - 45);
  const aim = getAimPoint();
  player.angle = angleTo(player, aim);
  player.invulnerable = Math.max(0, player.invulnerable - delta);
  player.fireCooldown = Math.max(0, player.fireCooldown - delta);
  player.comboTimer = Math.max(0, player.comboTimer - delta);
  if (player.comboTimer <= 0) player.combo = 0;
  player.reloadTimer = Math.max(0, player.reloadTimer - delta);
  if (player.reloadTimer === 0 && player.reloadDuration > 0) {
    const weapon = activeWeapon();
    const current = getAmmo(weapon);
    const missing = weapon.mag - current.ammo;
    const loaded = Math.min(missing, current.reserve);
    setAmmo(weapon, current.ammo + loaded, current.reserve - loaded);
    player.reloadDuration = 0;
  }
  if ((state.mouse.down || state.keys.has('l')) && isPlaying()) fireWeapon();
}

function getAmmo(weapon) {
  if (!Number.isFinite(weapon.mag)) return { ammo: Infinity, reserve: Infinity };
  if (!state.player.ammoStore) state.player.ammoStore = Object.fromEntries(WEAPONS.filter((entry) => Number.isFinite(entry.mag)).map((entry) => [entry.id, { ammo: entry.mag, reserve: entry.reserve }]));
  return state.player.ammoStore[weapon.id];
}

function setAmmo(weapon, ammo, reserve) {
  if (!Number.isFinite(weapon.mag)) return;
  if (!state.player.ammoStore) state.player.ammoStore = Object.fromEntries(WEAPONS.filter((entry) => Number.isFinite(entry.mag)).map((entry) => [entry.id, { ammo: entry.mag, reserve: entry.reserve }]));
  state.player.ammoStore[weapon.id] = { ammo, reserve };
}

function getTarget(range, cone = .7) {
  let best = null;
  let bestDistance = range;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > bestDistance) continue;
    const facing = Math.cos(state.player.angle) * dx / (dist || 1) + Math.sin(state.player.angle) * dy / (dist || 1);
    if (facing >= cone) { best = enemy; bestDistance = dist; }
  }
  return best;
}

function fireWeapon() {
  const weapon = activeWeapon();
  if (state.player.reloadTimer > 0 || state.player.fireCooldown > 0) return;
  const ammo = getAmmo(weapon);
  if (Number.isFinite(weapon.mag) && ammo.ammo <= 0) { startReload(); return; }
  if (Number.isFinite(weapon.mag)) setAmmo(weapon, ammo.ammo - 1, ammo.reserve);
  state.player.fireCooldown = weapon.rate;
  if (weapon.mode === 'melee') {
    meleeAttack(weapon);
    return;
  }
  const muzzle = { x: state.player.x + Math.cos(state.player.angle) * 28, y: state.player.y + Math.sin(state.player.angle) * 28 };
  const target = getTarget(weapon.range, weapon.mode === 'spread' ? .15 : .55);
  const endpoint = target ? { x: target.x, y: target.y } : { x: muzzle.x + Math.cos(state.player.angle) * weapon.range, y: muzzle.y + Math.sin(state.player.angle) * weapon.range };
  burst(muzzle.x, muzzle.y, weapon.color, weapon.mode === 'flame' ? 10 : 5, weapon.mode === 'flame' ? 80 : 36);
  if (weapon.mode === 'hitscan') {
    tracer(muzzle, endpoint, weapon.color, weapon.id === 'sniperRifle' ? 1.7 : 1);
    if (target) hitEnemy(target, weapon.damage, weapon.color, weapon.id === 'sniperRifle' ? 20 : 7);
  } else if (weapon.mode === 'spread') {
    for (let index = 0; index < weapon.pellets; index += 1) {
      const spread = (Math.random() - .5) * .38;
      const shotAngle = state.player.angle + spread;
      const end = { x: muzzle.x + Math.cos(shotAngle) * weapon.range, y: muzzle.y + Math.sin(shotAngle) * weapon.range };
      tracer(muzzle, end, weapon.color, .7);
      const pelletTarget = target || getTarget(weapon.range, -.2);
      if (pelletTarget && distance(pelletTarget, state.player) < weapon.range) hitEnemy(pelletTarget, weapon.damage, weapon.color, 7);
    }
  } else if (weapon.mode === 'flame') {
    tracer(muzzle, endpoint, weapon.color, 5);
    for (const enemy of state.enemies) {
      if (!enemy.alive || distance(enemy, state.player) > weapon.range) continue;
      const facing = Math.cos(state.player.angle) * (enemy.x - state.player.x) / distance(enemy, state.player) + Math.sin(state.player.angle) * (enemy.y - state.player.y) / distance(enemy, state.player);
      if (facing > .2) hitEnemy(enemy, weapon.damage, weapon.color, 2);
    }
  } else if (weapon.mode === 'detonator') {
    explode(endpoint.x, endpoint.y, weapon.radius, weapon.damage, weapon.color);
  } else {
    state.projectiles.push({ x: muzzle.x, y: muzzle.y, vx: Math.cos(state.player.angle) * weapon.speed, vy: Math.sin(state.player.angle) * weapon.speed, life: 3, damage: weapon.damage, radius: weapon.radius, color: weapon.color, owner: 'player', kind: weapon.mode });
  }
  state.player.meter = clamp(state.player.meter + 1.5, 0, 100);
  if (state.sound) beep(weapon.mode === 'rocket' || weapon.mode === 'heli' ? 90 : 160, .045, weapon.mode === 'flame' ? 'sawtooth' : 'square');
}

function meleeAttack(weapon) {
  const target = getTarget(weapon.range, .05);
  slash(state.player.x + Math.cos(state.player.angle) * 42, state.player.y + Math.sin(state.player.angle) * 42, weapon.color);
  if (target) hitEnemy(target, weapon.damage, weapon.color, weapon.id === 'baseballBat' ? 18 : 6);
  if (state.sound) beep(weapon.id === 'baseballBat' ? 95 : 190, .06, 'triangle');
}

function hitEnemy(enemy, damage, color, knockback) {
  if (!enemy.alive) return;
  enemy.health -= damage;
  const angle = angleTo(state.player, enemy);
  enemy.knockX += Math.cos(angle) * knockback;
  enemy.knockY += Math.sin(angle) * knockback;
  enemy.stun = .12;
  state.player.combo = state.player.comboTimer > 0 ? state.player.combo + 1 : 1;
  state.player.comboTimer = .72;
  state.player.meter = clamp(state.player.meter + 3 + damage * .05, 0, 100);
  state.score += Math.round((15 + damage * 1.8) * Math.max(1, state.player.combo));
  burst(enemy.x, enemy.y, color, damage > 50 ? 16 : 7, damage > 50 ? 110 : 50);
  if (enemy.health <= 0) killEnemy(enemy, color);
}

function killEnemy(enemy, color) {
  if (!enemy.alive) return;
  enemy.alive = false;
  enemy.deathTimer = enemy.kind === 'boss' ? 2.5 : .8;
  state.score += enemy.kind === 'boss' ? 2500 : 180;
  state.cred += enemy.kind === 'boss' ? 500 : 45;
  state.progress += enemy.kind === 'boss' ? 1 : 1;
  state.pickups.push({ x: enemy.x, y: enemy.y, life: 28, bob: Math.random() * TAU });
  burst(enemy.x, enemy.y, color, enemy.kind === 'boss' ? 34 : 14, enemy.kind === 'boss' ? 210 : 80);
  if (enemy.kind === 'boss') { state.player.meter = 100; state.phase = 'victory'; showVictory(); }
  else if (state.progress >= activeMission().target) showMissionComplete();
}

function spawnEnemyProjectile(enemy, speed = 220) {
  const angle = angleTo(enemy, state.player);
  state.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 4, damage: enemy.damage, radius: 0, color: enemy.color, owner: 'enemy', kind: 'enemy' });
}

function updateEnemies(delta) {
  const slow = state.slowTimer > 0 ? .35 : 1;
  for (const enemy of state.enemies) {
    if (!enemy.alive) { enemy.deathTimer -= delta; continue; }
    enemy.attackTimer -= delta * slow;
    enemy.stun = Math.max(0, enemy.stun - delta);
    enemy.x += enemy.knockX * delta;
    enemy.y += enemy.knockY * delta;
    enemy.knockX *= Math.max(0, 1 - delta * 8);
    enemy.knockY *= Math.max(0, 1 - delta * 8);
    if (enemy.stun > 0) continue;
    const dist = distance(enemy, state.player);
    const direction = angleTo(enemy, state.player);
    enemy.angle = direction;
    const keepDistance = enemy.kind === 'lookout' ? 260 : enemy.range * .75;
    if (dist > keepDistance) { enemy.x += Math.cos(direction) * enemy.speed * delta * slow; enemy.y += Math.sin(direction) * enemy.speed * delta * slow; }
    if (enemy.attackTimer <= 0 && dist < enemy.range * (enemy.kind === 'lookout' ? 1.3 : 1.15)) {
      enemy.attackTimer = enemy.cooldown;
      if (enemy.kind === 'lookout' || enemy.kind === 'boss') spawnEnemyProjectile(enemy, enemy.kind === 'boss' ? 270 : 210);
      else hurtPlayer(enemy.damage, enemy.color);
    }
    enemy.x = clamp(enemy.x, 40, WORLD.width - 40);
    enemy.y = clamp(enemy.y, 40, WORLD.height - 40);
  }
  state.enemies = state.enemies.filter((enemy) => enemy.alive || enemy.deathTimer > 0);
}

function updateProjectiles(delta) {
  for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = state.projectiles[index];
    projectile.life -= delta;
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;
    if (projectile.owner === 'player') {
      const target = state.enemies.find((enemy) => enemy.alive && distance(projectile, enemy) < enemy.size + 12);
      if (target) { explode(projectile.x, projectile.y, projectile.radius, projectile.damage, projectile.color); state.projectiles.splice(index, 1); continue; }
      if (projectile.life <= 0 || projectile.x < 0 || projectile.x > WORLD.width || projectile.y < 0 || projectile.y > WORLD.height) { if (projectile.radius) explode(projectile.x, projectile.y, projectile.radius, projectile.damage, projectile.color); state.projectiles.splice(index, 1); }
    } else {
      if (distance(projectile, state.player) < 25) { hurtPlayer(projectile.damage, projectile.color); state.projectiles.splice(index, 1); continue; }
      if (projectile.life <= 0) state.projectiles.splice(index, 1);
    }
  }
}

function hurtPlayer(amount, color) {
  if (state.player.invulnerable > 0 || state.phase !== 'playing') return;
  state.player.health = Math.max(0, state.player.health - amount);
  state.player.invulnerable = .5;
  state.player.wanted = clamp(state.player.wanted + .08, 0, 1);
  burst(state.player.x, state.player.y, color, 9, 75);
  showToast(`VETRI HIT · -${Math.ceil(amount)}`, COLORS.pink);
  if (state.player.health <= 0) showGameOver();
}

function dodge() {
  if (!isPlaying() || state.player.dodge > 0) return;
  state.player.dodge = .24;
  state.player.invulnerable = .42;
}

function useAbility(id) {
  if (!isPlaying()) return;
  const costs = { massEntry: 20, auraStrike: 30, timeVeil: 25, finalBell: 70 };
  const cooldowns = { massEntry: 2.5, auraStrike: 4, timeVeil: 7, finalBell: 10 };
  const cost = costs[id];
  if (!cost || state.abilityTimers[id] > 0) return;
  if (state.player.meter < cost) { showToast(`NEED ${cost} AURA`, COLORS.pink); return; }
  state.player.meter -= cost;
  state.abilityTimers[id] = cooldowns[id];
  if (id === 'massEntry') {
    explode(state.player.x, state.player.y, 210, 70, COLORS.gold);
    showToast('MASS ENTRY · STREET CLEARED', COLORS.gold);
  } else if (id === 'auraStrike') {
    const target = getTarget(250, -.1);
    if (target) hitEnemy(target, 130, COLORS.pink, 42);
    ring(state.player.x, state.player.y, 170, COLORS.pink);
    showToast('AURA STRIKE', COLORS.pink);
  } else if (id === 'timeVeil') {
    state.slowTimer = 5;
    ring(state.player.x, state.player.y, 150, COLORS.cyan);
    showToast('TIME VEIL · OWN THE MOMENT', COLORS.cyan);
  } else if (id === 'finalBell') {
    explode(state.player.x, state.player.y, 290, 180, COLORS.purple);
    showToast('FINAL BELL', COLORS.purple);
  }
}

function explode(x, y, radius, damage, color) {
  ring(x, y, radius, color);
  burst(x, y, color, 25, 230);
  for (const enemy of state.enemies) {
    if (!enemy.alive || distance({ x, y }, enemy) > radius) continue;
    const falloff = 1 - Math.min(.7, distance({ x, y }, enemy) / radius * .7);
    hitEnemy(enemy, damage * falloff, color, 15);
  }
  if (state.sound) beep(55, .12, 'sawtooth');
}

function collectPickups(delta) {
  for (let index = state.pickups.length - 1; index >= 0; index -= 1) {
    const pickup = state.pickups[index];
    pickup.life -= delta;
    if (pickup.life <= 0) { state.pickups.splice(index, 1); continue; }
    if (distance(pickup, state.player) < 28) {
      state.cred += 125;
      state.score += 125;
      state.player.meter = clamp(state.player.meter + 16, 0, 100);
      showToast('+125 CRED · AURA CHARGED', COLORS.cyan);
      burst(pickup.x, pickup.y, COLORS.cyan, 12, 90);
      state.pickups.splice(index, 1);
    }
  }
}

function updateParticles(delta) {
  for (let index = state.particles.length - 1; index >= 0; index -= 1) {
    const particle = state.particles[index];
    particle.life -= delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += particle.gravity * delta;
    if (particle.life <= 0) state.particles.splice(index, 1);
  }
}

function burst(x, y, color, count, force) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * TAU;
    const speed = force * (.35 + Math.random() * .8);
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .25 + Math.random() * .55, maxLife: .8, size: 2 + Math.random() * 4, color, gravity: force * .25 });
  }
}

function tracer(start, end, color, width = 1) { state.particles.push({ type: 'line', x: start.x, y: start.y, endX: end.x, endY: end.y, life: .09, maxLife: .09, size: width, color, vx: 0, vy: 0, gravity: 0 }); }
function slash(x, y, color) { state.particles.push({ type: 'slash', x, y, life: .2, maxLife: .2, size: 38, color, vx: 0, vy: 0, gravity: 0 }); }
function ring(x, y, radius, color) { state.particles.push({ type: 'ring', x, y, life: .55, maxLife: .55, size: radius, color, vx: 0, vy: 0, gravity: 0 }); }

let audioContext = null;
function beep(frequency, duration, type = 'square') {
  if (!state.sound) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* Audio is optional. */ }
}

function updateWorld(delta) {
  state.slowTimer = Math.max(0, state.slowTimer - delta);
  Object.keys(state.abilityTimers).forEach((key) => { state.abilityTimers[key] = Math.max(0, state.abilityTimers[key] - delta); });
  state.player.wanted = Math.max(0, state.player.wanted - delta * .01);
  for (const vehicle of state.vehicles) {
    if (vehicle.kind === 'train') {
      vehicle.x += vehicle.speed * delta;
      if (vehicle.x > WORLD.width + 130) vehicle.x = -130;
    } else {
      vehicle.phase += delta * .4;
    }
  }
  for (const drop of state.rain) {
    drop.y += drop.speed * delta;
    drop.x -= drop.speed * .12 * delta;
    if (drop.y > WORLD.height + 40) { drop.y = -40; drop.x = Math.random() * WORLD.width; }
  }
  if (state.toastTimer > 0) { state.toastTimer -= delta; if (state.toastTimer <= 0) ui.toast.classList.remove('show'); }
}

function drawWorld() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a1024');
  gradient.addColorStop(.55, '#0d1722');
  gradient.addColorStop(1, '#091019');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  drawMapBase();
  drawVehicles();
  drawWorldRain();
  drawPickups();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
  drawParticles();
  ctx.restore();
  drawVignette(width, height);
}

function drawMapBase() {
  ctx.fillStyle = COLORS.asphalt;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  ctx.fillStyle = '#101b2a';
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  drawRoad(0, 650, WORLD.width, 230, false);
  drawRoad(950, 0, 245, WORLD.height, true);
  drawRoad(250, 240, 1500, 120, false);
  drawRoad(300, 1040, 1550, 150, false);
  drawRoad(180, 120, 120, 1160, true);

  const blocks = [
    [40, 50, 310, 470, COLORS.buildingAlt], [370, 30, 430, 500, COLORS.building], [1250, 40, 390, 470, COLORS.buildingAlt], [1660, 40, 470, 470, COLORS.building],
    [40, 900, 290, 420, COLORS.building], [350, 1200, 470, 160, COLORS.buildingAlt], [1260, 1210, 410, 150, COLORS.building], [1700, 870, 430, 460, COLORS.buildingAlt],
    [40, 520, 250, 100, '#273447'], [1680, 520, 440, 100, '#273447'],
  ];
  blocks.forEach(([x, y, w, h, color]) => drawBuilding(x, y, w, h, color));

  drawTemple(1090, 100);
  drawMarket(720, 585, COLORS.pink, 'தேநீர்');
  drawMarket(1370, 585, COLORS.cyan, 'பஜார்');
  drawHarbour(260, 930);
  drawKolam(1080, 610, COLORS.gold);
  drawKolam(1570, 380, COLORS.cyan);
  drawPalm(500, 620, -.04);
  drawPalm(1770, 620, .05);
  drawPalm(2020, 810, -.08);
  drawPalm(290, 730, .06);
  drawSign(805, 550, 'மாலை ரோடு', COLORS.gold, 0);
  drawSign(1440, 520, 'முத்து நகர்', COLORS.pink, 0);
  drawSign(600, 1070, 'துறைமுகம்', COLORS.purple, 0);
  drawStreetLamps();
}

function drawRoad(x, y, width, height, vertical) {
  ctx.fillStyle = COLORS.road;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(116, 139, 164, .22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);
  ctx.strokeStyle = COLORS.roadLine;
  ctx.lineWidth = 5;
  ctx.setLineDash([36, 28]);
  if (vertical) { ctx.beginPath(); ctx.moveTo(x + width / 2, y); ctx.lineTo(x + width / 2, y + height); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(x, y + height / 2); ctx.lineTo(x + width, y + height / 2); ctx.stroke(); }
  ctx.setLineDash([]);
}

function drawBuilding(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = 'rgba(132, 161, 197, .28)';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = 'rgba(86, 216, 232, .42)';
  const columns = Math.max(2, Math.floor(width / 80));
  const rows = Math.max(2, Math.floor(height / 80));
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    if ((row + column + Math.floor(x / 10)) % 5 === 0) continue;
    ctx.fillRect(x + 25 + column * (width - 50) / columns, y + 24 + row * (height - 45) / rows, 22, 12);
  }
}

function drawStreetLamps() {
  for (let x = 300; x <= 1900; x += 180) {
    drawLamp(x, 620, x % 360 === 0 ? COLORS.cyan : COLORS.pink);
    drawLamp(x, 900, x % 360 === 0 ? COLORS.pink : COLORS.cyan);
  }
}

function drawLamp(x, y, color) {
  ctx.strokeStyle = '#485566';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 82); ctx.lineTo(x + 26, y - 82); ctx.stroke();
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 22;
  ctx.fillRect(x + 20, y - 88, 14, 12);
  ctx.shadowBlur = 0;
}

function drawSign(x, y, text, color, rotation = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
  ctx.fillStyle = '#121b28'; ctx.strokeStyle = color; ctx.lineWidth = 4;
  ctx.fillRect(-100, -28, 200, 56); ctx.strokeRect(-100, -28, 200, 56);
  ctx.fillStyle = COLORS.white; ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1);
  ctx.restore();
}

function drawMarket(x, y, color, label) {
  ctx.fillStyle = '#5e3b32'; ctx.fillRect(x - 78, y, 156, 60);
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 18; ctx.fillRect(x - 86, y - 72, 172, 16); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#d3a478'; ctx.lineWidth = 4;
  for (const side of [-70, 70]) { ctx.beginPath(); ctx.moveTo(x + side, y - 62); ctx.lineTo(x + side, y + 4); ctx.stroke(); }
  drawSign(x, y - 105, label, color);
}

function drawTemple(x, y) {
  ctx.save(); ctx.translate(x, y);
  for (let level = 0; level < 5; level += 1) {
    const width = 250 - level * 34;
    ctx.fillStyle = level % 2 ? '#674b68' : '#83546a';
    ctx.fillRect(-width / 2, 120 - level * 35, width, 30);
    ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.strokeRect(-width / 2, 120 - level * 35, width, 30);
  }
  ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.arc(0, -66, 20, 0, TAU); ctx.fill();
  ctx.fillStyle = COLORS.white; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('முத்து நகர்', 0, 170);
  ctx.restore();
}

function drawKolam(x, y, color) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.globalAlpha = .65; ctx.lineWidth = 3;
  for (let index = 1; index < 4; index += 1) { ctx.beginPath(); ctx.arc(0, 0, index * 18, 0, TAU); ctx.stroke(); }
  for (let index = 0; index < 8; index += 1) { const angle = index / 8 * TAU; ctx.beginPath(); ctx.arc(Math.cos(angle) * 72, Math.sin(angle) * 72, 5, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

function drawPalm(x, y, lean) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(lean); ctx.strokeStyle = COLORS.trunk; ctx.lineWidth = 17; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -170); ctx.stroke();
  ctx.strokeStyle = COLORS.leaf; ctx.lineWidth = 9;
  for (let index = 0; index < 7; index += 1) { const angle = index / 7 * TAU; ctx.beginPath(); ctx.moveTo(10, -170); ctx.lineTo(10 + Math.cos(angle) * 78, -170 + Math.sin(angle) * 50); ctx.stroke(); }
  ctx.restore();
}

function drawHarbour(x, y) {
  ctx.strokeStyle = COLORS.steel; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 290); ctx.lineTo(x + 300, y - 290); ctx.stroke();
  ctx.strokeStyle = COLORS.purple; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x + 220, y - 290); ctx.lineTo(x + 220, y - 110); ctx.stroke();
  ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.arc(x + 220, y - 95, 12, 0, TAU); ctx.fill();
  for (let index = 0; index < 3; index += 1) { ctx.fillStyle = index % 2 ? '#713f4c' : '#45566e'; ctx.fillRect(x + index * 105, y - 50, 88, 48); }
}

function drawVehicles() {
  for (const vehicle of state.vehicles) {
    const bob = vehicle.kind === 'train' ? 0 : Math.sin(state.time * .8 + vehicle.phase) * 2;
    drawVehicle(vehicle.x, vehicle.y + bob, vehicle.angle, vehicle.kind, vehicle.color, vehicle.label);
  }
}

function drawVehicle(x, y, angle, kind, color, label) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  if (kind === 'train') {
    ctx.fillStyle = color; ctx.fillRect(-170, -38, 340, 76); ctx.fillStyle = '#193747';
    for (let index = -2; index <= 2; index += 1) ctx.fillRect(index * 58 - 22, -22, 42, 27);
    ctx.fillStyle = COLORS.gold; ctx.fillRect(120, -8, 28, 16);
    ctx.restore(); return;
  }
  const dimensions = kind === 'bus' ? [180, 62] : kind === 'auto' ? [88, 58] : [125, 54];
  ctx.fillStyle = color; ctx.fillRect(-dimensions[0] / 2, -dimensions[1] / 2, dimensions[0], dimensions[1]);
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 4; ctx.strokeRect(-dimensions[0] / 2, -dimensions[1] / 2, dimensions[0], dimensions[1]);
  ctx.fillStyle = kind === 'bus' ? '#163a4b' : '#29424d';
  ctx.fillRect(-dimensions[0] * .22, -dimensions[1] * .37, dimensions[0] * .42, dimensions[1] * .32);
  ctx.fillStyle = '#11151c';
  for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(-dimensions[0] * .25, side * dimensions[1] * .55, 11, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(dimensions[0] * .26, side * dimensions[1] * .55, 11, 0, TAU); ctx.fill(); }
  ctx.fillStyle = COLORS.gold; ctx.fillRect(dimensions[0] / 2 - 4, -8, 7, 16);
  ctx.fillStyle = COLORS.white; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0);
  ctx.restore();
}

function drawWorldRain() {
  ctx.strokeStyle = 'rgba(151, 220, 245, .22)'; ctx.lineWidth = 2;
  for (const drop of state.rain) { ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x - 7, drop.y + drop.length); ctx.stroke(); }
}

function drawPickups() {
  for (const pickup of state.pickups) {
    const bob = Math.sin(state.time * 4 + pickup.bob) * 5;
    ctx.save(); ctx.translate(pickup.x, pickup.y + bob); ctx.rotate(state.time * 2);
    ctx.fillStyle = COLORS.cyan; ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

function drawProjectiles() {
  for (const projectile of state.projectiles) {
    ctx.fillStyle = projectile.color; ctx.shadowColor = projectile.color; ctx.shadowBlur = projectile.owner === 'enemy' ? 10 : 18;
    ctx.beginPath(); ctx.arc(projectile.x, projectile.y, projectile.owner === 'enemy' ? 7 : 9, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    if (!enemy.alive && enemy.deathTimer <= 0) continue;
    ctx.save(); ctx.translate(enemy.x, enemy.y); ctx.rotate(enemy.angle);
    const alpha = enemy.alive ? 1 : clamp(enemy.deathTimer / .8, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#171d2b'; ctx.fillRect(-enemy.size * .72, -enemy.size * .58, enemy.size * 1.44, enemy.size * 1.16);
    ctx.fillStyle = enemy.color; ctx.shadowColor = enemy.color; ctx.shadowBlur = 14;
    ctx.fillRect(-enemy.size * .54, -enemy.size * .1, enemy.size * 1.08, enemy.size * .18);
    ctx.shadowBlur = 0;
    if (enemy.kind === 'enforcer' || enemy.kind === 'boss') { ctx.strokeStyle = enemy.color; ctx.lineWidth = 5; ctx.strokeRect(-enemy.size * .9, -enemy.size * .72, enemy.size * 1.8, enemy.size * 1.44); }
    if (enemy.kind === 'lookout' || enemy.kind === 'boss') { ctx.fillStyle = '#20293a'; ctx.fillRect(enemy.size * .5, -4, enemy.size * 1.1, 8); ctx.fillStyle = enemy.color; ctx.fillRect(enemy.size * 1.48, -3, 10, 6); }
    ctx.restore();
    if (enemy.alive) {
      const width = enemy.size * 2.1;
      ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.size - 18, width, 5);
      ctx.fillStyle = enemy.color; ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.size - 18, width * clamp(enemy.health / enemy.maxHealth, 0, 1), 5);
    }
  }
}

function drawPlayer() {
  const player = state.player;
  ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
  ctx.globalAlpha = player.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0 ? .4 : 1;
  ctx.fillStyle = '#2e3142'; ctx.fillRect(-18, -19, 36, 38);
  ctx.fillStyle = '#e4e3dc'; ctx.fillRect(-25, -9, 50, 22);
  ctx.fillStyle = COLORS.skin; ctx.beginPath(); ctx.arc(0, -27, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#717787'; ctx.fillRect(-18, -39, 36, 9);
  ctx.fillStyle = '#0a101a'; ctx.fillRect(-17, -30, 34, 5);
  ctx.fillStyle = '#72513d'; ctx.fillRect(-12, 16, 9, 26); ctx.fillRect(3, 16, 9, 26);
  drawWeaponShape(activeWeapon());
  if (player.dodge > 0) { ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 42, 0, TAU); ctx.stroke(); }
  ctx.restore();
  if (player.combo > 1) { ctx.fillStyle = COLORS.gold; ctx.font = 'bold 24px Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${player.combo} HIT COMBO`, player.x, player.y - 60); }
}

function drawWeaponShape(weapon) {
  ctx.save();
  const color = weapon.color;
  ctx.strokeStyle = '#171b27'; ctx.lineWidth = weapon.mode === 'melee' ? 10 : 8; ctx.lineCap = 'round';
  if (weapon.id === 'baseballBat') { ctx.strokeStyle = '#9b6546'; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(22, 7); ctx.lineTo(76, 0); ctx.stroke(); }
  else if (weapon.id === 'unarmed') { ctx.fillStyle = COLORS.skin; ctx.beginPath(); ctx.arc(26, 8, 8, 0, TAU); ctx.fill(); }
  else if (weapon.mode === 'grenade') { ctx.fillStyle = '#5f3a2d'; ctx.beginPath(); ctx.arc(36, 2, 10, 0, TAU); ctx.fill(); ctx.fillStyle = color; ctx.fillRect(34, -10, 4, 6); }
  else if (weapon.mode === 'detonator') { ctx.fillStyle = '#202936'; ctx.fillRect(21, -10, 23, 28); ctx.fillStyle = color; ctx.fillRect(28, -7, 9, 5); }
  else { ctx.strokeStyle = '#171b27'; ctx.lineWidth = weapon.id === 'rocketLauncher' ? 15 : 8; ctx.beginPath(); ctx.moveTo(15, 2); ctx.lineTo(75, 0); ctx.stroke(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(84, 0); ctx.stroke(); }
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    const progress = 1 - particle.life / particle.maxLife;
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    if (particle.type === 'line') { ctx.strokeStyle = particle.color; ctx.lineWidth = particle.size; ctx.beginPath(); ctx.moveTo(particle.x, particle.y); ctx.lineTo(particle.endX, particle.endY); ctx.stroke(); }
    else if (particle.type === 'slash') { ctx.strokeStyle = particle.color; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * (1 - progress * .3), -.9, .9); ctx.stroke(); }
    else if (particle.type === 'ring') { ctx.strokeStyle = particle.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * progress, 0, TAU); ctx.stroke(); }
    else { ctx.fillStyle = particle.color; ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * (1 - progress * .4), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
}

function drawVignette(width, height) {
  const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .25, width / 2, height / 2, Math.max(width, height) * .75);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,.46)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  if (state.slowTimer > 0) { ctx.strokeStyle = 'rgba(86,216,232,.2)'; ctx.lineWidth = 5; ctx.strokeRect(8, 8, width - 16, height - 16); }
}

function updateHud() {
  const weapon = activeWeapon();
  const ammo = getAmmo(weapon);
  const mission = activeMission();
  ui.score.textContent = formatNumber(state.score);
  ui.cred.textContent = formatNumber(state.cred, 3);
  ui.missionTitle.textContent = mission.title;
  ui.missionObjective.textContent = mission.objective;
  ui.missionProgress.textContent = mission.boss ? (state.phase === 'victory' ? 'CLEARED' : 'FINAL') : `${Math.min(state.progress, mission.target)} / ${mission.target}`;
  ui.weaponShort.textContent = weapon.short;
  ui.weaponName.textContent = weapon.label;
  ui.ammo.textContent = Number.isFinite(weapon.mag) ? String(ammo.ammo).padStart(2, '0') : '∞';
  ui.reserve.textContent = Number.isFinite(weapon.mag) ? String(ammo.reserve).padStart(3, '0') : '—';
  ui.reload.style.width = state.player.reloadDuration > 0 ? `${(1 - state.player.reloadTimer / state.player.reloadDuration) * 100}%` : '0%';
  ui.health.style.transform = `scaleX(${clamp(state.player.health / 100, 0, 1)})`;
  ui.meter.style.transform = `scaleX(${clamp(state.player.meter / 100, 0, 1)})`;
  ui.healthLabel.textContent = `${Math.ceil(state.player.health)} / 100`;
  ui.meterLabel.textContent = `${Math.ceil(state.player.meter)}%`;
  ui.weaponGrid.querySelectorAll('button').forEach((button, index) => button.classList.toggle('active', index === state.player.weaponIndex));
  document.querySelectorAll('[data-ability]').forEach((button) => button.classList.toggle('ready', state.player.meter >= ({ massEntry: 20, auraStrike: 30, timeVeil: 25, finalBell: 70 })[button.dataset.ability] && state.abilityTimers[button.dataset.ability] <= 0));
}

function update(delta) {
  state.time += delta;
  updateWorld(delta);
  if (isPlaying()) {
    updatePlayer(delta);
    updateEnemies(delta);
    updateProjectiles(delta);
    collectPickups(delta);
    updateParticles(delta);
    updateCamera();
  } else {
    updateParticles(delta);
    updateCamera();
  }
  updateHud();
  drawWorld();
}

function frame(now) {
  const delta = Math.min(.05, Math.max(0, (now - state.lastFrame) / 1000));
  state.lastFrame = now;
  update(delta);
  requestAnimationFrame(frame);
}

showMenu();
updateHud();
requestAnimationFrame(frame);
