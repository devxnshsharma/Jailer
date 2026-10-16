import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const game = await readFile(new URL('../web/game.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../web/styles.css', import.meta.url), 'utf8');

test('static entry uses the raw browser runtime', () => {
  assert.match(html, /web\/game\.js/);
  assert.doesNotMatch(html, /src\/main\.ts|vite|three/i);
  assert.doesNotMatch(game, /from ['"]three|from ['"]vite/i);
});

test('native inventory and Tamil scenarios are represented', () => {
  for (const name of ['Colt45', 'Shotgun', 'M16', 'Unarmed', 'BaseballBat', 'Uzi', 'AK47', 'SniperRifle', 'RocketLauncher', 'FlameThrower', 'Molotov', 'Grenade', 'Detonator', 'HeliCannon']) {
    assert.match(game, new RegExp(name));
  }
  for (const name of ['NEON BAZAAR', 'ROOFTOP RECKONING', 'IRON HIDEOUT', 'THE LAST BELL', 'முத்து நகர்', 'துறைமுகம்']) {
    assert.match(game, new RegExp(name));
  }
});

test('runtime is raw WebGL with no renderer framework dependency', () => {
  assert.match(css, /#world/);
  assert.match(game, /renderer3d/);
  assert.match(game, /state\.keys\.has\('l'\)/);
  assert.doesNotMatch(game, /import[^\n]*from ['"](?:three|vite)/i);
});
