import './styles/normalize.css';
import './styles/index.css';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Constraint, createConstraintTuning } from '@constraint/effect';

class App {
    followTimeout = 500;

    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(45, 1, 1, 3000);
    private readonly control: OrbitControls;
    private readonly tuning = createConstraintTuning();
    private readonly constraint: Constraint;
    private readonly gui: GUI;
    private readonly mouse = new THREE.Vector2();
    private readonly ray = new THREE.Ray();

    private width = 0;
    private height = 0;
    private time = 0;
    private animationFrame = 0;
    private initAnimation = 0;
    private lastMouseMove = 0;
    private isOverControls = false;

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

    private readonly onKeyUp = (evt: KeyboardEvent): void => {
        if (evt.key === ' ') {
            this.tuning.appearance.lightMode = !this.tuning.appearance.lightMode;
        }
    };

    constructor() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.debug.checkShaderErrors = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

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

        this.gui = this.createGui();
    }

    start(): void {
        window.addEventListener('resize', this.onResize);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('touchmove', this.onTouchMove);
        document.addEventListener('keyup', this.onKeyUp);

        this.time = Date.now();
        this.onResize();
        this.loop();
    }

    dispose(): void {
        window.cancelAnimationFrame(this.animationFrame);
        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('touchmove', this.onTouchMove);
        document.removeEventListener('keyup', this.onKeyUp);
        this.gui.destroy();
        this.constraint.dispose();
        this.control.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    private createGui(): GUI {
        const gui = new GUI();
        const linesGui = gui.addFolder('Motion');
        linesGui.add(this.tuning.motion, 'constraintRatio', 0, 0.15).name('constraint ratio');
        linesGui.add(this.tuning.motion, 'simulationSpeed', 0, 3).name('simulation speed');
        linesGui.add(this, 'followTimeout', 100, 1000, 10).name('follow timeout (ms)');

        const envGui = gui.addFolder('Rendering');
        envGui.add(this.tuning.appearance, 'showLightNodes').name('light nodes');
        envGui.add(this.tuning.appearance, 'lightMode').name('light mode').listen();
        envGui.addColor(this.tuning.appearance, 'backgroundDark').name('background dark');
        envGui.addColor(this.tuning.appearance, 'backgroundLight').name('background light');
        envGui.addColor(this.tuning.appearance, 'groundDark').name('ground dark');
        envGui.addColor(this.tuning.appearance, 'groundLight').name('ground light');
        envGui.add(this.tuning.appearance, 'fogDensity', 0, 0.01).name('fog density');

        const preventDefault = (evt: KeyboardEvent) => {
            evt.preventDefault();
            (evt.currentTarget as HTMLElement).blur();
        };
        Array.prototype.forEach.call(gui.domElement.querySelectorAll('input[type="checkbox"],select'), function(elem: HTMLInputElement | HTMLSelectElement) {
            elem.onkeyup = elem.onkeydown = preventDefault;
            elem.style.color = '#000';
        });

        if (window.screen.width > 480) {
            linesGui.open();
            envGui.open();
        }

        return gui;
    }

    private onMove(evt: MouseEvent | Touch): void {
        this.lastMouseMove = performance.now();
        this.isOverControls = evt.target instanceof Element && evt.target.closest('.lil-gui') !== null;

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
        const isMoving = performance.now() - this.lastMouseMove < this.followTimeout;
        const pointer = isMoving && !this.isOverControls ? this.ray.origin : null;

        this.initAnimation = Math.min(this.initAnimation + dt * 0.0002, 1);
        const zoomAnimation = Math.pow(this.initAnimation, 2);

        this.control.maxDistance = zoomAnimation === 1 ? 1500 : 1500 + (900 - 1500) * zoomAnimation;
        this.control.update();

        this.camera.updateMatrixWorld();
        this.ray.origin.setFromMatrixPosition(this.camera.matrixWorld);
        this.ray.direction.set(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera).sub(this.ray.origin).normalize();
        const distance = this.ray.origin.length() / Math.cos(Math.PI - this.ray.direction.angleTo(this.ray.origin));
        this.ray.origin.add(this.ray.direction.multiplyScalar(distance * 0.9));
        this.constraint.update({ dt, pointer });

        this.renderer.render(this.scene, this.camera);

        document.documentElement.classList.toggle('is-light', this.tuning.appearance.lightMode);
    }
}

function showInitializationError(error: Error): void {
    document.body.innerHTML = `<main class="compatibility-message"><h1>无法运行此实验</h1><p>${error.message}</p><p>请尝试使用最新版 Chrome、Safari 或 Firefox，并开启硬件加速。</p></main>`;
}

function main(): void {
    try {
        new App().start();
    } catch (error) {
        console.error(error);
        showInitializationError(error as Error);
    }
}

main();
