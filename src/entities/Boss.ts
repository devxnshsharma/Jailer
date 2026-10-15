import * as THREE from 'three';

export type BossActionType = 'strike' | 'projectile' | 'shockwave';

export interface BossAction {
  type: BossActionType;
  damage: number;
  position: THREE.Vector3;
  color: number;
}

export class Boss {
  readonly group = new THREE.Group();
  readonly maxHealth = 360;
  health = this.maxHealth;
  alive = true;
  phase = 1;
  private readonly visual = new THREE.Group();
  private readonly healthFill: THREE.Mesh;
  private attackCooldown = 2.2;
  private stunTimer = 0;
  private deathTimer = 0;
  private knockback = new THREE.Vector3();
  private flashTimer = 0;

  constructor(position: THREE.Vector3) {
    this.group.name = 'Rathna Veyil';
    this.group.position.copy(position);
    this.group.add(this.visual);
    this.buildModel();

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x171a25, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    back.position.y = 3.6;
    back.rotation.y = Math.PI;
    this.group.add(back);
    this.healthFill = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, side: THREE.DoubleSide }),
    );
    this.healthFill.position.set(0, 3.6, -0.01);
    this.healthFill.rotation.y = Math.PI;
    this.group.add(this.healthFill);
  }

  update(delta: number, target: THREE.Vector3, slowed: boolean): BossAction | null {
    if (!this.alive) {
      this.deathTimer -= delta;
      this.visual.position.y -= delta * 1.4;
      this.visual.rotation.y += delta * 4;
      this.group.scale.multiplyScalar(Math.max(0.9, 1 - delta * 0.7));
      return null;
    }

    const ratio = this.health / this.maxHealth;
    this.phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    const timeScale = slowed ? 0.38 : 1;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta * timeScale);
    this.stunTimer = Math.max(0, this.stunTimer - delta);
    this.flashTimer = Math.max(0, this.flashTimer - delta);
    this.group.position.addScaledVector(this.knockback, delta);
    this.knockback.multiplyScalar(Math.max(0, 1 - delta * 6));

    if (this.stunTimer > 0) {
      this.visual.rotation.z = Math.sin(this.stunTimer * 35) * 0.07;
      this.updateHealthBar();
      return null;
    }

    const toTarget = target.clone().sub(this.group.position);
    toTarget.y = 0;
    const distance = toTarget.length();
    if (distance > 2.3) {
      toTarget.normalize();
      const speed = this.phase === 1 ? 1.6 : this.phase === 2 ? 2.3 : 3.2;
      this.group.position.addScaledVector(toTarget, speed * delta * timeScale);
      this.group.rotation.y = Math.atan2(toTarget.x, toTarget.z);
    }

    if (this.attackCooldown <= 0 && distance < 10) {
      this.attackCooldown = this.phase === 1 ? 2.1 : this.phase === 2 ? 1.55 : 1.05;
      const color = this.phase === 1 ? 0xffc857 : this.phase === 2 ? 0xff4d6d : 0xb58cff;
      const type: BossActionType = this.phase === 3
        ? 'shockwave'
        : this.phase === 2 && distance > 4
          ? 'projectile'
          : 'strike';
      return {
        type,
        damage: this.phase === 1 ? 17 : this.phase === 2 ? 22 : 29,
        position: this.group.position.clone().add(new THREE.Vector3(0, 1.45, 0)),
        color,
      };
    }

    this.visual.position.y = Math.sin(performance.now() * 0.003) * 0.035;
    this.visual.rotation.z = 0;
    this.updateHealthBar();
    return null;
  }

  takeDamage(amount: number, direction: THREE.Vector3, knockback: number): boolean {
    if (!this.alive || this.stunTimer > 0.3) {
      return false;
    }
    this.health = Math.max(0, this.health - amount);
    this.stunTimer = 0.16;
    this.flashTimer = 0.15;
    this.knockback.copy(direction).setY(0).normalize().multiplyScalar(knockback * 0.25);
    if (this.health <= 0) {
      this.alive = false;
      this.deathTimer = 2;
    }
    this.updateHealthBar();
    return true;
  }

  isExpired(): boolean {
    return !this.alive && this.deathTimer <= 0;
  }

  private updateHealthBar(): void {
    const ratio = Math.max(0.001, this.health / this.maxHealth);
    this.healthFill.scale.x = ratio;
    this.healthFill.position.x = -1.25 * (1 - ratio);
    const material = this.healthFill.material as THREE.MeshBasicMaterial;
    material.opacity = this.alive ? 1 : 0;
    material.color.setHex(this.flashTimer > 0 ? 0xffffff : this.phase === 3 ? 0xb58cff : 0xff4d6d);
  }

  private buildModel(): void {
    const armorMaterial = new THREE.MeshStandardMaterial({ color: 0x1d2232, roughness: 0.34, metalness: 0.68, emissive: 0x22091b, emissiveIntensity: 0.7 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff4d6d, emissiveIntensity: 1.7, metalness: 0.4 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.32, 1.65, 0.76), armorMaterial);
    torso.position.y = 1.45;
    this.visual.add(torso);
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.26, 0.85), trimMaterial);
    shoulder.position.y = 2.1;
    this.visual.add(shoulder);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), new THREE.MeshStandardMaterial({ color: 0x805040, roughness: 0.85 }));
    head.position.y = 2.8;
    this.visual.add(head);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.46, 6), armorMaterial);
    crown.position.y = 3.25;
    this.visual.add(crown);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.17, 0.09), trimMaterial);
    visor.position.set(0, 2.82, -0.43);
    this.visual.add(visor);
    const legGeometry = new THREE.BoxGeometry(0.42, 0.95, 0.4);
    const leftLeg = new THREE.Mesh(legGeometry, armorMaterial);
    leftLeg.position.set(-0.42, 0.48, 0);
    const rightLeg = new THREE.Mesh(legGeometry, armorMaterial);
    rightLeg.position.set(0.42, 0.48, 0);
    this.visual.add(leftLeg, rightLeg);
    const armGeometry = new THREE.BoxGeometry(0.36, 1.2, 0.4);
    const leftArm = new THREE.Mesh(armGeometry, armorMaterial);
    leftArm.position.set(-0.91, 1.48, 0);
    const rightArm = new THREE.Mesh(armGeometry, armorMaterial);
    rightArm.position.set(0.91, 1.48, 0);
    this.visual.add(leftArm, rightArm);
  }
}
