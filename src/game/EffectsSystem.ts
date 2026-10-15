import * as THREE from 'three';

interface Particle {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  spin: number;
  scale: number;
}

export class EffectsSystem {
  readonly group = new THREE.Group();
  private readonly particles: Particle[] = [];

  burst(position: THREE.Vector3, color: number, count = 12, force = 3): void {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const geometry = new THREE.SphereGeometry(0.07, 5, 5);
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(position);
      const angle = (index / count) * Math.PI * 2 + Math.random() * 0.4;
      const vertical = (Math.random() - 0.25) * force;
      const velocity = new THREE.Vector3(Math.cos(angle) * force, vertical, Math.sin(angle) * force);
      this.addParticle(mesh, velocity, 0.34 + Math.random() * 0.3, 0.6 + Math.random() * 0.7);
    }
  }

  shockwave(position: THREE.Vector3, color: number, radius = 4): void {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.07, 8, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(position);
    this.addParticle(mesh, new THREE.Vector3(), 0.65, radius / 0.45);
  }

  slash(position: THREE.Vector3, color: number): void {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.045, 6, 24, Math.PI * 0.8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    );
    mesh.rotation.set(Math.PI / 2.4, 0, -0.35);
    mesh.position.copy(position);
    this.addParticle(mesh, new THREE.Vector3(0, 0.2, 0), 0.22, 1.35);
  }

  aura(position: THREE.Vector3, color: number): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 10),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, wireframe: true }),
    );
    mesh.position.copy(position);
    this.addParticle(mesh, new THREE.Vector3(0, 0.4, 0), 0.8, 1.8);
  }

  tracer(start: THREE.Vector3, end: THREE.Vector3, color: number): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92 });
    const line = new THREE.Line(geometry, material);
    this.addParticle(line, new THREE.Vector3(), 0.075, 1);
  }

  muzzle(position: THREE.Vector3, color: number): void {
    this.burst(position, color, 7, 1.8);
    const flash = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.48, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.95 }),
    );
    flash.position.copy(position);
    flash.rotation.x = Math.PI / 2;
    this.addParticle(flash, new THREE.Vector3(0, 0, -1.5), 0.08, 1);
  }

  update(delta: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.life -= delta;
      if (particle.life <= 0) {
        this.group.remove(particle.mesh);
        particle.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        this.particles.splice(index, 1);
        continue;
      }

      particle.mesh.position.addScaledVector(particle.velocity, delta);
      particle.velocity.y -= delta * 4.2;
      particle.mesh.rotation.y += particle.spin * delta;
      const progress = 1 - particle.life / particle.maxLife;
      const scale = particle.scale * (1 + progress * 0.8);
      particle.mesh.scale.setScalar(scale);
      particle.mesh.traverse((child) => {
        if ((child instanceof THREE.Mesh || child instanceof THREE.Line) && child.material instanceof THREE.Material) {
          const material = child.material as THREE.Material & { opacity?: number; transparent?: boolean };
          if (typeof material.opacity === 'number') {
            material.opacity = Math.max(0, 1 - progress);
          }
        }
      });
    }
  }

  clear(): void {
    for (const particle of this.particles) {
      this.group.remove(particle.mesh);
    }
    this.particles.length = 0;
  }

  private addParticle(mesh: THREE.Object3D, velocity: THREE.Vector3, life: number, scale: number): void {
    this.group.add(mesh);
    this.particles.push({ mesh, velocity, life, maxLife: life, spin: (Math.random() - 0.5) * 8, scale });
  }
}
