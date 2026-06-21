import * as THREE from 'three';
import { getTerrainHeight } from './terrain';

export interface CarInput {
  steer: number;      // -1 (left) to 1 (right)
  throttle: number;  // 0 to 1
  brake: number;     // 0 to 1
  handbrake: boolean;
  headlights: boolean;
}

export interface CarState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: number;   // world-space yaw in radians
  speed: number;     // m/s (signed: negative = reverse)
  steeringAngle: number;
  rpm: number;
  gear: number;      // -1=R, 0=N, 1-6
  fuel: number;      // 0-100
  damaged: boolean;
}

export function defaultCarState(): CarState {
  return {
    position: new THREE.Vector3(0, getTerrainHeight(0, 0) + 0.4, 0),
    velocity: new THREE.Vector3(),
    heading: 0,
    speed: 0,
    steeringAngle: 0,
    rpm: 800,
    gear: 0,
    fuel: 100,
    damaged: false,
  };
}

export function defaultInput(): CarInput {
  return { steer: 0, throttle: 0, brake: 0, handbrake: false, headlights: true };
}

// --- Procedural car mesh ---
export function createCarMesh(): THREE.Group {
  const car = new THREE.Group();

  // Body — wide flat box
  const bodyGeo = new THREE.BoxGeometry(2.0, 0.55, 4.2);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe03020 }); // red car
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  car.add(body);

  // Roof — smaller box
  const roofGeo = new THREE.BoxGeometry(1.7, 0.45, 2.2);
  const roof = new THREE.Mesh(roofGeo, bodyMat);
  roof.position.set(0, 1.05, -0.2);
  roof.castShadow = true;
  car.add(roof);

  // Windshield strip (dark)
  const windMat = new THREE.MeshLambertMaterial({ color: 0x1a2a40 });
  const windGeo = new THREE.BoxGeometry(1.65, 0.38, 0.1);
  const wind = new THREE.Mesh(windGeo, windMat);
  wind.position.set(0, 0.95, 0.91);
  car.add(wind);

  // Spoiler
  const spoilerMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const spoilerGeo = new THREE.BoxGeometry(1.8, 0.1, 0.4);
  const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
  spoiler.position.set(0, 1.15, -1.9);
  car.add(spoiler);

  // Bumpers
  const bumperGeo = new THREE.BoxGeometry(2.05, 0.3, 0.2);
  const bumperMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const frontBumper = new THREE.Mesh(bumperGeo, bumperMat);
  frontBumper.position.set(0, 0.3, 2.2);
  car.add(frontBumper);
  const rearBumper = new THREE.Mesh(bumperGeo, bumperMat);
  rearBumper.position.set(0, 0.3, -2.2);
  car.add(rearBumper);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const rimMat   = new THREE.MeshLambertMaterial({ color: 0xcccccc });

  const wheelPositions: [number, number, number, string][] = [
    [ 1.05, 0.38,  1.5, 'fl'],
    [-1.05, 0.38,  1.5, 'fr'],
    [ 1.05, 0.38, -1.5, 'rl'],
    [-1.05, 0.38, -1.5, 'rr'],
  ];

  wheelPositions.forEach(([x, y, z, name]) => {
    const wheel = new THREE.Group();
    const tyre = new THREE.Mesh(wheelGeo, wheelMat);
    tyre.rotation.z = Math.PI / 2;
    tyre.castShadow = true;
    wheel.add(tyre);

    // Rim disc
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.31, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);

    wheel.position.set(x, y, z);
    wheel.name = name;
    car.add(wheel);
  });

  // Headlights
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const headlightGeo = new THREE.BoxGeometry(0.4, 0.15, 0.1);
  [-0.6, 0.6].forEach(ox => {
    const hl = new THREE.Mesh(headlightGeo, headlightMat);
    hl.position.set(ox, 0.6, 2.16);
    hl.name = 'headlight';
    car.add(hl);
  });

  // Headlight spot lights (off by default)
  [-0.6, 0.6].forEach((ox, i) => {
    const spot = new THREE.SpotLight(0xfff8e0, 0, 40, Math.PI / 7, 0.3, 1.5);
    spot.position.set(ox, 0.6, 2.2);
    spot.target.position.set(ox, -1, 20);
    spot.name = `headspot_${i}`;
    car.add(spot);
    car.add(spot.target);
  });

  // Tail lights
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
  [-0.6, 0.6].forEach(ox => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), tailMat);
    tl.position.set(ox, 0.6, -2.16);
    car.add(tl);
  });

  return car;
}

