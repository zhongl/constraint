import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Constraint } from './effect/constraint';
import { createConstraintTuning, type ConstraintTuning } from './tuning';

export interface PointerOptions {
    target?: HTMLElement;
    idleTimeout?: number;
    ignoreSelector?: string;
}

export interface ConstraintBackgroundOptions {
    theme?: 'dark' | 'light';
    pointer?: false | PointerOptions;
    tuning?: ConstraintTuning;
}

type Pointer = {
    options: PointerOptions;
    target: HTMLElement;
} | null;

export class ConstraintBackground {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
    private readonly control: OrbitControls;
    private readonly constraint: Constraint;
    private readonly host: HTMLElement;
    private readonly tuning: ConstraintTuning;
    private readonly pointer: Pointer;
    private readonly resizeObserver: ResizeObserver;
    private readonly mouse = new THREE.Vector2();
    private readonly ray = new THREE.Ray();

    private time = 0;
    private animationFrame = 0;
    private initAnimation = 0;
    private lastPointerMove = 0;

    private readonly onResize = (): void => {
        const { width, height } = this.host.getBoundingClientRect();
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };

    private readonly onPointerMove = (evt: PointerEvent): void => {
        if (this.isPointerIgnored(evt.target)) {
            this.clearPointer();
            return;
        }

        const { left, top, width, height } = this.host.getBoundingClientRect();
        this.lastPointerMove = performance.now();
        this.mouse.x = ((evt.clientX - left) / width) * 2 - 1;
        this.mouse.y = -((evt.clientY - top) / height) * 2 + 1;
    };

    private readonly clearPointer = (): void => {
        this.lastPointerMove = 0;
    };

    constructor(host: HTMLElement, options: ConstraintBackgroundOptions = {}) {
        this.host = host;
        this.tuning = createTuning(options);
        this.pointer = createPointer(host, options.pointer);
        this.renderer = createRenderer(host);

        configureCamera(this.camera);
        this.control = createControls(this.camera, this.renderer.domElement);
        this.constraint = createConstraint(this.renderer, this.scene, this.tuning);
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.start();
    }

    dispose(): void {
        window.cancelAnimationFrame(this.animationFrame);
        this.resizeObserver.disconnect();
        this.pointer?.target.removeEventListener('pointermove', this.onPointerMove, true);
        this.pointer?.target.removeEventListener('pointerleave', this.clearPointer);
        this.constraint.dispose();
        this.control.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    private start(): void {
        this.resizeObserver.observe(this.host);
        this.pointer?.target.addEventListener('pointermove', this.onPointerMove, true);
        this.pointer?.target.addEventListener('pointerleave', this.clearPointer);
        this.time = Date.now();
        this.onResize();
        this.loop();
    }

    private isPointerIgnored(target: EventTarget | null): boolean {
        return target instanceof Element && target.closest(this.pointer?.options.ignoreSelector ?? '[data-constraint-ignore-pointer]') !== null;
    }

    private readonly loop = (): void => {
        const newTime = Date.now();
        this.animationFrame = window.requestAnimationFrame(this.loop);
        this.render(newTime - this.time);
        this.time = newTime;
    };

    private render(dt: number): void {
        this.applyIntroZoom(dt);
        this.updateOrbitCamera();
        this.constraint.update({ dt, pointer: this.resolvePointer() });
        this.renderer.render(this.scene, this.camera);
    }

    private applyIntroZoom(dt: number): void {
        this.initAnimation = Math.min(this.initAnimation + dt * 0.0002, 1);
        const zoomAnimation = Math.pow(this.initAnimation, 2);
        this.control.maxDistance = zoomAnimation === 1 ? 1500 : 1500 + (900 - 1500) * zoomAnimation;
    }

    private updateOrbitCamera(): void {
        this.control.update();
        this.camera.updateMatrixWorld();
    }

    private resolvePointer(): THREE.Vector3 | null {
        if (performance.now() - this.lastPointerMove >= (this.pointer?.options.idleTimeout ?? 500)) {
            return null;
        }

        this.ray.origin.setFromMatrixPosition(this.camera.matrixWorld);
        this.ray.direction.set(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.ray.origin).normalize();
        const distance = this.ray.origin.length() / Math.cos(Math.PI - this.ray.direction.angleTo(this.ray.origin));
        return this.ray.origin.add(this.ray.direction.multiplyScalar(distance * 0.9));
    }
}

function createTuning(options: ConstraintBackgroundOptions): ConstraintTuning {
    const tuning = options.tuning ?? createConstraintTuning();
    if (options.theme !== undefined) {
        tuning.appearance.lightMode = options.theme === 'light';
    }
    return tuning;
}

function createPointer(host: HTMLElement, options: false | PointerOptions | undefined): Pointer {
    if (options === false) return null;

    const pointer = options ?? {};
    return { options: pointer, target: pointer.target ?? host };
}

function createRenderer(host: HTMLElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.debug.checkShaderErrors = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    return renderer;
}

function configureCamera(camera: THREE.PerspectiveCamera): void {
    camera.position.set(0, 500, 1200).normalize().multiplyScalar(1500);
}

function createControls(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): OrbitControls {
    const control = new OrbitControls(camera, canvas);
    control.minDistance = 600;
    control.maxDistance = 1500;
    control.minPolarAngle = 0.3;
    control.maxPolarAngle = Math.PI / 2;
    control.target.y = -30;
    control.enablePan = false;
    control.update();
    return control;
}

function createConstraint(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    tuning: ConstraintTuning
): Constraint {
    return new Constraint(renderer, scene, {
        textureSize: 32,
        lineAmount: 1024 * 16,
        tuning
    });
}
