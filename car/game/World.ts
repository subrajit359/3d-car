import * as THREE from 'three';
import { getTerrainHeight, seededRandom, WORLD_SIZE, ROAD_SPACING, ROAD_HALF_WIDTH } from './terrain';

const TREE_COUNT = 120;
const ROCK_COUNT = 80;

export interface WorldObjects {
  terrain: THREE.Mesh;
  sun: THREE.DirectionalLight;
  ambient: THREE.AmbientLight;
  hemisphere: THREE.HemisphereLight;
}

function buildTerrain(): THREE.Mesh {
  const SEGS = 60;
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = getTerrainHeight(x, z);
    pos.setY(i, y);

    // Vertex colour: green grass with slope variation
    const slope = Math.min(1, Math.abs(y) / 14);
    colors[i * 3]     = 0.15 + slope * 0.15 + seededRandom(i * 3) * 0.03;
    colors[i * 3 + 1] = 0.35 + slope * 0.05 + seededRandom(i * 3 + 1) * 0.04;
    colors[i * 3 + 2] = 0.08 + slope * 0.04;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
}

function buildRoads(scene: THREE.Scene): void {
  const range = Math.floor(WORLD_SIZE / 2 / ROAD_SPACING);
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x202020 });
  const lineMat  = new THREE.MeshLambertMaterial({ color: 0xf0f0c0 });
  const sideWalkMat = new THREE.MeshLambertMaterial({ color: 0x908070 });

  function addRoad(ax: number, az: number, bx: number, bz: number) {
    const dx = bx - ax, dz = bz - az;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle  = Math.atan2(dx, dz);
    const cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const y = 0.05;

    // Road surface
    const rg = new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, length);
    const rm = new THREE.Mesh(rg, roadMat);
    rm.rotation.x = -Math.PI / 2;
    rm.rotation.z = angle;
    rm.position.set(cx, y, cz);
    rm.receiveShadow = true;
    scene.add(rm);

    // Centre dashes
    const dashCount = Math.floor(length / 10);
    for (let d = 0; d < dashCount; d++) {
      const t = -length / 2 + 5 + d * 10;
      const lx = cx + Math.sin(angle) * t;
      const lz = cz + Math.cos(angle) * t;
      const lg = new THREE.PlaneGeometry(0.3, 4);
      const lm = new THREE.Mesh(lg, lineMat);
      lm.rotation.x = -Math.PI / 2;
      lm.rotation.z = angle;
      lm.position.set(lx, y + 0.01, lz);
      scene.add(lm);
    }

    // Sidewalks
    [-1, 1].forEach(side => {
      const sw = new THREE.PlaneGeometry(3, length);
      const sm = new THREE.Mesh(sw, sideWalkMat);
      const offset = (ROAD_HALF_WIDTH + 1.5) * side;
      sm.rotation.x = -Math.PI / 2;
      sm.rotation.z = angle;
      sm.position.set(
        cx + Math.cos(angle) * offset,
        y,
        cz - Math.sin(angle) * offset
      );
      sm.receiveShadow = true;
      scene.add(sm);
    });
  }

  for (let r = -range; r <= range; r++) {
    const half = WORLD_SIZE / 2 - 10;
    addRoad(-half, r * ROAD_SPACING, half, r * ROAD_SPACING);
    addRoad(r * ROAD_SPACING, -half, r * ROAD_SPACING, half);
  }
}

function buildTrees(scene: THREE.Scene): void {
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 1, 6);
  const canopyGeo = new THREE.ConeGeometry(1, 1, 7);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a15 });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x2a5515 });

  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, TREE_COUNT);
  trunks.castShadow = true;
  canopies.castShadow = true;

  const dummy = new THREE.Object3D();
  const half = WORLD_SIZE / 2 - 20;
  let placed = 0, attempts = 0;

  while (placed < TREE_COUNT && attempts < TREE_COUNT * 8) {
    const x = (seededRandom(attempts * 2 + 1) - 0.5) * half * 2;
    const z = (seededRandom(attempts * 2 + 2) - 0.5) * half * 2;
    const rx = Math.round(x / ROAD_SPACING) * ROAD_SPACING;
    const rz = Math.round(z / ROAD_SPACING) * ROAD_SPACING;
    const nearRoad = Math.abs(x - rx) < ROAD_HALF_WIDTH + 6 || Math.abs(z - rz) < ROAD_HALF_WIDTH + 6;
    attempts++;
    if (nearRoad) continue;

    const y = getTerrainHeight(x, z);
    const scale = 0.8 + seededRandom(placed * 7) * 0.8;
    const treeH = (3 + seededRandom(placed * 3) * 3) * scale;

    dummy.position.set(x, y + treeH * 0.4, z);
    dummy.scale.set(scale * 0.5, scale * treeH * 0.5, scale * 0.5);
    dummy.rotation.y = seededRandom(placed * 5) * Math.PI * 2;
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);

    const ch = (1.5 + seededRandom(placed * 9) * 1.5) * scale;
    dummy.position.set(x, y + treeH * scale + ch * 0.4, z);
    dummy.scale.set(scale * 1.5, scale * ch, scale * 1.5);
    dummy.updateMatrix();
    canopies.setMatrixAt(placed, dummy.matrix);
    placed++;
  }

  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  scene.add(trunks, canopies);
}

