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

export interface CityBuild {
  group: THREE.Group;
  arenaMarkers: THREE.Group;
}

export function createCity(): CityBuild {
  const group = new THREE.Group();
  group.name = 'Muthu Nagar';

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: COLORS.asphalt, roughness: 0.96, metalness: 0.03 }),
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

  for (let i = -32; i <= 32; i += 8) {
    addStreetLamp(group, i, -4.8, i % 16 === 0 ? COLORS.cyan : COLORS.pink);
    addStreetLamp(group, i, 4.8, i % 16 === 0 ? COLORS.pink : COLORS.cyan);
  }

  addMarketStall(group, -8.5, 3.2, COLORS.pink);
  addMarketStall(group, -5.7, 3.2, COLORS.amber);
  addMarketStall(group, 8.5, -3.2, COLORS.cyan);
  addMarketStall(group, 5.7, -3.2, COLORS.purple);
  addPuddle(group, -2.4, 1.1, 4.5, 1.2, 0x152b48);
  addPuddle(group, 4.8, 7.7, 2.3, 0.8, 0x17213d);
  addPuddle(group, -7.2, -5.9, 3.2, 0.9, 0x252343);
  addOverheadCable(group, 0, -8.6, 24, 0x4a5265);
  addOverheadCable(group, 0, 8.6, 24, 0x4a5265);

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
