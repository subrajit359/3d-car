import * as THREE from 'three';
import { CarState } from './Car';

export type CameraMode = 'third' | 'first' | 'hood' | 'orbit';

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  mode: CameraMode;
}

const cam: CameraState = {
  position: new THREE.Vector3(0, 5, -10),
  target: new THREE.Vector3(),
  mode: 'third',
};

const OFFSETS: Record<CameraMode, [number, number, number]> = {
  third:  [0, 4.5, -10],
  first:  [0, 1.2,  1.5],
  hood:   [0, 0.9,  2.0],
  orbit:  [0, 15, -25],
};

const LAG = 0.06; // Lower = smoother/more lag

export function cycleCameraMode(): void {
  const modes: CameraMode[] = ['third', 'first', 'hood', 'orbit'];
  const idx = modes.indexOf(cam.mode);
  cam.mode = modes[(idx + 1) % modes.length];
}

export function updateCamera(camera: THREE.PerspectiveCamera, carState: CarState, dt: number): void {
  const [ox, oy, oz] = OFFSETS[cam.mode];

  const sin = Math.sin(carState.heading);
  const cos = Math.cos(carState.heading);

  const worldOffsetX = sin * oz + cos * ox;
  const worldOffsetZ = cos * oz - sin * ox;

  const targetPos = new THREE.Vector3(
    carState.position.x + worldOffsetX,
    carState.position.y + oy,
    carState.position.z + worldOffsetZ,
  );

  // Slight tilt on sharp turns
  const tiltAmount = carState.steeringAngle * Math.abs(carState.speed) * 0.01;
  camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, tiltAmount, 0.1);

  // Smooth lag
  cam.position.lerp(targetPos, LAG);
  camera.position.copy(cam.position);

  // Look target — slightly ahead of car
  const lookAhead = new THREE.Vector3(
    carState.position.x + sin * 8,
    carState.position.y + 1.2,
    carState.position.z + cos * 8,
  );
  cam.target.lerp(lookAhead, 0.12);
  camera.lookAt(cam.target);
}
