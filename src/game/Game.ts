import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { Boss, type BossAction } from '../entities/Boss';
import { Enemy, type EnemyAction } from '../entities/Enemy';
import { Hero } from '../entities/Hero';
import { AudioManager } from './AudioManager';
import { ABILITIES, MISSIONS } from './definitions';
import { EffectsSystem } from './EffectsSystem';
import { InputManager } from './InputManager';
import { calculateScore } from './logic';
import type { AbilityId, GamePhase, SaveData } from './types';
import { createCity } from '../world/City';
import { WeatherSystem } from '../world/WeatherSystem';
import { MissionManager } from '../missions/MissionManager';
import { Hud } from '../ui/Hud';
import { Screens } from '../ui/Screens';

interface Pickup {
  mesh: THREE.Mesh;
  value: number;
  baseY: number;
  life: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  color: number;
  life: number;
}

const SAVE_KEY = 'mass-metro-save-v1';

export class Game {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly input = new InputManager();
  private readonly audio: AudioManager;
  private readonly effects = new EffectsSystem();
  private readonly hero = new Hero();
  private readonly missions = new MissionManager();
  private readonly hud: Hud;
  private readonly screens: Screens;
  private readonly enemies: Enemy[] = [];
  private readonly pickups: Pickup[] = [];
  private readonly projectiles: Projectile[] = [];
  private readonly weather = new WeatherSystem();
  private readonly abilityTimers: Record<AbilityId, number> = {
    massEntry: 0,
    auraStrike: 0,
    timeVeil: 0,
    finalBell: 0,
  };
  private phase: GamePhase = 'menu';
  private saveData: SaveData;
  private timeSlow = 0;
  private auraTimer = 0;
  private outOfBoundsNoticeAt = -Infinity;
  private victoryTimer = 0;
  private missionCompleteTimer = 0;
  private missionCompletionQueued = false;
  private bossVictoryQueued = false;
  private cameraShake = 0;
  private lastFrame = performance.now();
  private elapsed = 0;
  private boss: Boss | null = null;

  constructor(private readonly mount: HTMLElement) {
    this.saveData = this.loadSave();
    this.audio = new AudioManager(this.saveData.soundEnabled);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.domElement.className = 'game-canvas';
    this.mount.append(this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.72, 0.55, 0.72));

    this.scene.background = new THREE.Color(0x090c14);
    this.scene.fog = new THREE.FogExp2(0x101522, 0.018);
    this.createLights();

    const city = createCity();
    this.scene.add(city.group);
    this.scene.add(this.weather.group);
    this.scene.add(this.effects.group);
    this.scene.add(this.hero.group);

    this.hud = new Hud(this.input);
    this.mount.append(this.hud.root);
    this.screens = new Screens({
      onStart: () => this.startRun(),
      onResume: () => this.resume(),
      onRestart: () => this.restartRun(),
      onContinue: () => this.continueFlow(),
      onMenu: () => this.returnToMenu(),
      onToggleSound: () => this.toggleSound(),
    });
    this.mount.append(this.screens.root);

