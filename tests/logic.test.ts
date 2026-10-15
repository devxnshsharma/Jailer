import { describe, expect, it } from 'vitest';

import {
  advanceCombo,
  advanceMissionProgress,
  calculateScore,
  consumeSpecialMeter,
  damageHealth,
  gainSpecialMeter,
  healHealth,
  isCooldownReady,
  isMissionComplete,
  type ComboState,
  type MissionProgress,
} from '../src/game/logic';

describe('health helpers', () => {
  it('applies damage and clamps health at zero and max health', () => {
    expect(damageHealth(80, 25, 100)).toBe(55);
    expect(damageHealth(20, 50, 100)).toBe(0);
    expect(damageHealth(140, 10, 100)).toBe(90);
    expect(damageHealth(50, -10, 100)).toBe(50);
  });

  it('heals health without exceeding max health', () => {
    expect(healHealth(40, 25, 100)).toBe(65);
    expect(healHealth(90, 25, 100)).toBe(100);
    expect(healHealth(-10, 25, 100)).toBe(25);
    expect(healHealth(40, -10, 100)).toBe(40);
  });
});

describe('special meter helpers', () => {
  it('gains meter up to its maximum', () => {
    expect(gainSpecialMeter(30, 20, 100)).toBe(50);
    expect(gainSpecialMeter(90, 20, 100)).toBe(100);
    expect(gainSpecialMeter(30, -20, 100)).toBe(30);
  });

  it('consumes meter only when the full cost is available', () => {
    expect(consumeSpecialMeter(80, 35)).toEqual({
      meter: 45,
      consumed: true,
    });
    expect(consumeSpecialMeter(20, 35)).toEqual({
      meter: 20,
      consumed: false,
    });
    expect(consumeSpecialMeter(20, 0)).toEqual({
      meter: 20,
      consumed: true,
    });
  });
});

describe('cooldowns and combos', () => {
  it('treats unused and expired cooldowns as ready, including the boundary', () => {
    expect(isCooldownReady(1_000, null, 500)).toBe(true);
    expect(isCooldownReady(1_500, 1_000, 500)).toBe(true);
    expect(isCooldownReady(1_499, 1_000, 500)).toBe(false);
  });

  it('continues a combo inside its window and resets it after the window', () => {
    const first: ComboState = { count: 0, lastHitAt: null };
    const second = advanceCombo(first, 100, 400);
    const third = advanceCombo(second, 450, 400);
    const reset = advanceCombo(third, 851, 400);

    expect(second).toEqual({ count: 1, lastHitAt: 100 });
    expect(third).toEqual({ count: 2, lastHitAt: 450 });
    expect(reset).toEqual({ count: 1, lastHitAt: 851 });
    expect(advanceCombo(third, 400, 400)).toEqual({
      count: 1,
      lastHitAt: 400,
    });
  });
});

describe('missions and score', () => {
  it('advances mission progress, caps it at the target, and reports completion', () => {
    const initial: MissionProgress = { current: 2, target: 5 };
    const progressed = advanceMissionProgress(initial, 2);
    const complete = advanceMissionProgress(progressed, 10);

    expect(progressed).toEqual({ current: 4, target: 5 });
    expect(isMissionComplete(progressed)).toBe(false);
    expect(complete).toEqual({ current: 5, target: 5 });
    expect(isMissionComplete(complete)).toBe(true);
    expect(isMissionComplete({ current: 0, target: 0 })).toBe(true);
  });

  it('calculates a rounded score from points, combo, multiplier, and bonus', () => {
    expect(
      calculateScore({
        basePoints: 125,
        comboCount: 3,
        comboMultiplier: 1.2,
        missionBonus: 50,
      }),
    ).toBe(500);
    expect(
      calculateScore({
        basePoints: 100,
        comboCount: 0,
        comboMultiplier: 1,
        missionBonus: 0,
      }),
    ).toBe(100);
    expect(
      calculateScore({
        basePoints: -10,
        comboCount: 2,
        comboMultiplier: 1,
        missionBonus: -5,
      }),
    ).toBe(0);
  });
});
