import * as THREE from 'three';

const COLORS = {
  asphalt: 0x151a27,
  road: 0x202739,
  concrete: 0x2e3443,
  cyan: 0x42e8ff,
  pink: 0xff4d9d,
  amber: 0xffc857,
  lime: 0x9cff7a,
  purple: 0x9f7bff,
};

function createBox(
  width: number,
  height: number,
  depth: number,
  color: number,
  emissive = 0,
  emissiveIntensity = 0,
): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: emissive ? 0.38 : 0.8,
    metalness: emissive ? 0.25 : 0.12,
    emissive,
    emissiveIntensity,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addBuilding(parent: THREE.Group, x: number, z: number, width: number, depth: number, height: number, color: number): void {
  const building = createBox(width, height, depth, color);
  building.position.set(x, height / 2, z);
  parent.add(building);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.cyan,
    emissive: COLORS.cyan,
    emissiveIntensity: 1.9,
    roughness: 0.3,
  });
  const windowGeometry = new THREE.BoxGeometry(Math.min(width * 0.14, 0.45), 0.16, 0.03);
  const floors = Math.max(2, Math.floor(height / 1.5));
  const columns = Math.max(2, Math.floor(width / 1.3));

  for (let floor = 0; floor < floors; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      if ((floor + column + Math.round(x * z)) % 4 === 0) {
        continue;
      }
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(
        x - width / 2 + 0.55 + column * Math.max(0.75, width / columns),
        0.85 + floor * 1.45,
        z - depth / 2 - 0.022,
      );
      parent.add(window);
    }
  }
}

function addNeonSign(parent: THREE.Group, x: number, y: number, z: number, color: number, textWidth = 2.2): void {
  const frame = createBox(textWidth, 0.55, 0.08, 0x111522, color, 0.4);
  frame.position.set(x, y, z);
  parent.add(frame);

  const neon = createBox(textWidth - 0.2, 0.08, 0.06, color, color, 4);
  neon.position.set(x, y, z - 0.06);
  parent.add(neon);
}

function addStreetLamp(parent: THREE.Group, x: number, z: number, color: number): void {
  const post = createBox(0.08, 2.7, 0.08, 0x44485a, 0x111321, 0.2);
  post.position.set(x, 1.35, z);
  parent.add(post);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 10, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 5 }),
  );
  lamp.position.set(x, 2.75, z);
  parent.add(lamp);

  const light = new THREE.PointLight(color, 1.5, 5, 2);
  light.position.set(x, 2.7, z);
  parent.add(light);
}

function addMarketStall(parent: THREE.Group, x: number, z: number, color: number): void {
  const stall = new THREE.Group();
  stall.position.set(x, 0, z);
  const counter = createBox(1.8, 0.75, 0.8, 0x5b3b34);
  counter.position.y = 0.38;
  stall.add(counter);
  const canopy = createBox(2, 0.14, 1.1, color, color, 1.4);
  canopy.position.y = 1.75;
  stall.add(canopy);
  for (const side of [-0.8, 0.8]) {
    const pole = createBox(0.06, 1.7, 0.06, 0x9e8c78);
    pole.position.set(side, 0.95, 0);
    stall.add(pole);
  }
  parent.add(stall);
}

function addPuddle(parent: THREE.Group, x: number, z: number, width: number, depth: number, color: number): void {
  const puddle = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ color, metalness: 0.82, roughness: 0.12, transparent: true, opacity: 0.74 }),
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(x, 0.075, z);
  parent.add(puddle);
}

function addOverheadCable(parent: THREE.Group, x: number, z: number, length: number, color: number): void {
  const cable = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, length, 6),
    new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.42 }),
  );
  cable.position.set(x, 7.2, z);
  cable.rotation.z = Math.PI / 2;
  parent.add(cable);
}