function buildRocks(scene: THREE.Scene): void {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0x807060 });
  const rocks = new THREE.InstancedMesh(geo, mat, ROCK_COUNT);
  rocks.castShadow = rocks.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const half = WORLD_SIZE / 2 - 15;

  for (let i = 0; i < ROCK_COUNT; i++) {
    const x = (seededRandom(i * 3 + 500) - 0.5) * half * 2;
    const z = (seededRandom(i * 3 + 501) - 0.5) * half * 2;
    const y = getTerrainHeight(x, z);
    const s = 0.3 + seededRandom(i * 17) * 1.0;
    dummy.position.set(x, y + s * 0.4, z);
    dummy.scale.set(s * (0.8 + seededRandom(i) * 0.4), s * 0.6, s * (0.7 + seededRandom(i * 2) * 0.5));
    dummy.rotation.set(seededRandom(i * 4) * 0.5, seededRandom(i * 5) * Math.PI * 2, seededRandom(i * 6) * 0.4);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }

  rocks.instanceMatrix.needsUpdate = true;
  scene.add(rocks);
}

function buildBuildings(scene: THREE.Scene): void {
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xb0a890 });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x706860 });

  const blocks = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 0], [0, 1], [1, -1], [1, 0], [1, 1]];

  blocks.forEach(([bx, bz], bi) => {
    const blockX = bx * ROAD_SPACING;
    const blockZ = bz * ROAD_SPACING;
    const count = 2 + Math.floor(seededRandom(bi * 7) * 3);

    for (let b = 0; b < count; b++) {
      const ox = (seededRandom(bi * 13 + b * 5) - 0.5) * (ROAD_SPACING - ROAD_HALF_WIDTH * 3);
      const oz = (seededRandom(bi * 13 + b * 5 + 1) - 0.5) * (ROAD_SPACING - ROAD_HALF_WIDTH * 3);
      const x = blockX + ox, z = blockZ + oz;
      const y = getTerrainHeight(x, z);
      const w = 8 + seededRandom(bi + b + 2) * 12;
      const d = 8 + seededRandom(bi + b + 3) * 12;
      const h = 8 + seededRandom(bi + b + 4) * 28;

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      body.position.set(x, y + h / 2, z);
      body.castShadow = body.receiveShadow = true;
      scene.add(body);

      // Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.6, d + 0.5), roofMat);
      roof.position.set(x, y + h + 0.3, z);
      scene.add(roof);
    }
  });
}

function buildStreetlights(scene: THREE.Scene): void {
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const range = Math.floor(WORLD_SIZE / 2 / ROAD_SPACING);

  const addLight = (x: number, z: number) => {
    const y = getTerrainHeight(x, z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 8, 6), poleMat);
    pole.position.set(x, y + 4, z);
    pole.castShadow = true;
    scene.add(pole);

    const light = new THREE.PointLight(0xffe880, 3, 22, 2);
    light.position.set(x + 2, y + 7.5, z);
    scene.add(light);
  };

  for (let r = -range; r <= range; r++) {
    for (let offset = -1; offset <= 1; offset++) {
      addLight(offset * 80, r * ROAD_SPACING + ROAD_HALF_WIDTH + 2);
      addLight(r * ROAD_SPACING + ROAD_HALF_WIDTH + 2, offset * 80);
    }
  }
}

export function buildWorld(scene: THREE.Scene): WorldObjects {
  // Terrain
  const terrain = buildTerrain();
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Roads
  buildRoads(scene);

  // Nature
  buildTrees(scene);
  buildRocks(scene);

  // Urban
  buildBuildings(scene);
  buildStreetlights(scene);

  // Lighting
  const ambient = new THREE.AmbientLight(0xc8d4e8, 0.8);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x3a5a20, 0.6);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfffde8, 1.4);
  sun.position.set(60, 80, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -150;
  sun.shadow.camera.right = sun.shadow.camera.top = 150;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // Fog
  scene.fog = new THREE.FogExp2(0xb0cfe0, 0.004);

  return { terrain, sun, ambient, hemisphere };
}

const DAY_SPEED = 0.0003;

export function updateDayNight(scene: THREE.Scene, objects: WorldObjects, time: number): void {
  const elevation = Math.sin(time);
  const isNight = elevation < -0.15;
  const isSunset = elevation >= -0.15 && elevation < 0.15;

  // Sun position
  const sunX = Math.cos(time) * 80;
  const sunY = Math.sin(time) * 80 + 5;
  objects.sun.position.set(sunX, Math.abs(sunY), sunX * 0.3);

  // Colors
  if (isNight) {
    objects.sun.color.set(0x203060);
    objects.sun.intensity = 0.2;
    objects.ambient.color.set(0x0d1530);
    objects.ambient.intensity = 0.3;
    scene.background = new THREE.Color(0x060615);
    (scene.fog as THREE.FogExp2).color.set(0x060615);
  } else if (isSunset) {
    const t = (elevation + 0.15) / 0.3;
    objects.sun.color.set(new THREE.Color().lerpColors(new THREE.Color(0xff7030), new THREE.Color(0xffe890), t));
    objects.sun.intensity = 0.4 + t * 1.0;
    objects.ambient.color.set(0x604030);
    objects.ambient.intensity = 0.5;
    scene.background = new THREE.Color().lerpColors(new THREE.Color(0x803020), new THREE.Color(0x87ceeb), t);
    (scene.fog as THREE.FogExp2).color.copy(scene.background as THREE.Color);
  } else {
    objects.sun.color.set(0xfffde8);
    objects.sun.intensity = 1.4;
    objects.ambient.color.set(0xc8d4e8);
    objects.ambient.intensity = 0.8;
    scene.background = new THREE.Color(0x87ceeb);
    (scene.fog as THREE.FogExp2).color.set(0xb0cfe0);
  }
}

export { DAY_SPEED };