const MAX_SPEED = 55;          // m/s ~198 km/h
const ACCELERATION = 18;
const BRAKE_FORCE  = 30;
const FRICTION     = 0.97;
const STEER_MAX    = 0.6;      // radians
const STEER_SPEED  = 2.5;
const WHEEL_BASE   = 3.0;

const GEAR_RATIOS  = [0, 3.5, 2.1, 1.4, 1.0, 0.75, 0.6]; // 0=N, 1-6

export function updateCar(state: CarState, input: CarInput, dt: number): void {
  // Fuel depletion
  if (input.throttle > 0 && state.fuel > 0) {
    state.fuel = Math.max(0, state.fuel - input.throttle * dt * 0.8);
  }

  const canDrive = state.fuel > 0;
  const throttle = canDrive ? input.throttle : 0;

  // Gear selection
  const absSpeed = Math.abs(state.speed);
  if (state.gear >= 0) {
    if (absSpeed < 2) state.gear = 1;
    else if (absSpeed < 8) state.gear = 2;
    else if (absSpeed < 18) state.gear = 3;
    else if (absSpeed < 28) state.gear = 4;
    else if (absSpeed < 38) state.gear = 5;
    else state.gear = 6;
  }

  // RPM simulation
  const ratio = GEAR_RATIOS[Math.max(1, state.gear)] ?? 1;
  state.rpm = Math.max(800, Math.min(7000, (absSpeed * ratio * 60) + throttle * 2000));

  // Acceleration / braking
  const forward = new THREE.Vector3(Math.sin(state.heading), 0, Math.cos(state.heading));

  if (input.brake > 0) {
    state.speed *= 1 - BRAKE_FORCE * dt * input.brake;
  }

  if (throttle > 0 && state.speed < MAX_SPEED) {
    state.speed += ACCELERATION * dt * throttle;
  }
  if (throttle === 0 && input.brake === 0) {
    state.speed *= FRICTION;
  }
  if (Math.abs(state.speed) < 0.05) state.speed = 0;

  // Handbrake drift
  if (input.handbrake) {
    state.speed *= 0.95;
  }

  // Steering (speed-sensitive)
  const targetSteering = input.steer * STEER_MAX * Math.max(0.2, 1 - absSpeed / MAX_SPEED * 0.5);
  state.steeringAngle += (targetSteering - state.steeringAngle) * STEER_SPEED * dt;

  // Heading update (Ackermann-style)
  if (Math.abs(state.speed) > 0.1) {
    const turnRate = (state.speed / WHEEL_BASE) * Math.tan(state.steeringAngle);
    state.heading += turnRate * dt;
  }

  // Position update
  const move = forward.clone().multiplyScalar(state.speed * dt);
  state.position.add(move);

  // Ground clamping
  const groundY = getTerrainHeight(state.position.x, state.position.z);
  state.position.y = groundY + 0.38;

  // World boundary
  const half = 280;
  state.position.x = Math.max(-half, Math.min(half, state.position.x));
  state.position.z = Math.max(-half, Math.min(half, state.position.z));
}

export function applyCarToMesh(state: CarState, mesh: THREE.Group, input: CarInput): void {
  mesh.position.copy(state.position);
  mesh.rotation.y = state.heading;

  // Wheel rotation (spin)
  const wheelSpin = state.speed * 0.5;
  mesh.children.forEach(child => {
    if (['fl', 'rl'].includes(child.name)) {
      child.rotation.z += wheelSpin * 0.1;
    } else if (['fr', 'rr'].includes(child.name)) {
      child.rotation.z -= wheelSpin * 0.1;
    }
    // Front wheel steer
    if (child.name === 'fl' || child.name === 'fr') {
      child.rotation.y = state.steeringAngle;
    }
  });

  // Headlights
  mesh.children.forEach(child => {
    if (child.name.startsWith('headspot_')) {
      (child as THREE.SpotLight).intensity = input.headlights ? 12 : 0;
    }
  });

  // Body roll on turns
  mesh.rotation.z = -state.steeringAngle * Math.abs(state.speed) * 0.015;
}
