import * as THREE from "three";
import shaderParse from "../helpers/shaderParse";
import fboVert from "../glsl/fbo.vert";
import fboThroughFrag from "../glsl/fboThrough.frag";
import velocityFrag from "../glsl/velocity.frag";
import positionFrag from "../glsl/position.frag";

const defaultMouse3d = new THREE.Vector3(0, 0, -9999);

declare const fboRenderer: unique symbol;

export type FboRenderer = THREE.WebGLRenderer & {
  readonly [fboRenderer]: true;
};

export class UnsupportedWebGLCapabilityError extends Error {
  constructor(capability: string) {
    super(`FBO requires ${capability}`);
    this.name = "UnsupportedWebGLCapabilityError";
  }
}

function assertFboCapability(capability: string, supported: boolean): void {
  if (!supported) {
    throw new UnsupportedWebGLCapabilityError(capability);
  }
}

export function assertFboRenderer(
  renderer: THREE.WebGLRenderer,
): asserts renderer is FboRenderer {
  const gl = renderer.getContext();
  assertFboCapability(
    "MAX_VERTEX_TEXTURE_IMAGE_UNITS",
    !!gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
  );

  const extensions = renderer.capabilities.isWebGL2
    ? ["EXT_color_buffer_float"]
    : ["OES_texture_float", "WEBGL_color_buffer_float"];
  for (const extension of extensions) {
    assertFboCapability(extension, !!gl.getExtension(extension));
  }
}

class FboPassRenderer {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.Material>;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.mesh);
  }

  render(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget,
  ): void {
    this.mesh.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
  }
}

export class Fbo {
  readonly textureSize: number;
  readonly amount: number;

  private _copyShader!: THREE.ShaderMaterial;
  private _velocityShader!: THREE.ShaderMaterial;
  private _positionShader!: THREE.ShaderMaterial;
  private _velocityRenderTarget!: THREE.WebGLRenderTarget;
  private _velocityRenderTarget2!: THREE.WebGLRenderTarget;
  private _positionRenderTarget!: THREE.WebGLRenderTarget;
  private _positionRenderTarget2!: THREE.WebGLRenderTarget;
  private _passRenderer!: FboPassRenderer;
  private _time = 0;

  constructor(textureSize: number) {
    this.textureSize = textureSize;
    this.amount = textureSize * textureSize;
  }

  init(renderer: FboRenderer): void {
    const square = this.squareVector(this.textureSize);
    this._copyShader = new THREE.ShaderMaterial({
      uniforms: {
        resolution: {
          value: square,
        },
        inputTexture: { value: null },
      },
      vertexShader: shaderParse(fboVert),
      fragmentShader: shaderParse(fboThroughFrag),
    });

    this._velocityShader = new THREE.ShaderMaterial({
      uniforms: {
        resolution: {
          value: new THREE.Vector2(this.textureSize, this.textureSize),
        },
        mouse3d: { value: new THREE.Vector3() },
        texturePosition: { value: null },
        textureVelocity: { value: null },
        constraintRatio: { value: 0 },
        delta: { value: 1 },
        time: { value: 0 },
      },
      vertexShader: shaderParse(fboVert),
      fragmentShader: shaderParse(velocityFrag),
      blending: THREE.NoBlending,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    });

    this._positionShader = new THREE.ShaderMaterial({
      uniforms: {
        resolution: {
          value: new THREE.Vector2(this.textureSize, this.textureSize),
        },
        texturePosition: { value: null },
        textureVelocity: { value: null },
        delta: { value: 1 },
        time: { value: 0 },
      },
      vertexShader: shaderParse(fboVert),
      fragmentShader: shaderParse(positionFrag),
      blending: THREE.NoBlending,
      transparent: false,
      depthWrite: false,
      depthTest: false,
    });

    this._passRenderer = new FboPassRenderer(renderer);

    this._velocityRenderTarget = this.createRenderTarget(this.textureSize);
    this._velocityRenderTarget2 = this._velocityRenderTarget.clone();
    const velocityTexture = this.createVelocityTexture(this.textureSize);
    this.copyTexture(velocityTexture, this._velocityRenderTarget);
    this.copyTexture(
      this._velocityRenderTarget.texture,
      this._velocityRenderTarget2,
    );
    velocityTexture.dispose();

    this._positionRenderTarget = this.createRenderTarget(this.textureSize);
    this._positionRenderTarget2 = this._positionRenderTarget.clone();
    const positionTexture = this.createPositionTexture(this.textureSize);
    this.copyTexture(positionTexture, this._positionRenderTarget);
    this.copyTexture(
      this._positionRenderTarget.texture,
      this._positionRenderTarget2,
    );
    positionTexture.dispose();

  }

