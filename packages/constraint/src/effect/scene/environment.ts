import * as THREE from 'three';
import type { Appearance } from '../../settings';
import { Ground } from './ground';
import { Lights } from './lights';

export class Environment {
    private readonly previousFog: THREE.Fog | THREE.FogExp2 | null;
    private readonly previousClearColor: THREE.Color;
    private readonly previousClearAlpha: number;
    private readonly fog: THREE.FogExp2;
    private readonly backgroundDark = new THREE.Color();
    private readonly backgroundLight = new THREE.Color();
    private readonly ground = new Ground();
    private readonly lights = new Lights();

    private lightRatio = 0;
    private lightNodesRatio = 0;

    constructor(
        private readonly renderer: THREE.WebGLRenderer,
        private readonly scene: THREE.Scene,
        appearance: Appearance
    ) {
        this.previousFog = scene.fog;
        this.previousClearColor = renderer.getClearColor(new THREE.Color());
        this.previousClearAlpha = renderer.getClearAlpha();
        this.fog = new THREE.FogExp2(appearance.backgroundDark, appearance.fogDensity);
        this.scene.fog = this.fog;
        this.scene.add(this.lights.mesh, this.ground.mesh);
    }

    update(appearance: Appearance): EnvironmentFrame {
        this.lightRatio += ((appearance.lightMode ? 1 : 0) - this.lightRatio) * 0.2;
        this.lightNodesRatio += ((appearance.showLightNodes ? 1 : 0) - this.lightNodesRatio) * 0.1;

        this.backgroundDark.set(appearance.backgroundDark);
        this.backgroundLight.set(appearance.backgroundLight);
        this.fog.color.copy(this.backgroundDark).lerp(this.backgroundLight, this.lightRatio);
        this.fog.density = appearance.fogDensity;
        this.renderer.setClearColor(this.fog.color.getHex());
        this.ground.update(appearance.groundDark, appearance.groundLight, this.lightRatio);

        return {
            lightRatio: this.lightRatio,
            lightNodesRatio: this.lightNodesRatio,
            showLightNodes: appearance.showLightNodes
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

export interface EnvironmentFrame {
    lightRatio: number;
    lightNodesRatio: number;
    showLightNodes: boolean;
}
