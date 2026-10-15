import { ABILITIES } from '../game/definitions';
import { InputManager, type InputAction } from '../game/InputManager';
import { WEAPONS, type WeaponStatus } from '../game/WeaponSystem';

export interface HudState {
  health: number;
  maxHealth: number;
  meter: number;
  score: number;
  currency: number;
  combo: number;
  missionTitle: string;
  objective: string;
  progress: string;
  weapon: WeaponStatus;
  aiming: boolean;
  bossHealth?: number;
  bossMaxHealth?: number;
}

export class Hud {
  readonly root = document.createElement('div');
  private readonly healthFill: HTMLDivElement;
  private readonly meterFill: HTMLDivElement;
  private readonly bossWrap = document.createElement('div');
  private readonly bossFill: HTMLDivElement;
  private readonly objective: HTMLDivElement;
  private readonly missionTitle: HTMLDivElement;
  private readonly score: HTMLSpanElement;
  private readonly currency: HTMLSpanElement;
  private readonly combo: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly weaponName: HTMLDivElement;
  private readonly weaponAmmo: HTMLSpanElement;
  private readonly weaponReserve: HTMLSpanElement;
  private readonly weaponReload: HTMLDivElement;
  private readonly abilityButtons = new Map<string, HTMLButtonElement>();
  private toastTimer: number | null = null;

