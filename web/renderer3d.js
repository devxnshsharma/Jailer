/*
 * Raw WebGL renderer for the browser build.
 *
 * It deliberately has no framework dependency. The native reference uses a
 * RenderWare-style forward renderer; this file follows the same broad shape
 * with a depth-tested forward pass, fog, vertex lighting, low-poly entities,
 * and emissive colour accents. Runtime game data stays in game.js.
 */

const TAU = Math.PI * 2;
const WORLD_SCALE = 0.018;

const COLOR = {
  sky: [0.018, 0.03, 0.08],
  fog: [0.035, 0.055, 0.09],
  asphalt: [0.035, 0.055, 0.075],
  road: [0.075, 0.11, 0.16],
  roadLine: [0.84, 0.58, 0.18],
  building: [0.08, 0.12, 0.19],
  buildingAlt: [0.12, 0.16, 0.23],
  dark: [0.02, 0.028, 0.045],
  steel: [0.28, 0.34, 0.43],
  skin: [0.55, 0.29, 0.22],
  shirt: [0.82, 0.82, 0.78],
  trousers: [0.18, 0.18, 0.23],
  hair: [0.34, 0.35, 0.42],
  wood: [0.45, 0.26, 0.16],
  leaf: [0.12, 0.34, 0.24],
  gold: [0.95, 0.65, 0.18],
};

function hexColor(value, fallback = [1, 1, 1]) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return fallback;
  const hex = value.replace('#', '');
  if (hex.length !== 6) return fallback;
  return [Number.parseInt(hex.slice(0, 2), 16) / 255, Number.parseInt(hex.slice(2, 4), 16) / 255, Number.parseInt(hex.slice(4, 6), 16) / 255];
}

function vec3(x = 0, y = 0, z = 0) { return [x, y, z]; }

function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function multiply(a, b) {
  const out = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      out[column * 4 + row] = a[row] * b[column * 4]
        + a[4 + row] * b[column * 4 + 1]
        + a[8 + row] * b[column * 4 + 2]
        + a[12 + row] * b[column * 4 + 3];
    }
  }
  return out;
}

function translation(x, y, z) {
  const out = identity();
  out[12] = x; out[13] = y; out[14] = z;
  return out;
}

function scale(x, y, z) {
  const out = identity();
  out[0] = x; out[5] = y; out[10] = z;
  return out;
}

function rotationX(angle) {
  const c = Math.cos(angle); const s = Math.sin(angle);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}

function rotationY(angle) {
  const c = Math.cos(angle); const s = Math.sin(angle);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
}

function rotationZ(angle) {
  const c = Math.cos(angle); const s = Math.sin(angle);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function compose(position, rotation, dimensions) {
  let model = translation(position[0], position[1], position[2]);
  model = multiply(model, rotationY(rotation[1] || 0));
  model = multiply(model, rotationX(rotation[0] || 0));
  model = multiply(model, rotationZ(rotation[2] || 0));
  return multiply(model, scale(dimensions[0], dimensions[1], dimensions[2]));
}

function normalize(value) {
  const length = Math.hypot(value[0], value[1], value[2]) || 1;
  return [value[0] / length, value[1] / length, value[2] / length];
}

function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const range = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * range, -1, 0, 0, far * near * 2 * range, 0];
}

function lookAt(eye, target, up = [0, 1, 0]) {
  const forward = normalize(subtract(target, eye));
  const side = normalize(cross(forward, up));
  const correctedUp = cross(side, forward);
  return [
    side[0], correctedUp[0], -forward[0], 0,
    side[1], correctedUp[1], -forward[1], 0,
    side[2], correctedUp[2], -forward[2], 0,
    -dot(side, eye), -dot(correctedUp, eye), dot(forward, eye), 1,
  ];
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || 'unknown shader error';
    gl.deleteShader(shader);
    throw new Error(`Mass Metro WebGL shader error: ${error}`);
  }
  return shader;
}

