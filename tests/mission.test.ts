import { describe, expect, it } from 'vitest';

import { MissionManager } from '../src/missions/MissionManager';

describe('mission progression', () => {
  it('starts at the first mission and completes after its target defeats', () => {
    const missions = new MissionManager();
    missions.start();

    expect(missions.currentIndex).toBe(0);
    expect(missions.current?.title).toBe('NEON BAZAAR');
    expect(missions.progressCount).toBe(0);
    expect(missions.isComplete).toBe(false);

    for (let index = 0; index < 4; index += 1) {
      expect(missions.registerDefeat()).toBe(false);
    }
    expect(missions.registerDefeat()).toBe(true);
    expect(missions.progressCount).toBe(5);
    expect(missions.isComplete).toBe(true);
  });

  it('resets progress when entering the next mission and supports the boss slot', () => {
    const missions = new MissionManager();
    missions.start();
    missions.begin(1);

    expect(missions.currentIndex).toBe(1);
    expect(missions.current?.title).toBe('ROOFTOP RECKONING');
    expect(missions.progressCount).toBe(0);

    missions.enterBoss();
    expect(missions.isBossMission).toBe(true);
    expect(missions.current).toBeNull();
  });
});
