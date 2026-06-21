function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function hash(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fade(fx), uy = fade(fy);
  return lerp(
    lerp(hash(ix, iy), hash(ix + 1, iy), ux),
    lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux),
    uy
  );
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0, amplitude = 1, frequency = 1, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (valueNoise(x * frequency, y * frequency) * 2 - 1);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value / maxValue;
}

export const WORLD_SIZE = 600;
export const ROAD_SPACING = 200;
export const ROAD_HALF_WIDTH = 14;

function distanceToNearestRoad(x: number, z: number): number {
  const xRoad = Math.round(x / ROAD_SPACING) * ROAD_SPACING;
  const zRoad = Math.round(z / ROAD_SPACING) * ROAD_SPACING;
  return Math.min(Math.abs(x - xRoad), Math.abs(z - zRoad));
}

export function getTerrainHeight(x: number, z: number): number {
  let h = 0;
  h += fbm(x * 0.005, z * 0.005, 3) * 16;
  h += fbm(x * 0.02 + 100, z * 0.02 + 50, 2) * 4;
  h += fbm(x * 0.06 + 200, z * 0.06 + 150, 2) * 1;

  const roadDist = distanceToNearestRoad(x, z);
  if (roadDist < ROAD_HALF_WIDTH) {
    h = 0;
  } else if (roadDist < ROAD_HALF_WIDTH + 25) {
    const t = (roadDist - ROAD_HALF_WIDTH) / 25;
    const s = t * t * (3 - 2 * t);
    h *= s;
  }
  return h;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed + 9.123) * 43758.5453;
  return x - Math.floor(x);
}
