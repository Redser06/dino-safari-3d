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
 * for realistic non-overlapping tuberculate dinosaur skin (polygonal basement scales
 * + larger feature osteoderm rosettes + transverse dermal skin creases).
 */
export function getReptileSkinMaps(): ReptileSkinTextures {
  if (cachedSkinMaps) return cachedSkinMaps;

  const size = 512;
  const heightData = new Float32Array(size * size);
  const gridCells = 34;

  const cellX = new Float32Array(gridCells * gridCells);
  const cellY = new Float32Array(gridCells * gridCells);
  const cellScaleHeight = new Float32Array(gridCells * gridCells);
  const cellIsRosette = new Uint8Array(gridCells * gridCells);

  for (let cy = 0; cy < gridCells; cy++) {
    for (let cx = 0; cx < gridCells; cx++) {
      const idx = cy * gridCells + cx;
      cellX[idx] = cx + 0.16 + hash2D(cx, cy) * 0.68;
      cellY[idx] = cy + 0.16 + hash2D(cx + 53, cy + 19) * 0.68;
      const isFeature = hash2D(cx + 17, cy + 89) > 0.82;
      cellIsRosette[idx] = isFeature ? 1 : 0;
      cellScaleHeight[idx] = isFeature
        ? 0.92 + hash2D(cx + 101, cy + 77) * 0.08
        : 0.62 + hash2D(cx + 101, cy + 77) * 0.26;
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
      let isRosette = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = (baseCy + dy + gridCells) % gridCells;
        const offsetY = baseCy + dy - v;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = (baseCx + dx + gridCells) % gridCells;
          const idx = ny * gridCells + nx;

          const rx = baseCx + dx + (cellX[idx] - nx) - u;
          const ry = offsetY + (cellY[idx] - ny);
          const scaleWeight = cellIsRosette[idx] ? 0.78 : 1.08;
          const d = Math.sqrt(rx * rx * 1.12 + ry * ry * 0.92) * scaleWeight;

          if (d < minDist1) {
            minDist2 = minDist1;
            minDist1 = d;
            closestCellVal = cellScaleHeight[idx];
            isRosette = cellIsRosette[idx];
          } else if (d < minDist2) {
            minDist2 = d;
          }
        }
      }

      const edgeDist = minDist2 - minDist1;
      // Crisp interstitial sulcus groove between non-overlapping polygonal tubercles
      const scaleBevel = Math.min(1.0, Math.pow(Math.max(0, edgeDist * 3.4), 0.45));
      const dome = Math.max(0, 1.0 - minDist1 * (isRosette ? 0.72 : 0.95));
      // Central keel on feature osteoderm scales
      const centralKeel = isRosette ? Math.max(0, 1.0 - minDist1 * 2.2) * 0.18 : 0;
      // Fine dermal flexion creases
      const wrinkle =
        Math.sin((px / size) * Math.PI * 12 + Math.sin((py / size) * Math.PI * 6) * 1.6) * 0.055 +
        Math.cos((py / size) * Math.PI * 16 + Math.sin((px / size) * Math.PI * 8) * 1.2) * 0.045;

      const h = Math.max(
        0,
        Math.min(1, scaleBevel * (0.54 + dome * 0.46) * closestCellVal + centralKeel + wrinkle)
      );
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

  const strength = 4.4;

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

      // Scale crowns are slightly burnished/smoother (lower roughness), interstitial grooves are matte
      const rVal = Math.floor((0.92 - h * 0.40) * 255);
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

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  cachedSkinMaps = { normalMap, bumpMap, roughnessMap };
  return cachedSkinMaps;
}

/**
 * Generates a high-definition reptile skin detail map with multi-scale polygonal basement scales,
 * rosette feature tubercles, dark melanin interstitial crevices, and natural organic mottling.
 * Balanced around high-key neutral luminance so vertex-color countershading & patterning stay rich and accurate.
 */
