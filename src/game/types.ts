import type * as THREE from 'three';

export type GamePhase =
  | 'menu'
  | 'briefing'
  | 'playing'
  | 'paused'
  | 'missionComplete'
  | 'gameOver'
  | 'victory';

export type AbilityId = 'massEntry' | 'auraStrike' | 'timeVeil' | 'finalBell';

export type EnemyKind = 'bruiser' | 'lookout' | 'blade' | 'enforcer';

export interface AbilityDefinition {
  id: AbilityId;
  label: string;
  key: string;
  cost: number;
  cooldown: number;
  accent: string;
  description: string;
}

export interface MissionDefinition {
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  target: number;
  enemyKinds: EnemyKind[];
  reward: number;
  scoreBonus: number;
  arena: THREE.Vector3;
}

export interface SaveData {
  highScore: number;
  bestMission: number;
  soundEnabled: boolean;
}

export interface DamageEvent {
  amount: number;
  position: THREE.Vector3;
  color: number;
  knockback?: number;
}
