"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  extend,
} from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * Background TV/CRT-style shader.
 *
 * Source of inspiration:
 *   https://21st.dev/r/jatin-yadav05/old-television-shader
 *
 * A full-viewport plane with a custom shader that mixes:
 *  - Two perpendicular sine waves (slow + medium speed)
 *  - 2D fbm noise (4 octaves)
 *  - Smoothed value noise
 *  - Mouse-driven domain offset for parallax
 *  - Center glow (radial falloff)
 *  - Time-based brightness variation
 *
 * Plus a low-opacity SVG noise overlay with mix-blend-overlay for
 * the "old TV" static/grain feel.
 *
 * Plane is dynamically scaled to viewport aspect ratio so the
 * shader always covers the screen with no black bars.
 */

/* -------------------------------------------------------------------------
 * Shader material
 * ----------------------------------------------------------------------- */

const WaveShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorA: new THREE.Color("#ffffff"),
    uColorB: new THREE.Color("#000000"),
    uMouse: new THREE.Vector2(0, 0),
    uResolution: new THREE.Vector2(1, 1),
  },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec2 uMouse;
    uniform vec2 uResolution;

    varying vec2 vUv;

    // Hash-based value noise — cheap, no textures.
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }

    // 4-octave fbm for organic texture.
    float fbm(vec2 st) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    // Smoothed value noise (Perlin-style fade).
    float smoothNoise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = noise(i);
      float b = noise(i + vec2(1.0, 0.0));
      float c = noise(i + vec2(0.0, 1.0));
      float d = noise(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 st = vUv;

      // Three crossing sine waves for the "TV scanline wave" feel.
      float wave1 = sin(st.x * 8.0 + uTime * 2.0) * 0.1;
      float wave2 = sin(st.y * 6.0 + uTime * 1.5) * 0.1;
      float wave3 = sin((st.x + st.y) * 4.0 + uTime * 3.0) * 0.05;

      // Mouse parallax — domain shift up to ~0.15.
      vec2 mouseInfluence = (uMouse - 0.5) * 0.3;
      st += mouseInfluence;

      float waves = wave1 + wave2 + wave3;

      // Mix smoothed noise + fbm for the body of the texture.
      float noiseValue = smoothNoise(st * 3.0 + uTime * 0.5);
      float fbmNoise = fbm(st * 2.0 + uTime * 0.3);
      float combinedNoise = mix(noiseValue, fbmNoise, 0.6);

      // Map to a 0..1 mix factor and smoothstep for nicer contrast.
      float mixFactor = (waves + combinedNoise + 1.0) * 0.5;
      mixFactor = smoothstep(0.2, 0.8, mixFactor);

      vec3 color = mix(uColorA, uColorB, mixFactor);

      // Center glow + noise highlight.
      float glow = 1.0 - distance(st, vec2(0.5)) * 1.2;
      glow = smoothstep(0.0, 1.0, glow);
      glow += combinedNoise * 0.2;
      color += glow * 0.15;

      // Subtle global brightness breathing.
      float brightness = 0.9 + sin(uTime * 0.8) * 0.1;
      color *= brightness;

      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ WaveShaderMaterial });

type ShaderMaterialRef = InstanceType<typeof WaveShaderMaterial> & {
  uTime: number;
  uMouse: THREE.Vector2;
  uResolution: THREE.Vector2;
};

/**
 * Compute the plane scale (x, y) needed to cover the viewport at
 * the given camera FOV + Z position. Picks the larger of width and
 * height with a small overscan to prevent sub-pixel gaps.
 */
function planeScaleForViewport(
  width: number,
  height: number,
  fovDeg: number,
  positionZ: number,
  overscan = 1.05
): { x: number; y: number } {
  const visibleH = 2 * positionZ * Math.tan((fovDeg * Math.PI) / 360);
  const aspect = width / height;
  const visibleW = visibleH * aspect;
  const cover = Math.max(visibleW, visibleH) * overscan;
  return { x: cover, y: cover };
}

/* -------------------------------------------------------------------------
 * The plane — sizes itself to always cover the viewport
 * ----------------------------------------------------------------------- */

