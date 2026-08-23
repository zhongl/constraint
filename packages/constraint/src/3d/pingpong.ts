import * as THREE from "three";

export class PingPongBuffers {
  private readTarget: THREE.WebGLRenderTarget;
  private writeTarget: THREE.WebGLRenderTarget;

  constructor(size: number) {
    this.readTarget = new THREE.WebGLRenderTarget(size, size, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.writeTarget = this.readTarget.clone();
  }

  get texture(): THREE.Texture {
    return this.readTarget.texture;
  }

  write(output: (target: THREE.WebGLRenderTarget) => void): void {
    output(this.writeTarget);
    [this.readTarget, this.writeTarget] = [this.writeTarget, this.readTarget];
  }

  dispose(): void {
    this.readTarget.dispose();
    this.writeTarget.dispose();
  }
}
