import * as THREE from 'three';
import { ConstraintGround } from './ground';
import { ConstraintLights } from './lights';

export class ConstraintEnvironment {
    private readonly previousFog: THREE.Fog | THREE.FogExp2 | null;
    private readonly previousClearColor: THREE.Color;
    private readonly previousClearAlpha: number;
    private readonly fog = new THREE.FogExp2('#222222', 0.001);
    private readonly backgroundDark = new THREE.Color();
    private readonly backgroundLight = new THREE.Color();
    private readonly ground = new ConstraintGround();
    private readonly lights = new ConstraintLights();

    private lightRatio = 0;
    private lightNodesRatio = 0;
    private _useLightNodes = false;
    private _isLight = false;
    private _backgroundDark = '#222222';
    private _backgroundLight = '#eeeeee';
    private _groundDark = '#111111';
    private _groundLight = '#cccccc';
    private _fogDensity = 0.001;

    constructor(
        private readonly renderer: THREE.WebGLRenderer,
        private readonly scene: THREE.Scene
    ) {
        this.previousFog = scene.fog;
        this.previousClearColor = renderer.getClearColor(new THREE.Color());
        this.previousClearAlpha = renderer.getClearAlpha();
        this.scene.fog = this.fog;
        this.scene.add(this.lights.mesh, this.ground.mesh);
    }

    get useLightNodes(): boolean { return this._useLightNodes; }
    set useLightNodes(value: boolean) { this._useLightNodes = value; }

    get isLight(): boolean { return this._isLight; }
    set isLight(value: boolean) { this._isLight = value; }

    get backgroundDarkValue(): string { return this._backgroundDark; }
    set backgroundDarkValue(value: string) { this._backgroundDark = value; }

    get backgroundLightValue(): string { return this._backgroundLight; }
    set backgroundLightValue(value: string) { this._backgroundLight = value; }

    get groundDarkValue(): string { return this._groundDark; }
    set groundDarkValue(value: string) { this._groundDark = value; }

    get groundLightValue(): string { return this._groundLight; }
    set groundLightValue(value: string) { this._groundLight = value; }

    get fogDensity(): number { return this._fogDensity; }
    set fogDensity(value: number) { this._fogDensity = value; }

    update(): ConstraintEnvironmentFrame {
        this.lightRatio += ((this._isLight ? 1 : 0) - this.lightRatio) * 0.2;
        this.lightNodesRatio += ((this._useLightNodes ? 1 : 0) - this.lightNodesRatio) * 0.1;

        this.backgroundDark.set(this._backgroundDark);
        this.backgroundLight.set(this._backgroundLight);
        this.fog.color.copy(this.backgroundDark).lerp(this.backgroundLight, this.lightRatio);
        this.fog.density = this._fogDensity;
        this.renderer.setClearColor(this.fog.color.getHex());
        this.ground.update(this._groundDark, this._groundLight, this.lightRatio);

        return {
            lightRatio: this.lightRatio,
            lightNodesRatio: this.lightNodesRatio,
            showLightNodes: this._useLightNodes
        };
    }

    dispose(): void {
        this.scene.remove(this.lights.mesh, this.ground.mesh);
        this.lights.dispose();
        this.ground.dispose();
        this.scene.fog = this.previousFog;
        this.renderer.setClearColor(this.previousClearColor, this.previousClearAlpha);
    }
}

export interface ConstraintEnvironmentFrame {
    lightRatio: number;
    lightNodesRatio: number;
    showLightNodes: boolean;
}
