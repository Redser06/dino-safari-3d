import * as THREE from 'three';

export interface ReptileSkinTextures {
  normalMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

let cachedSkinMaps: ReptileSkinTextures | null = null;
let cachedBoneBump: THREE.CanvasTexture | null = null;
let cachedBoneAlbedo: THREE.CanvasTexture | null = null;
const albedoCache = new Map<string, THREE.CanvasTexture>();

function hash2D(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return h - Math.floor(h);
}

/**
 * Generates high-resolution (512x512) heightfield, normal map, and roughness map
 * for realistic leathery non-overlapping reptilian scales, osteoderm tubercles, and skin creases.
 */
export function getReptileSkinMaps(): ReptileSkinTextures {
  if (cachedSkinMaps) return cachedSkinMaps;

  const size = 512;
  const heightData = new Float32Array(size * size);
  const gridCells = 30;

  const cellX = new Float32Array(gridCells * gridCells);
  const cellY = new Float32Array(gridCells * gridCells);
  const cellScaleHeight = new Float32Array(gridCells * gridCells);

  for (let cy = 0; cy < gridCells; cy++) {
    for (let cx = 0; cx < gridCells; cx++) {
      const idx = cy * gridCells + cx;
      cellX[idx] = cx + 0.18 + hash2D(cx, cy) * 0.64;
      cellY[idx] = cy + 0.18 + hash2D(cx + 53, cy + 19) * 0.64;
      cellScaleHeight[idx] = 0.75 + hash2D(cx + 101, cy + 77) * 0.25;
    }
  }

  for (let py = 0; py < size; py++) {
    const v = (py / size) * gridCells;
    const baseCy = Math.floor(v);

    for (let px = 0; px < size; px++) {
      const u = (px / size) * gridCells;
      const baseCx = Math.floor(u);

      let minDist1 = 999.0;
      let minDist2 = 999.0;
      let closestCellVal = 1.0;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = (baseCy + dy + gridCells) % gridCells;
        const offsetY = (baseCy + dy) - v;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = (baseCx + dx + gridCells) % gridCells;
          const idx = ny * gridCells + nx;

          const rx = (baseCx + dx + (cellX[idx] - nx)) - u;
          const ry = offsetY + (cellY[idx] - ny);
          const d = Math.sqrt(rx * rx * 1.15 + ry * ry * 0.9);

          if (d < minDist1) {
            minDist2 = minDist1;
            minDist1 = d;
            closestCellVal = cellScaleHeight[idx];
          } else if (d < minDist2) {
            minDist2 = d;
          }
        }
      }

      const edgeDist = minDist2 - minDist1;
      const scaleBevel = Math.min(1.0, Math.pow(Math.max(0, edgeDist * 3.0), 0.5));
      const dome = Math.max(0, 1.0 - minDist1 * 0.9);
      const wrinkle =
        Math.sin((px / size) * Math.PI * 10 + Math.sin((py / size) * Math.PI * 6) * 1.4) * 0.06 +
        Math.cos((py / size) * Math.PI * 14) * 0.05;

      const h = Math.max(0, Math.min(1, scaleBevel * (0.58 + dome * 0.42) * closestCellVal + wrinkle));
      heightData[py * size + px] = h;
    }
  }

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bumpCtx = bumpCanvas.getContext('2d')!;
  const bumpImg = bumpCtx.createImageData(size, size);

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext('2d')!;
  const roughImg = roughCtx.createImageData(size, size);

  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const normCtx = normCanvas.getContext('2d')!;
  const normImg = normCtx.createImageData(size, size);

  const strength = 3.8;

  for (let y = 0; y < size; y++) {
    const yUp = (y - 1 + size) % size;
    const yDown = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xLeft = (x - 1 + size) % size;
      const xRight = (x + 1) % size;

      const idx = y * size + x;
      const pIdx = idx * 4;
      const h = heightData[idx];

      const bVal = Math.floor(h * 255);
      bumpImg.data[pIdx] = bVal;
      bumpImg.data[pIdx + 1] = bVal;
      bumpImg.data[pIdx + 2] = bVal;
      bumpImg.data[pIdx + 3] = 255;

      const rVal = Math.floor((0.88 - h * 0.36) * 255);
      roughImg.data[pIdx] = rVal;
      roughImg.data[pIdx + 1] = rVal;
      roughImg.data[pIdx + 2] = rVal;
      roughImg.data[pIdx + 3] = 255;

      const dX = (heightData[y * size + xRight] - heightData[y * size + xLeft]) * strength;
      const dY = (heightData[yDown * size + x] - heightData[yUp * size + x]) * strength;
      const dZ = 1.0;
      const invLen = 1.0 / Math.sqrt(dX * dX + dY * dY + dZ * dZ);

      normImg.data[pIdx] = Math.floor((-dX * invLen * 0.5 + 0.5) * 255);
      normImg.data[pIdx + 1] = Math.floor((-dY * invLen * 0.5 + 0.5) * 255);
      normImg.data[pIdx + 2] = Math.floor((dZ * invLen * 0.5 + 0.5) * 255);
      normImg.data[pIdx + 3] = 255;
    }
  }

  bumpCtx.putImageData(bumpImg, 0, 0);
  roughCtx.putImageData(roughImg, 0, 0);
  normCtx.putImageData(normImg, 0, 0);

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(6, 6);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(6, 6);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(6, 6);

  cachedSkinMaps = { normalMap, bumpMap, roughnessMap };
  return cachedSkinMaps;
}