    window.addEventListener('resize', this.resize);
    this.resize();
    this.screens.showLoading();
    window.setTimeout(() => {
      if (this.phase === 'menu') this.screens.showMenu(this.saveData.highScore, this.saveData.soundEnabled);
    }, 420);
    requestAnimationFrame(this.loop);
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.composer.setSize(width, height);
  };

  private readonly loop = (now: number): void => {
    const delta = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.elapsed += delta;
    if (this.phase === 'playing') {
      this.update(delta);
    } else {
      this.effects.update(delta);
      this.weather.update(delta);
      this.updateCamera(delta);
    }
    if (this.phase === 'playing') {
      this.weather.update(delta);
    }
    this.composer.render();
    requestAnimationFrame(this.loop);
  };

  private createLights(): void {
    const hemisphere = new THREE.HemisphereLight(0x8fa4ff, 0x16111f, 1.7);
    this.scene.add(hemisphere);
    const moon = new THREE.DirectionalLight(0xb9c7ff, 2.4);
    moon.position.set(-18, 28, 10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -50;
    moon.shadow.camera.right = 50;
    moon.shadow.camera.top = 50;
    moon.shadow.camera.bottom = -50;
    this.scene.add(moon);
    const pink = new THREE.PointLight(0xff327a, 5, 22, 2);
    pink.position.set(-10, 5, -2);
    this.scene.add(pink);
    const cyan = new THREE.PointLight(0x32dfff, 4, 24, 2);
    cyan.position.set(12, 4, 12);
    this.scene.add(cyan);
  }

  private startRun(): void {
    void this.audio.start();
    this.resetRun();
    this.phase = 'briefing';
    this.screens.showBriefing(MISSIONS[0], 0);
    this.audio.play('menu');
  }

  private restartRun(): void {
    void this.audio.start();
    this.resetRun();
    this.phase = 'briefing';
    this.screens.showBriefing(MISSIONS[0], 0);
  }

  private resetRun(): void {
    this.clearActors();
    this.effects.clear();
    this.missions.start();
    this.hero.reset(new THREE.Vector3(0, 0, 4));
    Object.keys(this.abilityTimers).forEach((key) => {
      this.abilityTimers[key as AbilityId] = 0;
    });
    this.timeSlow = 0;
    this.auraTimer = 0;
    this.victoryTimer = 0;
    this.missionCompleteTimer = 0;
    this.missionCompletionQueued = false;
    this.bossVictoryQueued = false;
    this.cameraShake = 0;
    this.input.clear();
  }

  private continueFlow(): void {
    if (this.phase === 'briefing') {
      if (this.missions.isBossMission) {
        this.beginBoss();
      } else {
        this.beginMission();
      }
      return;
    }

    if (this.phase === 'missionComplete') {
      if (this.missions.currentIndex >= MISSIONS.length - 1) {
        this.enterBossBriefing();
      } else {
        this.missions.begin(this.missions.currentIndex + 1);
        this.phase = 'briefing';
        const next = this.missions.current;
        if (next) this.screens.showBriefing(next, this.missions.currentIndex);
      }
    }
  }

  private beginMission(): void {
    const mission = this.missions.current;
    if (!mission) return;
    this.missionCompletionQueued = false;
    this.missionCompleteTimer = 0;
    this.bossVictoryQueued = false;
    this.clearActors();
    this.hero.reset(mission.arena.clone().add(new THREE.Vector3(0, 0, 4)));
    const count = mission.target;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 + 0.25;
      const radius = 4.7 + (index % 3) * 1.2;
      const position = mission.arena.clone().add(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
      const kind = mission.enemyKinds[index % mission.enemyKinds.length];
      const enemy = new Enemy(kind, position);
      this.enemies.push(enemy);
      this.scene.add(enemy.group);
    }
    this.spawnPickups(mission.arena, 3);
    this.phase = 'playing';
    this.screens.hide();
    this.hud.flash(`${mission.title} — MAKE AN ENTRY`, 'pink');
    const radioLines: Record<string, string> = {
      'neon-bazaar': 'NILA SIGNAL: “Vetri… the lights are moving.”',
      'rooftop-reckoning': 'NILA SIGNAL: “Follow the red kite. Do not stop.”',
      'iron-hideout': 'NILA SIGNAL: “The last door is beneath the old bell.”',
    };
    window.setTimeout(() => {
      if (this.phase === 'playing' && this.missions.current?.id === mission.id) {
        this.hud.flash(radioLines[mission.id] ?? 'NILA SIGNAL: “I know you are coming.”', 'cyan');
      }
    }, 1100);
    this.audio.play('menu');
  }

  private enterBossBriefing(): void {
    this.clearActors();
    this.missions.enterBoss();
    this.phase = 'briefing';
    this.screens.showBriefing(null, MISSIONS.length, true);
  }

  private beginBoss(): void {
    this.missionCompletionQueued = false;
    this.missionCompleteTimer = 0;
    this.bossVictoryQueued = false;
    this.clearActors();
    this.hero.reset(new THREE.Vector3(0, 0, 8));
    this.boss = new Boss(new THREE.Vector3(0, 0, -4));
    this.scene.add(this.boss.group);
    this.phase = 'playing';
    this.screens.hide();
    this.hud.flash('THE LAST BELL — BREAK THE SYNDICATE', 'purple');
    this.audio.play('heavy');
  }

  private resume(): void {
    this.phase = 'playing';
    this.screens.hide();
    this.input.clear();
  }

  private returnToMenu(): void {
    this.clearActors();
    this.phase = 'menu';
    this.input.clear();
    this.screens.showMenu(this.saveData.highScore, this.saveData.soundEnabled);
  }

  private toggleSound(): boolean {
    this.saveData.soundEnabled = !this.saveData.soundEnabled;
    this.audio.setEnabled(this.saveData.soundEnabled);
    this.saveSave();
    if (this.saveData.soundEnabled) {
      void this.audio.start();
      this.audio.play('menu');
    }
    return this.saveData.soundEnabled;
  }

  private clearActors(): void {
    for (const enemy of this.enemies) this.scene.remove(enemy.group);
    this.enemies.length = 0;
    for (const pickup of this.pickups) this.scene.remove(pickup.mesh);
    this.pickups.length = 0;
    for (const projectile of this.projectiles) this.scene.remove(projectile.mesh);
    this.projectiles.length = 0;
    if (this.boss) {
      this.scene.remove(this.boss.group);
      this.boss = null;
    }
  }

  private spawnPickups(center: THREE.Vector3, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = index * (Math.PI * 2 / count) + 0.4;
      const mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0x62d9ff, emissive: 0x62d9ff, emissiveIntensity: 3, metalness: 0.6, roughness: 0.2 }),
      );
      mesh.position.set(center.x + Math.cos(angle) * 2.4, 0.62, center.z + Math.sin(angle) * 2.4);
      this.scene.add(mesh);
      this.pickups.push({ mesh, value: 125, baseY: mesh.position.y, life: 45 });
    }
  }

  private update(delta: number): void {
    if (this.input.consume('pause')) {
      this.phase = 'paused';
      this.screens.showPause(this.saveData.soundEnabled);
      this.input.clear();
      return;
    }

    this.timeSlow = Math.max(0, this.timeSlow - delta);
    this.auraTimer = Math.max(0, this.auraTimer - delta);
    if (this.auraTimer <= 0) {
      this.hero.setAura(false);
    }
    this.cameraShake = Math.max(0, this.cameraShake - delta * 1.8);
    for (const ability of ABILITIES) {
      this.abilityTimers[ability.id] = Math.max(0, this.abilityTimers[ability.id] - delta);
    }

    this.hero.update(delta, this.input);
    const maxDistanceFromMission = this.missions.isBossMission ? 22 : 17;
    if (!this.missions.isBossMission && this.missions.current && this.hero.group.position.distanceTo(this.missions.current.arena) > maxDistanceFromMission) {
      this.hero.group.position.lerp(this.missions.current.arena.clone().add(new THREE.Vector3(0, 0, 4)), delta * 0.08);
      if (this.elapsed - this.outOfBoundsNoticeAt > 2.8) {
        this.outOfBoundsNoticeAt = this.elapsed;
        this.hud.flash('STAY WITHIN THE SIGNAL ZONE', 'muted');
      }
    }
    this.handleHeroAttack();
    this.handleAbilities();
    this.updateEnemies(delta);
    this.updateBoss(delta);
    this.updateProjectiles(delta);
    this.updatePickups(delta);
    this.effects.update(delta);

    if (this.hero.health <= 0) {
      this.showGameOver();
      return;
    }

    if (this.missions.isComplete && !this.missionCompletionQueued && !this.boss) {
      this.missionCompletionQueued = true;
      this.missionCompleteTimer = 0.85;
    }
    if (this.missionCompletionQueued) {
      this.missionCompleteTimer -= delta;
      if (this.missionCompleteTimer <= 0) {
        this.completeMission();
      }
    }

    if (this.boss && !this.boss.alive && !this.bossVictoryQueued) {
      this.bossVictoryQueued = true;
      this.victoryTimer = 1.7;
      this.cameraShake = 1.2;
      this.audio.play('victory');
    }
    if (this.bossVictoryQueued) {
      this.victoryTimer -= delta;
      if (this.victoryTimer <= 0) {
        this.showVictory();
      }
    }

    this.updateHud();
    this.updateCamera(delta);
  }

  private updateEnemies(delta: number): void {
    const slowed = this.timeSlow > 0;
    for (const enemy of this.enemies) {
      const action = enemy.update(delta, this.hero.group.position, slowed);
      if (action) this.handleEnemyAction(action);
    }
    for (let index = this.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = this.enemies[index];
      if (enemy.isExpired()) {
        this.scene.remove(enemy.group);
        this.enemies.splice(index, 1);
      }
    }
  }

  private updateBoss(delta: number): void {
    if (!this.boss) return;
    const action = this.boss.update(delta, this.hero.group.position, this.timeSlow > 0);
    if (action) this.handleBossAction(action);
    if (this.boss.isExpired()) {
      this.scene.remove(this.boss.group);
    }
  }

  private updateProjectiles(delta: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.life -= delta;
      projectile.mesh.position.addScaledVector(projectile.velocity, delta);
      projectile.mesh.rotation.x += delta * 8;
      projectile.mesh.rotation.y += delta * 9;
      if (projectile.life <= 0 || projectile.mesh.position.distanceTo(this.hero.group.position) > 38) {
        this.removeProjectile(index);
        continue;
      }
      if (projectile.mesh.position.distanceTo(this.hero.group.position) < 0.95) {
        const damaged = this.hero.takeDamage({ amount: projectile.damage, position: projectile.mesh.position, color: projectile.color });
        if (damaged) {
          this.effects.burst(this.hero.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), projectile.color, 8, 2.2);
          this.cameraShake = Math.max(this.cameraShake, 0.22);
          this.audio.play('hurt');
        }
        this.removeProjectile(index);
      }
    }
  }

  private updatePickups(delta: number): void {
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      pickup.life -= delta;
      pickup.mesh.rotation.y += delta * 2.6;
      pickup.mesh.position.y = pickup.baseY + Math.sin(this.elapsed * 3 + index) * 0.16;
      if (pickup.life <= 0) {
        this.scene.remove(pickup.mesh);
        this.pickups.splice(index, 1);
        continue;
      }
      if (pickup.mesh.position.distanceTo(this.hero.group.position) < 1.1) {
        this.hero.currency += pickup.value;
        this.hero.score += pickup.value;
        this.hero.gainMeter(16);
        this.effects.burst(pickup.mesh.position, 0x62d9ff, 10, 2.3);
        this.audio.play('collect');
        this.hud.flash(`+${pickup.value} CRED · AURA CHARGED`, 'cyan');
        this.scene.remove(pickup.mesh);
        this.pickups.splice(index, 1);
      }
    }
  }

  private handleHeroAttack(): void {
    const hitbox = this.hero.getAttackHitbox();
    if (!hitbox.active) return;
    let hitSomething = false;
    const origin = this.hero.group.position;
    const forward = this.hero.getForward();
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const offset = enemy.group.position.clone().sub(origin);
      const distance = offset.length();
      if (distance > hitbox.range || forward.dot(offset.normalize()) < 0.15) continue;
      enemy.takeDamage(hitbox.damage, forward, hitbox.knockback);
      this.onSuccessfulHit(enemy.group.position, hitbox.damage, hitbox.color, enemy);
      hitSomething = true;
    }
    if (this.boss?.alive) {
      const offset = this.boss.group.position.clone().sub(origin);
      if (offset.length() <= hitbox.range + 0.65 && forward.dot(offset.normalize()) > 0.05) {
        if (this.boss.takeDamage(hitbox.damage, forward, hitbox.knockback)) {
          this.onSuccessfulHit(this.boss.group.position, hitbox.damage, hitbox.color);
          hitSomething = true;
        }
      }
    }
    this.hero.markAttackHit();
    if (hitSomething) {
      this.cameraShake = Math.max(this.cameraShake, hitbox.damage > 20 ? 0.24 : 0.11);
    }
  }

  private handleAbilities(): void {
    const inputActions: Record<AbilityId, 'ability1' | 'ability2' | 'ability3' | 'ability4'> = {
      massEntry: 'ability1',
      auraStrike: 'ability2',
      timeVeil: 'ability3',
      finalBell: 'ability4',
    };
    for (const ability of ABILITIES) {
      if (this.input.consume(inputActions[ability.id])) {
        this.useAbility(ability.id);
      }
    }
  }

  private useAbility(id: AbilityId): void {
    const definition = ABILITIES.find((ability) => ability.id === id);
    if (!definition) return;
    if (this.abilityTimers[id] > 0) {
      this.hud.flash(`${definition.label} RECHARGING`, 'muted');
      return;
    }
    if (!this.hero.spendMeter(definition.cost)) {
      this.hud.flash(`NEED ${definition.cost} AURA`, 'pink');
      return;
    }
    this.abilityTimers[id] = definition.cooldown;
    this.hero.setAura(true, Number.parseInt(definition.accent.slice(1), 16));
    this.auraTimer = id === 'timeVeil' ? 5 : id === 'finalBell' ? 1.4 : 0.75;
    this.audio.play('ability');

    if (id === 'massEntry') {
      const radius = 5.2;
      this.effects.shockwave(this.hero.group.position.clone().add(new THREE.Vector3(0, 0.04, 0)), 0xffc857, radius);
      this.cameraShake = 0.4;
      for (const enemy of this.enemies) {
        if (enemy.alive && enemy.group.position.distanceTo(this.hero.group.position) <= radius) {
          const direction = enemy.group.position.clone().sub(this.hero.group.position).normalize();
          enemy.takeDamage(34, direction, 11);
          this.onSuccessfulHit(enemy.group.position, 34, 0xffc857, enemy);
        }
      }
      if (this.boss?.alive && this.boss.group.position.distanceTo(this.hero.group.position) <= radius) {
        const direction = this.boss.group.position.clone().sub(this.hero.group.position).normalize();
        if (this.boss.takeDamage(27, direction, 8)) this.onSuccessfulHit(this.boss.group.position, 27, 0xffc857);
      }
    }

    if (id === 'auraStrike') {
      const target = this.findNearestTarget(4.2, 0.05);
      this.effects.aura(this.hero.getAttackPosition(), 0xff4d6d);
      this.effects.shockwave(this.hero.getAttackPosition(), 0xff4d6d, 2.2);
      this.cameraShake = 0.55;
      if (target instanceof Enemy) {
        const direction = target.group.position.clone().sub(this.hero.group.position).normalize();
        target.takeDamage(78, direction, 13);
        this.onSuccessfulHit(target.group.position, 78, 0xff4d6d, target);
      } else if (target instanceof Boss && target.alive) {
        const direction = target.group.position.clone().sub(this.hero.group.position).normalize();
        if (target.takeDamage(58, direction, 7)) this.onSuccessfulHit(target.group.position, 58, 0xff4d6d);
      }
    }

    if (id === 'timeVeil') {
      this.timeSlow = 5;
      this.effects.aura(this.hero.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0x62d9ff);
      this.hud.flash('TIME VEIL · OWN THE MOMENT', 'cyan');
    }

    if (id === 'finalBell') {
      const radius = 7.5;
      this.effects.shockwave(this.hero.group.position, 0xb58cff, radius);
      this.effects.burst(this.hero.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 0xb58cff, 32, 5);
      this.cameraShake = 0.9;
      for (const enemy of this.enemies) {
        if (enemy.alive && enemy.group.position.distanceTo(this.hero.group.position) <= radius) {
          const direction = enemy.group.position.clone().sub(this.hero.group.position).normalize();
          enemy.takeDamage(150, direction, 18);
          this.onSuccessfulHit(enemy.group.position, 150, 0xb58cff, enemy);
        }
      }
      if (this.boss?.alive && this.boss.group.position.distanceTo(this.hero.group.position) <= radius) {
        const direction = this.boss.group.position.clone().sub(this.hero.group.position).normalize();
        if (this.boss.takeDamage(125, direction, 10)) this.onSuccessfulHit(this.boss.group.position, 125, 0xb58cff);
      }
    }
  }

  private handleEnemyAction(action: EnemyAction): void {
    if (action.type === 'strike') {
      if (action.position.distanceTo(this.hero.group.position) < 2.8) {
        const damaged = this.hero.takeDamage({ amount: action.damage, position: action.position, color: action.color });
        if (damaged) {
          this.effects.burst(this.hero.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), action.color, 8, 2.4);
          this.cameraShake = Math.max(this.cameraShake, 0.2);
          this.audio.play('hurt');
        }
      }
      return;
    }
    this.spawnProjectile(action.position, action.damage, action.color, 9);
  }

  private handleBossAction(action: BossAction): void {
    if (action.type === 'strike') {
      if (action.position.distanceTo(this.hero.group.position) < 3.2) {
        const damaged = this.hero.takeDamage({ amount: action.damage, position: action.position, color: action.color });
        if (damaged) {
          this.effects.burst(this.hero.group.position.clone().add(new THREE.Vector3(0, 1.25, 0)), action.color, 12, 3.3);
          this.cameraShake = Math.max(this.cameraShake, 0.3);
          this.audio.play('hurt');
        }
      }
      return;
    }
    if (action.type === 'projectile') {
      this.spawnProjectile(action.position, action.damage, action.color, 11);
      return;
    }

    this.effects.shockwave(action.position, action.color, 5.6);
    this.cameraShake = Math.max(this.cameraShake, 0.35);
    if (action.position.distanceTo(this.hero.group.position) < 5.7) {
      const damaged = this.hero.takeDamage({ amount: action.damage, position: action.position, color: action.color });
      if (damaged) this.audio.play('hurt');
    }
  }

  private spawnProjectile(position: THREE.Vector3, damage: number, color: number, speed: number): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.96 }),
    );
    mesh.position.copy(position);
    const velocity = this.hero.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)).sub(position).normalize().multiplyScalar(speed);
    this.projectiles.push({ mesh, velocity, damage, color, life: 4 });
    this.scene.add(mesh);
  }

  private onSuccessfulHit(position: THREE.Vector3, damage: number, color: number, enemy?: Enemy): void {
    this.hero.gainMeter(3 + damage * 0.08);
    this.hero.score += calculateScore({ basePoints: 20 + damage * 2, comboCount: Math.max(1, this.hero.comboCount), comboMultiplier: 1.05 });
    this.effects.burst(position.clone().add(new THREE.Vector3(0, 0.7, 0)), color, damage > 45 ? 16 : 8, damage > 45 ? 4 : 2.4);
    this.effects.slash(position.clone().add(new THREE.Vector3(0, 0.65, 0)), color);
    this.audio.play(damage > 20 ? 'heavy' : 'hit');
    if (enemy && !enemy.alive) {
      const completed = this.missions.registerDefeat();
      this.hero.score += 180;
      this.hero.currency += 45;
      this.effects.aura(position.clone().add(new THREE.Vector3(0, 1, 0)), color);
      if (completed) this.hud.flash('OBJECTIVE CLEARED · HOLD THE FRAME', 'gold');
    }
  }

  private findNearestTarget(maxDistance: number, minimumFacing: number): Enemy | Boss | null {
    const origin = this.hero.group.position;
    const forward = this.hero.getForward();
    let nearest: Enemy | Boss | null = null;
    let distance = maxDistance;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const offset = enemy.group.position.clone().sub(origin);
      const candidateDistance = offset.length();
      if (candidateDistance <= distance && forward.dot(offset.normalize()) >= minimumFacing) {
        distance = candidateDistance;
        nearest = enemy;
      }
    }
    if (this.boss?.alive) {
      const offset = this.boss.group.position.clone().sub(origin);
      const candidateDistance = offset.length();
      if (candidateDistance <= distance && forward.dot(offset.normalize()) >= minimumFacing) {
        nearest = this.boss;
      }
    }
    return nearest;
  }

  private completeMission(): void {
    const mission = this.missions.current;
    if (!mission || this.phase !== 'playing') return;
    this.phase = 'missionComplete';
    this.hero.currency += mission.reward;
    this.hero.score += mission.scoreBonus;
    this.saveHighScoreIfNeeded();
    this.audio.play('victory');
    this.screens.showMissionComplete(mission.title, mission.reward, this.hero.score);
  }

  private showGameOver(): void {
    if (this.phase === 'gameOver') return;
    this.phase = 'gameOver';
    this.clearActors();
    this.saveHighScoreIfNeeded();
    this.audio.play('defeat');
    this.screens.showGameOver(this.hero.score);
  }

  private showVictory(): void {
    if (this.phase === 'victory') return;
    this.phase = 'victory';
    this.clearActors();
    this.saveHighScoreIfNeeded();
    this.audio.play('victory');
    this.screens.showVictory(this.hero.score, this.saveData.highScore);
  }

  private updateHud(): void {
    const mission = this.missions.current;
    this.hud.update({
      health: this.hero.health,
      maxHealth: this.hero.maxHealth,
      meter: this.hero.meter,
      score: this.hero.score,
      currency: this.hero.currency,
      combo: this.hero.comboCount,
      missionTitle: this.missions.isBossMission ? 'THE LAST BELL' : mission?.title ?? 'MUTHU NAGAR',
      objective: this.missions.isBossMission ? 'Defeat Rathna Veyil' : mission?.objective ?? 'Find the next signal',
      progress: this.missions.isBossMission ? 'FINAL' : `${this.missions.progressCount} / ${mission?.target ?? 0}`,
      bossHealth: this.boss?.alive ? this.boss.health : undefined,
      bossMaxHealth: this.boss?.alive ? this.boss.maxHealth : undefined,
    });
    for (const ability of ABILITIES) {
      this.hud.setAbilityState(ability.id, this.abilityTimers[ability.id] <= 0 && this.hero.meter >= ability.cost, this.abilityTimers[ability.id], this.hero.meter, ability.cost);
    }
  }

  private updateCamera(delta: number): void {
    const heroPosition = this.hero.group.position;
    const forward = this.hero.getForward().clone();
    const shoulder = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
    const desired = heroPosition.clone()
      .addScaledVector(forward, -7.6)
      .addScaledVector(shoulder, 1.15)
      .add(new THREE.Vector3(0, 4.4, 0));
    this.camera.position.lerp(desired, Math.min(1, delta * 5.5));
    if (this.cameraShake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake * 0.34;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake * 0.22;
    }
    this.camera.lookAt(heroPosition.clone().add(new THREE.Vector3(0, 1.3, 0)));
  }

  private removeProjectile(index: number): void {
    const projectile = this.projectiles[index];
    this.scene.remove(projectile.mesh);
    projectile.mesh.geometry.dispose();
    if (Array.isArray(projectile.mesh.material)) {
      projectile.mesh.material.forEach((material) => material.dispose());
    } else {
      projectile.mesh.material.dispose();
    }
    this.projectiles.splice(index, 1);
  }

  private loadSave(): SaveData {
    const fallback: SaveData = { highScore: 0, bestMission: 0, soundEnabled: true };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        highScore: Number.isFinite(parsed.highScore) ? Math.max(0, Number(parsed.highScore)) : 0,
        bestMission: Number.isFinite(parsed.bestMission) ? Math.max(0, Number(parsed.bestMission)) : 0,
        soundEnabled: parsed.soundEnabled !== false,
      };
    } catch {
      return fallback;
    }
  }

  private saveHighScoreIfNeeded(): void {
    if (this.hero.score > this.saveData.highScore) {
      this.saveData.highScore = Math.floor(this.hero.score);
    }
    this.saveSave();
  }

  private saveSave(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.saveData));
    } catch {
      // Storage can be disabled; the current run still remains playable.
    }
  }
}
