import { describe, expect, it } from 'vitest';

import { WeaponSystem } from '../src/game/WeaponSystem';

describe('WeaponSystem', () => {
  it('cycles original weapons and returns a shot plan with magazine ammo', () => {
    const weapons = new WeaponSystem();
    expect(weapons.getStatus()).toMatchObject({ id: 'pistol', ammo: 12, reserve: 72 });

    const firstShot = weapons.tryFire();
    expect(firstShot?.weapon.id).toBe('pistol');
    expect(weapons.getStatus().ammo).toBe(11);

    weapons.update(0.22);
    expect(weapons.switchTo(1)).toBe(true);
    expect(weapons.getStatus()).toMatchObject({ id: 'scattergun', ammo: 6, reserve: 36 });
    expect(weapons.tryFire()?.pellets).toBe(6);
  });

  it('reloads only the active weapon and caps the magazine at its size', () => {
    const weapons = new WeaponSystem();
    for (let index = 0; index < 12; index += 1) {
      weapons.tryFire();
      weapons.update(0.22);
    }
    expect(weapons.getStatus().ammo).toBe(0);
    expect(weapons.startReload()).toBe(true);
    expect(weapons.getStatus().reloading).toBe(true);

    weapons.update(1.2);
    expect(weapons.getStatus()).toMatchObject({ ammo: 12, reserve: 60, reloading: false });
  });

  it('does not fire or reload when the current weapon is already full', () => {
    const weapons = new WeaponSystem();
    expect(weapons.startReload()).toBe(false);
    expect(weapons.tryFire()).not.toBeNull();
    expect(weapons.tryFire()).toBeNull();
  });
});