function addVehicle(parent: THREE.Group, x: number, z: number, rotation: number, color: number, taxi = false): void {
  const vehicle = new THREE.Group();
  vehicle.position.set(x, 0, z);
  vehicle.rotation.y = rotation;
  const body = createBox(2.4, 0.48, 1.15, color);
  body.position.y = 0.46;
  vehicle.add(body);
  const cabin = createBox(1.15, 0.44, 0.94, taxi ? 0x222938 : 0x202638);
  cabin.position.set(-0.18, 0.83, 0);
  vehicle.add(cabin);
  const glass = createBox(0.72, 0.22, 0.96, taxi ? 0x96d9df : 0x526078, 0x29414d, 0.35);
  glass.position.set(-0.3, 0.87, 0);
  vehicle.add(glass);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.78, metalness: 0.16 });
  for (const [wheelX, wheelZ] of [[-0.72, -0.63], [-0.72, 0.63], [0.78, -0.63], [0.78, 0.63]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12), wheelMaterial);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wheelX, 0.29, wheelZ);
    vehicle.add(wheel);
  }
  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffe1a3, emissive: 0xffc857, emissiveIntensity: 2.4 });
  const rearMaterial = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0xff4d6d, emissiveIntensity: 1.6 });
  for (const side of [-0.36, 0.36]) {
    const headlamp = createBox(0.12, 0.12, 0.06, 0xffe1a3, 0xffc857, 3);
    headlamp.position.set(1.2, 0.54, side);
    vehicle.add(headlamp);
    const rearLamp = createBox(0.12, 0.12, 0.06, 0xff4d6d, 0xff4d6d, 2);
    rearLamp.position.set(-1.2, 0.54, side);
    vehicle.add(rearLamp);
  }
  parent.add(vehicle);
}

function addContainer(parent: THREE.Group, x: number, z: number, color: number, rotation = 0): void {
  const container = createBox(2.2, 1.6, 1.15, color);
  container.position.set(x, 0.8, z);
  container.rotation.y = rotation;
  parent.add(container);
  for (let index = -2; index <= 2; index += 1) {
    const rib = createBox(0.06, 1.45, 0.03, 0x6b6e7a);
    rib.position.set(x + index * 0.4, 0.8, z - 0.59);
    rib.rotation.y = rotation;
    parent.add(rib);
  }
}

function addWaterTank(parent: THREE.Group, x: number, z: number, color: number): void {
  const tank = new THREE.Group();
  tank.position.set(x, 0, z);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.18, 16), new THREE.MeshStandardMaterial({ color: 0x56606e, metalness: 0.4, roughness: 0.5 }));
  legs.position.y = 2.25;
  tank.add(legs);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.86, 1.2, 16), new THREE.MeshStandardMaterial({ color, metalness: 0.22, roughness: 0.42 }));
  body.position.y = 3;
  tank.add(body);
  const cap = createBox(0.18, 0.34, 0.18, 0x2e3443);
  cap.position.y = 3.78;
  tank.add(cap);
  parent.add(tank);
}

function addTamilSign(parent: THREE.Group, x: number, y: number, z: number, color: number, text: string, rotation = 0): void {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 180;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#111522';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.lineWidth = 10;
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  context.fillStyle = '#edf1f8';
  context.font = 'bold 62px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 4);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.02),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, side: THREE.DoubleSide }),
  );
  sign.position.set(x, y, z);
  sign.rotation.y = rotation;
  parent.add(sign);
}

function addTamilFlagLine(parent: THREE.Group, x: number, z: number, color: number): void {
  const pole = createBox(0.05, 2.3, 0.05, 0x8e7f68, 0x221a12, 0.1);
  pole.position.set(x, 1.15, z);
  parent.add(pole);
  const flag = createBox(0.72, 0.36, 0.025, color, color, 0.6);
  flag.position.set(x + 0.35, 2.02, z);
  parent.add(flag);
}

function addCoconutPalm(parent: THREE.Group, x: number, z: number, lean = 0): void {
  const palm = new THREE.Group();
  palm.position.set(x, 0, z);
  palm.rotation.z = lean;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.24, 5.2, 10),
    new THREE.MeshStandardMaterial({ color: 0x72523a, roughness: 0.9 }),
  );
  trunk.position.y = 2.6;
  trunk.castShadow = true;
  palm.add(trunk);
  const crown = new THREE.Group();
  crown.position.y = 5.1;
  for (let index = 0; index < 7; index += 1) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 2.3, 6),
      new THREE.MeshStandardMaterial({ color: index % 2 === 0 ? 0x2e7257 : 0x47885d, roughness: 0.84 }),
    );
    leaf.rotation.z = Math.PI / 2;
    leaf.rotation.y = (index / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(leaf.rotation.y) * 0.62, Math.sin(index * 1.9) * 0.08, Math.sin(leaf.rotation.y) * 0.62);
    leaf.castShadow = true;
    crown.add(leaf);
  }
  palm.add(crown);
  parent.add(palm);
}

