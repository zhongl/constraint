import * as THREE from 'three';
import { requireConstraintRenderer, type ConstraintRenderer } from './ConstraintRenderer';
import { Fbo } from './3d/fbo';
import { ConstraintGround } from './3d/ground';
import { ConstraintLights } from './3d/lights';
import { ConstraintLines } from './3d/lines';
import { ConstraintNodes } from './3d/nodes';

export interface ConstraintEffectOptions {
    textureSize: number;
    lineAmount: number;
}

export class ConstraintEffect {
    private readonly _renderer: ConstraintRenderer;
    private readonly _scene: THREE.Scene;
    private readonly _previousFog: THREE.Fog | THREE.FogExp2 | null;
    private readonly _previousClearColor: THREE.Color;
    private readonly _previousClearAlpha: number;
    private readonly _fog: THREE.FogExp2;
    private readonly _backgroundDark = new THREE.Color();
    private readonly _backgroundLight = new THREE.Color();
    private readonly _fbo: Fbo;
    private readonly _lines: ConstraintLines;
    private readonly _nodes: ConstraintNodes;
    private readonly _ground: ConstraintGround;
    private readonly _lights: ConstraintLights;

    private _constraintRatio = 0.07;
    private _simulationSpeed = 1;
    private _followPointer = false;
    private _useLightNodes = false;
    private _isLight = false;
    private _lightRatio = 0;
    private _lightNodesRatio = 0;
    private _backgroundDarkValue = '#222222';
    private _backgroundLightValue = '#eeeeee';
    private _groundDarkValue = '#111111';
    private _groundLightValue = '#cccccc';
    private _fogDensity = 0.001;

    constructor(
        renderer: THREE.WebGLRenderer,
        scene: THREE.Scene,
        options: ConstraintEffectOptions
    ) {
        this._renderer = requireConstraintRenderer(renderer);
        this._scene = scene;
        this._previousFog = scene.fog;
        this._previousClearColor = renderer.getClearColor(new THREE.Color());
        this._previousClearAlpha = renderer.getClearAlpha();
        this._fog = new THREE.FogExp2(this._backgroundDarkValue, this._fogDensity);
        this._fbo = new Fbo(options.textureSize, this._renderer);
        this._lights = new ConstraintLights();
        this._lines = new ConstraintLines(options.lineAmount, options.textureSize);
        this._nodes = new ConstraintNodes(options.textureSize);
        this._ground = new ConstraintGround();

        this._scene.fog = this._fog;
        this._scene.add(this._lights.mesh, this._lines.mesh, this._nodes.mesh, this._ground.mesh);
    }

    get constraintRatio(): number { return this._constraintRatio; }
    set constraintRatio(value: number) { this._constraintRatio = value; }

    get simulationSpeed(): number { return this._simulationSpeed; }
    set simulationSpeed(value: number) { this._simulationSpeed = value; }

    get followPointer(): boolean { return this._followPointer; }
    set followPointer(value: boolean) { this._followPointer = value; }

    get useLightNodes(): boolean { return this._useLightNodes; }
    set useLightNodes(value: boolean) { this._useLightNodes = value; }

    get isLight(): boolean { return this._isLight; }
    set isLight(value: boolean) { this._isLight = value; }

    get backgroundDark(): string { return this._backgroundDarkValue; }
    set backgroundDark(value: string) { this._backgroundDarkValue = value; }

    get backgroundLight(): string { return this._backgroundLightValue; }
    set backgroundLight(value: string) { this._backgroundLightValue = value; }

    get groundDark(): string { return this._groundDarkValue; }
    set groundDark(value: string) { this._groundDarkValue = value; }

    get groundLight(): string { return this._groundLightValue; }
    set groundLight(value: string) { this._groundLightValue = value; }

    get fogDensity(): number { return this._fogDensity; }
    set fogDensity(value: number) { this._fogDensity = value; }

    dispose(): void {
        this._scene.remove(this._lights.mesh, this._lines.mesh, this._nodes.mesh, this._ground.mesh);
        this._lights.dispose();
        this._lines.dispose();
        this._nodes.dispose();
        this._ground.dispose();
        this._fbo.dispose();
        this._scene.fog = this._previousFog;
        this._renderer.setClearColor(this._previousClearColor, this._previousClearAlpha);
    }

    update(dt: number, mouse3d: Readonly<THREE.Vector3>): void {
        this._lightRatio += ((this._isLight ? 1 : 0) - this._lightRatio) * 0.2;
        this._lightNodesRatio += ((this._useLightNodes ? 1 : 0) - this._lightNodesRatio) * 0.1;

        this._backgroundDark.set(this._backgroundDarkValue);
        this._backgroundLight.set(this._backgroundLightValue);
        this._fog.color.copy(this._backgroundDark).lerp(this._backgroundLight, this._lightRatio);
        this._fog.density = this._fogDensity;
        this._renderer.setClearColor(this._fog.color.getHex());

        const positionTexture = this._fbo.update(
            dt,
            this._simulationSpeed,
            this._constraintRatio,
            this._followPointer ? mouse3d : null
        );

        this._lines.update(positionTexture, this._lightNodesRatio, this._lightRatio);
        this._nodes.update(positionTexture, this._useLightNodes, this._lightRatio);
        this._ground.update(this._groundDarkValue, this._groundLightValue, this._lightRatio);
    }
}