export function createReptileSkinAlbedo(
  skinHex: number,
  bellyHex: number,
  patternHex: number
): THREE.CanvasTexture {
  const key = `v3-${skinHex}-${bellyHex}-${patternHex}`;
  if (albedoCache.has(key)) return albedoCache.get(key)!;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Warm neutral parchment-keratin base
  ctx.fillStyle = '#EAE4D7';
  ctx.fillRect(0, 0, size, size);

  // 1. Macroscopic organic dermal blotches & weathered skin mottling
  for (let i = 0; i < 95; i++) {
    const x = hash2D(i, 11) * size;
    const y = hash2D(i, 23) * size;
    const rx = 14 + hash2D(i, 37) * 44;
    const ry = 8 + hash2D(i, 43) * 24;
    const rot = (hash2D(i, 59) - 0.5) * Math.PI;
    const mode = i % 3;

    const grad = ctx.createRadialGradient(x, y, 2, x, y, Math.max(rx, ry));
    if (mode === 0) {
      grad.addColorStop(0, 'rgba(255, 250, 236, 0.36)');
    } else if (mode === 1) {
      grad.addColorStop(0, 'rgba(138, 128, 110, 0.34)');
    } else {
      grad.addColorStop(0, 'rgba(175, 158, 132, 0.28)');
    }
    grad.addColorStop(1, 'rgba(234, 228, 215, 0)');

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Multi-scale polygonal pebbly scales & rosette osteoderms with dark melanin crevices
  const grid = 34;
  const step = size / grid;
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const cx = (gx + 0.5 + (hash2D(gx, gy) - 0.5) * 0.42) * step;
      const cy = (gy + 0.5 + (hash2D(gx + 31, gy + 17) - 0.5) * 0.42) * step;
      const isRosette = hash2D(gx + 17, gy + 89) > 0.82;
      const r = step * (isRosette ? 0.56 : 0.41 + (hash2D(gx + 7, gy + 9) - 0.5) * 0.10);

      // Scale-by-scale natural pigment variation
      const shadeJitter = hash2D(gx * 3, gy * 5);
      const baseLum = isRosette ? 205 + shadeJitter * 28 : 218 + shadeJitter * 32;
      const warmShift = Math.floor((hash2D(gx + 13, gy + 29) - 0.5) * 14);
      const cr = Math.min(255, Math.floor(baseLum + warmShift));
      const cg = Math.min(255, Math.floor(baseLum - 3));
      const cb = Math.min(255, Math.floor(baseLum - 11 - warmShift * 0.5));

      ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.86, (hash2D(gx, gy) - 0.5) * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Dark melanin interstitial sulcus around each scale
      ctx.strokeStyle = isRosette ? 'rgba(62, 54, 44, 0.52)' : 'rgba(78, 70, 58, 0.42)';
      ctx.lineWidth = isRosette ? 1.6 : 1.15;
      ctx.stroke();

      // Specular keratin crown highlight on top of raised tubercle
      if (isRosette || shadeJitter > 0.55) {
        ctx.fillStyle = 'rgba(255, 252, 244, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.15, cy - r * 0.15, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. Fine dermal flexion lines & micro-speckling
  ctx.strokeStyle = 'rgba(72, 64, 52, 0.18)';
  ctx.lineWidth = 1.0;
  for (let w = 0; w < 28; w++) {
    const startY = hash2D(w, 91) * size;
    ctx.beginPath();
    ctx.moveTo(0, startY);
    for (let x = 0; x <= size; x += 32) {
      const dy = Math.sin((x / size) * Math.PI * 4 + w) * 6;
      ctx.lineTo(x, startY + dy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  albedoCache.set(key, tex);
  return tex;
}

/**
 * Generates museum-grade permineralized fossil bone textures (albedo & bump)
 * with realistic Haversian bone grain, mineral staining, and suture micro-relief.
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

  // Warm museum fossil sandstone-ivory base
  aCtx.fillStyle = '#EAE0C8';
  aCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Subtle mineral patina patches (ochre/umber permineralization)
  for (let p = 0; p < 45; p++) {
    const x = hash2D(p, 19) * size;
    const y = hash2D(p, 31) * size;
    const r = 24 + hash2D(p, 47) * 60;
    const grad = aCtx.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, p % 2 === 0 ? 'rgba(162, 138, 98, 0.16)' : 'rgba(248, 243, 232, 0.20)');
    grad.addColorStop(1, 'rgba(234, 224, 200, 0)');
    aCtx.fillStyle = grad;
    aCtx.beginPath();
    aCtx.arc(x, y, r, 0, Math.PI * 2);
    aCtx.fill();
  }

  // Longitudinal Haversian bone striae
  for (let i = 0; i < 700; i++) {
    const x = hash2D(i, 1) * size;
    const y = hash2D(i, 2) * size;
    const len = 10 + hash2D(i, 3) * 60;
    const thick = 0.7 + hash2D(i, 4) * 2.0;
    const isDark = hash2D(i, 5) > 0.42;

    aCtx.fillStyle = isDark ? 'rgba(135, 114, 82, 0.14)' : 'rgba(252, 248, 238, 0.18)';
    aCtx.fillRect(x, y, len, thick);

    bCtx.fillStyle = isDark ? 'rgba(52, 52, 52, 0.25)' : 'rgba(202, 202, 202, 0.22)';
    bCtx.fillRect(x, y, len, thick);
  }

  // Nutrient foramina & trabecular pores
  for (let i = 0; i < 280; i++) {
    const x = hash2D(i + 800, 1) * size;
    const y = hash2D(i + 800, 2) * size;
    const r = 0.8 + hash2D(i + 800, 3) * 2.2;
    aCtx.fillStyle = 'rgba(102, 84, 58, 0.18)';
    aCtx.beginPath();
    aCtx.arc(x, y, r, 0, Math.PI * 2);
    aCtx.fill();

    bCtx.fillStyle = 'rgba(30, 30, 30, 0.38)';
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