function addAutoRickshaw(parent: THREE.Group, x: number, z: number, rotation: number, color: number): void {
  const auto = new THREE.Group();
  auto.position.set(x, 0, z);
  auto.rotation.y = rotation;
  const body = createBox(1.55, 0.62, 1.08, color);
  body.position.y = 0.56;
  auto.add(body);
  const roof = createBox(1.3, 0.12, 1.02, 0x171b25);
  roof.position.set(-0.08, 1.46, 0);
  auto.add(roof);
  const windshield = createBox(0.1, 0.52, 0.78, 0x9bdbe0, 0x29414d, 0.3);
  windshield.position.set(0.7, 1.02, 0);
  auto.add(windshield);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.84 });
  for (const [wheelX, wheelZ] of [[0.43, -0.59], [0.43, 0.59], [-0.55, 0]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 12), wheelMaterial);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wheelX, 0.28, wheelZ);
    auto.add(wheel);
  }
  const headlamp = createBox(0.08, 0.12, 0.2, 0xfff0b0, 0xffc857, 3);
  headlamp.position.set(0.79, 0.67, 0);
  auto.add(headlamp);
  parent.add(auto);
}

function addBus(parent: THREE.Group, x: number, z: number, rotation: number, color: number): void {
  const bus = new THREE.Group();
  bus.position.set(x, 0, z);
  bus.rotation.y = rotation;
  const body = createBox(4.6, 1.45, 1.6, color);
  body.position.y = 1.05;
  bus.add(body);
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x152d3c, emissive: 0x153e4d, emissiveIntensity: 0.45, metalness: 0.2, roughness: 0.26 });
  for (let index = -2; index <= 2; index += 1) {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.48, 0.04), windowMaterial);
    window.position.set(index * 0.78 - 0.05, 1.4, -0.82);
    bus.add(window);
  }
  const bumper = createBox(0.16, 0.24, 1.36, 0x2c303b, 0x111421, 0.2);
  bumper.position.set(2.32, 0.52, 0);
  bus.add(bumper);
  parent.add(bus);
}

function addTempleGopuram(parent: THREE.Group, x: number, z: number, accent: number): void {
  const temple = new THREE.Group();
  temple.name = 'Tamil temple gopuram';
  temple.position.set(x, 0, z);
  const base = createBox(5.8, 0.45, 3.2, 0x4d3f48);
  base.position.y = 0.23;
  temple.add(base);
  for (let level = 0; level < 5; level += 1) {
    const width = 4.8 - level * 0.72;
    const tier = createBox(width, 0.58, 2.45 - level * 0.3, level % 2 === 0 ? 0x7e5261 : 0x5f506d, accent, 0.25);
    tier.position.y = 0.62 + level * 0.58;
    temple.add(tier);
    for (const side of [-1, 1]) {
      const statue = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 6), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.6 }));
      statue.position.set(side * (width / 2 - 0.22), tier.position.y + 0.32, -0.93);
      temple.add(statue);
    }
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), new THREE.MeshStandardMaterial({ color: 0xc6a05d, metalness: 0.78, roughness: 0.2, emissive: accent, emissiveIntensity: 0.5 }));
  cap.position.y = 3.65;
  temple.add(cap);
  const bell = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 18), new THREE.MeshStandardMaterial({ color: 0xc6a05d, metalness: 0.72, roughness: 0.24 }));
  bell.position.set(0, 2.55, -1.38);
  bell.rotation.x = Math.PI / 2;
  temple.add(bell);
  parent.add(temple);
  addTamilSign(parent, x, 2.1, z - 1.68, accent, 'முத்து நகர்');
}

function addKolam(parent: THREE.Group, x: number, z: number, color: number): void {
  const kolam = new THREE.Group();
  kolam.position.set(x, 0.09, z);
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35 + index * 0.28, 0.38 + index * 0.28, 16), material);
    ring.rotation.x = -Math.PI / 2;
    kolam.add(ring);
  }
  for (const side of [-1, 1]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), material);
    dot.position.set(side * 1.2, 0, 0);
    kolam.add(dot);
  }
  parent.add(kolam);
}