  private squareVector(size: number) {
    return new THREE.Vector2(size, size);
  }

  update(
    dt: number,
    simulationSpeed: number,
    constraintRatio: number,
    mouse3d: THREE.Vector3 | null,
  ): THREE.Texture {
    const delta = (Math.min(dt, 50) / (1000 / 60)) * simulationSpeed;

    this._time += dt;

    this._velocityShader.uniforms.delta!.value = delta;
    this._positionShader.uniforms.delta!.value = delta;

    const mouse3dUniformValue = this._velocityShader.uniforms.mouse3d!.value;
    mouse3dUniformValue.copy(mouse3d ?? defaultMouse3d);

    this._velocityShader.uniforms.constraintRatio!.value = constraintRatio;
    // vt = velocity.update(pt, constraintRatio, time, delta, mouse3d)
    // pt = position.update(vt, time, delta)
    this._updateVelocity();
    this._updatePosition();

    return this._positionRenderTarget.texture;
  }

  dispose(): void {
    this._velocityRenderTarget.dispose();
    this._velocityRenderTarget2.dispose();
    this._positionRenderTarget.dispose();
    this._positionRenderTarget2.dispose();
    this._copyShader.dispose();
    this._velocityShader.dispose();
    this._positionShader.dispose();
    this._passRenderer.dispose();
  }

  private createRenderTarget(size: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(size, size, {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
  }

  private _updateVelocity(): void {
    const tmp = this._velocityRenderTarget;
    this._velocityRenderTarget = this._velocityRenderTarget2;
    this._velocityRenderTarget2 = tmp;

    this._velocityShader.uniforms.time!.value = this._time;
    this._velocityShader.uniforms.textureVelocity!.value =
      this._velocityRenderTarget2.texture;
    this._velocityShader.uniforms.texturePosition!.value =
      this._positionRenderTarget.texture;
    this._passRenderer.render(
      this._velocityShader,
      this._velocityRenderTarget,
    );
  }

  private _updatePosition(): void {
    const tmp = this._positionRenderTarget;
    this._positionRenderTarget = this._positionRenderTarget2;
    this._positionRenderTarget2 = tmp;

    this._positionShader.uniforms.time!.value = this._time;
    this._positionShader.uniforms.textureVelocity!.value =
      this._velocityRenderTarget.texture;
    this._positionShader.uniforms.texturePosition!.value =
      this._positionRenderTarget2.texture;
    this._passRenderer.render(
      this._positionShader,
      this._positionRenderTarget,
    );
  }

  private copyTexture(
    input: THREE.Texture,
    output: THREE.WebGLRenderTarget,
  ): void {
    this._copyShader.uniforms.inputTexture!.value = input;
    this._passRenderer.render(this._copyShader, output);
  }

  private createVelocityTexture(size: number): THREE.DataTexture {
    return this.squareTexture(size, this.velocitySquare);
  }

  private velocitySquare(size: number): Float32Array {
    const a = new Float32Array(size * size * 4);
    for (let i = 0, len = a.length; i < len; i += 4) {
      a[i] = 0;
      a[i + 1] = 0;
      a[i + 2] = 0;
      a[i + 3] = ((~~(i / 4) % size) + 1) % size;
    }
    return a;
  }

  private createPositionTexture(size: number): THREE.DataTexture {
    return this.squareTexture(size, this.positionSquare);
  }

  private positionSquare(size: number): Float32Array {
    const a = new Float32Array(size * size * 4);
    for (let i = 0, len = a.length; i < len; i += 4) {
      a[i] = (Math.random() - 0.5) * 1;
      a[i + 1] = (Math.random() - 0.5) * 1;
      a[i + 2] = (Math.random() - 0.5) * 1;
    }
    return a;
  }

  private squareTexture(
    size: number,
    data: (size: number) => Float32Array,
  ): THREE.DataTexture {
    const texture = new THREE.DataTexture(
      data(size),
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType,
    );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    return texture;
  }
}