/**
 * Generates a bright, high-definition scale & organic mottling detail map
 * (centered around 0.85 - 1.0 luminance so vertex colors retain full sunlit vibrancy without darkening!).
 */
export function createReptileSkinAlbedo(
  skinHex: number,
  bellyHex: number,
  patternHex: number
): THREE.CanvasTexture {
  const key = `v2-${skinHex}-${bellyHex}-${patternHex}`;
  if (albedoCache.has(key)) return albedoCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Warm bright neutral base so vertex color multiplication preserves vibrant hues
  ctx.fillStyle = '#F4F1EA';
  ctx.fillRect(0, 0, size, size);

  // Organic mottled patches
  for (let i = 0; i < 70; i++) {
    const x = hash2D(i, 11) * size;
    const y = hash2D(i, 23) * size;
    const rx = 16 + hash2D(i, 37) * 48;
    const ry = 8 + hash2D(i, 43) * 22;
    const rot = (hash2D(i, 59) - 0.5) * 1.2;
    const isLight = i % 3 === 0;

    const grad = ctx.createRadialGradient(x, y, 2, x, y, Math.max(rx, ry));
    grad.addColorStop(0, isLight ? 'rgba(255, 252, 240, 0.35)' : 'rgba(165, 158, 142, 0.32)');
    grad.addColorStop(1, 'rgba(244, 241, 234, 0)');

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Individual polygonal scale highlights & subtle interstitial grooves
  const grid = 30;
  const step = size / grid;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const cx = (gx + 0.5 + (hash2D(gx, gy) - 0.5) * 0.38) * step;
      const cy = (gy + 0.5 + (hash2D(gx + 31, gy + 17) - 0.5) * 0.38) * step;
      const r = step * (0.44 + (hash2D(gx + 7, gy + 9) - 0.5) * 0.12);

      // Scale crown tint
      const v = Math.floor(225 + hash2D(gx * 3, gy * 5) * 30);
      ctx.fillStyle = `rgb(${v}, ${v - 2}, ${v - 6})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.85, (hash2D(gx, gy) - 0.5) * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Interstitial scale groove
      ctx.strokeStyle = 'rgba(95, 88, 76, 0.34)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  albedoCache.set(key, tex);
  return tex;
}

/**
 * Generates museum-grade permineralized fossil bone textures (albedo & bump).
 */
export function getFossilBoneTextures(): { albedo: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  if (cachedBoneAlbedo && cachedBoneBump) {
    return { albedo: cachedBoneAlbedo, bump: cachedBoneBump };
  }

  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  aCtx.fillStyle = '#EFE8D5';
  aCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 600; i++) {
    const x = hash2D(i, 1) * size;
    const y = hash2D(i, 2) * size;
    const len = 12 + hash2D(i, 3) * 65;
    const thick = 0.8 + hash2D(i, 4) * 2.2;
    const isDark = hash2D(i, 5) > 0.45;

    aCtx.fillStyle = isDark ? 'rgba(148, 128, 96, 0.12)' : 'rgba(252, 248, 238, 0.16)';
    aCtx.fillRect(x, y, len, thick);

    bCtx.fillStyle = isDark ? 'rgba(60, 60, 60, 0.22)' : 'rgba(195, 195, 195, 0.22)';
    bCtx.fillRect(x, y, len, thick);
  }

  for (let i = 0; i < 240; i++) {
    const x = hash2D(i + 800, 1) * size;
    const y = hash2D(i + 800, 2) * size;
    const r = 0.8 + hash2D(i + 800, 3) * 2.5;
    aCtx.fillStyle = 'rgba(115, 96, 70, 0.16)';
    aCtx.beginPath();
    aCtx.arc(x, y, r, 0, Math.PI * 2);
    aCtx.fill();

    bCtx.fillStyle = 'rgba(35, 35, 35, 0.35)';
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  cachedBoneAlbedo = new THREE.CanvasTexture(albedoCanvas);
  cachedBoneAlbedo.colorSpace = THREE.SRGBColorSpace;
  cachedBoneAlbedo.wrapS = THREE.RepeatWrapping;
  cachedBoneAlbedo.wrapT = THREE.RepeatWrapping;
  cachedBoneAlbedo.repeat.set(2, 2);

  cachedBoneBump = new THREE.CanvasTexture(bumpCanvas);
  cachedBoneBump.wrapS = THREE.RepeatWrapping;
  cachedBoneBump.wrapT = THREE.RepeatWrapping;
  cachedBoneBump.repeat.set(2, 2);

  return { albedo: cachedBoneAlbedo, bump: cachedBoneBump };
}
