import * as THREE from 'three';

export class Lights {
    readonly mesh = new THREE.Object3D();

    private readonly spot = createSpotLight();

    constructor() {
        this.mesh.add(new THREE.AmbientLight(0x999999, Math.PI), this.spot);
    }

    dispose(): void {
        this.spot.dispose();
    }
}

function createSpotLight(): THREE.SpotLight {
    const spot = new THREE.SpotLight(0xffffff, Math.PI, 0, Math.PI / 2, 1);
    spot.position.set(200, 500, 200);
    spot.target.position.set(0, 0, 0);
    spot.decay = 0;
    spot.castShadow = true;

    spot.shadow.camera.near = 100;
    spot.shadow.camera.far = 2500;
    spot.shadow.focus = 0.5;
    spot.shadow.bias = 0;
    spot.shadow.mapSize.set(1024, 2048);
    return spot;
}