type ShaderPlaneProps = {
  /**
   * Target color for the shader's "bright" pole (uColorA). The
   * shader lerps its actual uniform toward this color each frame
   * so retints are smooth, not jarring.
   */
  targetColorA: THREE.Color;
  /**
   * Target color for the shader's "dark" pole (uColorB). This is
   * the one the parent retints to match the hovered product's
   * dominant color — so the shader reads as "tinted toward the
   * product" while keeping its contrast structure.
   */
  targetColorB: THREE.Color;
};

function ShaderPlane({ targetColorA, targetColorB }: ShaderPlaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<ShaderMaterialRef | null>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const lerpedMouse = useRef(new THREE.Vector2(0.5, 0.5));
  // Reusable scratch colors so we don't allocate each frame.
  const scratchA = useRef(new THREE.Color()).current;
  const scratchB = useRef(new THREE.Color()).current;
  const { size, camera } = useThree();

  // Re-scale the plane any time the viewport size changes.
  useEffect(() => {
    if (!meshRef.current) return;
    const persp = camera as THREE.PerspectiveCamera;
    const fovDeg = persp.fov;
    const positionZ = persp.position.z;
    const { x, y } = planeScaleForViewport(size.width, size.height, fovDeg, positionZ);
    meshRef.current.scale.set(x, y, 1);
  }, [size.width, size.height, camera]);

  // Track pointer for mouse parallax. Works for touch + mouse.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX / window.innerWidth;
      mouse.current.y = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((_state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uTime += delta;
    lerpedMouse.current.x += (mouse.current.x - lerpedMouse.current.x) * 0.05;
    lerpedMouse.current.y += (mouse.current.y - lerpedMouse.current.y) * 0.05;
    mat.uMouse.copy(lerpedMouse.current);
    mat.uResolution.set(size.width, size.height);

    // Lerp the actual uniform colors toward the targets. The
    // per-frame factor is framerate-independent in feel: at 60fps
    // it takes ~25 frames (~400ms) to reach ~95% of the target.
    // THREE.Color.lerp is delta-aware in newer versions; we pass
    // a clamped factor for stable behavior.
    const t = Math.min(1, delta * 4);
    scratchA.copy(mat.uColorA).lerp(targetColorA, t);
    scratchB.copy(mat.uColorB).lerp(targetColorB, t);
    mat.uColorA.copy(scratchA);
    mat.uColorB.copy(scratchB);
  });

  return (
    <mesh ref={meshRef} scale={[1, 1, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      {/* The waveShaderMaterial intrinsic is registered at runtime
          via extend() above. TS doesn't see it in JSX.IntrinsicElements
          because of React 19's new JSX runtime, so cast. */}
      {/* @ts-expect-error - extended via fiber extend() */}
      <waveShaderMaterial
        ref={materialRef as any}
        key={WaveShaderMaterial.key}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------
 * Exported component
 *
 * Outer wrapper is fixed full-viewport. No overlay — products float
 * directly on top of the shader so they read as a single
 * composition, not "products in a grainy box."
 * ----------------------------------------------------------------------- */

export type PolishedShaderProps = {
  /**
   * Hex color for the shader's bright pole. Default: white.
   * Pass a product's accent to retint the bright side toward it.
   */
  colorA?: string;
  /**
   * Hex color for the shader's dark pole. Default: black.
   * Pass a product's accent to retint the dark side toward it —
   * this is the one that reads as the "tint" because the dark
   * pole dominates the noise output.
   */
  colorB?: string;
};

export function PolishedShader({
  colorA = "#ffffff",
  colorB = "#000000",
}: PolishedShaderProps = {}) {
  // Stable THREE.Color instances so the useFrame dep is referentially
  // stable; only their RGB values change when the props change.
  const targetA = useMemo(() => new THREE.Color(colorA), [colorA]);
  const targetB = useMemo(() => new THREE.Color(colorB), [colorB]);

  // When the props change, update the live targets in place so the
  // shader can keep lerping toward them without re-creating the
  // THREE.Color instance (which would force a re-mount).
  useEffect(() => {
    targetA.set(colorA);
  }, [colorA, targetA]);
  useEffect(() => {
    targetB.set(colorB);
  }, [colorB, targetB]);

  return (
    <div className="h-full w-full">
      <Canvas
        className="absolute inset-0"
        camera={{ position: [0, 0, 2], fov: 75 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <ShaderPlane targetColorA={targetA} targetColorB={targetB} />
      </Canvas>
    </div>
  );
}

export default PolishedShader;
