import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Constraint } from './constraint';
import { createConstraintTuning, type ConstraintTuning } from './settings';

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

export class ConstraintBackground {
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
    private readonly control: OrbitControls;
    private readonly constraint: Constraint;
    private readonly host: HTMLElement;
    private readonly tuning: ConstraintTuning;
    private readonly pointer: PointerOptions | null;
    private readonly pointerTarget: HTMLElement | null;
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
        this.tuning = options.tuning ?? createConstraintTuning();
        if (options.theme !== undefined) {
            this.tuning.appearance.lightMode = options.theme === 'light';
        }

        if (options.pointer === false) {
            this.pointer = null;
            this.pointerTarget = null;
        } else {
            const pointer = options.pointer ?? {};
            this.pointer = pointer;
            this.pointerTarget = pointer.target ?? host;
        }

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.debug.checkShaderErrors = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.enabled = true;
        host.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 500, 1200).normalize().multiplyScalar(1500);

        this.control = new OrbitControls(this.camera, this.renderer.domElement);
        this.control.minDistance = 600;
        this.control.maxDistance = 1500;
        this.control.minPolarAngle = 0.3;
        this.control.maxPolarAngle = Math.PI / 2;
        this.control.target.y = -30;
        this.control.enablePan = false;
        this.control.update();

        this.constraint = new Constraint(this.renderer, this.scene, {
            textureSize: 32,
            lineAmount: 1024 * 16,
            tuning: this.tuning
        });

        this.resizeObserver = new ResizeObserver(this.onResize);
        this.start();
    }

    dispose(): void {
        window.cancelAnimationFrame(this.animationFrame);
        this.resizeObserver.disconnect();
        this.pointerTarget?.removeEventListener('pointermove', this.onPointerMove, true);
        this.pointerTarget?.removeEventListener('pointerleave', this.clearPointer);
        this.constraint.dispose();
        this.control.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    private start(): void {
        this.resizeObserver.observe(this.host);
        this.pointerTarget?.addEventListener('pointermove', this.onPointerMove, true);
        this.pointerTarget?.addEventListener('pointerleave', this.clearPointer);
        this.time = Date.now();
        this.onResize();
        this.loop();
    }

    private isPointerIgnored(target: EventTarget | null): boolean {
        return target instanceof Element && target.closest(this.pointer?.ignoreSelector ?? '[data-constraint-ignore-pointer]') !== null;
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
        if (performance.now() - this.lastPointerMove >= (this.pointer?.idleTimeout ?? 500)) {
            return null;
        }

        this.ray.origin.setFromMatrixPosition(this.camera.matrixWorld);
        this.ray.direction.set(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.ray.origin).normalize();
        const distance = this.ray.origin.length() / Math.cos(Math.PI - this.ray.direction.angleTo(this.ray.origin));
        return this.ray.origin.add(this.ray.direction.multiplyScalar(distance * 0.9));
    }
}