function createProgram(gl) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;
    uniform vec3 uCamera;
    varying vec3 vNormal;
    varying vec3 vWorld;
    varying float vDistance;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vWorld = world.xyz;
      vNormal = normalize((uModel * vec4(aNormal, 0.0)).xyz);
      vDistance = distance(world.xyz, uCamera);
      gl_Position = uProjection * uView * world;
    }
  `);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec3 uColor;
    uniform vec3 uLightDirection;
    uniform vec3 uFogColor;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uEmissive;
    uniform float uAlpha;
    varying vec3 vNormal;
    varying vec3 vWorld;
    varying float vDistance;
    void main() {
      float diffuse = max(dot(normalize(vNormal), normalize(-uLightDirection)), 0.0);
      float ambient = 0.35 + diffuse * 0.72;
      vec3 lit = uColor * (ambient + uEmissive);
      float fogFactor = clamp((vDistance - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      vec3 color = mix(lit, uFogColor, fogFactor * 0.72);
      gl_FragColor = vec4(color, uAlpha);
    }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`Mass Metro WebGL link error: ${gl.getProgramInfoLog(program) || 'unknown error'}`);
  return program;
}

function createGeometry(gl, positions, normals, indices = null, mode = gl.TRIANGLES) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  let indexBuffer = null;
  if (indices) {
    indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }
  return { positionBuffer, normalBuffer, indexBuffer, count: indices ? indices.length : positions.length / 3, mode };
}

function cubeGeometry(gl) {
  const positions = [
    -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1,
    1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1,
    -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1,
    -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,
    1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1,
    -1, -1, -1, -1, -1, 1, -1, 1, 1, -1, 1, -1,
  ];
  const normals = [
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ];
  const indices = [];
  for (let face = 0; face < 6; face += 1) {
    const offset = face * 4;
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  }
  return createGeometry(gl, positions, normals, indices);
}

function cylinderGeometry(gl, sides = 12, topRadius = 1, bottomRadius = 1, height = 2) {
  const positions = [];
  const normals = [];
  const indices = [];
  const half = height / 2;
  for (let index = 0; index < sides; index += 1) {
    const a0 = index / sides * TAU;
    const a1 = (index + 1) / sides * TAU;
    const c0 = Math.cos(a0); const s0 = Math.sin(a0);
    const c1 = Math.cos(a1); const s1 = Math.sin(a1);
    const base = positions.length / 3;
    positions.push(bottomRadius * c0, -half, bottomRadius * s0, bottomRadius * c1, -half, bottomRadius * s1, topRadius * c1, half, topRadius * s1, topRadius * c0, half, topRadius * s0);
    const n0 = normalize([c0, (bottomRadius - topRadius) / height, s0]);
    const n1 = normalize([c1, (bottomRadius - topRadius) / height, s1]);
    normals.push(...n0, ...n1, ...n1, ...n0);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, -half, 0); normals.push(0, -1, 0);
  const topCenter = positions.length / 3;
  positions.push(0, half, 0); normals.push(0, 1, 0);
  for (let index = 0; index < sides; index += 1) {
    const a0 = index / sides * TAU;
    const a1 = (index + 1) / sides * TAU;
    const base = index * 4;
    const bottomA = positions.length / 3;
    positions.push(bottomRadius * Math.cos(a0), -half, bottomRadius * Math.sin(a0)); normals.push(0, -1, 0);
    const bottomB = positions.length / 3;
    positions.push(bottomRadius * Math.cos(a1), -half, bottomRadius * Math.sin(a1)); normals.push(0, -1, 0);
    indices.push(bottomCenter, bottomB, bottomA);
    const topA = positions.length / 3;
    positions.push(topRadius * Math.cos(a0), half, topRadius * Math.sin(a0)); normals.push(0, 1, 0);
    const topB = positions.length / 3;
    positions.push(topRadius * Math.cos(a1), half, topRadius * Math.sin(a1)); normals.push(0, 1, 0);
    indices.push(topCenter, topA, topB);
    void base;
  }
  return createGeometry(gl, positions, normals, indices);
}

function sphereGeometry(gl, rings = 8, segments = 12) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const phi = ring / rings * Math.PI;
    const y = Math.cos(phi);
    const radius = Math.sin(phi);
    for (let segment = 0; segment <= segments; segment += 1) {
      const theta = segment / segments * TAU;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      positions.push(x, y, z);
      normals.push(x, y, z);
    }
  }
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = ring * (segments + 1) + segment;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  return createGeometry(gl, positions, normals, indices);
}

function coneGeometry(gl, sides = 12, radius = 1, height = 2) {
  return cylinderGeometry(gl, sides, 0.02, radius, height);
}

function torusGeometry(gl, major = 1, minor = .08, majorSegments = 24, minorSegments = 6) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let majorIndex = 0; majorIndex < majorSegments; majorIndex += 1) {
    const u = majorIndex / majorSegments * TAU;
    const nextU = (majorIndex + 1) / majorSegments * TAU;
    for (let minorIndex = 0; minorIndex < minorSegments; minorIndex += 1) {
      const v = minorIndex / minorSegments * TAU;
      const nextV = (minorIndex + 1) / minorSegments * TAU;
      const base = positions.length / 3;
      for (const [majorAngle, minorAngle] of [[u, v], [nextU, v], [nextU, nextV], [u, nextV]]) {
        const radial = major + minor * Math.cos(minorAngle);
        const x = radial * Math.cos(majorAngle);
        const y = minor * Math.sin(minorAngle);
        const z = radial * Math.sin(majorAngle);
        positions.push(x, y, z);
        normals.push(Math.cos(minorAngle) * Math.cos(majorAngle), Math.sin(minorAngle), Math.cos(minorAngle) * Math.sin(majorAngle));
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  return createGeometry(gl, positions, normals, indices);
}

function lineGeometry(gl) {
  return createGeometry(gl, [0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 1, 0], null, gl.LINES);
}

function worldPoint(x, y, height = 0) {
  return [(x - 1100) * WORLD_SCALE, height, (y - 700) * WORLD_SCALE];
}

function colorFor(value) { return hexColor(value, [1, 1, 1]); }

const RENDER_WEAPONS = [
  { id: 'colt45', mode: 'hitscan', color: '#f4bf4f' },
  { id: 'shotgun', mode: 'spread', color: '#fa7a61' },
  { id: 'm16', mode: 'hitscan', color: '#56d8e8' },
  { id: 'unarmed', mode: 'melee', color: '#ffefd0' },
  { id: 'baseballBat', mode: 'melee', color: '#f4bf4f' },
  { id: 'uzi', mode: 'hitscan', color: '#f879d3' },
  { id: 'ak47', mode: 'hitscan', color: '#ff9c5a' },
  { id: 'sniperRifle', mode: 'hitscan', color: '#9fc8ff' },
  { id: 'rocketLauncher', mode: 'rocket', color: '#f4d46e' },
  { id: 'flamethrower', mode: 'flame', color: '#ff6039' },
  { id: 'molotov', mode: 'grenade', color: '#ffb83d' },
  { id: 'grenade', mode: 'grenade', color: '#91dc78' },
  { id: 'detonator', mode: 'detonator', color: '#b995ff' },
  { id: 'heliCannon', mode: 'heli', color: '#5ce1cf' },
];

function weaponForIndex(index) { return RENDER_WEAPONS[(index + RENDER_WEAPONS.length) % RENDER_WEAPONS.length]; }

export function create3DRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, powerPreference: 'high-performance' });
  if (!gl) throw new Error('Mass Metro requires WebGL to render its 3D world.');
  const program = createProgram(gl);
  const attributes = {
    position: gl.getAttribLocation(program, 'aPosition'),
    normal: gl.getAttribLocation(program, 'aNormal'),
  };
  const uniforms = {
    projection: gl.getUniformLocation(program, 'uProjection'),
    view: gl.getUniformLocation(program, 'uView'),
    model: gl.getUniformLocation(program, 'uModel'),
    camera: gl.getUniformLocation(program, 'uCamera'),
    color: gl.getUniformLocation(program, 'uColor'),
    lightDirection: gl.getUniformLocation(program, 'uLightDirection'),
    fogColor: gl.getUniformLocation(program, 'uFogColor'),
    fogNear: gl.getUniformLocation(program, 'uFogNear'),
    fogFar: gl.getUniformLocation(program, 'uFogFar'),
    emissive: gl.getUniformLocation(program, 'uEmissive'),
    alpha: gl.getUniformLocation(program, 'uAlpha'),
  };
  const geometry = {
    cube: cubeGeometry(gl),
    cylinder: cylinderGeometry(gl, 12),
    sphere: sphereGeometry(gl, 7, 10),
    cone: coneGeometry(gl, 12),
    torus: torusGeometry(gl),
    line: lineGeometry(gl),
  };
  const linePositionBuffer = gl.createBuffer();
  const lineNormalBuffer = gl.createBuffer();
  let width = 1;
  let height = 1;
  let projection = perspective(Math.PI / 3, 1, .1, 160);
  let cameraPosition = [0, 7, 10];
  let view = identity();

  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(...COLOR.sky, 1);
  gl.uniform3fv(uniforms.lightDirection, new Float32Array([-0.45, -0.9, -0.25]));
  gl.uniform3fv(uniforms.fogColor, new Float32Array(COLOR.fog));
  gl.uniform1f(uniforms.fogNear, 25);
  gl.uniform1f(uniforms.fogFar, 105);

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
    height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    projection = perspective(Math.PI / 3.15, width / height, .1, 160);
  }

  function bindGeometry(mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positionBuffer);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 0, 0);
    if (mesh.indexBuffer) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
  }

  function drawMesh(mesh, position, rotation, dimensions, color, options = {}) {
    bindGeometry(mesh);
    gl.uniformMatrix4fv(uniforms.model, false, new Float32Array(compose(position, rotation, dimensions)));
    gl.uniform3fv(uniforms.color, new Float32Array(color));
    gl.uniform1f(uniforms.emissive, options.emissive || 0);
    gl.uniform1f(uniforms.alpha, options.alpha === undefined ? 1 : options.alpha);
    if (mesh.indexBuffer) gl.drawElements(mesh.mode, mesh.count, gl.UNSIGNED_SHORT, 0);
    else gl.drawArrays(mesh.mode, 0, mesh.count);
  }

  function drawLineSegments(lines, color, alpha = 1, emissive = .2) {
    if (!lines.length) return;
    const positions = new Float32Array(lines.length * 6);
    const normals = new Float32Array(lines.length * 6);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      positions.set([...line[0], ...line[1]], index * 6);
      normals.set([0, 1, 0, 0, 1, 0], index * 6);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, linePositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(attributes.position);
    gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(attributes.normal);
    gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(uniforms.model, false, new Float32Array(identity()));
    gl.uniform3fv(uniforms.color, new Float32Array(color));
    gl.uniform1f(uniforms.emissive, emissive);
    gl.uniform1f(uniforms.alpha, alpha);
    gl.drawArrays(gl.LINES, 0, lines.length * 2);
  }

  function setupFrame(state) {
    const player = state.player;
    const playerPosition = worldPoint(player.x, player.y, 0);
    const facing = [Math.cos(player.angle), 0, Math.sin(player.angle)];
    const shoulder = [-facing[2], 0, facing[0]];
    const distanceBack = state.mouse && state.mouse.aim ? 6.8 : 9.2;
    cameraPosition = [
      playerPosition[0] - facing[0] * distanceBack + shoulder[0] * 1.5,
      state.mouse && state.mouse.aim ? 3.6 : 5.1,
      playerPosition[2] - facing[2] * distanceBack + shoulder[2] * 1.5,
    ];
    const target = [playerPosition[0] + facing[0] * 2, 1.35, playerPosition[2] + facing[2] * 2];
    view = lookAt(cameraPosition, target);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uniforms.projection, false, new Float32Array(projection));
    gl.uniformMatrix4fv(uniforms.view, false, new Float32Array(view));
    gl.uniform3fv(uniforms.camera, new Float32Array(cameraPosition));
  }

  function drawBoxAt(x, y, width, depth, height, color, emissive = 0) {
    const position = worldPoint(x, y, height / 2);
    drawMesh(geometry.cube, position, [0, 0, 0], [width * WORLD_SCALE / 2, height / 2, depth * WORLD_SCALE / 2], color, { emissive });
  }

  function drawRoad(x, y, roadWidth, roadDepth, vertical = false) {
    const color = COLOR.road;
    drawBoxAt(x, y, vertical ? roadWidth : roadDepth, vertical ? roadDepth : roadWidth, .08, color);
    const lineCount = Math.max(4, Math.floor((vertical ? roadDepth : roadWidth) / 100));
    for (let index = 0; index < lineCount; index += 1) {
      const offset = -((lineCount - 1) * 50) + index * 100;
      if (vertical) drawBoxAt(x, y + offset, .06, 34, .11, COLOR.roadLine, 1.2);
      else drawBoxAt(x + offset, y, 34, .06, .11, COLOR.roadLine, 1.2);
    }
  }

  function drawBuilding(x, y, widthPx, depthPx, heightPx, color) {
    drawBoxAt(x, y, widthPx, depthPx, heightPx, color);
    const windows = [];
    const rows = Math.max(2, Math.floor(heightPx / 90));
    const columns = Math.max(2, Math.floor(widthPx / 90));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row + column + Math.floor(x / 10)) % 5 === 0) continue;
        const wx = x - widthPx / 2 + 32 + column * (widthPx - 64) / columns;
        const wy = y - depthPx / 2 - .7;
        const wz = y - depthPx / 2 - 0.7;
        const h = 0.07 + row * (heightPx - 55) / rows;
        const p = worldPoint(wx, y - depthPx / 2 - 1.2, h);
        drawMesh(geometry.cube, p, [0, 0, 0], [.16, .09, .02], row % 3 === 0 ? COLOR.cyan : COLOR.gold, { emissive: 1.9 });
        void wy; void wz;
      }
    }
  }

  function drawLamp(x, y, color) {
    drawBoxAt(x, y, 6, 6, 130, COLOR.steel);
    const head = worldPoint(x + 16, y, 138);
    drawMesh(geometry.sphere, head, [0, 0, 0], [7, 7, 7], color, { emissive: 2.5 });
    drawBoxAt(x + 8, y, 28, 5, 5, color, 2.4);
  }

  function drawTemple(x, y) {
    const tiers = [250, 214, 178, 142, 106];
    tiers.forEach((tier, index) => drawBoxAt(x, y, tier, 120 - index * 14, 30, index % 2 ? [0.32, .22, .35] : [.5, .28, .36], .15));
    const top = worldPoint(x, y, 165);
    drawMesh(geometry.sphere, top, [0, 0, 0], [15, 15, 15], COLOR.gold, { emissive: 2.5 });
    drawBoxAt(x, y - 64, 120, 10, 45, COLOR.gold, .45);
  }

  function drawMarket(x, y, color) {
    drawBoxAt(x, y, 156, 86, 54, [0.34, .2, .15]);
    drawBoxAt(x, y, 180, 92, 8, color, 1.4);
    drawBoxAt(x - 68, y, 4, 4, 88, COLOR.steel);
    drawBoxAt(x + 68, y, 4, 4, 88, COLOR.steel);
    drawBoxAt(x, y - 44, 130, 4, 4, color, 1.8);
  }

  function drawPalm(x, y, lean = 0) {
    const base = worldPoint(x, y, 80);
    drawMesh(geometry.cylinder, base, [0, 0, lean], [7, 85, 7], COLOR.wood);
    const crown = worldPoint(x + lean * 90, y, 166);
    drawMesh(geometry.cone, crown, [0, 0, 0], [30, 15, 30], COLOR.leaf, .05);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * TAU;
      const leafEnd = worldPoint(x + lean * 90 + Math.cos(angle) * 45, y + Math.sin(angle) * 45, 166);
      drawLineSegments([[crown, leafEnd]], index % 2 ? [.18, .4, .24] : [.25, .5, .3], 1, .15);
    }
  }

  function drawHarbour(x, y) {
    drawBoxAt(x, y, 10, 10, 300, COLOR.steel);
    drawBoxAt(x + 300, y, 10, 10, 300, COLOR.steel);
    drawBoxAt(x + 150, y, 310, 10, 300, COLOR.purple, .2);
    drawBoxAt(x + 220, y, 5, 5, 190, COLOR.dark);
    const hook = worldPoint(x + 220, y, 92);
    drawMesh(geometry.torus, hook, [Math.PI / 2, 0, 0], [14, 14, 14], COLOR.gold, .8);
    for (let index = 0; index < 3; index += 1) drawBoxAt(x + index * 105, y - 55, 88, 52, 46, index % 2 ? [.36, .22, .28] : [.25, .32, .42]);
  }

  function drawStaticWorld() {
    drawBoxAt(1100, 700, 2200, 1400, .2, COLOR.asphalt);
    drawRoad(1100, 650, 2200, 230, false);
    drawRoad(1070, 0, 245, 1400, true);
    drawRoad(1000, 240, 1500, 120, false);
    drawRoad(1080, 1115, 1550, 150, false);
    drawRoad(240, 700, 120, 1160, true);
    const blocks = [
      [40, 50, 310, 470, 260, COLOR.buildingAlt], [370, 30, 430, 500, 330, COLOR.building], [1250, 40, 390, 470, 290, COLOR.buildingAlt], [1660, 40, 470, 470, 340, COLOR.building],
      [40, 900, 290, 420, 240, COLOR.building], [350, 1200, 470, 160, 180, COLOR.buildingAlt], [1260, 1210, 410, 150, 170, COLOR.building], [1700, 870, 430, 460, 280, COLOR.buildingAlt],
    ];
    blocks.forEach((block) => drawBuilding(...block));
    drawTemple(1090, 100);
    drawMarket(720, 585, [.98, .3, .47]);
    drawMarket(1370, 585, [.34, .85, .9]);
    drawHarbour(260, 930);
    drawPalm(500, 620, -.04); drawPalm(1770, 620, .05); drawPalm(2020, 810, -.08); drawPalm(290, 730, .06);
    for (let x = 300; x <= 1900; x += 180) { drawLamp(x, 620, x % 360 === 0 ? COLOR.cyan : [.98, .3, .47]); drawLamp(x, 900, x % 360 === 0 ? [.98, .3, .47] : COLOR.cyan); }
  }

  function drawVehicle(vehicle) {
    const [x, z] = worldPoint(vehicle.x, vehicle.y, 0);
    const angle = -vehicle.angle + Math.PI / 2;
    if (vehicle.kind === 'train') {
      drawMesh(geometry.cube, [x, .9, z], [0, angle, 0], [3.1, .9, 1.1], colorFor(vehicle.color));
      drawMesh(geometry.cube, [x, 1.6, z], [0, angle, 0], [2.7, .35, .95], [.08, .2, .28], { emissive: .3 });
      return;
    }
    const widthPx = vehicle.kind === 'bus' ? 180 : vehicle.kind === 'auto' ? 88 : 125;
    const depthPx = vehicle.kind === 'bus' ? 62 : vehicle.kind === 'auto' ? 58 : 54;
    drawMesh(geometry.cube, [x, .48, z], [0, angle, 0], [widthPx * WORLD_SCALE / 2, .42, depthPx * WORLD_SCALE / 2], colorFor(vehicle.color));
    drawMesh(geometry.cube, [x - Math.cos(angle) * .18, .93, z - Math.sin(angle) * .18], [0, angle, 0], [widthPx * WORLD_SCALE * .23, .3, depthPx * WORLD_SCALE * .37], [.08, .22, .28], { emissive: .25 });
    for (const side of [-1, 1]) {
      const wheel = [x + Math.sin(angle) * side * .47, .28, z - Math.cos(angle) * side * .47];
      drawMesh(geometry.cylinder, wheel, [Math.PI / 2, 0, 0], [.18, .08, .18], COLOR.dark);
    }
    drawMesh(geometry.sphere, [x + Math.cos(angle) * .95, .52, z + Math.sin(angle) * .95], [0, 0, 0], [.08, .08, .08], COLOR.gold, { emissive: 2.3 });
  }

  function drawPlayer(state) {
    const player = state.player;
    const [x, z] = worldPoint(player.x, player.y, 0);
    const angle = -player.angle + Math.PI / 2;
    const alpha = player.invulnerable > 0 && Math.floor(state.time * 18) % 2 === 0 ? .42 : 1;
    drawMesh(geometry.cube, [x, .92, z], [0, angle, 0], [.55, .85, .42], COLOR.trousers, { alpha });
    drawMesh(geometry.cube, [x, 1.75, z], [0, angle, 0], [.72, .68, .5], COLOR.shirt, { alpha });
    drawMesh(geometry.sphere, [x, 2.55, z], [0, 0, 0], [.32, .39, .32], COLOR.skin, { alpha });
    drawMesh(geometry.sphere, [x, 2.86, z], [0, 0, 0], [.34, .18, .34], COLOR.hair, { alpha });
    drawMesh(geometry.cube, [x + Math.cos(player.angle) * .3, 2.56, z + Math.sin(player.angle) * .3], [0, angle, 0], [.42, .06, .04], COLOR.dark, { alpha, emissive: .1 });
    drawWeapon([x, z], player, alpha);
    if (player.dodge > 0) drawMesh(geometry.torus, [x, .1, z], [Math.PI / 2, 0, 0], [.9, .9, .9], COLOR.gold, { emissive: 1.6, alpha: .8 });
    if (state.mouse && state.mouse.aim) drawMesh(geometry.torus, [x, .08, z], [Math.PI / 2, 0, 0], [1.2, 1.2, 1.2], COLOR.gold, { emissive: 1.2, alpha: .55 });
  }

  function drawWeapon(origin, player, alpha) {
    const weapon = weaponForIndex(player.weaponIndex || 0);
    const [x, z] = origin;
    const forward = [Math.cos(player.angle), 0, Math.sin(player.angle)];
    const weaponPosition = [x + forward[0] * .62, 1.55, z + forward[2] * .62];
    const color = colorFor(weapon?.color || '#f4bf4f');
    if (weapon?.id === 'unarmed') return;
    if (weapon?.id === 'baseballBat') drawMesh(geometry.cylinder, weaponPosition, [Math.PI / 2, -player.angle, 0], [.1, .7, .1], [.45, .27, .16]);
    else if (weapon?.mode === 'grenade') drawMesh(geometry.sphere, weaponPosition, [0, 0, 0], [.15, .15, .15], color, { emissive: 1.2, alpha });
    else if (weapon?.mode === 'detonator') drawMesh(geometry.cube, weaponPosition, [0, -player.angle, 0], [.18, .26, .14], COLOR.dark, { emissive: .15, alpha });
    else {
      const length = weapon?.id === 'rocketLauncher' ? 1.35 : weapon?.id === 'sniperRifle' ? 1.45 : 1;
      drawMesh(geometry.cylinder, weaponPosition, [Math.PI / 2, -player.angle, 0], [.08, length, .08], COLOR.dark, { alpha });
      drawMesh(geometry.cube, [weaponPosition[0] + forward[0] * length, weaponPosition[1], weaponPosition[2] + forward[2] * length], [0, -player.angle + Math.PI / 2, 0], [.1, .07, .1], color, { emissive: 1.9, alpha });
    }
  }

  function drawEnemy(enemy) {
    if (!enemy.alive && enemy.deathTimer <= 0) return;
    const [x, z] = worldPoint(enemy.x, enemy.y, 0);
    const angle = -enemy.angle + Math.PI / 2;
    const alpha = enemy.alive ? 1 : Math.max(0, enemy.deathTimer / .8);
    const bodyScale = enemy.kind === 'boss' ? 1.55 : enemy.kind === 'enforcer' ? 1.2 : 1;
    const bodyColor = [.09, .11, .17];
    const accent = colorFor(enemy.color);
    drawMesh(geometry.cube, [x, .88 * bodyScale, z], [0, angle, 0], [.55 * bodyScale, .82 * bodyScale, .42 * bodyScale], bodyColor, { alpha });
    drawMesh(geometry.sphere, [x, 1.78 * bodyScale, z], [0, 0, 0], [.27 * bodyScale, .3 * bodyScale, .27 * bodyScale], COLOR.skin, { alpha });
    drawMesh(geometry.cube, [x + Math.cos(enemy.angle) * .3 * bodyScale, 1.78 * bodyScale, z + Math.sin(enemy.angle) * .3 * bodyScale], [0, angle, 0], [.34 * bodyScale, .08, .05], accent, { emissive: 2.2, alpha });
    if (enemy.kind === 'enforcer' || enemy.kind === 'boss') {
      drawMesh(geometry.torus, [x, 1.1 * bodyScale, z], [Math.PI / 2, 0, 0], [.68 * bodyScale, .68 * bodyScale, .68 * bodyScale], accent, { emissive: .7, alpha: .85 });
    }
    if (enemy.kind === 'lookout' || enemy.kind === 'boss') {
      const gun = worldPoint(enemy.x + Math.cos(enemy.angle) * 40, enemy.y + Math.sin(enemy.angle) * 40, 1.45 * bodyScale);
      drawMesh(geometry.cylinder, gun, [Math.PI / 2, -enemy.angle, 0], [.055, .55, .055], COLOR.dark, { alpha });
      drawMesh(geometry.sphere, worldPoint(enemy.x + Math.cos(enemy.angle) * 70, enemy.y + Math.sin(enemy.angle) * 70, 1.45 * bodyScale), [0, 0, 0], [.065, .065, .065], accent, { emissive: 2, alpha });
    }
    if (enemy.alive) {
      const barPosition = worldPoint(enemy.x, enemy.y, 2.55 * bodyScale);
      drawMesh(geometry.cube, barPosition, [0, 0, 0], [.65 * bodyScale, .035, .035], COLOR.dark, { alpha: .85 });
      drawMesh(geometry.cube, [barPosition[0] - .65 * bodyScale * (1 - enemy.health / enemy.maxHealth) / 2, barPosition[1] + .01, barPosition[2]], [0, 0, 0], [.65 * bodyScale * Math.max(.02, enemy.health / enemy.maxHealth), .042, .042], accent, { emissive: .8, alpha });
    }
  }

  function drawProjectile(projectile) {
    const [x, z] = worldPoint(projectile.x, projectile.y, .95);
    const color = colorFor(projectile.color);
    drawMesh(geometry.sphere, [x, .95, z], [0, 0, 0], [projectile.owner === 'enemy' ? .12 : .16, projectile.owner === 'enemy' ? .12 : .16, projectile.owner === 'enemy' ? .12 : .16], color, { emissive: 2.2 });
  }

  function drawPickup(pickup, time) {
    const [x, z] = worldPoint(pickup.x, pickup.y, .52 + Math.sin(time * 4 + pickup.bob) * .08);
    drawMesh(geometry.octahedron || geometry.cone, [x, .52 + Math.sin(time * 4 + pickup.bob) * .08, z], [0, time * 2, 0], [.18, .24, .18], COLOR.cyan, { emissive: 2.7 });
  }

  function drawParticles(state) {
    const lines = [];
    for (const particle of state.particles) {
      const progress = 1 - particle.life / particle.maxLife;
      const alpha = Math.max(0, particle.life / particle.maxLife);
      if (particle.type === 'line') {
        const start = worldPoint(particle.x, particle.y, 1.5);
        const end = worldPoint(particle.endX, particle.endY, 1.5);
        lines.push([start, end, particle.color, alpha]);
      } else if (particle.type === 'ring' || particle.type === 'slash') {
        const [x, z] = worldPoint(particle.x, particle.y, .08);
        const radius = particle.size * WORLD_SCALE * progress;
        drawMesh(geometry.torus, [x, .1, z], [Math.PI / 2, 0, 0], [radius, radius, radius], colorFor(particle.color), { emissive: 1.9, alpha });
      } else {
        const [x, z] = worldPoint(particle.x, particle.y, .9);
        const radius = Math.max(.025, particle.size * WORLD_SCALE * (1 - progress * .4));
        drawMesh(geometry.sphere, [x, .9, z], [0, 0, 0], [radius, radius, radius], colorFor(particle.color), { emissive: 1.3, alpha });
      }
    }
    const grouped = new Map();
    for (const line of lines) {
      const key = line[2];
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push([line[0], line[1], line[3]]);
    }
    grouped.forEach((value, key) => drawLineSegments(value, colorFor(key), value.reduce((sum, entry) => sum + entry[2], 0) / value.length, 1.5));
  }

  function render(state) {
    setupFrame(state);
    drawStaticWorld();
    for (const vehicle of state.vehicles) drawVehicle(vehicle);
    for (const pickup of state.pickups) drawPickup(pickup, state.time);
    for (const projectile of state.projectiles) drawProjectile(projectile);
    for (const enemy of state.enemies) drawEnemy(enemy);
    drawPlayer(state);

    const rainLines = [];
    for (const drop of state.rain) {
      const a = worldPoint(drop.x, drop.y, 8);
      const b = worldPoint(drop.x - 12, drop.y + drop.length, 7.2);
      rainLines.push([a, b]);
    }
    drawLineSegments(rainLines, [.45, .72, .86], .28, .25);
    drawParticles(state);
  }

  resize();
  return { resize, render };
}
