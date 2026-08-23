import * as THREE from 'three';
import shaderParse from '../../three/shader-source';
import linesVert from './lines.vert';
import linesFrag from './lines.frag';
import lineDepthVert from './lineDepth.vert';
import lineDepthFrag from './lineDepth.frag';
import { hash } from './hash';

type LineUniforms = Record<string, THREE.IUniform> & {
    texturePosition: THREE.IUniform<THREE.Texture | null>;
    lightNodesRatio: THREE.IUniform<number>;
    lightRatio: THREE.IUniform<number>;
};

export class Lines {
    readonly mesh: THREE.LineSegments;

    private readonly material: THREE.ShaderMaterial;
    private readonly depthMaterial: THREE.ShaderMaterial;
    private readonly uniforms: LineUniforms;

    constructor(lineAmount: number, textureSize: number) {
        this.uniforms = createUniforms();
        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: shaderParse(linesVert),
            fragmentShader: shaderParse(linesFrag),
            linewidth: 1,
            blending: THREE.NoBlending,
            lights: true,
            fog: true
        });
        this.depthMaterial = new THREE.ShaderMaterial({
            uniforms: { texturePosition: this.uniforms.texturePosition },
            vertexShader: shaderParse(lineDepthVert),
            fragmentShader: shaderParse(lineDepthFrag),
            depthTest: true,
            depthWrite: true
        });
        this.mesh = new THREE.LineSegments(createGeometry(lineAmount, textureSize), this.material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.frustumCulled = false;
        this.mesh.customDepthMaterial = this.depthMaterial;
    }

    dispose(): void {
        this.mesh.geometry.dispose();
        this.material.dispose();
        this.depthMaterial.dispose();
    }

    update(positionTexture: THREE.Texture, lightNodesRatio: number, lightRatio: number): void {
        this.uniforms.texturePosition.value = positionTexture;
        this.uniforms.lightNodesRatio.value = lightNodesRatio;
        this.uniforms.lightRatio.value = lightRatio;
    }
}

function createGeometry(lineAmount: number, textureSize: number): THREE.BufferGeometry {
    const particleAmount = textureSize ** 2;
    const positions = new Float32Array(lineAmount * 2 * 3);

    for (let i = 0; i < lineAmount; ++i) {
        const i6 = i * 6;
        const indexA = i % particleAmount;
        positions[i6] = (indexA % textureSize) / textureSize;
        positions[i6 + 1] = Math.floor(indexA / textureSize) / textureSize;
        positions[i6 + 2] = -1;

        let indexB = Math.floor(hash(i * 100.0) * particleAmount);
        if (indexB === indexA) indexB = (indexB + 1) % particleAmount;
        positions[i6 + 3] = (indexB % textureSize) / textureSize;
        positions[i6 + 4] = Math.floor(indexB / textureSize) / textureSize;
        positions[i6 + 5] = 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
}

function createUniforms(): LineUniforms {
    return {
        ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog, THREE.UniformsLib.lights]),
        texturePosition: { value: null },
        lightNodesRatio: { value: 1 },
        lightRatio: { value: 1 }
    };
}
