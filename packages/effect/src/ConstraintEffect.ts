import * as THREE from 'three';
import { requireConstraintRenderer } from './ConstraintRenderer';
import { ConstraintEnvironment } from './3d/environment';
import { Fbo } from './3d/fbo';
import { ConstraintLines } from './3d/lines';
import { ConstraintNodes } from './3d/nodes';

export interface ConstraintEffectOptions {
    textureSize: number;
    lineAmount: number;
}

export interface ConstraintFrame {
    dt: number;
    pointer: Readonly<THREE.Vector3> | null;
}

export class ConstraintEffect {
    private readonly scene: THREE.Scene;
    private readonly environment: ConstraintEnvironment;
    private readonly fbo: Fbo;
    private readonly lines: ConstraintLines;
    private readonly nodes: ConstraintNodes;

    private constraintRatioValue = 0.07;
    private simulationSpeedValue = 1;

    constructor(
        renderer: THREE.WebGLRenderer,
        scene: THREE.Scene,
        options: ConstraintEffectOptions
    ) {
        const constraintRenderer = requireConstraintRenderer(renderer);
        this.scene = scene;
        this.fbo = new Fbo(options.textureSize, constraintRenderer);
        this.lines = new ConstraintLines(options.lineAmount, options.textureSize);
        this.nodes = new ConstraintNodes(options.textureSize);
        this.environment = new ConstraintEnvironment(renderer, scene);
        this.scene.add(this.lines.mesh, this.nodes.mesh);
    }

    get constraintRatio(): number { return this.constraintRatioValue; }
    set constraintRatio(value: number) { this.constraintRatioValue = value; }

    get simulationSpeed(): number { return this.simulationSpeedValue; }
    set simulationSpeed(value: number) { this.simulationSpeedValue = value; }

    get useLightNodes(): boolean { return this.environment.useLightNodes; }
    set useLightNodes(value: boolean) { this.environment.useLightNodes = value; }

    get isLight(): boolean { return this.environment.isLight; }
    set isLight(value: boolean) { this.environment.isLight = value; }

    get backgroundDark(): string { return this.environment.backgroundDarkValue; }
    set backgroundDark(value: string) { this.environment.backgroundDarkValue = value; }

    get backgroundLight(): string { return this.environment.backgroundLightValue; }
    set backgroundLight(value: string) { this.environment.backgroundLightValue = value; }

    get groundDark(): string { return this.environment.groundDarkValue; }
    set groundDark(value: string) { this.environment.groundDarkValue = value; }

    get groundLight(): string { return this.environment.groundLightValue; }
    set groundLight(value: string) { this.environment.groundLightValue = value; }

    get fogDensity(): number { return this.environment.fogDensity; }
    set fogDensity(value: number) { this.environment.fogDensity = value; }

    dispose(): void {
        this.scene.remove(this.lines.mesh, this.nodes.mesh);
        this.lines.dispose();
        this.nodes.dispose();
        this.fbo.dispose();
        this.environment.dispose();
    }

    update(frame: ConstraintFrame): void {
        const environment = this.environment.update();
        const positionTexture = this.fbo.update(
            frame.dt,
            this.simulationSpeedValue,
            this.constraintRatioValue,
            frame.pointer
        );

        this.lines.update(positionTexture, environment.lightNodesRatio, environment.lightRatio);
        this.nodes.update(positionTexture, environment.showLightNodes, environment.lightRatio);
    }
}
