export type WeaponId =
  | 'pistol'
  | 'scattergun'
  | 'carbine'
  | 'unarmed'
  | 'baseballBat'
  | 'uzi'
  | 'ak47'
  | 'sniperRifle'
  | 'rocketLauncher'
  | 'flamethrower'
  | 'molotov'
  | 'grenade'
  | 'detonator'
  | 'heliCannon';

export type WeaponFireMode = 'hitscan' | 'melee' | 'flame' | 'projectile' | 'detonator' | 'heliCannon';

export interface WeaponDefinition {
  id: WeaponId;
  label: string;
  shortLabel: string;
  demoName: string;
  magazineSize: number;
  reserveSize: number;
  damage: number;
  pellets: number;
  range: number;
  fireInterval: number;
  reloadSeconds: number;
  spread: number;
  color: number;
  mode: WeaponFireMode;
  projectileSpeed: number;
  explosionRadius: number;
  usesAmmo: boolean;
}

export interface WeaponStatus {
  id: WeaponId;
  label: string;
  ammo: number;
  magazineSize: number;
  reserve: number;
  reloading: boolean;
  reloadProgress: number;
  mode: WeaponFireMode;
  usesAmmo: boolean;
}

export interface ShotPlan {
  weapon: WeaponDefinition;
  pellets: number;
  damage: number;
  range: number;
  spread: number;
  color: number;
  mode: WeaponFireMode;
  projectileSpeed: number;
  explosionRadius: number;
}

