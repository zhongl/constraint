import * as THREE from 'three';

declare const rendererCapability: unique symbol;

export type Renderer = THREE.WebGLRenderer & {
    readonly [rendererCapability]: true;
};

export function requireRenderer(renderer: THREE.WebGLRenderer): Renderer {
    if (!renderer.extensions.has('EXT_color_buffer_float')) {
        throw new Error('Constraint requires EXT_color_buffer_float');
    }
    return renderer as Renderer;
}
