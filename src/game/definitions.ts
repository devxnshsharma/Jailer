import * as THREE from 'three';

import type { AbilityDefinition, MissionDefinition } from './types';

export const ABILITIES: AbilityDefinition[] = [
  {
    id: 'massEntry',
    label: 'MASS ENTRY',
    key: '1',
    cost: 20,
    cooldown: 2.5,
    accent: '#ffc857',
    description: 'A shockwave that clears the street.',
  },
  {
    id: 'auraStrike',
    label: 'AURA STRIKE',
    key: '2',
    cost: 30,
    cooldown: 4,
    accent: '#ff4d6d',
    description: 'A charged blow with heavyweight impact.',
  },
  {
    id: 'timeVeil',
    label: 'TIME VEIL',
    key: '3',
    cost: 25,
    cooldown: 7,
    accent: '#62d9ff',
    description: 'Slow the syndicate and own the moment.',
  },
  {
    id: 'finalBell',
    label: 'FINAL BELL',
    key: '4',
    cost: 70,
    cooldown: 10,
    accent: '#b58cff',
    description: 'A screen-shaking finisher for the last stand.',
  },
];

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'neon-bazaar',
    title: 'NEON BAZAAR',
    subtitle: 'Kovil Street is bright with rain, tea steam, and trouble.',
    objective: 'Clear the temple-market Black Lotus squad',
    target: 5,
    enemyKinds: ['bruiser', 'lookout'],
    reward: 450,
    scoreBonus: 1200,
    arena: new THREE.Vector3(0, 0, 4),
  },
  {
    id: 'rooftop-reckoning',
    title: 'ROOFTOP RECKONING',
    subtitle: 'Cross the old bus route before the courier reaches the flyover.',
    objective: 'Silence the rooftop courier crew',
    target: 7,
    enemyKinds: ['blade', 'lookout', 'bruiser'],
    reward: 800,
    scoreBonus: 2200,
    arena: new THREE.Vector3(18, 0, -18),
  },
  {
    id: 'iron-hideout',
    title: 'IRON HIDEOUT',
    subtitle: 'Salt air, freight steel, and an armed harbour yard.',
    objective: 'Crack the harbour-yard guard line',
    target: 9,
    enemyKinds: ['enforcer', 'bruiser', 'blade'],
    reward: 1250,
    scoreBonus: 3500,
    arena: new THREE.Vector3(-22, 0, -16),
  },
];
