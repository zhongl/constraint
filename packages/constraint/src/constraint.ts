import * as THREE from 'three';
import { requireRenderer } from './renderer';
import { Environment } from './3d/environment';
import { Fbo } from './3d/fbo';
import { Lines } from './3d/lines';
import { Nodes } from './3d/nodes';
import type { Appearance, Motion } from './settings';

export interface ConstraintOptions {
    textureSize: number;
    lineAmount: number;
}

export interface Frame {
    dt: number;
    pointer: Readonly<THREE.Vector3> | null;
}

export class Constraint {
    readonly motion: Motion = {
        constraintRatio: 0.07,
        simulationSpeed: 1
    };

    readonly appearance: Appearance = {
        showLightNodes: false,
        lightMode: false,
        backgroundDark: '#222222',
        backgroundLight: '#eeeeee',
        groundDark: '#111111',
        groundLight: '#cccccc',
        fogDensity: 0.001
    };

    private readonly scene: THREE.Scene;
    private readonly environment: Environment;
    private readonly fbo: Fbo;
    private readonly lines: Lines;
    private readonly nodes: Nodes;

    constructor(
        renderer: THREE.WebGLRenderer,
        scene: THREE.Scene,
        options: ConstraintOptions
    ) {
        const rendererCapability = requireRenderer(renderer);
        this.scene = scene;
        this.fbo = new Fbo(options.textureSize, rendererCapability);
        this.lines = new Lines(options.lineAmount, options.textureSize);
        this.nodes = new Nodes(options.textureSize);
        this.environment = new Environment(renderer, scene, this.appearance);
        this.scene.add(this.lines.mesh, this.nodes.mesh);
    }

    dispose(): void {
        this.scene.remove(this.lines.mesh, this.nodes.mesh);
        this.lines.dispose();
        this.nodes.dispose();
        this.fbo.dispose();
        this.environment.dispose();
    }

    update(frame: Frame): void {
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