export const WEAPONS: WeaponDefinition[] = [
  {
    id: 'pistol',
    label: 'COLT .45',
    shortLabel: '45',
    demoName: 'Colt45',
    magazineSize: 12,
    reserveSize: 72,
    damage: 25,
    pellets: 1,
    range: 24,
    fireInterval: 0.22,
    reloadSeconds: 1.15,
    spread: 0.012,
    color: 0xffd27a,
    mode: 'hitscan',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: true,
  },
  {
    id: 'scattergun',
    label: 'SHOTGUN',
    shortLabel: 'SG',
    demoName: 'Shotgun',
    magazineSize: 6,
    reserveSize: 36,
    damage: 14,
    pellets: 6,
    range: 14,
    fireInterval: 0.72,
    reloadSeconds: 1.7,
    spread: 0.18,
    color: 0xff765e,
    mode: 'hitscan',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: true,
  },
  {
    id: 'carbine',
    label: 'M16',
    shortLabel: 'M16',
    demoName: 'M16',
    magazineSize: 30,
    reserveSize: 120,
    damage: 13,
    pellets: 1,
    range: 42,
    fireInterval: 0.075,
    reloadSeconds: 1.8,
    spread: 0.025,
    color: 0x65ddff,
    mode: 'hitscan',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: true,
  },
  {
    id: 'unarmed',
    label: 'UNARMED',
    shortLabel: 'FIST',
    demoName: 'Unarmed',
    magazineSize: 0,
    reserveSize: 0,
    damage: 16,
    pellets: 1,
    range: 1.9,
    fireInterval: 0.36,
    reloadSeconds: 0,
    spread: 0,
    color: 0xfff0c2,
    mode: 'melee',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: false,
  },
  {
    id: 'baseballBat',
    label: 'BASEBALL BAT',
    shortLabel: 'BAT',
    demoName: 'BaseballBat',
    magazineSize: 0,
    reserveSize: 0,
    damage: 36,
    pellets: 1,
    range: 2.7,
    fireInterval: 0.66,
    reloadSeconds: 0,
    spread: 0,
    color: 0xffc857,
    mode: 'melee',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: false,
  },
  {
    id: 'uzi',
    label: 'UZI',
    shortLabel: 'UZI',
    demoName: 'Uzi',
    magazineSize: 32,
    reserveSize: 192,
    damage: 11,
    pellets: 1,
    range: 24,
    fireInterval: 0.075,
    reloadSeconds: 1.35,
    spread: 0.06,
    color: 0xff7ad9,
    mode: 'hitscan',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: true,
  },
  {
    id: 'ak47',
    label: 'AK-47',
    shortLabel: 'AK',
    demoName: 'AK47',
    magazineSize: 30,
    reserveSize: 180,
    damage: 15,
    pellets: 1,
    range: 34,
    fireInterval: 0.11,
    reloadSeconds: 1.55,
    spread: 0.045,
    color: 0xff9b58,
    mode: 'hitscan',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: true,
  },
  {
    id: 'sniperRifle',
    label: 'SNIPER RIFLE',
    shortLabel: 'SNIPE',
    demoName: 'SniperRifle',
    magazineSize: 6,
    reserveSize: 30,
    damage: 95,
    pellets: 1,
    range: 70,
    fireInterval: 0.95,
    reloadSeconds: 2.2,
    spread: 0.002,
    color: 0x9fc8ff,
    mode: 'hitscan',
    projectileSpeed: 0,
    explosionRadius: 0,
    usesAmmo: true,
  },
  {
    id: 'rocketLauncher',
    label: 'ROCKET LAUNCHER',
    shortLabel: 'RPG',
    demoName: 'RocketLauncher',
    magazineSize: 1,
    reserveSize: 12,
    damage: 120,
    pellets: 1,
    range: 48,
    fireInterval: 1.2,
    reloadSeconds: 1.9,
    spread: 0,
    color: 0xffd26a,
    mode: 'projectile',
    projectileSpeed: 15,
    explosionRadius: 4.8,
    usesAmmo: true,
  },
  {
    id: 'flamethrower',
    label: 'FLAMETHROWER',
    shortLabel: 'FLAME',
    demoName: 'FlameThrower',
    magazineSize: 100,
    reserveSize: 300,
    damage: 8,
    pellets: 1,
    range: 11,
    fireInterval: 0.055,
    reloadSeconds: 2.4,
    spread: 0.16,
    color: 0xff5a38,
    mode: 'flame',
    projectileSpeed: 0,
    explosionRadius: 1.25,
    usesAmmo: true,
  },
  {
    id: 'molotov',
    label: 'MOLOTOV',
    shortLabel: 'MOLO',
    demoName: 'Molotov',
    magazineSize: 1,
    reserveSize: 8,
    damage: 60,
    pellets: 1,
    range: 22,
    fireInterval: 0.9,
    reloadSeconds: 1.3,
    spread: 0.02,
    color: 0xffb83d,
    mode: 'projectile',
    projectileSpeed: 11,
    explosionRadius: 3.6,
    usesAmmo: true,
  },
  {
    id: 'grenade',
    label: 'GRENADE',
    shortLabel: 'GRENADE',
    demoName: 'Grenade',
    magazineSize: 1,
    reserveSize: 8,
    damage: 75,
    pellets: 1,
    range: 24,
    fireInterval: 0.9,
    reloadSeconds: 1.3,
    spread: 0.02,
    color: 0x8fe36f,
    mode: 'projectile',
    projectileSpeed: 13,
    explosionRadius: 4.4,
    usesAmmo: true,
  },
  {
    id: 'detonator',
    label: 'DETONATOR',
    shortLabel: 'DETONATE',
    demoName: 'Detonator',
    magazineSize: 1,
    reserveSize: 4,
    damage: 95,
    pellets: 1,
    range: 30,
    fireInterval: 0.6,
    reloadSeconds: 1.15,
    spread: 0,
    color: 0xb58cff,
    mode: 'detonator',
    projectileSpeed: 0,
    explosionRadius: 5.2,
    usesAmmo: true,
  },
  {
    id: 'heliCannon',
    label: 'HELI CANNON',
    shortLabel: 'HELI',
    demoName: 'HeliCannon',
    magazineSize: 30,
    reserveSize: 120,
    damage: 88,
    pellets: 1,
    range: 55,
    fireInterval: 0.18,
    reloadSeconds: 2.1,
    spread: 0.018,
    color: 0x5ce1cf,
    mode: 'heliCannon',
    projectileSpeed: 24,
    explosionRadius: 3.8,
    usesAmmo: true,
  },
];

