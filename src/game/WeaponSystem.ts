export type WeaponId = 'pistol' | 'scattergun' | 'carbine';

export interface WeaponDefinition {
  id: WeaponId;
  label: string;
  shortLabel: string;
  magazineSize: number;
  reserveSize: number;
  damage: number;
  pellets: number;
  range: number;
  fireInterval: number;
  reloadSeconds: number;
  spread: number;
  color: number;
}

export interface WeaponStatus {
  id: WeaponId;
  label: string;
  ammo: number;
  magazineSize: number;
  reserve: number;
  reloading: boolean;
  reloadProgress: number;
}

export interface ShotPlan {
  weapon: WeaponDefinition;
  pellets: number;
  damage: number;
  range: number;
  spread: number;
  color: number;
}

export const WEAPONS: WeaponDefinition[] = [
  {
    id: 'pistol',
    label: 'VETRI-9 SIDEARM',
    shortLabel: 'V9',
    magazineSize: 12,
    reserveSize: 72,
    damage: 25,
    pellets: 1,
    range: 24,
    fireInterval: 0.22,
    reloadSeconds: 1.15,
    spread: 0.012,
    color: 0xffd27a,
  },
  {
    id: 'scattergun',
    label: 'KAVERI-12',
    shortLabel: 'K12',
    magazineSize: 6,
    reserveSize: 36,
    damage: 14,
    pellets: 6,
    range: 12,
    fireInterval: 0.72,
    reloadSeconds: 1.7,
    spread: 0.16,
    color: 0xff765e,
  },
  {
    id: 'carbine',
    label: 'MONSOON CARBINE',
    shortLabel: 'MC',
    magazineSize: 30,
    reserveSize: 120,
    damage: 15,
    pellets: 1,
    range: 32,
    fireInterval: 0.105,
    reloadSeconds: 1.8,
    spread: 0.035,
    color: 0x65ddff,
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
    if (this.ammo[this.activeIndex] <= 0) {
      this.startReload();
      return null;
    }

    const weapon = this.current;
    this.ammo[this.activeIndex] -= 1;
    this.cooldown = weapon.fireInterval;
    return {
      weapon,
      pellets: weapon.pellets,
      damage: weapon.damage,
      range: weapon.range,
      spread: weapon.spread,
      color: weapon.color,
    };
  }

  startReload(): boolean {
    const weapon = this.current;
    if (this.isReloading || this.ammo[this.activeIndex] >= weapon.magazineSize || this.reserve[this.activeIndex] <= 0) {
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
    };
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
