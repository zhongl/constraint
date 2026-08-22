import * as THREE from "three";

export type PingPongBuffers = [
  read: THREE.WebGLRenderTarget,
  write: THREE.WebGLRenderTarget
];

export const PingPongBuffers = {
  read([r, _]: PingPongBuffers): THREE.Texture {
    return r.texture;
  },

  write(
    [r, w]: PingPongBuffers,
    output: (t: THREE.WebGLRenderTarget) => void
  ): PingPongBuffers {
    output(w);
    return [w, r];
  },

  dispose([r, w]: PingPongBuffers): void {
    r.dispose();
    w.dispose();
  },

  create(size: number): PingPongBuffers {
    const target = new THREE.WebGLRenderTarget(size, size, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    return [target, target.clone()];
  },
};
