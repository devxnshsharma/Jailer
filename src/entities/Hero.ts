import * as THREE from 'three';

import { damageHealth, gainSpecialMeter } from '../game/logic';
import type { DamageEvent } from '../game/types';
import { InputManager } from '../game/InputManager';

export type AttackKind = 'light' | 'heavy';

export interface AttackHitbox {
  active: boolean;
  damage: number;
  range: number;
  knockback: number;
  color: number;
}

const HERO_COLORS = {
  shirt: 0xe3e1db,
  trousers: 0x77654d,
  skin: 0xb97858,
  hair: 0x252735,
  glasses: 0x0b101b,
  shoe: 0x353443,
  belt: 0x171a25,
};

function box(width: number, height: number, depth: number, color: number, emissive = 0, intensity = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.12, emissive, emissiveIntensity: intensity }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function capsule(radius: number, length: number, color: number, emissive = 0, intensity = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 8, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.58, metalness: 0.1, emissive, emissiveIntensity: intensity }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class Hero {
  readonly group = new THREE.Group();
  readonly maxHealth = 100;
  readonly maxMeter = 100;
  health = this.maxHealth;
  meter = 38;
  score = 0;
  currency = 0;
  comboCount = 0;
  invulnerable = 0;

  private readonly visual = new THREE.Group();
  private readonly legs: THREE.Mesh[] = [];
  private readonly arms: THREE.Mesh[] = [];
  private readonly auraRing: THREE.Mesh;
  private readonly direction = new THREE.Vector3(0, 0, -1);
  private attackKind: AttackKind | null = null;
  private attackTimer = 0;
  private attackHitApplied = false;
  private comboTimer = 0;
  private dodgeTimer = 0;
  private jumpVelocity = 0;
  private hitFlashTimer = 0;
  private walkTime = 0;

  constructor() {
    this.group.name = 'Vetri Varman';
    this.group.add(this.visual);
    this.buildModel();
    this.auraRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.8, 0.035, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.5 }),
    );
    this.auraRing.rotation.x = Math.PI / 2;
    this.auraRing.position.y = 0.05;
    this.auraRing.visible = false;
    this.group.add(this.auraRing);
  }

  update(delta: number, input: InputManager): void {
    const movement = input.getMovement();
    const movementVector = new THREE.Vector3(movement.x, 0, movement.y);
    const isMoving = movementVector.lengthSq() > 0.01;

    if (input.consume('dodge') && this.dodgeTimer <= 0 && this.attackTimer <= 0) {
      this.dodgeTimer = 0.26;
      this.invulnerable = 0.32;
      if (!isMoving) {
        movementVector.copy(this.direction);
      }
    }

    if (input.consume('jump') && this.group.position.y <= 0.02 && this.dodgeTimer <= 0) {
      this.jumpVelocity = 6.6;
    }

    if (input.consume('lightAttack')) {
      this.startAttack('light');
    }
    if (input.consume('heavyAttack')) {
      this.startAttack('heavy');
    }

    const speed = input.isDown('sprint') ? 8.4 : 5.4;
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= delta;
      this.group.position.addScaledVector(this.direction, 14 * delta);
    } else if (isMoving && this.attackTimer <= 0) {
      movementVector.normalize();
      this.direction.lerp(movementVector, Math.min(1, delta * 14)).normalize();
      this.group.position.addScaledVector(movementVector, speed * delta);
      this.group.rotation.y = Math.atan2(this.direction.x, this.direction.z);
      this.walkTime += delta * speed;
    }

    this.jumpVelocity -= delta * 18;
    this.group.position.y += this.jumpVelocity * delta;
    if (this.group.position.y < 0) {
      this.group.position.y = 0;
      this.jumpVelocity = 0;
    }

    this.attackTimer = Math.max(0, this.attackTimer - delta);
    if (this.attackTimer <= 0) {
      this.attackKind = null;
    }
    this.comboTimer = Math.max(0, this.comboTimer - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - delta);
    if (this.comboTimer <= 0) {
      this.comboCount = 0;
    }

    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -38, 38);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -38, 38);
    this.animateVisual(delta, isMoving);
  }

  getAttackHitbox(): AttackHitbox {
    if (!this.attackKind || this.attackTimer <= 0.02 || this.attackHitApplied) {
      return { active: false, damage: 0, range: 0, knockback: 0, color: 0xffffff };
    }

    const isHeavy = this.attackKind === 'heavy';
    return {
      active: true,
      damage: isHeavy ? 28 : 11 + this.comboCount * 3,
      range: isHeavy ? 2.55 : 2.05,
      knockback: isHeavy ? 8 : 4.5,
      color: isHeavy ? 0xffc857 : 0xfff0c2,
    };
  }

  markAttackHit(): void {
    this.attackHitApplied = true;
  }

  takeDamage(event: DamageEvent): boolean {
    if (this.invulnerable > 0) {
      return false;
    }
    this.health = damageHealth(this.health, event.amount, this.maxHealth);
    this.invulnerable = 0.55;
    this.hitFlashTimer = 0.18;
    return true;
  }

  gainMeter(amount: number): void {
    this.meter = gainSpecialMeter(this.meter, amount, this.maxMeter);
  }

  spendMeter(cost: number): boolean {
    if (this.meter < cost) {
      return false;
    }
    this.meter -= cost;
    return true;
  }

  setAura(visible: boolean, color = 0xffc857): void {
    this.auraRing.visible = visible;
    (this.auraRing.material as THREE.MeshBasicMaterial).color.setHex(color);
  }

  getForward(): THREE.Vector3 {
    return this.direction;
  }

  getAttackPosition(offset = 1.2): THREE.Vector3 {
    return this.group.position.clone().addScaledVector(this.direction, offset).add(new THREE.Vector3(0, 1.15, 0));
  }

  reset(position = new THREE.Vector3(0, 0, 4)): void {
    this.group.position.copy(position);
    this.health = this.maxHealth;
    this.meter = 38;
    this.score = 0;
    this.currency = 0;
    this.comboCount = 0;
    this.attackKind = null;
    this.attackTimer = 0;
    this.attackHitApplied = false;
    this.comboTimer = 0;
    this.dodgeTimer = 0;
    this.invulnerable = 0;
    this.jumpVelocity = 0;
    this.setAura(false);
  }

  private startAttack(kind: AttackKind): void {
    if (this.attackTimer > 0.05 || this.dodgeTimer > 0) {
      return;
    }
    this.attackKind = kind;
    this.attackTimer = kind === 'heavy' ? 0.42 : 0.25;
    this.attackHitApplied = false;
    this.comboCount = kind === 'light' && this.comboTimer > 0 ? Math.min(3, this.comboCount + 1) : kind === 'light' ? 1 : 0;
    this.comboTimer = kind === 'light' ? 0.72 : 0;
  }

  private animateVisual(delta: number, isMoving: boolean): void {
    const attackProgress = this.attackKind && this.attackTimer > 0
      ? Math.sin((this.attackTimer / (this.attackKind === 'heavy' ? 0.42 : 0.25)) * Math.PI)
      : 0;
    const stride = isMoving ? Math.sin(this.walkTime * 2.2) * 0.42 : 0;
    this.legs[0].rotation.x = stride;
    this.legs[1].rotation.x = -stride;
    this.arms[0].rotation.x = -stride * 0.7;
    this.arms[1].rotation.x = stride * 0.7;
    if (this.attackKind === 'light') {
      this.arms[0].rotation.z = -0.25 - attackProgress * 0.9;
      this.arms[1].rotation.z = 0.18 + attackProgress * 0.7;
    } else if (this.attackKind === 'heavy') {
      this.arms[0].rotation.z = -0.7 - attackProgress * 1.2;
      this.arms[1].rotation.z = 0.7 + attackProgress * 1.2;
    } else {
      this.arms[0].rotation.z = 0;
      this.arms[1].rotation.z = 0;
    }

    this.visual.position.y = this.group.position.y > 0 ? 0.03 : Math.sin(this.walkTime * 4) * 0.015;
    this.visual.rotation.z = this.hitFlashTimer > 0 ? Math.sin(this.hitFlashTimer * 90) * 0.06 : 0;
    this.auraRing.rotation.z += delta * 1.6;
  }

  private buildModel(): void {
    const trousers = capsule(0.38, 0.6, HERO_COLORS.trousers);
    trousers.scale.z = 0.78;
    trousers.position.set(0, 0.85, 0);
    this.visual.add(trousers);

    const leftLeg = capsule(0.16, 0.64, HERO_COLORS.trousers);
    leftLeg.position.set(-0.2, 0.38, 0);
    const rightLeg = capsule(0.16, 0.64, HERO_COLORS.trousers);
    rightLeg.position.set(0.2, 0.38, 0);
    const leftShoe = capsule(0.17, 0.28, HERO_COLORS.shoe, 0x111421, 0.1);
    leftShoe.scale.z = 1.5;
    leftShoe.position.set(-0.2, -0.08, -0.08);
    const rightShoe = capsule(0.17, 0.28, HERO_COLORS.shoe, 0x111421, 0.1);
    rightShoe.scale.z = 1.5;
    rightShoe.position.set(0.2, -0.08, -0.08);
    this.visual.add(leftLeg, rightLeg, leftShoe, rightShoe);
    this.legs.push(leftLeg, rightLeg);

    const torso = capsule(0.46, 0.58, HERO_COLORS.shirt);
    torso.scale.z = 0.72;
    torso.position.y = 1.72;
    this.visual.add(torso);
    const belt = box(1.02, 0.12, 0.6, HERO_COLORS.belt);
    belt.position.y = 1.22;
    this.visual.add(belt);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.25, 12), new THREE.MeshStandardMaterial({ color: HERO_COLORS.skin }));
    neck.position.y = 2.4;
    this.visual.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), new THREE.MeshStandardMaterial({ color: HERO_COLORS.skin, roughness: 0.85 }));
    head.scale.set(0.92, 1.08, 0.92);
    head.position.set(0, 2.75, -0.02);
    this.visual.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), new THREE.MeshStandardMaterial({ color: HERO_COLORS.hair, roughness: 0.45, metalness: 0.08 }));
    hair.scale.set(1.02, 0.62, 1.02);
    hair.position.set(0, 3.06, 0.01);
    this.visual.add(hair);
    for (const [x, z, rotation] of [[-0.22, -0.02, -0.22], [0.18, -0.04, 0.2], [0, 0.12, 0]]) {
      const tuft = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), new THREE.MeshStandardMaterial({ color: HERO_COLORS.hair }));
      tuft.position.set(x, 3.15, z);
      tuft.rotation.z = rotation;
      this.visual.add(tuft);
    }

    const glasses = box(0.78, 0.16, 0.08, HERO_COLORS.glasses, 0x25314c, 0.3);
    glasses.position.set(0, 2.78, -0.34);
    this.visual.add(glasses);
    const bridge = box(0.14, 0.07, 0.08, HERO_COLORS.glasses);
    bridge.position.set(0, 2.78, -0.37);
    this.visual.add(bridge);

    const leftArm = capsule(0.15, 0.68, HERO_COLORS.shirt);
    leftArm.position.set(-0.64, 1.78, 0);
    const rightArm = capsule(0.15, 0.68, HERO_COLORS.shirt);
    rightArm.position.set(0.64, 1.78, 0);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: HERO_COLORS.skin }));
    leftHand.position.set(-0.64, 1.2, 0);
    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: HERO_COLORS.skin }));
    rightHand.position.set(0.64, 1.2, 0);
    this.visual.add(leftArm, rightArm, leftHand, rightHand);
    this.arms.push(leftArm, rightArm);

    const collarLeft = box(0.15, 0.5, 0.05, 0x45485a);
    collarLeft.position.set(-0.18, 2.18, -0.31);
    collarLeft.rotation.z = -0.35;
    const collarRight = box(0.15, 0.5, 0.05, 0x45485a);
    collarRight.position.set(0.18, 2.18, -0.31);
    collarRight.rotation.z = 0.35;
    this.visual.add(collarLeft, collarRight);

    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.018, 6, 18, Math.PI),
      new THREE.MeshStandardMaterial({ color: HERO_COLORS.belt, metalness: 0.72, roughness: 0.25 }),
    );
    chain.position.set(0, 2.14, -0.34);
    chain.rotation.x = Math.PI / 2;
    this.visual.add(chain);
  }
}
