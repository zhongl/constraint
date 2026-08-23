import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Constraint } from './constraint';
import type { ConstraintTuning } from './settings';

export interface ConstraintBackgroundOptions {
    tuning: ConstraintTuning;
    followTimeout: number;
    isPointerIgnored: (target: EventTarget | null) => boolean;
}

export class ConstraintBackground {
    followTimeout: number;

    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
    private readonly control: OrbitControls;
    private readonly constraint: Constraint;
    private readonly mouse = new THREE.Vector2();
    private readonly ray = new THREE.Ray();
    private readonly isPointerIgnored: (target: EventTarget | null) => boolean;

    private width = 0;
    private height = 0;
    private time = 0;
    private animationFrame = 0;
    private initAnimation = 0;
    private lastMouseMove = 0;
    private isOverIgnoredElement = false;

    private readonly onResize = (): void => {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.width, this.height);
    };

    private readonly onMouseMove = (evt: MouseEvent): void => {
        this.onMove(evt);
    };

    private readonly onTouchMove = (evt: TouchEvent): void => {
        this.onMove(evt.changedTouches[0]!);
    };

    constructor(host: HTMLElement, options: ConstraintBackgroundOptions) {
        this.followTimeout = options.followTimeout;
        this.isPointerIgnored = options.isPointerIgnored;
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
            tuning: options.tuning
        });
        this.start();
    }

    private start(): void {
        window.addEventListener('resize', this.onResize);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('touchmove', this.onTouchMove);

        this.time = Date.now();
        this.onResize();
        this.loop();
    }

    dispose(): void {
        window.cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('touchmove', this.onTouchMove);
        this.constraint.dispose();
        this.control.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    private onMove(evt: MouseEvent | Touch): void {
        this.lastMouseMove = performance.now();
        this.isOverIgnoredElement = this.isPointerIgnored(evt.target);
        this.mouse.x = (evt.pageX / this.width) * 2 - 1;
        this.mouse.y = -(evt.pageY / this.height) * 2 + 1;
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
        const isMoving = performance.now() - this.lastMouseMove < this.followTimeout;
        if (!isMoving || this.isOverIgnoredElement) {
            return null;
        }

        this.ray.origin.setFromMatrixPosition(this.camera.matrixWorld);
        this.ray.direction.set(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.ray.origin).normalize();
        const distance = this.ray.origin.length() / Math.cos(Math.PI - this.ray.direction.angleTo(this.ray.origin));
        return this.ray.origin.add(this.ray.direction.multiplyScalar(distance * 0.9));
    }
}
