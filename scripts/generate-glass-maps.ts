/**
 * Generates two PNGs used by the Apple-style Liquid Glass SVG filter:
 *
 *   public/glass-displacement.png  — Snell-law refraction field (RGBA)
 *   public/glass-specular.png      — rim light at -60° light direction
 *
 * Approach follows kube.io/blog/liquid-glass-css-svg :
 *   - Convex Squircle surface profile (Apple's choice): lens thickness
 *     y(x) = ⁴√(1 − (1−x)⁴) where x ∈ [0,1]
 *       x=0 = outer rim (thickness 0)
 *       x=1 = start of flat interior (max thickness 1)
 *   - At x=0 the surface is steepest → strongest refraction (rim bend)
 *   - At x=1 the surface is flat → no refraction
 *   - Surface normal at x = (-dy/dx, 1), rotated -90° from the slope
 *   - Incident ray is orthogonal (article's assumption)
 *   - Snell's law: sin(θ₂) = (1/n) sin(θ₁)  with n=1.5
 *   - Bending angle θ₁−θ₂ ≈ tan(θ₁−θ₂) horizontal offset
 *   - Pre-compute on one radius (symmetric) and rotate around the disc
 *
 * ENCODING (per the article):
 *   R = 128 + dx_normalized · 127   (signed X displacement, normalized to ±1)
 *   G = 128 + dy_normalized · 127   (signed Y displacement)
 *   B = 128, A = 255                (ignored by feDisplacementMap)
 *   Neutral value (no displacement) = (128, 128, 128, 255)
 *
 * feDisplacementMap semantics: for each output pixel, R/G of the
 * displacement map tell which source pixel to fetch from:
 *   R = 0   → fetch from (x − scale, y)
 *   R = 128 → fetch from (x, y)
 *   R = 255 → fetch from (x + scale, y)
 *
 * For a CONVEX glass, the rim bends light such that pixels visible
 * THROUGH the rim come from BEHIND the rim (i.e. further out radially
 * than where they appear). So the displacement direction at each rim
 * pixel points OUTWARD (away from center) — meaning the output rim
 * pixel pulls its source from further out, which means we want a
 * POSITIVE radial displacement (source pulled outward from output).
 *
 * Outside the disc → exactly (128, 128, 128, 255) (no shift).
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PNG } from "pngjs";

// ---------- knobs ----------
const MAP_SIZE = 256; // square displacement-map resolution
const N_SAMPLES = 127;
const REFRACTIVE_INDEX = 1.5;
const OUTPUT_MAX_DISPLACEMENT_PX = 22; // CSS px — re-scaled SVG filter scale

// ---------- surface profile ----------
// Convex squircle lens thickness. x=0 is the outer rim (thickness 0),
// x=1 is the start of the flat interior (max thickness 1).
function heightAt(x: number): number {
  const clamped = Math.max(0, Math.min(1, x));
  return Math.sqrt(Math.sqrt(1 - Math.pow(1 - clamped, 4)));
}

// Numerical derivative → surface normal (outward-pointing)
const DELTA = 1e-4;
function normalAt(x: number): { nx: number; ny: number } {
  const y1 = heightAt(Math.max(0, x - DELTA));
  const y2 = heightAt(Math.min(1, x + DELTA));
  const dy = (y2 - y1) / (2 * DELTA); // slope
  // Outward normal = (-dy, 1) rotated to point AWAY from the center
  // for a convex lens. We normalize.
  const nx = -dy;
  const ny = 1;
  const len = Math.hypot(nx, ny);
  return { nx: nx / len, ny: ny / len };
}

// ---------- refraction ----------
function displacementMagnitudes(): number[] {
  // magnitudes[i] = how much the ray bends at bezel position i
  // i=0 is the outer rim (strongest), i=N-1 is the flat interior (none)
  const out = new Array<number>(N_SAMPLES).fill(0);
  for (let i = 0; i < N_SAMPLES; i++) {
    const x = i / (N_SAMPLES - 1); // 0..1
    const n = normalAt(x);
    // sin(θ₁) where θ₁ is angle between ray (pointing along +Y, into the
    // glass from above) and the surface normal. Ray = (0, 1).
    // sin(θ₁) = |dot(ray, normal_perp)| / |ray||normal| = |nx|
    const sinTheta1 = Math.abs(n.nx);
    const sinTheta2 = Math.min(1, sinTheta1 / REFRACTIVE_INDEX);
    const theta1 = Math.asin(sinTheta1);
    const theta2 = Math.asin(sinTheta2);
    const bend = theta1 - theta2; // 0 at x=1, max at x=0
    // For Snell in the small-angle regime: horizontal offset over a unit
    // depth of glass = tan(θ₁−θ₂) × glass_thickness_at_that_x
    // We weight by current thickness so interior (x=1, thick glass, flat
    // surface, zero bend) still gives zero, while rim (x=0, thin glass,
    // steep normal, max bend) gives the maximum.
    const thickness = heightAt(x);
    out[i] = Math.tan(bend) * thickness;
  }
  return out;
}

// ---------- build displacement map (RGBA PNG) ----------
function buildDisplacementPNG(): { png: PNG; maxMag: number } {
  const magnitudes = displacementMagnitudes();
  const maxMag = Math.max(...magnitudes.map(Math.abs)) || 1;

  const png = new PNG({ width: MAP_SIZE, height: MAP_SIZE });
  const cx = (MAP_SIZE - 1) / 2;
  const cy = (MAP_SIZE - 1) / 2;
  const maxR = MAP_SIZE / 2;

  for (let py = 0; py < MAP_SIZE; py++) {
    for (let px = 0; px < MAP_SIZE; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      let r = 128,
        g = 128,
        b = 128,
        a = 255;
      if (dist <= maxR && dist > 0) {
        // Normalized radial position: 0 at rim, 1 at center
        const t = dist / maxR;
        const sampleIdx = Math.min(
          N_SAMPLES - 1,
          Math.round(t * (N_SAMPLES - 1))
        );
        const mag = magnitudes[sampleIdx] / maxMag; // 0..1, peaks at rim
        // Direction: OUTWARD radial (positive R → fetch from further out,
        // positive G → fetch from further down)
        const len = dist;
        const dirX = dx / len;
        const dirY = dy / len;
        r = Math.round(128 + dirX * mag * 127);
        g = Math.round(128 + dirY * mag * 127);
      }
      // outside circle: explicitly (128, 128, 128, 255) → no displacement
      const idx = (py * MAP_SIZE + px) << 2;
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
  return { png, maxMag };
}

// ---------- build specular map (rim light at -60°) ----------
function buildSpecularPNG(): PNG {
  const png = new PNG({ width: MAP_SIZE, height: MAP_SIZE });
  const cx = (MAP_SIZE - 1) / 2;
  const cy = (MAP_SIZE - 1) / 2;
  const maxR = MAP_SIZE / 2;
  const lightAngleDeg = -60;
  const la = (lightAngleDeg * Math.PI) / 180;
  const lx = Math.cos(la);
  const ly = Math.sin(la);

  for (let py = 0; py < MAP_SIZE; py++) {
    for (let px = 0; px < MAP_SIZE; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      let intensity = 0;
      if (dist <= maxR && dist > 0) {
        const len = dist;
        const nx = dx / len;
        const ny = dy / len;
        const dot = nx * lx + ny * ly;
        const rim = Math.max(0, dot);
        const edgeBoost = Math.pow(1 - dist / maxR, 0.6);
        intensity = Math.min(1, Math.pow(rim, 2.5) * edgeBoost * 1.5);
      }
      const v = Math.round(intensity * 255);
      const idx = (py * MAP_SIZE + px) << 2;
      png.data[idx] = v;
      png.data[idx + 1] = v;
      png.data[idx + 2] = v;
      png.data[idx + 3] = 255;
    }
  }
  return png;
}

// ---------- run ----------
mkdirSync(resolve("public"), { recursive: true });
const { png: dispPng, maxMag } = buildDisplacementPNG();
const dispBuf = PNG.sync.write(dispPng);
writeFileSync(resolve("public/glass-displacement.png"), dispBuf);

const specPng = buildSpecularPNG();
const specBuf = PNG.sync.write(specPng);
writeFileSync(resolve("public/glass-specular.png"), specBuf);

console.log(
  `[glass-maps] wrote public/glass-displacement.png (${MAP_SIZE}×${MAP_SIZE}, maxMag=${maxMag.toFixed(4)})`
);
console.log(`[glass-maps] wrote public/glass-specular.png (${MAP_SIZE}×${MAP_SIZE})`);
console.log(
  `[glass-maps] → use scale="${OUTPUT_MAX_DISPLACEMENT_PX}" in <feDisplacementMap>`
);