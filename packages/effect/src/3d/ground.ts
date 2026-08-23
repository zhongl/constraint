import * as THREE from 'three';

export class ConstraintGround {
    readonly mesh: THREE.Mesh;

    private readonly groundDark = new THREE.Color();
    private readonly groundLight = new THREE.Color();
    private readonly material: THREE.MeshPhongMaterial;

    constructor() {
        this.material = new THREE.MeshPhongMaterial({
            color: new THREE.Color(),
            transparent: true,
            shininess: 5
        });
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 10, 10), this.material);
        this.mesh.position.y = -200;
        this.mesh.rotation.x = -1.57;
        this.mesh.castShadow = false;
        this.mesh.receiveShadow = true;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }

    update(groundDark: string, groundLight: string, lightRatio: number): void {
        this.groundDark.set(groundDark);
        this.groundLight.set(groundLight);

        this.mesh.visible = true;
        this.material.color.copy(this.groundDark).lerp(this.groundLight, lightRatio);
    }
}