  constructor(private readonly input: InputManager) {
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-topline">
        <div class="brand-lockup"><span class="brand-mark">MM</span><span>SHADOW OF MUTHU NAGAR</span></div>
        <div class="hud-stats"><span class="stat-label">SCORE</span><strong data-score>000000</strong><span class="stat-label">CRED</span><strong data-currency>000</strong></div>
      </div>
      <div class="mission-card">
        <div class="mission-kicker">ACTIVE OBJECTIVE</div>
        <div class="mission-title" data-mission-title>NEON BAZAAR</div>
        <div class="mission-objective" data-objective>Break the first Black Lotus squad</div>
        <div class="mission-progress" data-progress>0 / 5</div>
      </div>
       <div class="weapon-card"><div class="weapon-kicker">DEMO ARMORY / <span data-weapon-short>45</span></div><div class="weapon-name" data-weapon-name>COLT .45</div><div class="weapon-ammo"><strong data-weapon-ammo>12</strong><span>/</span><span data-weapon-reserve>72</span></div><div class="weapon-reload" data-weapon-reload></div><div class="weapon-switches" data-weapon-switches></div><div class="weapon-hint">Z→] / TAB CYCLE · R RELOAD · CLICK FIRE</div></div>
      <div class="player-bars">
        <div class="bar-block"><div class="bar-label"><span>VETRI</span><span data-health-label>100 / 100</span></div><div class="bar health-bar"><div class="bar-fill" data-health></div></div></div>
        <div class="bar-block meter-block"><div class="bar-label"><span>AURA METER</span><span data-meter-label>38%</span></div><div class="bar meter-bar"><div class="bar-fill" data-meter></div></div></div>
      </div>
      <div class="ability-dock"></div>
      <div class="aim-reticle" data-reticle><span></span><span></span><span></span><span></span><b>+</b></div>
      <div class="combo-readout" data-combo></div>
      <div class="toast" data-toast></div>
    `;

    this.bossWrap.className = 'boss-bar-wrap';
    this.bossWrap.innerHTML = '<div class="boss-label"><span>RATHNA VEYIL</span><span data-boss-label></span></div><div class="bar boss-bar"><div class="bar-fill" data-boss></div></div>';
    this.bossFill = this.bossWrap.querySelector('[data-boss]') as HTMLDivElement;
    this.root.querySelector('.player-bars')?.append(this.bossWrap);
    this.bossWrap.hidden = true;

    const health = this.root.querySelector('[data-health]') as HTMLDivElement;
    const meter = this.root.querySelector('[data-meter]') as HTMLDivElement;
    this.healthFill = health;
    this.meterFill = meter;
    this.score = this.root.querySelector('[data-score]') as HTMLSpanElement;
    this.currency = this.root.querySelector('[data-currency]') as HTMLSpanElement;
    this.objective = this.root.querySelector('[data-objective]') as HTMLDivElement;
    this.missionTitle = this.root.querySelector('[data-mission-title]') as HTMLDivElement;
    this.combo = this.root.querySelector('[data-combo]') as HTMLDivElement;
    this.toast = this.root.querySelector('[data-toast]') as HTMLDivElement;
    this.weaponName = this.root.querySelector('[data-weapon-name]') as HTMLDivElement;
    this.weaponAmmo = this.root.querySelector('[data-weapon-ammo]') as HTMLSpanElement;
    this.weaponReserve = this.root.querySelector('[data-weapon-reserve]') as HTMLSpanElement;
    this.weaponReload = this.root.querySelector('[data-weapon-reload]') as HTMLDivElement;
    const weaponSwitches = this.root.querySelector('[data-weapon-switches]') as HTMLDivElement;
    WEAPONS.forEach((weapon, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.weaponSwitch = `weapon${index + 1}`;
      button.dataset.weaponId = weapon.id;
      button.title = weapon.demoName;
      button.setAttribute('aria-label', `Equip ${weapon.label}`);
      button.textContent = weapon.shortLabel;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.input.setVirtualAction(`weapon${index + 1}` as InputAction, true);
      });
      button.addEventListener('pointerup', () => this.input.setVirtualAction(`weapon${index + 1}` as InputAction, false));
      button.addEventListener('pointercancel', () => this.input.setVirtualAction(`weapon${index + 1}` as InputAction, false));
      button.addEventListener('click', () => {
        const action = `weapon${index + 1}` as InputAction;
        this.input.setVirtualAction(action, true);
        window.setTimeout(() => this.input.setVirtualAction(action, false), 120);
      });
      weaponSwitches.append(button);
    });
    this.buildAbilities();
    this.buildTouchControls();
  }

  update(state: HudState): void {
    const healthRatio = Math.max(0, Math.min(1, state.health / state.maxHealth));
    const meterRatio = Math.max(0, Math.min(1, state.meter / 100));
    this.healthFill.style.transform = `scaleX(${healthRatio})`;
    this.meterFill.style.transform = `scaleX(${meterRatio})`;
    this.score.textContent = String(Math.max(0, Math.floor(state.score))).padStart(6, '0');
    this.currency.textContent = String(Math.max(0, Math.floor(state.currency))).padStart(3, '0');
    this.missionTitle.textContent = state.missionTitle;
    this.objective.textContent = state.objective;
    this.weaponName.textContent = state.weapon.label;
    this.weaponAmmo.textContent = state.weapon.usesAmmo ? String(state.weapon.ammo).padStart(2, '0') : '∞';
    this.weaponReserve.textContent = state.weapon.usesAmmo ? String(state.weapon.reserve).padStart(3, '0') : '—';
    this.weaponReload.style.transform = `scaleX(${state.weapon.reloading ? state.weapon.reloadProgress : 0})`;
    this.weaponReload.dataset.active = state.weapon.reloading ? 'true' : 'false';
    const reticle = this.root.querySelector('[data-reticle]');
    reticle?.classList.toggle('is-visible', state.aiming);
    const weaponShort = this.root.querySelector('[data-weapon-short]');
    if (weaponShort) weaponShort.textContent = state.weapon.shortLabel;
    this.root.querySelectorAll<HTMLButtonElement>('[data-weapon-switch]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.weaponId === state.weapon.id);
    });
    const progressElement = this.root.querySelector('[data-progress]');
    if (progressElement) {
      progressElement.textContent = state.progress;
    }
    const healthLabel = this.root.querySelector('[data-health-label]');
    const meterLabel = this.root.querySelector('[data-meter-label]');
    if (healthLabel) healthLabel.textContent = `${Math.ceil(state.health)} / ${state.maxHealth}`;
    if (meterLabel) meterLabel.textContent = `${Math.ceil(state.meter)}%`;
    this.combo.textContent = state.combo > 1 ? `${state.combo} HIT COMBO` : '';
    this.combo.classList.toggle('is-visible', state.combo > 1);

    const hasBoss = typeof state.bossHealth === 'number' && typeof state.bossMaxHealth === 'number';
    this.bossWrap.hidden = !hasBoss;
    if (hasBoss) {
      const bossRatio = Math.max(0, Math.min(1, state.bossHealth! / state.bossMaxHealth!));
      this.bossFill.style.transform = `scaleX(${bossRatio})`;
      const label = this.bossWrap.querySelector('[data-boss-label]');
      if (label) label.textContent = `${Math.ceil(state.bossHealth!)} / ${state.bossMaxHealth}`;
    }
  }

  setAbilityState(id: string, available: boolean, cooldown: number, meter: number, cost: number): void {
    const button = this.abilityButtons.get(id);
    if (!button) return;
    button.disabled = !available;
    button.dataset.cooldown = cooldown > 0 ? cooldown.toFixed(1) : '';
    button.classList.toggle('is-ready', available && meter >= cost);
  }

  flash(message: string, accent = 'gold'): void {
    this.toast.textContent = message;
    this.toast.dataset.accent = accent;
    this.toast.classList.add('is-visible');
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove('is-visible'), 1900);
  }

  private buildAbilities(): void {
    const dock = this.root.querySelector('.ability-dock') as HTMLDivElement;
    ABILITIES.forEach((ability) => {
      const button = document.createElement('button');
      button.className = 'ability-button';
      button.type = 'button';
      button.dataset.ability = ability.id;
      button.style.setProperty('--ability-accent', ability.accent);
      button.innerHTML = `<span class="ability-key">${ability.key}</span><span class="ability-name">${ability.label}</span><span class="ability-cooldown"></span>`;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.input.setVirtualAction(`ability${ability.key}` as InputAction, true);
      });
      button.addEventListener('pointerup', () => this.input.setVirtualAction(`ability${ability.key}` as InputAction, false));
      button.addEventListener('pointercancel', () => this.input.setVirtualAction(`ability${ability.key}` as InputAction, false));
      dock.append(button);
      this.abilityButtons.set(ability.id, button);
    });
  }

  private buildTouchControls(): void {
    const touch = document.createElement('div');
    touch.className = 'touch-controls';
    touch.innerHTML = `
      <div class="joystick" aria-label="Movement control"><div class="joystick-knob"></div></div>
      <div class="touch-actions"><button data-touch="pause">PAUSE</button><button data-touch="reload">RELOAD</button><button data-touch="dodge">DODGE</button><button data-touch="jump">JUMP</button><button data-touch="lightAttack" class="attack-touch">STRIKE</button></div>
    `;
    const joystick = touch.querySelector('.joystick') as HTMLDivElement;
    const knob = touch.querySelector('.joystick-knob') as HTMLDivElement;
    let pointerId: number | null = null;
    const updateJoystick = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      const rect = joystick.getBoundingClientRect();
      const radius = rect.width * 0.38;
      const x = event.clientX - (rect.left + rect.width / 2);
      const y = event.clientY - (rect.top + rect.height / 2);
      const distance = Math.min(radius, Math.hypot(x, y));
      const angle = Math.atan2(y, x);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.input.setVirtualMovement(dx / radius, dy / radius);
    };
    joystick.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId;
      joystick.setPointerCapture(event.pointerId);
      updateJoystick(event);
    });
    joystick.addEventListener('pointermove', updateJoystick);
    const endJoystick = () => {
      pointerId = null;
      knob.style.transform = 'translate(0, 0)';
      this.input.clearVirtualMovement();
    };
    joystick.addEventListener('pointerup', endJoystick);
    joystick.addEventListener('pointercancel', endJoystick);

    touch.querySelectorAll<HTMLButtonElement>('[data-touch]').forEach((button) => {
      const action = button.dataset.touch as InputAction;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.input.setVirtualAction(action, true);
      });
      button.addEventListener('pointerup', () => this.input.setVirtualAction(action, false));
      button.addEventListener('pointercancel', () => this.input.setVirtualAction(action, false));
    });
    this.root.append(touch);
  }
}
