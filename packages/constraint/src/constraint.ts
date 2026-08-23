import * as THREE from 'three';
import { requireRenderer } from './renderer';
import { Environment } from './3d/environment';
import { Fbo } from './effect/simulation/fbo';
import { Lines } from './3d/lines';
import { Nodes } from './3d/nodes';
import type { ConstraintTuning } from './settings';

export interface ConstraintOptions {
    textureSize: number;
    lineAmount: number;
    tuning: ConstraintTuning;
}

export interface Frame {
    dt: number;
    pointer: Readonly<THREE.Vector3> | null;
}

export class Constraint {
    private readonly scene: THREE.Scene;
    private readonly tuning: ConstraintTuning;
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
        this.tuning = options.tuning;
        this.fbo = new Fbo(options.textureSize, rendererCapability);
        this.lines = new Lines(options.lineAmount, options.textureSize);
        this.nodes = new Nodes(options.textureSize);
        this.environment = new Environment(renderer, scene, this.tuning.appearance);
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
        const environment = this.environment.update(this.tuning.appearance);
        const positionTexture = this.fbo.update(
            frame.dt,
            this.tuning.motion.simulationSpeed,
            this.tuning.motion.constraintRatio,
            frame.pointer
        );

        this.lines.update(positionTexture, environment.lightNodesRatio, environment.lightRatio);
        this.nodes.update(positionTexture, environment.showLightNodes, environment.lightRatio);
    }
}