function addHarbourCrane(parent: THREE.Group, x: number, z: number, color: number): void {
  const crane = new THREE.Group();
  crane.position.set(x, 0, z);
  const left = createBox(0.24, 5.6, 0.24, 0x4b5362);
  left.position.set(-2.2, 2.8, 0);
  const right = createBox(0.24, 5.6, 0.24, 0x4b5362);
  right.position.set(2.2, 2.8, 0);
  const beam = createBox(4.6, 0.28, 0.28, color, color, 0.5);
  beam.position.y = 5.4;
  const trolley = createBox(0.42, 0.32, 0.4, color, color, 0.8);
  trolley.position.set(0.9, 5.02, 0);
  const cable = createBox(0.035, 2.8, 0.035, 0x171a25);
  cable.position.set(0.9, 3.6, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 6, 14, Math.PI), new THREE.MeshStandardMaterial({ color: 0xc6a05d, metalness: 0.64 }));
  hook.position.set(0.9, 2.2, 0);
  hook.rotation.z = Math.PI;
  crane.add(left, right, beam, trolley, cable, hook);
  parent.add(crane);
}

export interface CityBuild {
  group: THREE.Group;
  arenaMarkers: THREE.Group;
}

export function createCity(): CityBuild {
  const group = new THREE.Group();
  group.name = 'Muthu Nagar';

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(72, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0b1022, side: THREE.BackSide, fog: false }),
  );
  group.add(sky);
  const starPositions = new Float32Array(240 * 3);
  for (let index = 0; index < 240; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 26 + Math.random() * 34;
    starPositions[index * 3] = Math.cos(angle) * radius;
    starPositions[index * 3 + 1] = 11 + Math.random() * 30;
    starPositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const stars = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3)),
    new THREE.PointsMaterial({ color: 0xc7d6ff, size: 0.08, transparent: true, opacity: 0.7, sizeAttenuation: true }),
  );
  group.add(stars);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xcbd8ff, transparent: true, opacity: 0.86, fog: false }),
  );
  moon.position.set(23, 22, -32);
  group.add(moon);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: COLORS.asphalt, roughness: 0.74, metalness: 0.16 }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const roadMaterial = new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 0.88 });
  const roadHorizontal = new THREE.Mesh(new THREE.BoxGeometry(84, 0.04, 7.6), roadMaterial);
  roadHorizontal.position.y = 0.02;
  group.add(roadHorizontal);
  const roadVertical = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.045, 84), roadMaterial);
  roadVertical.position.y = 0.025;
  group.add(roadVertical);

  const laneMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.amber,
    emissive: COLORS.amber,
    emissiveIntensity: 1.5,
  });
  for (let i = -36; i <= 36; i += 4) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.025, 0.06), laneMaterial);
    dash.position.set(i, 0.08, 0);
    group.add(dash);
    const crossDash = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 1.8), laneMaterial);
    crossDash.position.set(0, 0.08, i);
    group.add(crossDash);
  }

  const buildingPalette = [0x22273a, 0x2a3146, 0x34304a, 0x1d3546, 0x3a2d3d];
  const blocks = [
    [-27, -29, 7, 8, 7], [-15, -31, 8, 7, 10], [15, -31, 8, 7, 8], [28, -27, 7, 10, 12],
    [-30, -14, 8, 7, 9], [30, -11, 9, 8, 7], [-29, 16, 7, 10, 11], [28, 18, 8, 8, 8],
    [-31, 30, 9, 8, 9], [-16, 30, 6, 8, 6], [15, 30, 9, 7, 11], [30, 31, 6, 8, 7],
  ];
  blocks.forEach(([x, z, width, depth, height], index) => {
    addBuilding(group, x, z, width, depth, height, buildingPalette[index % buildingPalette.length]);
  });

  addNeonSign(group, -12, 4.3, -3.9, COLORS.pink, 2.8);
  addNeonSign(group, 12, 5.2, 3.9, COLORS.cyan, 2.6);
  addNeonSign(group, -4.2, 3.6, 13, COLORS.amber, 2.4);
  addNeonSign(group, 4.4, 4.5, -13, COLORS.lime, 2.2);
  addTamilSign(group, -8.5, 2.8, 2.6, COLORS.amber, 'தேநீர்', Math.PI);
  addTamilSign(group, 8.5, 2.6, -2.6, COLORS.cyan, 'பஜார்');
  addTamilSign(group, 18.3, 4.8, -18.2, COLORS.pink, 'மாலை ரோடு', Math.PI / 2);
  addTamilSign(group, -22, 3.7, -20.8, COLORS.purple, 'சாலை பணிகள்');

  for (let i = -32; i <= 32; i += 8) {
    addStreetLamp(group, i, -4.8, i % 16 === 0 ? COLORS.cyan : COLORS.pink);
    addStreetLamp(group, i, 4.8, i % 16 === 0 ? COLORS.pink : COLORS.cyan);
  }

  addMarketStall(group, -8.5, 3.2, COLORS.pink);
  addMarketStall(group, -5.7, 3.2, COLORS.amber);
  addMarketStall(group, 8.5, -3.2, COLORS.cyan);
  addMarketStall(group, 5.7, -3.2, COLORS.purple);
  addTamilFlagLine(group, -9.4, 3.2, COLORS.amber);
  addTamilFlagLine(group, -7.6, 3.2, COLORS.pink);
  addTamilFlagLine(group, 7.6, -3.2, COLORS.cyan);
  addTamilFlagLine(group, 9.4, -3.2, COLORS.purple);
  addPuddle(group, -2.4, 1.1, 4.5, 1.2, 0x152b48);
  addPuddle(group, 4.8, 7.7, 2.3, 0.8, 0x17213d);
  addPuddle(group, -7.2, -5.9, 3.2, 0.9, 0x252343);
  addOverheadCable(group, 0, -8.6, 24, 0x4a5265);
  addOverheadCable(group, 0, 8.6, 24, 0x4a5265);
  addVehicle(group, -1.4, -1.5, Math.PI / 2, 0x5b6a8f);
  addVehicle(group, 10.5, 2.1, -Math.PI / 2, 0xb44c53, true);
  addVehicle(group, -10.5, -2.1, Math.PI / 2, 0x9c8156);
  addAutoRickshaw(group, -3.6, 4.9, Math.PI / 2, 0x178c70);
  addAutoRickshaw(group, 4.3, -5.2, -Math.PI / 2, 0xd2a23e);
  addBus(group, 17.5, -5.6, Math.PI / 2, 0x365f7b);
  addBus(group, -18.2, 5.7, -Math.PI / 2, 0x7b3e4c);
  addContainer(group, -27, -10.3, 0x424d63, 0.08);
  addContainer(group, -30, -8.8, 0x6a3f4e, 0.04);
  addWaterTank(group, -15.8, -30.6, 0x53657d);
  addWaterTank(group, 14.8, 29.5, 0x6c5863);
  addCoconutPalm(group, -19.5, 8.5, -0.05);
  addCoconutPalm(group, 20.5, 8.8, 0.08);
  addCoconutPalm(group, 23.5, -8.5, -0.08);
  addTempleGopuram(group, 0, -10.2, COLORS.amber);
  addKolam(group, 0, 0, COLORS.amber);
  addKolam(group, 18, -18, COLORS.cyan);
  addHarbourCrane(group, -25, -19.5, COLORS.purple);

  const hideout = new THREE.Group();
  hideout.name = 'Iron Hideout';
  hideout.position.set(-22, 0, -16);
  const hideoutFloor = createBox(13, 0.35, 10, COLORS.concrete);
  hideoutFloor.position.y = 0.15;
  hideout.add(hideoutFloor);
  for (const [x, z] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) {
    const pillar = createBox(0.7, 4, 0.7, 0x3c414d);
    pillar.position.set(x, 2, z);
    hideout.add(pillar);
  }
  const hideoutSign = createBox(7, 0.7, 0.16, COLORS.purple, COLORS.purple, 2.5);
  hideoutSign.position.set(0, 4.3, -4.8);
  hideout.add(hideoutSign);
  group.add(hideout);

  const arenaMarkers = new THREE.Group();
  arenaMarkers.name = 'Mission Markers';
  const markerPositions = [[0, 4], [18, -18], [-22, -16], [0, 0]];
  markerPositions.forEach(([x, z], index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 1.95, 32),
      new THREE.MeshBasicMaterial({ color: [COLORS.pink, COLORS.cyan, COLORS.purple, COLORS.amber][index], transparent: true, opacity: 0.62, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.11, z);
    ring.name = `marker-${index}`;
    arenaMarkers.add(ring);
  });
  group.add(arenaMarkers);

  return { group, arenaMarkers };
}
