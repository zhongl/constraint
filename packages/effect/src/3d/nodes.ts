import * as THREE from 'three';
import shaderParse from '../helpers/shaderParse';
import nodeVert from '../glsl/node.vert';
import nodeFrag from '../glsl/node.frag';
import * as math from '../utils/math';

type NodeUniforms = Record<string, THREE.IUniform> & {
    texturePosition: THREE.IUniform<THREE.Texture | null>;
    alpha: THREE.IUniform<number>;
};

export class ConstraintNodes {
    readonly mesh: THREE.Points;

    private readonly material: THREE.ShaderMaterial;
    private readonly uniforms: NodeUniforms;

    constructor(textureSize: number) {
        this.uniforms = createUniforms();
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: shaderParse(nodeVert),
            fragmentShader: shaderParse(nodeFrag),
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            fog: true
        });
        this.mesh = new THREE.Points(createGeometry(textureSize), this.material);
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        this.material.dispose();
    }

    update(
        positionTexture: THREE.Texture,
        visible: boolean,
        lightRatio: number
    ): void {
        this.mesh.visible = visible;
        this.uniforms.texturePosition.value = positionTexture;
        this.uniforms.alpha.value = 1 - lightRatio * 0.9;
    }
}

function createGeometry(textureSize: number): THREE.BufferGeometry {
    const amount = textureSize ** 2;
    const positions = new Float32Array(amount * 3);

    for (let i = 0; i < amount; ++i) {
        const i3 = i * 3;
        positions[i3] = (i % textureSize) / textureSize;
        positions[i3 + 1] = Math.floor(i / textureSize) / textureSize;
        positions[i3 + 2] = Math.pow(math.hash(20 + i * 31.512), 5);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
}

function createUniforms(): NodeUniforms {
    return {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        texturePosition: { value: null },
        alpha: { value: 1 }
    };
}
