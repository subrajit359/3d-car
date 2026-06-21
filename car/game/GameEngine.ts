import * as THREE from 'three';
import { buildWorld, updateDayNight, WorldObjects, DAY_SPEED } from './World';
import { createCarMesh, updateCar, applyCarToMesh, defaultCarState, defaultInput, CarState, CarInput } from './Car';
import { updateCamera, cycleCameraMode } from './Camera';

export class GameEngine {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;

  carMesh!: THREE.Group;
  carState!: CarState;
  input!: CarInput;
  worldObjects!: WorldObjects;

  dayTime = Math.PI * 0.3; // start at morning
  width = 0;
  height = 0;

  private _disposed = false;

  async init(gl: any, width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.3, 1500);
    this.camera.position.set(0, 8, -15);

    // Renderer — expo-gl compatible setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
        ownerDocument: {},
      } as any,
      context: gl as any,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Build world
    this.worldObjects = buildWorld(this.scene);

    // Car
    this.carState = defaultCarState();
    this.input = defaultInput();
    this.carMesh = createCarMesh();
    this.carMesh.position.copy(this.carState.position);
    this.scene.add(this.carMesh);
  }

  setInput(partial: Partial<CarInput>): void {
    Object.assign(this.input, partial);
  }

  cycleCam(): void {
    cycleCameraMode();
  }

  update(dt: number): void {
    if (this._disposed) return;

    // Day/night
    this.dayTime += DAY_SPEED;
    updateDayNight(this.scene, this.worldObjects, this.dayTime);

    // Car physics
    updateCar(this.carState, this.input, dt);
    applyCarToMesh(this.carState, this.carMesh, this.input);

    // Camera
    updateCamera(this.camera, this.carState, dt);
  }

  render(gl: any): void {
    if (this._disposed) return;
    this.renderer.render(this.scene, this.camera);
    gl.endFrameEXP();
  }

  dispose(): void {
    this._disposed = true;
    this.renderer?.dispose();
  }

  get speedKmh(): number {
    return Math.round(Math.abs(this.carState.speed) * 3.6);
  }

  get gear(): number {
    return this.carState.gear;
  }

  get fuel(): number {
    return Math.round(this.carState.fuel);
  }
}
