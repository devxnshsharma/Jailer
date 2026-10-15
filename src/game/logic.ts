export interface SpecialMeterResult {
  meter: number;
  consumed: boolean;
}

export interface ComboState {
  count: number;
  lastHitAt: number | null;
}

export interface MissionProgress {
  current: number;
  target: number;
}

export interface ScoreInput {
  basePoints: number;
  comboCount: number;
  comboMultiplier?: number;
  missionBonus?: number;
}

const nonNegative = (value: number): number => Math.max(0, value);

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

/** Reduce health without allowing it to fall below zero or exceed its maximum. */
export function damageHealth(
  currentHealth: number,
  damage: number,
  maxHealth: number,
): number {
  const maximum = nonNegative(maxHealth);
  const health = clamp(currentHealth, 0, maximum);
  return clamp(health - nonNegative(damage), 0, maximum);
}

/** Restore health without allowing it to exceed its maximum. */
export function healHealth(
  currentHealth: number,
  healing: number,
  maxHealth: number,
): number {
  const maximum = nonNegative(maxHealth);
  const health = clamp(currentHealth, 0, maximum);
  return clamp(health + nonNegative(healing), 0, maximum);
}

/** Add special meter while keeping it inside the range from zero to maxMeter. */
export function gainSpecialMeter(
  currentMeter: number,
  gain: number,
  maxMeter: number,
): number {
  const maximum = nonNegative(maxMeter);
  const meter = clamp(currentMeter, 0, maximum);
  return clamp(meter + nonNegative(gain), 0, maximum);
}

/** Spend special meter only when the full cost is available. */
export function consumeSpecialMeter(
  currentMeter: number,
  cost: number,
): SpecialMeterResult {
  const meter = nonNegative(currentMeter);
  const required = nonNegative(cost);

  if (meter < required) {
    return { meter, consumed: false };
  }

  return { meter: meter - required, consumed: true };
}

/** Return whether an action can be used at the supplied time. */
export function isCooldownReady(
  now: number,
  lastUsedAt: number | null,
  cooldownMs: number,
): boolean {
  if (lastUsedAt === null) {
    return true;
  }

  return now >= lastUsedAt + nonNegative(cooldownMs);
}

/** Register a hit, continuing the combo only while its timing window is open. */
export function advanceCombo(
  state: ComboState,
  hitAt: number,
  comboWindowMs: number,
): ComboState {
  const count = Math.max(0, Math.floor(state.count));
  const window = nonNegative(comboWindowMs);
  const continues =
    state.lastHitAt !== null &&
    hitAt >= state.lastHitAt &&
    hitAt - state.lastHitAt <= window;

  return {
    count: continues ? count + 1 : 1,
    lastHitAt: hitAt,
  };
}

/** Add mission progress and cap it at the mission target. */
export function advanceMissionProgress(
  state: MissionProgress,
  amount: number,
): MissionProgress {
  const target = nonNegative(state.target);
  const current = clamp(state.current, 0, target);

  return {
    current: clamp(current + nonNegative(amount), 0, target),
    target,
  };
}

/** A zero-target mission is complete immediately. */
export function isMissionComplete(state: MissionProgress): boolean {
  return state.target <= 0 || state.current >= state.target;
}

/**
 * Calculate an integer score using:
 *
 *   base points × combo count × combo multiplier + mission bonus
 *
 * Negative contributions are ignored, and fractional scores are rounded to the
 * nearest whole point.
 */
export function calculateScore({
  basePoints,
  comboCount,
  comboMultiplier = 1,
  missionBonus = 0,
}: ScoreInput): number {
  const base = nonNegative(basePoints);
  const combo = Math.max(1, Math.floor(comboCount));
  const multiplier = nonNegative(comboMultiplier);
  const bonus = nonNegative(missionBonus);

  return Math.round(base * combo * multiplier + bonus);
}
