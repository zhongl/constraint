import * as THREE from 'three';
import { requireConstraintRenderer } from './ConstraintRenderer';
import { ConstraintEnvironment } from './3d/environment';
import { Fbo } from './3d/fbo';
import { ConstraintLines } from './3d/lines';
import { ConstraintNodes } from './3d/nodes';
import type { ConstraintAppearance, ConstraintMotion } from './settings';

export interface ConstraintEffectOptions {
    textureSize: number;
    lineAmount: number;
}

export interface ConstraintFrame {
    dt: number;
    pointer: Readonly<THREE.Vector3> | null;
}

export class ConstraintEffect {
    readonly motion: ConstraintMotion = {
        constraintRatio: 0.07,
        simulationSpeed: 1
    };

    readonly appearance: ConstraintAppearance = {
        showLightNodes: false,
        lightMode: false,
        backgroundDark: '#222222',
        backgroundLight: '#eeeeee',
        groundDark: '#111111',
        groundLight: '#cccccc',
        fogDensity: 0.001
    };

    private readonly scene: THREE.Scene;
    private readonly environment: ConstraintEnvironment;
    private readonly fbo: Fbo;
    private readonly lines: ConstraintLines;
    private readonly nodes: ConstraintNodes;

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
        this.environment = new ConstraintEnvironment(renderer, scene, this.appearance);
        this.scene.add(this.lines.mesh, this.nodes.mesh);
    }

    dispose(): void {
        this.scene.remove(this.lines.mesh, this.nodes.mesh);
        this.lines.dispose();
        this.nodes.dispose();
        this.fbo.dispose();
        this.environment.dispose();
    }

    update(frame: ConstraintFrame): void {
        const environment = this.environment.update(this.appearance);
        const positionTexture = this.fbo.update(
            frame.dt,
            this.motion.simulationSpeed,
            this.motion.constraintRatio,
            frame.pointer
        );

        this.lines.update(positionTexture, environment.lightNodesRatio, environment.lightRatio);
        this.nodes.update(positionTexture, environment.showLightNodes, environment.lightRatio);
    }
}