export class WeaponSystem {
  private readonly ammo = WEAPONS.map((weapon) => weapon.magazineSize);
  private readonly reserve = WEAPONS.map((weapon) => weapon.reserveSize);
  private activeIndex = 0;
  private cooldown = 0;
  private reloadTimer = 0;
  private reloadDuration = 0;

  get current(): WeaponDefinition {
    return WEAPONS[this.activeIndex];
  }

  get isReloading(): boolean {
    return this.reloadTimer > 0;
  }

  update(delta: number): void {
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.reloadTimer <= 0) {
      return;
    }

    this.reloadTimer = Math.max(0, this.reloadTimer - delta);
    if (this.reloadTimer === 0) {
      const weapon = this.current;
      const needed = weapon.magazineSize - this.ammo[this.activeIndex];
      const loaded = Math.min(needed, this.reserve[this.activeIndex]);
      this.ammo[this.activeIndex] += loaded;
      this.reserve[this.activeIndex] -= loaded;
    }
  }

  switchTo(slot: number): boolean {
    const nextIndex = Math.max(0, Math.min(WEAPONS.length - 1, Math.floor(slot)));
    if (nextIndex === this.activeIndex && !this.isReloading) {
      return false;
    }
    this.activeIndex = nextIndex;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
    this.cooldown = 0;
    return true;
  }

  tryFire(): ShotPlan | null {
    if (this.isReloading || this.cooldown > 0) {
      return null;
    }
    const weapon = this.current;
    if (weapon.usesAmmo && this.ammo[this.activeIndex] <= 0) {
      this.startReload();
      return null;
    }

    if (weapon.usesAmmo) {
      this.ammo[this.activeIndex] -= 1;
    }
    this.cooldown = weapon.fireInterval;
    return {
      weapon,
      pellets: weapon.pellets,
      damage: weapon.damage,
      range: weapon.range,
      spread: weapon.spread,
      color: weapon.color,
      mode: weapon.mode,
      projectileSpeed: weapon.projectileSpeed,
      explosionRadius: weapon.explosionRadius,
    };
  }

  startReload(): boolean {
    const weapon = this.current;
    if (!weapon.usesAmmo || this.isReloading || this.ammo[this.activeIndex] >= weapon.magazineSize || this.reserve[this.activeIndex] <= 0) {
      return false;
    }
    this.reloadDuration = weapon.reloadSeconds;
    this.reloadTimer = weapon.reloadSeconds;
    return true;
  }

  getStatus(): WeaponStatus {
    const weapon = this.current;
    return {
      id: weapon.id,
      label: weapon.label,
      ammo: this.ammo[this.activeIndex],
      magazineSize: weapon.magazineSize,
      reserve: this.reserve[this.activeIndex],
      reloading: this.isReloading,
      reloadProgress: this.reloadDuration > 0 ? 1 - this.reloadTimer / this.reloadDuration : 0,
      mode: weapon.mode,
      usesAmmo: weapon.usesAmmo,
    };
  }

  switchNext(): boolean {
    return this.switchTo((this.activeIndex + 1) % WEAPONS.length);
  }

  switchPrevious(): boolean {
    return this.switchTo((this.activeIndex - 1 + WEAPONS.length) % WEAPONS.length);
  }

  reset(): void {
    WEAPONS.forEach((weapon, index) => {
      this.ammo[index] = weapon.magazineSize;
      this.reserve[index] = weapon.reserveSize;
    });
    this.activeIndex = 0;
    this.cooldown = 0;
    this.reloadTimer = 0;
    this.reloadDuration = 0;
  }
}
