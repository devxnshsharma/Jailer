import { MISSIONS } from '../game/definitions';
import { advanceMissionProgress, isMissionComplete } from '../game/logic';
import type { MissionDefinition } from '../game/types';

export class MissionManager {
  private index = -1;
  private progress = 0;
  private complete = false;

  start(): void {
    this.index = 0;
    this.progress = 0;
    this.complete = false;
  }

  get current(): MissionDefinition | null {
    return this.index >= 0 && this.index < MISSIONS.length ? MISSIONS[this.index] : null;
  }

  get currentIndex(): number {
    return this.index;
  }

  get isBossMission(): boolean {
    return this.index >= MISSIONS.length;
  }

  get progressCount(): number {
    return this.progress;
  }

  get isComplete(): boolean {
    return this.complete;
  }

  begin(index: number): void {
    this.index = Math.max(0, Math.min(index, MISSIONS.length));
    this.progress = 0;
    this.complete = false;
  }

  registerDefeat(): boolean {
    const mission = this.current;
    if (!mission || this.complete) {
      return false;
    }
    this.progress = advanceMissionProgress({ current: this.progress, target: mission.target }, 1).current;
    this.complete = isMissionComplete({ current: this.progress, target: mission.target });
    return this.complete;
  }

  enterBoss(): void {
    this.index = MISSIONS.length;
    this.progress = 0;
    this.complete = false;
  }

  reset(): void {
    this.index = -1;
    this.progress = 0;
    this.complete = false;
  }
}
