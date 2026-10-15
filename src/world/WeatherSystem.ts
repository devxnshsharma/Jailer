import * as THREE from 'three';

export class WeatherSystem {
  readonly group = new THREE.Group();
  private readonly geometry: THREE.BufferGeometry;
  private readonly positions: Float32Array;
  private readonly drops: { x: number; y: number; z: number; speed: number }[] = [];

  constructor(count = 360) {
    this.positions = new Float32Array(count * 6);
    for (let index = 0; index < count; index += 1) {
      const drop = {
        x: (Math.random() - 0.5) * 82,
        y: 2 + Math.random() * 27,
        z: (Math.random() - 0.5) * 82,
        speed: 18 + Math.random() * 12,
      };
      this.drops.push(drop);
      this.writeDrop(index, drop);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x9edbff, transparent: true, opacity: 0.22, depthWrite: false });
    this.group.add(new THREE.LineSegments(this.geometry, material));
  }

  update(delta: number, wind = 1.7): void {
    this.drops.forEach((drop, index) => {
      drop.y -= drop.speed * delta;
      drop.x += wind * delta * 0.2;
      if (drop.y < 0) {
        drop.y = 26 + Math.random() * 8;
        drop.x = (Math.random() - 0.5) * 82;
        drop.z = (Math.random() - 0.5) * 82;
      }
      this.writeDrop(index, drop);
    });
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  private writeDrop(index: number, drop: { x: number; y: number; z: number; speed: number }): void {
    const offset = index * 6;
    this.positions[offset] = drop.x;
    this.positions[offset + 1] = drop.y;
    this.positions[offset + 2] = drop.z;
    this.positions[offset + 3] = drop.x + 0.07;
    this.positions[offset + 4] = drop.y - 0.82;
    this.positions[offset + 5] = drop.z + 0.08;
  }
}
