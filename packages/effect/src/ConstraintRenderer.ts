import * as THREE from 'three';

declare const constraintRenderer: unique symbol;

export type ConstraintRenderer = THREE.WebGLRenderer & {
    readonly [constraintRenderer]: true;
};

export function requireConstraintRenderer(renderer: THREE.WebGLRenderer): ConstraintRenderer {
    if (!renderer.extensions.has('EXT_color_buffer_float')) {
        throw new Error('ConstraintEffect requires EXT_color_buffer_float');
    }
    return renderer as ConstraintRenderer;
}
