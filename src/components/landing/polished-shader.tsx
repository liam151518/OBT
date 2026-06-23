"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

// Custom shader material with smooth animations.
// Colors are pure white → pure black; the visual is monochrome waves + fbm
// noise, which fits OBT's restrained palette. Comments on the original
// mentioned "vibrant orange / hot pink" — those labels were stale.
const WaveShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorA: new THREE.Color("#ffffff"),
    uColorB: new THREE.Color("#0a0a0a"),
    uMouse: new THREE.Vector2(0, 0),
    uResolution: new THREE.Vector2(1, 1),
  },
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec2 uMouse;
    uniform vec2 uResolution;
    varying vec2 vUv;
    varying vec3 vPosition;

    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

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
      float wave1 = sin(st.x * 8.0 + uTime * 1.2) * 0.1;
      float wave2 = sin(st.y * 6.0 + uTime * 0.9) * 0.1;
      float wave3 = sin((st.x + st.y) * 4.0 + uTime * 1.8) * 0.05;
      vec2 mouseInfluence = (uMouse - 0.5) * 0.3;
      st += mouseInfluence;
      float waves = wave1 + wave2 + wave3;
      float noiseValue = smoothNoise(st * 3.0 + uTime * 0.3);
      float fbmNoise = fbm(st * 2.0 + uTime * 0.18);
      float combinedNoise = mix(noiseValue, fbmNoise, 0.6);
      float mixFactor = (waves + combinedNoise + 1.0) * 0.5;
      mixFactor = smoothstep(0.2, 0.8, mixFactor);
      vec3 color = mix(uColorA, uColorB, mixFactor);
      float glow = 1.0 - distance(st, vec2(0.5)) * 1.2;
      glow = smoothstep(0.0, 1.0, glow);
      glow += combinedNoise * 0.2;
      color += glow * 0.25;
      float brightness = 1.15 + sin(uTime * 0.5) * 0.08;
      color *= brightness;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
);

extend({ WaveShaderMaterial });

// React-19-compatible JSX augmentation: declare the custom element
// shape so <waveShaderMaterial /> typechecks.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      // The shader-material element exposes dynamic uniforms; we type
      // it loosely here because the shaderMaterial factory encodes the
      // real schema at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      waveShaderMaterial: any;
    }
  }
}

interface ShaderMaterialRef {
  uTime: number;
  uMouse: THREE.Vector2;
  uResolution: THREE.Vector2;
}

function ShaderPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<ShaderMaterialRef | null>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const lerpedMouse = useRef(new THREE.Vector2(0.5, 0.5));

  // Attach mousemove on mount, detach on unmount.
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = event.clientX / window.innerWidth;
      mouse.current.y = 1 - event.clientY / window.innerHeight;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state) => {
    const material = materialRef.current;
    if (!material) return;
    material.uTime = state.clock.elapsedTime;
    lerpedMouse.current.lerp(
      new THREE.Vector2(mouse.current.x, mouse.current.y),
      0.05
    );
    material.uMouse.copy(lerpedMouse.current);
    material.uResolution.set(window.innerWidth, window.innerHeight);
  });

  return (
    <mesh ref={meshRef} scale={[4, 4, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <waveShaderMaterial
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={materialRef as any}
        key={WaveShaderMaterial.key}
      />
    </mesh>
  );
}

export function PolishedShader() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* SVG film-grain overlay — matches the original aesthetic */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
        }}
      />

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0, 2], fov: 75 }} className="absolute inset-0">
        <ShaderPlane />
      </Canvas>
    </div>
  );
}

export default PolishedShader;
