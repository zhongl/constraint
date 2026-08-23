import * as THREE from "three";
import type { ConstraintRenderer } from "../ConstraintRenderer";
import shaderParse from "../helpers/shaderParse";
import fboVert from "../glsl/fbo.vert";
import fboThroughFrag from "../glsl/fboThrough.frag";
import velocityFrag from "../glsl/velocity.frag";
import positionFrag from "../glsl/position.frag";
import { PingPongBuffers } from "./pingpong";

export class Fbo {
  readonly textureSize: number;
  readonly amount: number;

  private readonly velocityBuffers: PingPongBuffers;
  private readonly positionBuffers: PingPongBuffers;

  private readonly velocity: Velocity;
  private readonly position: Position;
  private readonly geometry: THREE.PlaneGeometry;

  constructor(textureSize: number, renderer: ConstraintRenderer) {
    this.textureSize = textureSize;
    this.amount = textureSize * textureSize;
    this.velocityBuffers = new PingPongBuffers(textureSize);
    this.positionBuffers = new PingPongBuffers(textureSize);
    this.geometry = new THREE.PlaneGeometry(2, 2);
    const pass = new Pass(this.geometry, renderer);
    const copy = new Copy(pass);

    this.velocityBuffers.write(copy.render(squareTexture(textureSize, velocity)));
    this.positionBuffers.write(copy.render(squareTexture(textureSize, position)));

    copy.dispose();

    this.velocity = new Velocity(new THREE.Vector3(0, 0, -9999), pass);
    this.position = new Position(pass);
  }

  update(dt: number, simulationSpeed: number, constraintRatio: number, mouse3d: THREE.Vector3 | null): THREE.Texture {
    const delta = (Math.min(dt, 50) / (1000 / 60)) * simulationSpeed;

    const texturePosition = this.positionBuffers.texture;
    let textureVelocity = this.velocityBuffers.texture;
    this.velocityBuffers.write(
      this.velocity.render({
        delta,
        constraintRatio,
        mouse3d,
        textureVelocity,
        texturePosition,
      }),
    );

    textureVelocity = this.velocityBuffers.texture;

    this.positionBuffers.write(this.position.render({ delta, textureVelocity, texturePosition }));

    return this.positionBuffers.texture;
  }

  dispose(): void {
    this.geometry.dispose();
    this.velocity.dispose();
    this.position.dispose();
    this.velocityBuffers.dispose();
    this.positionBuffers.dispose();
  }
}

type Render = (target: THREE.WebGLRenderTarget) => void;

type InputUniforms<T extends object> = {
  [K in keyof T]: THREE.IUniform<T[K] | null>;
};

type ComputeUniforms<T extends object> = InputUniforms<T> & {
  resolution: THREE.IUniform<THREE.Vector2>;
};

function setUniforms<T extends object>(uniforms: InputUniforms<T>, input: T): void {
  for (const key of Object.keys(input) as (keyof T)[]) {
    uniforms[key].value = input[key];
  }
}

class Pass {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.Camera;
  private readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.Material>;

  constructor(
    private readonly geometry: THREE.PlaneGeometry,
    private readonly renderer: THREE.WebGLRenderer,
  ) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    this.camera.position.z = 1;
    this.mesh = new THREE.Mesh(this.geometry);
    this.scene.add(this.mesh);
  }

  apply(shader: THREE.ShaderMaterial): Render {
    return (target) => {
      shader.uniforms.resolution!.value.set(target.width, target.height);
      this.mesh.material = shader;
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
    };
  }
}

interface ComputeShader<T> {
  render(input: T): Render;

  dispose(): void;
}

class Copy implements ComputeShader<THREE.Texture> {
  constructor(private readonly pass: Pass) {}

  render(inputTexture: THREE.Texture): Render {
    return (target) => {
      this.shader.uniforms.inputTexture!.value = inputTexture;
      this.pass.apply(this.shader)(target);
    };
  }

  private readonly shader = new THREE.ShaderMaterial({
    uniforms: {
      resolution: { value: new THREE.Vector2() },
      inputTexture: { value: null },
    },
    vertexShader: shaderParse(fboVert),
    fragmentShader: shaderParse(fboThroughFrag),
  });

  dispose(): void {
    this.shader.dispose();
  }
}

type VelocityInput = {
  delta: number;
  constraintRatio: number;
  mouse3d: THREE.Vector3 | null;
  textureVelocity: THREE.Texture;
  texturePosition: THREE.Texture;
};

type VelocityUniformInput = Omit<VelocityInput, "mouse3d">;

class Velocity implements ComputeShader<VelocityInput> {
  private readonly uniforms: ComputeUniforms<VelocityUniformInput> & {
    mouse3d: THREE.IUniform<THREE.Vector3>;
  } = {
    resolution: { value: new THREE.Vector2() },
    mouse3d: { value: new THREE.Vector3() },
    texturePosition: { value: null },
    textureVelocity: { value: null },
    constraintRatio: { value: 0 },
    delta: { value: 1 },
  };

  private readonly shader = new THREE.ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: shaderParse(fboVert),
    fragmentShader: shaderParse(velocityFrag),
    blending: THREE.NoBlending,
    transparent: false,
    depthWrite: false,
    depthTest: false,
  });

  constructor(
    private readonly defaultMouse3d: THREE.Vector3,
    private readonly pass: Pass,
  ) {}

  render(input: VelocityInput): Render {
    return (target) => {
      const { mouse3d, ...uniformInput } = input;
      setUniforms<VelocityUniformInput>(this.uniforms, uniformInput);
      this.uniforms.mouse3d.value.copy(mouse3d ?? this.defaultMouse3d);
      this.pass.apply(this.shader)(target);
    };
  }
  dispose(): void {
    this.shader.dispose();
  }
}

type PositionInput = Pick<VelocityInput, "delta" | "textureVelocity" | "texturePosition">;

class Position implements ComputeShader<PositionInput> {
  private readonly uniforms: ComputeUniforms<PositionInput> = {
    resolution: { value: new THREE.Vector2() },
    texturePosition: { value: null },
    textureVelocity: { value: null },
    delta: { value: 1 },
  };

  private readonly shader = new THREE.ShaderMaterial({
    uniforms: this.uniforms,
    vertexShader: shaderParse(fboVert),
    fragmentShader: shaderParse(positionFrag),
    blending: THREE.NoBlending,
    transparent: false,
    depthWrite: false,
    depthTest: false,
  });

  constructor(private readonly pass: Pass) {}

  render(input: PositionInput): Render {
    return (target) => {
      setUniforms(this.uniforms, input);
      this.pass.apply(this.shader)(target);
    };
  }

  dispose(): void {
    this.shader.dispose();
  }
}

function velocity(size: number): Float32Array {
  const a = new Float32Array(size * size * 4);
  for (let i = 0, len = a.length; i < len; i += 4) {
    a[i] = 0;
    a[i + 1] = 0;
    a[i + 2] = 0;
    a[i + 3] = ((~~(i / 4) % size) + 1) % size;
  }
  return a;
}

function position(size: number): Float32Array {
  const a = new Float32Array(size * size * 4);
  for (let i = 0, len = a.length; i < len; i += 4) {
    a[i] = (Math.random() - 0.5) * 1;
    a[i + 1] = (Math.random() - 0.5) * 1;
    a[i + 2] = (Math.random() - 0.5) * 1;
  }
  return a;
}

function squareTexture(size: number, data: (size: number) => Float32Array): THREE.DataTexture {
  const texture = new THREE.DataTexture(data(size), size, size, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  texture.generateMipmaps = false;
  texture.flipY = false;
  return texture;
}
