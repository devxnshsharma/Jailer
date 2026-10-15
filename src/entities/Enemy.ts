import * as THREE from 'three';

import type { EnemyKind } from '../game/types';

export interface EnemyAction {
  type: 'strike' | 'projectile';
  damage: number;
  position: THREE.Vector3;
  color: number;
}

interface EnemyStats {
  health: number;
  speed: number;
  damage: number;
  range: number;
  cooldown: number;
  color: number;
}

const STATS: Record<EnemyKind, EnemyStats> = {
  bruiser: { health: 62, speed: 2.8, damage: 8, range: 1.6, cooldown: 1.25, color: 0xff4d6d },
  lookout: { health: 44, speed: 2.2, damage: 7, range: 8.5, cooldown: 2.2, color: 0x42e8ff },
  blade: { health: 50, speed: 4.3, damage: 11, range: 1.5, cooldown: 1.05, color: 0xffc857 },
  enforcer: { health: 112, speed: 1.7, damage: 18, range: 1.9, cooldown: 1.8, color: 0x9f7bff },
};

function createPart(geometry: THREE.BufferGeometry, color: number, emissive = 0, intensity = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.16, emissive, emissiveIntensity: intensity }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class Enemy {
  readonly group = new THREE.Group();
  readonly kind: EnemyKind;
  readonly maxHealth: number;
  health: number;
  alive = true;
  private readonly stats: EnemyStats;
  private readonly visual = new THREE.Group();
  private readonly healthFill: THREE.Mesh;
  private attackCooldown = 0.5 + Math.random() * 0.8;
  private stunTimer = 0;
  private deathTimer = 0;
  private flashTimer = 0;
  private knockback = new THREE.Vector3();

  constructor(kind: EnemyKind, position: THREE.Vector3) {
    this.kind = kind;
    this.stats = STATS[kind];
    this.maxHealth = this.stats.health;
    this.health = this.maxHealth;
    this.group.name = `${kind} syndicate guard`;
    this.group.position.copy(position);
    this.group.add(this.visual);
    this.buildModel();

    const healthBack = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.07),
      new THREE.MeshBasicMaterial({ color: 0x171a25, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    healthBack.position.y = this.kind === 'enforcer' ? 2.65 : 2.35;
    healthBack.rotation.y = Math.PI;
    this.group.add(healthBack);
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(0.86, 0.045),
      new THREE.MeshBasicMaterial({ color: this.stats.color, transparent: true, opacity: 1, side: THREE.DoubleSide }),
    );
    this.healthFill.position.set(0, healthBack.position.y, -0.01);
    this.healthFill.rotation.y = Math.PI;
    this.group.add(this.healthFill);
  }

  update(delta: number, target: THREE.Vector3, slowed: boolean): EnemyAction | null {
    if (!this.alive) {
      this.deathTimer -= delta;
      this.visual.position.y -= delta * 1.3;
      this.visual.rotation.z += delta * 5;
      this.group.scale.multiplyScalar(Math.max(0.9, 1 - delta * 1.5));
      return null;
    }

    const timeScale = slowed ? 0.32 : 1;
    const scaledDelta = delta * timeScale;
    this.attackCooldown = Math.max(0, this.attackCooldown - scaledDelta);
    this.stunTimer = Math.max(0, this.stunTimer - delta);
    this.flashTimer = Math.max(0, this.flashTimer - delta);
    this.group.position.addScaledVector(this.knockback, delta);
    this.knockback.multiplyScalar(Math.max(0, 1 - delta * 9));

    if (this.stunTimer > 0) {
      this.visual.rotation.z = Math.sin(this.stunTimer * 30) * 0.08;
      this.updateHealthBar();
      return null;
    }

    const toTarget = target.clone().sub(this.group.position);
    toTarget.y = 0;
    const distance = toTarget.length();
    if (distance > this.stats.range * 0.84) {
      toTarget.normalize();
      this.group.position.addScaledVector(toTarget, this.stats.speed * scaledDelta);
      this.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
    }

    if (this.attackCooldown <= 0 && distance <= this.stats.range * (this.kind === 'lookout' ? 1.3 : 1.12)) {
      this.attackCooldown = this.stats.cooldown;
      return {
        type: this.kind === 'lookout' ? 'projectile' : 'strike',
        damage: this.stats.damage,
        position: this.group.position.clone().add(new THREE.Vector3(0, 1.1, 0)),
        color: this.stats.color,
      };
    }

    this.visual.position.y = Math.sin(performance.now() * 0.004 + this.group.position.x) * 0.025;
    this.visual.rotation.z = 0;
    this.updateHealthBar();
    return null;
  }

  takeDamage(amount: number, direction: THREE.Vector3, knockback: number): void {
    if (!this.alive) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.stunTimer = this.kind === 'enforcer' ? 0.16 : 0.28;
    this.flashTimer = 0.12;
    this.knockback.copy(direction).setY(0).normalize().multiplyScalar(knockback);
    if (this.health <= 0) {
      this.alive = false;
      this.deathTimer = 0.8;
      this.knockback.multiplyScalar(0.2);
    }
    this.updateHealthBar();
  }

  isExpired(): boolean {
    return !this.alive && this.deathTimer <= 0;
  }

  private updateHealthBar(): void {
    this.healthFill.scale.x = Math.max(0.001, this.health / this.maxHealth);
    this.healthFill.position.x = -0.43 * (1 - this.health / this.maxHealth);
    const material = this.healthFill.material as THREE.MeshBasicMaterial;
    material.opacity = this.alive ? 1 : 0;
    if (this.flashTimer > 0) {
      material.color.setHex(0xffffff);
    } else {
      material.color.setHex(this.stats.color);
    }
  }

  private buildModel(): void {
    const bodyHeight = this.kind === 'enforcer' ? 1.45 : 1.15;
    const bodyWidth = this.kind === 'enforcer' ? 0.78 : 0.58;
    const body = createPart(new THREE.BoxGeometry(bodyWidth, bodyHeight, 0.48), 0x262a38);
    body.position.y = bodyHeight / 2 + 0.4;
    this.visual.add(body);

    const head = createPart(new THREE.SphereGeometry(this.kind === 'enforcer' ? 0.34 : 0.28, 10, 8), 0x8a5143);
    head.position.y = bodyHeight + 0.86;
    this.visual.add(head);
    const visor = createPart(new THREE.BoxGeometry(0.45, 0.12, 0.07), this.stats.color, this.stats.color, 3.2);
    visor.position.set(0, bodyHeight + 0.84, -0.25);
    this.visual.add(visor);

    const legGeometry = new THREE.BoxGeometry(this.kind === 'enforcer' ? 0.25 : 0.18, 0.75, 0.24);
    const leftLeg = createPart(legGeometry, 0x171a25);
    leftLeg.position.set(-0.18, 0.38, 0);
    const rightLeg = createPart(legGeometry, 0x171a25);
    rightLeg.position.set(0.18, 0.38, 0);
    this.visual.add(leftLeg, rightLeg);

    const armGeometry = new THREE.BoxGeometry(0.17, bodyHeight * 0.75, 0.2);
    const leftArm = createPart(armGeometry, 0x31374a);
    leftArm.position.set(-bodyWidth / 2 - 0.12, bodyHeight / 2 + 0.4, 0);
    const rightArm = createPart(armGeometry, 0x31374a);
    rightArm.position.set(bodyWidth / 2 + 0.12, bodyHeight / 2 + 0.4, 0);
    this.visual.add(leftArm, rightArm);
  }
}
