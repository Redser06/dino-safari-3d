import * as THREE from 'three';

export interface BodyStation {
  pos: [number, number, number];
  rx: number;
  ryTop: number;
  ryBottom: number;
  pinchTop?: number;
}

export interface LimbJoint {
  pos: [number, number, number];
  rx: number;
  rz: number;
}

export interface HeadSpec {
  attachPos: [number, number, number];
  pitch: number;
  length: number;
  width: number;
  height: number;
  snoutTaper: number;
  snoutDrop: number;
  browCrest: number;
  jawDepth: number;
  teethCount: number;
  toothLength: number;
  hasBeak?: boolean;
  nasalBoss?: number;
  skullType?:
    | 'tyrannosaur'
    | 'sauropod-arch'
    | 'diplodocid'
    | 'ceratopsian'
    | 'stegosaur'
    | 'dromaeosaur'
    | 'ankylosaur'
    | 'spinosaur';
}

export interface DinoMaterials {
  skinMat: THREE.MeshPhysicalMaterial;
  detailMat: THREE.MeshPhysicalMaterial;
  hornMat: THREE.MeshPhysicalMaterial;
  toothMat: THREE.MeshPhysicalMaterial;
  mouthMat: THREE.MeshStandardMaterial;
  boneMat: THREE.MeshStandardMaterial;
  darkCavityMat: THREE.MeshBasicMaterial;
}

/**
 * Naturalistic paleoart color grading: preserves earthy reptile hues without oversaturating
 * or washing out dark osteoderm patterns.
 */
function gradeReptileColor(hex: number, lightnessBoost = 1.12, satScale = 0.92): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.s = Math.min(0.85, hsl.s * satScale);
  hsl.l = Math.min(0.70, Math.max(0.12, hsl.l * lightnessBoost));
  c.setHSL(hsl.h, hsl.s, hsl.l);
  return c;
}

function sampleStations(stations: BodyStation[], t: number): {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  rx: number;
  ryTop: number;
  ryBottom: number;
  pinchTop: number;
} {
  const pts = stations.map((s) => new THREE.Vector3(...s.pos));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const pos = curve.getPointAt(t);
  const tangent = curve.getTangentAt(t).normalize();

  const scaled = t * (stations.length - 1);
  const idx = Math.min(Math.floor(scaled), stations.length - 2);
  const frac = scaled - idx;
  const f = frac * frac * (3 - 2 * frac);

  const s0 = stations[idx];
  const s1 = stations[idx + 1];

  return {
    pos,
    tangent,
    rx: THREE.MathUtils.lerp(s0.rx, s1.rx, f),
    ryTop: THREE.MathUtils.lerp(s0.ryTop, s1.ryTop, f),
    ryBottom: THREE.MathUtils.lerp(s0.ryBottom, s1.ryBottom, f),
    pinchTop: THREE.MathUtils.lerp(s0.pinchTop ?? 1.2, s1.pinchTop ?? 1.2, f),
  };
}

/**
 * Generates a continuous, high-resolution, organically sculpted dinosaur mesh along an anatomical spine.
 * Supports distinct shading & cross-section modes ('body', 'upperHead', 'lowerJaw') so that upper/lower jaws
 * have recessed dark oral cavities and crisp labial lip margins with zero belly-color or geometry spill-over.
 */
export function createLoftedBodyMesh(
  stations: BodyStation[],
  skinHex: number,
  bellyHex: number,
  patternHex: number,
  material: THREE.Material,
  options?: {
    slices?: number;
    radialSegments?: number;
    dorsalRidge?: number;
    skinFolds?: number;
    lateralKeel?: number;
    openStartCap?: boolean;
    openEndCap?: boolean;
    isHead?: boolean;
    shadingMode?: 'body' | 'upperHead' | 'lowerJaw';
  }
): THREE.Mesh {
  const slices = options?.slices ?? 96;
  const radialSegs = options?.radialSegments ?? 40;
  const dorsalRidge = options?.dorsalRidge ?? 0.055;
  const skinFolds = options?.skinFolds ?? 0.022;
  const lateralKeel = options?.lateralKeel ?? 0.0;
  const shadingMode = options?.shadingMode ?? (options?.isHead ? 'upperHead' : 'body');
  const isHead = shadingMode !== 'body';

  const pts = stations.map((s) => new THREE.Vector3(...s.pos));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

  const vertexCount = (slices + 1) * (radialSegs + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  const cSkin = gradeReptileColor(skinHex, 1.18, 0.90);
  const cBelly = gradeReptileColor(bellyHex, 1.04, 0.78).lerp(cSkin, 0.28);
  const cPattern = gradeReptileColor(patternHex, 0.78, 0.95);
  const cLip = cSkin.clone().lerp(cPattern, 0.42);
  const cPalate = new THREE.Color(0x4d2220); // Deep shadowed interior oral roof/floor
  const tempColor = new THREE.Color();

  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    const { pos, tangent, rx, ryTop, ryBottom, pinchTop } = sampleStations(stations, t);

    // Keep mediolateral X strictly horizontal so steep necks/backs never twist the ribcage or belly
    const right = new THREE.Vector3(1, 0, 0);
    const upVec = new THREE.Vector3(0, 1, -tangent.y / Math.max(0.25, Math.abs(tangent.z))).normalize();

    let endCapFactor = 1.0;
    if (!options?.openStartCap && t < 0.025) {
      endCapFactor = Math.pow(t / 0.025, 0.55);
    } else if (!options?.openEndCap && t > 0.975) {
      endCapFactor = Math.pow((1 - t) / 0.025, 0.65);
    }

    const foldWave = Math.sin(t * Math.PI * 28) * skinFolds * (0.4 + 0.6 * Math.sin(t * Math.PI));
    // Subtle, organic dorsal saddle bands (softly modulated, never harsh cartoon stripes)
    const saddleRaw =
      Math.sin(t * Math.PI * (isHead ? 5 : 16) + Math.sin(t * Math.PI * 4) * 0.8) * 0.5 + 0.5;
    const saddleWave = Math.pow(saddleRaw, 1.6);

    // Gular throat dewlap under the neck (t in 0.72..0.96)
    const dewlapEnv = !isHead && t > 0.70 && t < 0.98 ? Math.sin(((t - 0.70) / 0.28) * Math.PI) : 0;

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = u * Math.PI * 2;

      const sinT = Math.sin(theta); // mediolateral (+1 = right, -1 = left)
      const cosT = Math.cos(theta); // dorsoventral (+1 = dorsal top, -1 = ventral bottom)

      const isTop = cosT >= 0;
      const ry = isTop ? ryTop : ryBottom;

      const widthMod = isTop
        ? Math.pow(Math.abs(sinT), 1.0 / pinchTop) * (sinT >= 0 ? 1 : -1)
        : sinT * (1.0 + 0.08 * Math.sin(theta * 2));

      const dorsalPeak = isTop ? Math.pow(cosT, 8) * dorsalRidge : 0;
      const flankShelf = Math.pow(Math.abs(sinT), 6) * lateralKeel;
      const lateralSkinFold =
        shadingMode === 'body' ? Math.exp(-Math.pow((cosT + 0.32) / 0.14, 2)) * 0.032 * rx : 0;
      const dewlapSag = !isTop ? -Math.pow(-cosT, 5) * dewlapEnv * 0.13 * ryBottom : 0;

      let localX =
        (rx * widthMod + (sinT >= 0 ? flankShelf + lateralSkinFold : -flankShelf - lateralSkinFold)) *
        endCapFactor *
        (1 + foldWave);
      let localY = (ry * cosT + dorsalPeak + dewlapSag) * endCapFactor * (1 + foldWave * 0.5);

      // CRITICAL ANATOMICAL FIX FOR MOUTH/JAW CONTACT:
      // 1. Upper Skull ('upperHead'): flatten and vault the ventral palatal surface upward so it NEVER
      //    bulges down into the mouth gap, while keeping a crisp outer maxillary lip rim!
      if (shadingMode === 'upperHead' && !isTop) {
        const medialFactor = Math.pow(1.0 - Math.abs(sinT), 1.6);
        const lipRimDrop = Math.pow(Math.abs(sinT), 3.0) * 0.22 * ryBottom;
        localY = (-lipRimDrop + medialFactor * 0.18 * ryBottom) * endCapFactor;
      }

      // 2. Lower Jaw ('lowerJaw'): hollow the dorsal lingual surface downward into a U-shaped oral floor
      //    bordered by raised lateral dentary lip rims so it never bulges up into the upper teeth!
      if (shadingMode === 'lowerJaw' && isTop) {
        const medialFactor = Math.pow(1.0 - Math.abs(sinT), 1.6);
        const lipRimRise = Math.pow(Math.abs(sinT), 3.0) * 0.24 * ryTop;
        localY = (lipRimRise - medialFactor * 0.22 * ryBottom) * endCapFactor;
      }

      const vx = pos.x + right.x * localX + upVec.x * localY;
      const vy = pos.y + right.y * localX + upVec.y * localY;
      const vz = pos.z + right.z * localX + upVec.z * localY;

      const vIdx = i * (radialSegs + 1) + j;
      positions[vIdx * 3] = vx;
      positions[vIdx * 3 + 1] = vy;
      positions[vIdx * 3 + 2] = vz;

      uvs[vIdx * 2] = t * (isHead ? 4.0 : 10.0);
      uvs[vIdx * 2 + 1] = u * (isHead ? 2.8 : 5.0);

      // Shading by anatomical region with strict inside/outside separation
      if (shadingMode === 'upperHead') {
        if (cosT < -0.35 && Math.abs(sinT) < 0.72) {
          // Recessed interior roof of the mouth (palate)
          tempColor.copy(cPalate);
        } else if (cosT < -0.05) {
          // Crisp, darker scaly maxillary labial lip margin
          const lipFactor = Math.min(1, (-cosT - 0.05) / 0.45);
          tempColor.copy(cSkin).lerp(cLip, lipFactor * 0.85);
        } else {
          // Dorsal nasal ridge & lateral cheek hide (NO belly color on upper jaw!)
          const dorsalMix = Math.pow(cosT, 1.35) * (0.42 + saddleWave * 0.32);
          tempColor.copy(cSkin).lerp(cPattern, Math.min(0.88, dorsalMix));
        }
      } else if (shadingMode === 'lowerJaw') {
        if (cosT > 0.35 && Math.abs(sinT) < 0.72) {
          // Recessed interior floor of the mouth
          tempColor.copy(cPalate);
        } else if (cosT > 0.0) {
          // Crisp scaly dentary lower lip rim
          tempColor.copy(cSkin).lerp(cLip, Math.min(1, cosT * 1.8) * 0.80);
        } else if (cosT < -0.42) {
          // Ventral chin & sub-mandibular throat countershading
          const chinFactor = Math.min(1, (-cosT - 0.42) / 0.58);
          const smoothChin = chinFactor * chinFactor * (3 - 2 * chinFactor);
          tempColor.copy(cSkin).lerp(cBelly, smoothChin * 0.72);
        } else {
          // Outer lateral mandible skin
          tempColor.copy(cSkin);
        }
      } else {
        // 'body' mode: organic reptilian countershading from dark dorsal saddle to warm ventral belly
        const wavyBellyLine = -0.36 + 0.05 * Math.sin(t * Math.PI * 12);
        if (cosT > -0.10) {
          const heightFrac = (cosT + 0.10) / 1.10;
          const dorsalBase = Math.pow(Math.max(0, cosT), 1.25) * 0.52;
          const saddlePatch = Math.pow(heightFrac, 0.85) * saddleWave * 0.42;
          const mottle = Math.max(0, Math.sin(t * 38 + Math.abs(sinT) * 6)) * heightFrac * 0.14;
          const pMix = Math.min(0.92, dorsalBase + saddlePatch * 0.55 + mottle);
          tempColor.copy(cSkin).lerp(cPattern, pMix);
        } else if (cosT < wavyBellyLine) {
          const bellyFactor = Math.min(1, (wavyBellyLine - cosT) / (1 + wavyBellyLine));
          const smoothBelly = bellyFactor * bellyFactor * (3 - 2 * bellyFactor);
          tempColor.copy(cSkin).lerp(cBelly, smoothBelly * 0.78);
        } else {
          tempColor.copy(cSkin);
        }
      }

      colors[vIdx * 3] = tempColor.r;
      colors[vIdx * 3 + 1] = tempColor.g;
      colors[vIdx * 3 + 2] = tempColor.b;
    }
  }

  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * (radialSegs + 1) + j;
      const b = (i + 1) * (radialSegs + 1) + j;
      const c = (i + 1) * (radialSegs + 1) + (j + 1);
      const d = i * (radialSegs + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.userData.spineCurve = curve;

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Adds a row of sculpted reptilian dermal scutes/tubercles along the dorsal ridge of the body.
 */
export function createDermalScuteRow(
  stations: BodyStation[],
  material: THREE.Material,
  count: number,
  baseSize: number,
  startT = 0.06,
  endT = 0.90
): THREE.Group {
  const group = new THREE.Group();
  const scuteGeo = new THREE.ConeGeometry(baseSize * 0.5, baseSize * 1.25, 6);
  scuteGeo.rotateX(-Math.PI / 5);
  scuteGeo.scale(0.5, 1.0, 1.3);

  for (let i = 0; i < count; i++) {
    const t = THREE.MathUtils.lerp(startT, endT, i / (count - 1));
    const { pos, tangent, ryTop } = sampleStations(stations, t);
    const sizeEnvelope = Math.sin(((t - startT) / (endT - startT)) * Math.PI);
    const s = 0.4 + sizeEnvelope * 0.8;

    const scute = new THREE.Mesh(scuteGeo, material);
    scute.position.set(pos.x, pos.y + ryTop * 0.94, pos.z);
    scute.scale.set(s, s, s);

    const dummy = new THREE.Object3D();
    dummy.position.copy(scute.position);
    dummy.lookAt(pos.clone().add(tangent));
    scute.quaternion.copy(dummy.quaternion);
    scute.castShadow = true;
    group.add(scute);
  }

  return group;
}

/**
 * Creates a curved, pointed keratin claw, horn, or tooth mesh, optionally with a basal keratin collar.
 */
export function createCurvedClawOrTooth(
  length: number,
  baseRadius: number,
  curvature: number,
  material: THREE.Material
): THREE.Mesh {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, length * 0.55, length * curvature * 0.5),
    new THREE.Vector3(0, length, length * curvature)
  );

  const slices = 10;
  const radSegs = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    const pt = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    const r = baseRadius * (1 - Math.pow(t, 1.35));

    const right = new THREE.Vector3(1, 0, 0);
    const norm = new THREE.Vector3().crossVectors(right, tan).normalize();

    for (let j = 0; j <= radSegs; j++) {
      const a = (j / radSegs) * Math.PI * 2;
      const x = Math.cos(a) * r * 0.78;
      const z = Math.sin(a) * r;
      const v = pt.clone().addScaledVector(right, x).addScaledVector(norm, z);
      positions.push(v.x, v.y, v.z);
    }
  }

  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < radSegs; j++) {
      const a = i * (radSegs + 1) + j;
      const b = (i + 1) * (radSegs + 1) + j;
      const c = (i + 1) * (radSegs + 1) + (j + 1);
      const d = i * (radSegs + 1) + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Sculpts an organic, muscular multi-joint dinosaur limb with caudofemoralis thigh depth,
 * gastrocnemius calf musculature, untwisted sagittal cross-sections, and integrated feet/claws
 * with keratinous nail collars at the skin-to-claw contact point.
 */
export function createMuscularLimb(
  joints: LimbJoint[],
  isLeft: boolean,
  skinHex: number,
  bellyHex: number,
  skinMat: THREE.Material,
  clawMat: THREE.Material,
  options: {
    toes: number;
    footLength: number;
    footWidth: number;
    clawLength: number;
    sickleClaw?: boolean;
    columnarPad?: boolean;
    patternHex?: number;
  }
): THREE.Group {
  const limbGroup = new THREE.Group();
  const xSign = isLeft ? 1 : -1;

  const firstJ = joints[0];
  const secondJ = joints[1];
  const hipDirY = Math.max(0.25, firstJ.pos[1] - secondJ.pos[1]) * 0.38;
  const rootStation: LimbJoint = {
    pos: [firstJ.pos[0] * 0.65, firstJ.pos[1] + hipDirY, firstJ.pos[2] - 0.04],
    rx: firstJ.rx * 0.92,
    rz: firstJ.rz * 1.05,
  };
  const fullJoints = [rootStation, ...joints];

  const pts = fullJoints.map((j) => new THREE.Vector3(j.pos[0] * xSign, j.pos[1], j.pos[2]));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

  const slices = 44;
  const radSegs = 24;
  const positions = new Float32Array((slices + 1) * (radSegs + 1) * 3);
  const colors = new Float32Array((slices + 1) * (radSegs + 1) * 3);
  const uvs = new Float32Array((slices + 1) * (radSegs + 1) * 2);
  const indices: number[] = [];

  const cSkin = gradeReptileColor(skinHex, 1.18, 0.90);
  const cPattern = gradeReptileColor(options.patternHex ?? skinHex, 0.78, 0.95);
  const cInner = gradeReptileColor(bellyHex, 1.02, 0.78).lerp(cSkin, 0.52);
  const tempColor = new THREE.Color();

  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    const pos = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();

    const right = new THREE.Vector3(1, 0, 0);
    const forward = new THREE.Vector3().crossVectors(right, tan).normalize();
    if (forward.z < 0) forward.negate();

    const scaled = t * (fullJoints.length - 1);
    const idx = Math.min(Math.floor(scaled), fullJoints.length - 2);
    const f = scaled - idx;
    const smoothF = f * f * (3 - 2 * f);

    let rx = THREE.MathUtils.lerp(fullJoints[idx].rx, fullJoints[idx + 1].rx, smoothF);
    let rz = THREE.MathUtils.lerp(fullJoints[idx].rz, fullJoints[idx + 1].rz, smoothF);

    if (options.columnarPad && t > 0.82) {
      const padFrac = (t - 0.82) / 0.18;
      const flare = 1.0 + Math.sin(padFrac * Math.PI * 0.65) * 0.38;
      rx *= flare;
      rz *= flare * 1.08;
    }

    const thighBulge = Math.exp(-Math.pow((t - 0.26) / 0.16, 2)) * 0.18;
    const calfBulge = Math.exp(-Math.pow((t - 0.58) / 0.12, 2)) * 0.15;
    const wrinkle = Math.sin(t * Math.PI * 22) * 0.018;
    const capScale = t < 0.04 ? Math.pow(t / 0.04, 0.5) : 1.0;

    const legBand = Math.pow(Math.max(0, Math.sin(t * Math.PI * 8)), 2.2) * (1 - t * 0.65);

    for (let j = 0; j <= radSegs; j++) {
      const u = j / radSegs;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const lateralBias = cosT * xSign > 0 ? 1.06 : 0.82;
      const sagittalAsymmetry =
        sinT < 0 ? 1.0 + (thighBulge * 1.35 + calfBulge * 1.45) * -sinT : 1.0 + thighBulge * 0.55 * sinT;

      const lx = cosT * rx * lateralBias * (1 + thighBulge * 0.5 + calfBulge * 0.4) * capScale * (1 + wrinkle);
      const lz = sinT * rz * sagittalAsymmetry * capScale * (1 + wrinkle);

      const v = pos.clone().addScaledVector(right, lx).addScaledVector(forward, lz);
      if (options.columnarPad && t > 0.94) {
        v.y = Math.max(0.03, v.y * (1 - (t - 0.94) * 6));
      }

      const vIdx = i * (radSegs + 1) + j;
      positions[vIdx * 3] = v.x;
      positions[vIdx * 3 + 1] = v.y;
      positions[vIdx * 3 + 2] = v.z;

      uvs[vIdx * 2] = u * 3.8;
      uvs[vIdx * 2 + 1] = t * 6.0;

      const outerSide = Math.max(0, cosT * xSign);
      const haunchDorsalMix = Math.max(0, 1 - t / 0.36) * 0.38 + legBand * outerSide * 0.28;
      // Darken ankle/foot scales slightly near ground contact for realistic weathered reptile feet
      const footWeathering = t > 0.78 ? ((t - 0.78) / 0.22) * 0.32 : 0;
      const innerMix = Math.max(0, -cosT * xSign * 0.38) * (1 - footWeathering);

      tempColor
        .copy(cSkin)
        .lerp(cPattern, Math.min(0.85, haunchDorsalMix + footWeathering))
        .lerp(cInner, innerMix * (1 - haunchDorsalMix));

      colors[vIdx * 3] = tempColor.r;
      colors[vIdx * 3 + 1] = tempColor.g;
      colors[vIdx * 3 + 2] = tempColor.b;
    }
  }

  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < radSegs; j++) {
      const a = i * (radSegs + 1) + j;
      const b = (i + 1) * (radSegs + 1) + j;
      const c = (i + 1) * (radSegs + 1) + (j + 1);
      const d = i * (radSegs + 1) + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const limbGeo = new THREE.BufferGeometry();
  limbGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  limbGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  limbGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  limbGeo.setIndex(indices);
  limbGeo.computeVertexNormals();

  const limbMesh = new THREE.Mesh(limbGeo, skinMat);
  limbMesh.castShadow = true;
  limbMesh.receiveShadow = true;
  limbGroup.add(limbMesh);

  const endPt = pts[pts.length - 1];
  const lastJ = joints[joints.length - 1];
  const cFootScale = cSkin.clone().lerp(cPattern, 0.35);

  if (options.columnarPad) {
    for (let d = 0; d < options.toes; d++) {
      const angle = (d / Math.max(1, options.toes - 1) - 0.5) * 1.25;
      const hx = endPt.x + Math.sin(angle) * lastJ.rx * 1.18;
      const hz = endPt.z + Math.cos(angle) * lastJ.rz * 1.22;

      const hoof = createCurvedClawOrTooth(options.clawLength * 1.05, options.footWidth * 0.17, 0.25, clawMat);
      hoof.rotation.x = Math.PI / 2.3;
      hoof.rotation.z = -angle * 0.6;
      hoof.position.set(hx, 0.04, hz);
      limbGroup.add(hoof);
    }
  } else {
    for (let d = 0; d < options.toes; d++) {
      const spread = options.toes > 1 ? d / (options.toes - 1) - 0.5 : 0;
      const toeAngle = spread * 0.58;
      const isMiddle = Math.abs(spread) < 0.2;
      const tLen = options.footLength * (isMiddle ? 1.12 : 0.90);

      const isSickleToe = options.sickleClaw && ((isLeft && d === 0) || (!isLeft && d === options.toes - 1));

      const toeGroup = new THREE.Group();
      toeGroup.position.set(endPt.x + spread * options.footWidth * 0.45, endPt.y, endPt.z);
      toeGroup.rotation.y = toeAngle;

      if (isSickleToe) {
        const phalanxGeo = new THREE.CapsuleGeometry(options.footWidth * 0.15, tLen * 0.48, 6, 8);
        const pColors = new Float32Array(phalanxGeo.attributes.position.count * 3);
        for (let k = 0; k < phalanxGeo.attributes.position.count; k++) {
          pColors[k * 3] = cFootScale.r;
          pColors[k * 3 + 1] = cFootScale.g;
          pColors[k * 3 + 2] = cFootScale.b;
        }
        phalanxGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
        const phalanx = new THREE.Mesh(phalanxGeo, skinMat);
        phalanx.rotation.x = Math.PI / 4;
        phalanx.position.set(0, tLen * 0.22, tLen * 0.22);
        toeGroup.add(phalanx);

        const sickle = createCurvedClawOrTooth(options.clawLength * 2.0, options.footWidth * 0.19, 0.85, clawMat);
        sickle.rotation.x = Math.PI * 0.55;
        sickle.position.set(0, tLen * 0.42, tLen * 0.38);
        toeGroup.add(sickle);
      } else {
        const toeGeo = new THREE.CapsuleGeometry(options.footWidth * 0.18, tLen * 0.65, 6, 10);
        toeGeo.rotateX(Math.PI / 2);
        const tColors = new Float32Array(toeGeo.attributes.position.count * 3);
        for (let k = 0; k < toeGeo.attributes.position.count; k++) {
          tColors[k * 3] = cFootScale.r;
          tColors[k * 3 + 1] = cFootScale.g;
          tColors[k * 3 + 2] = cFootScale.b;
        }
        toeGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
        const toeMesh = new THREE.Mesh(toeGeo, skinMat);
        toeMesh.position.set(0, 0, tLen * 0.36);
        toeMesh.castShadow = true;
        toeGroup.add(toeMesh);

        const claw = createCurvedClawOrTooth(options.clawLength, options.footWidth * 0.15, 0.38, clawMat);
        claw.rotation.x = Math.PI / 2.1;
        claw.position.set(0, -0.02, tLen * 0.68);
        toeGroup.add(claw);
      }

      limbGroup.add(toeGroup);
    }
  }

  return limbGroup;
}

/**
 * Creates a realistic reptilian eye with a dark recessed orbital cavity, sculpted upper and lower
 * palpebral eyelids, supraorbital brow boss, dark limbal ring, golden-amber iris, and pupil.
 * Ensures crisp inside/outside contrast with zero color spill-over onto the surrounding cheek skin.
 */
export function createRealisticReptileEye(
  radius: number,
  isLeft: boolean,
  slitPupil: boolean,
  detailMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const xSign = isLeft ? 1 : -1;

  // 1. Dark Orbital Socket / Palpebral Sulcus Backing (prevents orange iris from touching raw green/brown skin)
  const socketGeo = new THREE.SphereGeometry(radius * 1.28, 14, 14);
  socketGeo.scale(0.42, 0.96, 1.22);
  const socketMat = new THREE.MeshStandardMaterial({
    color: 0x16120e,
    roughness: 0.92,
    metalness: 0.02,
  });
  const socket = new THREE.Mesh(socketGeo, socketMat);
  socket.position.x = -xSign * radius * 0.08;
  group.add(socket);

  // 2. Sculpted Upper & Lower Palpebral Eyelids framing the almond-shaped eye opening
  const upperLidGeo = new THREE.TorusGeometry(radius * 1.05, radius * 0.28, 8, 16, Math.PI * 1.08);
  upperLidGeo.rotateY((xSign * Math.PI) / 2);
  upperLidGeo.scale(0.75, 0.92, 1.15);
  const upperLid = new THREE.Mesh(upperLidGeo, detailMat);
  upperLid.position.set(xSign * radius * 0.05, radius * 0.06, 0);
  group.add(upperLid);

  const lowerLidGeo = new THREE.TorusGeometry(radius * 1.02, radius * 0.22, 8, 16, Math.PI * 0.96);
  lowerLidGeo.rotateY((xSign * Math.PI) / 2);
  lowerLidGeo.rotateX(Math.PI);
  lowerLidGeo.scale(0.70, 0.85, 1.12);
  const lowerLid = new THREE.Mesh(lowerLidGeo, detailMat);
  lowerLid.position.set(xSign * radius * 0.04, -radius * 0.06, 0);
  group.add(lowerLid);

  // Heavy Supraorbital Brow Ridge overarching the orbit
  const browGeo = new THREE.CapsuleGeometry(radius * 0.36, radius * 1.55, 6, 10);
  browGeo.rotateX(Math.PI / 2);
  const brow = new THREE.Mesh(browGeo, detailMat);
  brow.position.set(xSign * radius * 0.14, radius * 0.88, 0);
  brow.rotation.z = -xSign * 0.28;
  group.add(brow);

  // 3. Glossy Amber-Gold Reptilian Iris seated inside the dark orbital socket
  const irisGeo = new THREE.SphereGeometry(radius * 0.92, 14, 14);
  irisGeo.scale(0.55, 0.88, 0.98);
  const irisMat = new THREE.MeshPhysicalMaterial({
    color: 0xd97706,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const iris = new THREE.Mesh(irisGeo, irisMat);
  iris.position.x = xSign * radius * 0.10;
  group.add(iris);

  // 4. Crisp Black Pupil on the outward-facing corneal surface
  const pupilGeo = slitPupil
    ? new THREE.BoxGeometry(radius * 0.22, radius * 1.12, radius * 0.20)
    : new THREE.SphereGeometry(radius * 0.46, 10, 10);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x060606 });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.x = xSign * radius * 0.52;
  group.add(pupil);

  return group;
}

/**
 * Sculpts an anatomically contoured reptilian dinosaur head & hinged mandible.
 * Features vaulted upper palate, hollowed lower oral floor, darkened labial lip margins,
 * corner-of-mouth rictus cheek folds, framed nostrils, and recessed circumorbital eyes.
 */
export function createSculptedHead(
  spec: HeadSpec,
  skinHex: number,
  bellyHex: number,
  patternHex: number,
  mats: DinoMaterials,
  slitPupil = true
): { headGroup: THREE.Group; jawGroup: THREE.Group } {
  const headGroup = new THREE.Group();
  headGroup.position.set(...spec.attachPos);
  headGroup.rotation.x = spec.pitch;

  const L = spec.length;
  const W = spec.width * 0.5;
  const H = spec.height;

  // 1. Upper Cranium & Snout Loft ('upperHead' mode keeps ventral palate vaulted and upper lips dark/scaly)
  const craniumStations: BodyStation[] = [
    { pos: [0, -0.02 * H, -0.24 * L], rx: W * 0.86, ryTop: H * 0.44, ryBottom: H * 0.24, pinchTop: 1.15 },
    { pos: [0, 0.04 * H, 0.04 * L], rx: W * 1.02, ryTop: H * 0.48, ryBottom: H * 0.18, pinchTop: 1.12 },
    { pos: [0, 0.06 * H, 0.28 * L], rx: W * 0.90, ryTop: H * (0.50 + spec.browCrest), ryBottom: H * 0.16, pinchTop: 1.22 },
    {
      pos: [0, 0.03 * H, 0.56 * L],
      rx: W * THREE.MathUtils.lerp(0.42, 0.74, spec.snoutTaper),
      ryTop: H * (0.40 + (spec.nasalBoss ?? 0)),
      ryBottom: H * 0.14,
      pinchTop: 1.28,
    },
    {
      pos: [0, -spec.snoutDrop * H * 0.42, 0.84 * L],
      rx: W * THREE.MathUtils.lerp(0.30, 0.60, spec.snoutTaper),
      ryTop: H * 0.32,
      ryBottom: H * 0.12,
      pinchTop: 1.2,
    },
    {
      pos: [0, -spec.snoutDrop * H * 0.88, 1.0 * L],
      rx: W * THREE.MathUtils.lerp(0.18, 0.36, spec.snoutTaper),
      ryTop: H * 0.18,
      ryBottom: H * 0.09,
      pinchTop: 1.1,
    },
  ];

  const upperSkullMesh = createLoftedBodyMesh(
    craniumStations,
    skinHex,
    bellyHex,
    patternHex,
    mats.skinMat,
    {
      slices: 42,
      radialSegments: 32,
      dorsalRidge: 0.028,
      skinFolds: 0.015,
      shadingMode: 'upperHead',
    }
  );
  headGroup.add(upperSkullMesh);

  // Framed External Nostrils (fleshy scale rim + recessed dark nasal passage)
  for (const side of [-1, 1]) {
    const nostrilX = side * W * THREE.MathUtils.lerp(0.24, 0.43, spec.snoutTaper);
    const nostrilY = H * 0.09 - spec.snoutDrop * H * 0.45;
    const nostrilZ = L * 0.82;

    const narialRim = new THREE.Mesh(
      new THREE.TorusGeometry(W * 0.068, W * 0.024, 6, 12),
      mats.detailMat
    );
    narialRim.rotation.y = (side * Math.PI) / 2.4;
    narialRim.scale.set(1.35, 0.78, 1.0);
    narialRim.position.set(nostrilX, nostrilY, nostrilZ);
    headGroup.add(narialRim);

    const nostrilCavity = new THREE.Mesh(
      new THREE.SphereGeometry(W * 0.062, 8, 8),
      mats.darkCavityMat
    );
    nostrilCavity.scale.set(0.35, 0.68, 1.25);
    nostrilCavity.position.set(nostrilX * 0.96, nostrilY, nostrilZ);
    headGroup.add(nostrilCavity);

    // Subtle recessed Tympanic Ear Opening near posterior temporal region
    const earCavity = new THREE.Mesh(
      new THREE.SphereGeometry(W * 0.055, 8, 8),
      mats.darkCavityMat
    );
    earCavity.scale.set(0.3, 0.95, 0.65);
    earCavity.position.set(side * W * 0.95, H * 0.05, L * 0.05);
    headGroup.add(earCavity);
  }

  // Lateral Circumorbital Reptilian Eyes
  const eyeRadius = Math.max(0.028, Math.min(0.048, H * 0.074));
  const eyeX = W * 0.84;
  const eyeY = H * 0.15;
  const eyeZ = L * 0.28;

  const leftEye = createRealisticReptileEye(eyeRadius, true, slitPupil, mats.detailMat);
  leftEye.position.set(eyeX, eyeY, eyeZ);
  leftEye.rotation.y = 0.16;

  const rightEye = createRealisticReptileEye(eyeRadius, false, slitPupil, mats.detailMat);
  rightEye.position.set(-eyeX, eyeY, eyeZ);
  rightEye.rotation.y = -0.16;
  headGroup.add(leftEye, rightEye);

  // Upper Maxillary Teeth (erupting cleanly from the recessed alveolar groove inside the upper lip rim)
  if (spec.teethCount > 0) {
    for (let i = 0; i < spec.teethCount; i++) {
      const frac = i / Math.max(1, spec.teethCount - 1);
      const zPos = THREE.MathUtils.lerp(0.30 * L, 0.88 * L, frac);
      const jawHalfW = W * THREE.MathUtils.lerp(0.62, THREE.MathUtils.lerp(0.18, 0.38, spec.snoutTaper), frac);
      const sizeMod = Math.sin(frac * Math.PI * 0.85 + 0.2) * 0.65 + 0.35;
      const tLen = spec.toothLength * sizeMod;

      for (const side of [-1, 1]) {
        const tooth = createCurvedClawOrTooth(tLen, tLen * 0.16, -0.18, mats.toothMat);
        tooth.rotation.x = Math.PI;
        tooth.position.set(
          side * jawHalfW * 0.76,
          -H * 0.015 - frac * spec.snoutDrop * H * 0.42,
          zPos
        );
        headGroup.add(tooth);
      }
    }
  }

  // Keratinous Beak (for Triceratops, Stegosaurus, Ankylosaurus)
  if (spec.hasBeak) {
    const beakHook = createCurvedClawOrTooth(H * 0.42, W * 0.34, 0.42, mats.hornMat);
    beakHook.rotation.x = Math.PI * 0.72;
    beakHook.position.set(0, -H * 0.02, L * 0.94);
    headGroup.add(beakHook);
  }

  // 2. Hinged Lower Mandible ('lowerJaw' mode keeps oral trough recessed and pale throat strictly ventral)
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -H * 0.14, 0.04 * L);
  headGroup.add(jawGroup);

  const jawStations: BodyStation[] = [
    { pos: [0, 0.02 * H, -0.12 * L], rx: W * 0.78, ryTop: H * 0.08, ryBottom: spec.jawDepth * H * 0.82, pinchTop: 0.85 },
    { pos: [0, 0.0, 0.22 * L], rx: W * 0.70, ryTop: H * 0.06, ryBottom: spec.jawDepth * H * 0.86, pinchTop: 0.85 },
    {
      pos: [0, -spec.snoutDrop * H * 0.32, 0.58 * L],
      rx: W * THREE.MathUtils.lerp(0.25, 0.50, spec.snoutTaper),
      ryTop: H * 0.05,
      ryBottom: spec.jawDepth * H * 0.62,
      pinchTop: 0.9,
    },
    {
      pos: [0, -spec.snoutDrop * H * 0.72, 0.90 * L],
      rx: W * THREE.MathUtils.lerp(0.12, 0.27, spec.snoutTaper),
      ryTop: H * 0.04,
      ryBottom: spec.jawDepth * H * 0.38,
      pinchTop: 0.95,
    },
  ];

  const lowerJawMesh = createLoftedBodyMesh(
    jawStations,
    skinHex,
    bellyHex,
    patternHex,
    mats.skinMat,
    {
      slices: 30,
      radialSegments: 26,
      dorsalRidge: 0,
      skinFolds: 0.014,
      shadingMode: 'lowerJaw',
    }
  );
  jawGroup.add(lowerJawMesh);

  // Corner-of-Mouth Rictus Cheek Webbing (m. adductor mandibulae skin fold bridging upper & lower jaw corners)
  for (const side of [-1, 1]) {
    const rictusGeo = new THREE.CapsuleGeometry(W * 0.075, H * 0.16, 5, 8);
    rictusGeo.scale(0.55, 1.0, 1.65);
    const rictus = new THREE.Mesh(rictusGeo, mats.detailMat);
    rictus.position.set(side * W * 0.68, H * 0.07, 0.16 * L);
    rictus.rotation.x = 0.32;
    jawGroup.add(rictus);
  }

  // Narrow Fleshy Tongue seated deep inside the hollowed floor of the lower mandible
  const tongueGeo = new THREE.CapsuleGeometry(W * 0.10, L * 0.25, 4, 8);
  tongueGeo.rotateX(Math.PI / 2);
  tongueGeo.scale(1.0, 0.20, 1.0);
  const tongue = new THREE.Mesh(tongueGeo, mats.mouthMat);
  tongue.position.set(0, -H * 0.035, L * 0.28);
  jawGroup.add(tongue);

  // Lower Dentary Teeth (erupting inside the lower lip rim)
  if (spec.teethCount > 0) {
    const lowerCount = Math.max(2, spec.teethCount - 1);
    for (let i = 0; i < lowerCount; i++) {
      const frac = i / Math.max(1, lowerCount - 1);
      const zPos = THREE.MathUtils.lerp(0.24 * L, 0.82 * L, frac);
      const jawHalfW = W * THREE.MathUtils.lerp(0.50, THREE.MathUtils.lerp(0.14, 0.28, spec.snoutTaper), frac);
      const tLen = spec.toothLength * 0.68 * (Math.sin(frac * Math.PI * 0.8 + 0.2) * 0.65 + 0.35);

      for (const side of [-1, 1]) {
        const tooth = createCurvedClawOrTooth(tLen, tLen * 0.15, -0.16, mats.toothMat);
        tooth.position.set(
          side * jawHalfW * 0.72,
          -frac * spec.snoutDrop * H * 0.36,
          zPos
        );
        jawGroup.add(tooth);
      }
    }
  }

  return { headGroup, jawGroup };
}

// ============================================================================
// MUSEUM-GRADE FOSSIL RECORD SKELETON BUILDERS
// ============================================================================

/**
 * Sculpts a realistic waisted bone shaft with expanded proximal and distal articular condyles.
 */
function createWaistedBoneSegment(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  radius: number,
  bowOffset: THREE.Vector3,
  boneMat: THREE.Material
): THREE.Mesh {
  const mid = p0.clone().lerp(p1, 0.5).add(bowOffset);
  const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
  const slices = 16;
  const radSegs = 12;
  const positions: number[] = [];
  const indices: number[] = [];

  const worldUp = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    const pt = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();

    // Hourglass diaphysis shaft flaring into double-condyle epiphyses at t=0 and t=1
    const distFromMid = Math.abs(t - 0.5) * 2;
    const epiphysisFlare = Math.pow(distFromMid, 2.4) * 0.68;
    const capTaper = t < 0.035 ? t / 0.035 : t > 0.965 ? (1 - t) / 0.035 : 1.0;
    const r = radius * (0.72 + epiphysisFlare) * (0.45 + 0.55 * Math.sqrt(capTaper));

    const right = new THREE.Vector3().crossVectors(tan, worldUp);
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
    right.normalize();
    const norm = new THREE.Vector3().crossVectors(right, tan).normalize();

    for (let j = 0; j <= radSegs; j++) {
      const a = (j / radSegs) * Math.PI * 2;
      // Double-condyle bilobed profile near bone ends
      const condyleGroove = distFromMid > 0.7 ? 1.0 - 0.14 * Math.pow(Math.sin(a), 2) : 1.0;
      const xScale = (1.0 + Math.pow(distFromMid, 2) * 0.32) * condyleGroove;
      const x = Math.cos(a) * r * xScale;
      const z = Math.sin(a) * r * 0.86;
      const v = pt.clone().addScaledVector(right, x).addScaledVector(norm, z);
      positions.push(v.x, v.y, v.z);
    }
  }

  for (let i = 0; i < slices; i++) {
    for (let j = 0; j < radSegs; j++) {
      const a = i * (radSegs + 1) + j;
      const b = (i + 1) * (radSegs + 1) + j;
      const c = (i + 1) * (radSegs + 1) + (j + 1);
      const d = i * (radSegs + 1) + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, boneMat);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Reconstructs an articulated vertebral column differentiated into Cervical, Dorsal, Sacral, and Caudal
 * series based on the fossil record (including cervical ribs, diapophyses, zygapophyses, sacral fusion,
 * caudal haemal chevrons, ossified tendon rods, and Spinosaurus paddle-tail caudals).
 */
export function createArticulatedVertebralColumn(
  stations: BodyStation[],
  boneMat: THREE.Material,
  options?: {
    vertebraCount?: number;
    neuralSpineScale?: number;
    sailProfile?: (t: number) => number;
    caudalPaddleProfile?: (t: number) => number;
    ossifiedTailRods?: boolean;
    diplodocidBifidSpines?: boolean;
    tailClub?: boolean;
    tailSpikes?: boolean;
    ribStartT?: number;
    ribEndT?: number;
  }
): THREE.Group {
  const group = new THREE.Group();
  const count = options?.vertebraCount ?? 44;
  const spineScale = options?.neuralSpineScale ?? 1.0;
  const ribStartT = options?.ribStartT ?? 0.45;
  const ribEndT = options?.ribEndT ?? 0.80;

  const pts = stations.map((s) => new THREE.Vector3(...s.pos));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const totalLen = curve.getLength();
  const segLen = (totalLen / count) * 0.84;

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const { pos, tangent, rx, ryTop } = sampleStations(stations, t);

    const isCaudal = t < ribStartT - 0.05;
    const isSacral = t >= ribStartT - 0.05 && t <= ribStartT + 0.04;
    const isDorsal = t > ribStartT + 0.04 && t <= ribEndT;
    const isCervical = t > ribEndT;

    const vGroup = new THREE.Group();
    vGroup.position.copy(pos);

    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.lookAt(pos.clone().add(tangent));
    vGroup.quaternion.copy(dummy.quaternion);

    const centrumR = Math.max(0.026, Math.min(0.17, (rx + ryTop) * 0.155));

    // 1. Spool-shaped amphicoelous/opisthocoelous vertebral centrum with pleurocoel fossa
    const centrumGeo = new THREE.CylinderGeometry(
      centrumR,
      centrumR * (isSacral ? 1.05 : 0.90),
      segLen * (isSacral ? 1.18 : 0.94),
      10
    );
    centrumGeo.rotateX(Math.PI / 2);
    const centrum = new THREE.Mesh(centrumGeo, boneMat);
    centrum.castShadow = true;
    vGroup.add(centrum);

    // 2. Neural Arch Pedicles & Transverse Processes (Diapophyses / Caudal Ribs)
    if (isDorsal || isSacral || (isCaudal && t > 0.20)) {
      const tpWidth = isSacral ? rx * 0.88 : isDorsal ? Math.max(0.08, rx * 0.54) : rx * 0.46;
      const tpGeo = new THREE.BoxGeometry(tpWidth, centrumR * 0.32, segLen * 0.48);
      const tp = new THREE.Mesh(tpGeo, boneMat);
      tp.position.set(0, centrumR * 0.58, 0);
      vGroup.add(tp);
    }

    // 3. Backward-pointing Cervical Ribs on Neck Vertebrae
    if (isCervical && t < 0.97) {
      const cervRibLen = segLen * 1.45;
      for (const side of [-1, 1]) {
        const cRibGeo = new THREE.ConeGeometry(centrumR * 0.16, cervRibLen, 5);
        cRibGeo.rotateX(-Math.PI * 0.58);
        const cRib = new THREE.Mesh(cRibGeo, boneMat);
        cRib.position.set(side * centrumR * 0.85, -centrumR * 0.35, -cervRibLen * 0.38);
        vGroup.add(cRib);
      }
    }

    // 4. Neural Spine (Tall rectangular in theropods, bifid in Diplodocus, sail in Spinosaurus, paddle in Spino tail)
    const sailBoost = options?.sailProfile ? options.sailProfile(t) : 0;
    const paddleBoost = options?.caudalPaddleProfile ? options.caudalPaddleProfile(t) : 0;
    const regionScale = isCervical ? 0.65 : isSacral ? 1.12 : isDorsal ? 1.05 : 0.72;
    const naturalSpineH = Math.max(0.042, ryTop * 0.56 * spineScale * regionScale + sailBoost + paddleBoost);

    if (options?.diplodocidBifidSpines && (isCervical || (isDorsal && t > 0.60))) {
      // Bifurcated V-shaped neural spines characteristic of Diplodocus cervicals & anterior dorsals
      for (const side of [-1, 1]) {
        const branchGeo = new THREE.BoxGeometry(centrumR * 0.24, naturalSpineH * 0.92, segLen * 0.48);
        const branch = new THREE.Mesh(branchGeo, boneMat);
        branch.position.set(side * centrumR * 0.32, centrumR * 0.65 + naturalSpineH * 0.42, -segLen * 0.08);
        branch.rotation.z = -side * 0.22;
        branch.rotation.x = -0.14;
        vGroup.add(branch);
      }
    } else {
      const spineThickZ = sailBoost > 0.1 ? segLen * 0.72 : segLen * 0.54;
      const spineGeo = new THREE.BoxGeometry(centrumR * 0.32, naturalSpineH, spineThickZ);
      const nSpine = new THREE.Mesh(spineGeo, boneMat);
      nSpine.position.set(0, centrumR * 0.65 + naturalSpineH * 0.48, -segLen * 0.10);
      nSpine.rotation.x = isCaudal && paddleBoost === 0 ? -0.26 : -0.12;
      nSpine.castShadow = true;
      vGroup.add(nSpine);
    }

    // 5. Caudal Haemal Arches (Chevrons) underneath the tail vertebrae
    if (isCaudal && t > 0.05) {
      const chevH = Math.max(0.035, ryTop * 0.50 + paddleBoost * 0.68);
      const chevGeo = new THREE.ConeGeometry(centrumR * 0.24, chevH, 5);
      chevGeo.rotateX(Math.PI * 0.80);
      const chevron = new THREE.Mesh(chevGeo, boneMat);
      chevron.position.set(0, -centrumR * 0.80 - chevH * 0.36, -segLen * 0.18);
      vGroup.add(chevron);

      // Diplodocus "Double Beam" anteroposterior chevron skid on mid-caudals
      if (options?.diplodocidBifidSpines && t > 0.15 && t < 0.36) {
        const beamGeo = new THREE.CylinderGeometry(centrumR * 0.12, centrumR * 0.12, segLen * 1.4, 6);
        beamGeo.rotateX(Math.PI / 2);
        const beam = new THREE.Mesh(beamGeo, boneMat);
        beam.position.set(0, -centrumR * 0.82 - chevH * 0.65, -segLen * 0.15);
        vGroup.add(beam);
      }
    }

    // 6. Ossified Prezygapophyseal Tendon Bundle (Velociraptor & Ankylosaurus stiffened tail)
    if (options?.ossifiedTailRods && isCaudal && t < 0.36) {
      for (const side of [-1, 1]) {
        const rodGeo = new THREE.CylinderGeometry(0.009, 0.009, segLen * 1.65, 5);
        rodGeo.rotateX(Math.PI / 2);
        const rod = new THREE.Mesh(rodGeo, boneMat);
        rod.position.set(side * centrumR * 0.72, centrumR * 0.35, 0);
        vGroup.add(rod);
      }
    }

    group.add(vGroup);
  }

  if (options?.tailClub) {
    const { pos, tangent } = sampleStations(stations, 0.02);
    const clubGroup = new THREE.Group();
    clubGroup.position.copy(pos);
    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.lookAt(pos.clone().add(tangent));
    clubGroup.quaternion.copy(dummy.quaternion);

    for (const side of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), boneMat);
      lobe.scale.set(0.85, 0.65, 1.45);
      lobe.position.set(side * 0.17, 0, 0);
      lobe.castShadow = true;
      clubGroup.add(lobe);
    }
    const terminalLobe = new THREE.Mesh(new THREE.SphereGeometry(0.20, 10, 10), boneMat);
    terminalLobe.scale.set(1.1, 0.6, 1.1);
    terminalLobe.position.set(0, 0, -0.24);
    clubGroup.add(terminalLobe);
    group.add(clubGroup);
  }

  return group;
}

/**
 * Reconstructs an anatomical dinosaur ribcage with double-headed (capitulum + tuberculum)
 * thoracic ribs, paired sternal plates, and an articulated ventral gastralia basket.
 */
export function createAnatomicalRibcage(
  stations: BodyStation[],
  startT: number,
  endT: number,
  ribPairs: number,
  boneMat: THREE.Material,
  hasGastralia = false
): THREE.Group {
  const group = new THREE.Group();

  for (let i = 0; i < ribPairs; i++) {
    const frac = i / Math.max(1, ribPairs - 1);
    const t = THREE.MathUtils.lerp(startT, endT, frac);
    const { pos, rx, ryTop, ryBottom } = sampleStations(stations, t);

    // Anterior and posterior floating ribs are shorter than mid-dorsal ribs
    const ribEnv = Math.sin(frac * Math.PI * 0.88 + 0.18);
    const ribWidth = rx * (0.88 + ribEnv * 0.12);
    const ribDepth = (ryTop * 0.32 + ryBottom * 0.86) * (0.68 + ribEnv * 0.30);
    const sweepBack = -0.18 * ribDepth;

    for (const side of [-1, 1]) {
      // Main curved rib shaft
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pos.x + side * rx * 0.14, pos.y + ryTop * 0.12, pos.z),
        new THREE.Vector3(pos.x + side * ribWidth * 0.76, pos.y - ribDepth * 0.16, pos.z + sweepBack * 0.35),
        new THREE.Vector3(pos.x + side * ribWidth * 0.94, pos.y - ribDepth * 0.56, pos.z + sweepBack * 0.78),
        new THREE.Vector3(pos.x + side * ribWidth * 0.46, pos.y - ribDepth * 0.92, pos.z + sweepBack),
      ]);

      const ribRadius = Math.max(0.015, Math.min(0.036, rx * 0.036));
      const ribGeo = new THREE.TubeGeometry(ribCurve, 16, ribRadius, 7, false);
      const ribMesh = new THREE.Mesh(ribGeo, boneMat);
      ribMesh.castShadow = true;
      group.add(ribMesh);

      // Dorsal tuberculum strut articulating with the vertebral diapophysis
      const tubStrut = createWaistedBoneSegment(
        new THREE.Vector3(pos.x + side * rx * 0.26, pos.y + ryTop * 0.22, pos.z),
        new THREE.Vector3(pos.x + side * ribWidth * 0.48, pos.y - ribDepth * 0.02, pos.z + sweepBack * 0.15),
        ribRadius * 0.85,
        new THREE.Vector3(0, 0, 0),
        boneMat
      );
      group.add(tubStrut);
    }

    // Ventral Gastralia Basket (interlocking medial & lateral dermal belly ribs in theropods)
    if (hasGastralia && frac > 0.10 && frac < 0.84) {
      for (const side of [-1, 1]) {
        const gasCurve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(pos.x - side * 0.02, pos.y - ryBottom * 0.90, pos.z + 0.08),
          new THREE.Vector3(pos.x + side * rx * 0.32, pos.y - ryBottom * 0.84, pos.z),
          new THREE.Vector3(pos.x + side * rx * 0.58, pos.y - ryBottom * 0.64, pos.z - 0.08)
        );
        const gasGeo = new THREE.TubeGeometry(gasCurve, 8, Math.max(0.011, rx * 0.020), 5, false);
        group.add(new THREE.Mesh(gasGeo, boneMat));
      }
    }
  }

  return group;
}

/**
 * Reconstructs museum-accurate Pelvic (Ilium with perforate Acetabulum, Pubis + Pubic Boot / Prepubis, Ischium)
 * and Pectoral (Scapula blade, Coracoid plate, Furcula wishbone, Sternal plates) girdles.
 */
export function createSkeletalGirdles(
  hipPos: [number, number, number],
  shoulderPos: [number, number, number],
  pelvisWidth: number,
  pelvisScale: number,
  shoulderWidth: number,
  shoulderScale: number,
  isSaurischian: boolean,
  boneMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();

  // 1. Sculpted Ilium Blade with an Open Perforate Acetabulum (defining synapomorphy of Dinosauria!)
  const iliumShape = new THREE.Shape();
  iliumShape.moveTo(-0.56 * pelvisScale, 0.04 * pelvisScale); // Postacetabular blade
  iliumShape.quadraticCurveTo(-0.58 * pelvisScale, 0.36 * pelvisScale, 0.0, 0.40 * pelvisScale); // Dorsal iliac crest
  iliumShape.quadraticCurveTo(0.58 * pelvisScale, 0.38 * pelvisScale, 0.52 * pelvisScale, 0.06 * pelvisScale); // Preacetabular hook
  iliumShape.lineTo(0.22 * pelvisScale, 0.04 * pelvisScale); // Pubic peduncle
  // Perforate Acetabulum arch (open hip socket where the femoral head inserts!)
  iliumShape.absarc(0, 0.04 * pelvisScale, 0.16 * pelvisScale, 0, Math.PI, false);
  iliumShape.lineTo(-0.22 * pelvisScale, 0.04 * pelvisScale); // Ischiadic peduncle
  iliumShape.closePath();

  const iliumGeo = new THREE.ExtrudeGeometry(iliumShape, {
    depth: 0.045 * pelvisScale,
    bevelEnabled: true,
    bevelThickness: 0.014 * pelvisScale,
    bevelSize: 0.014 * pelvisScale,
    bevelSegments: 2,
  });
  iliumGeo.rotateY(Math.PI / 2);

  for (const side of [-1, 1]) {
    const pGroup = new THREE.Group();
    pGroup.position.set(hipPos[0] + side * pelvisWidth * 0.48, hipPos[1], hipPos[2]);

    const ilium = new THREE.Mesh(iliumGeo, boneMat);
    ilium.position.set(-0.02 * pelvisScale, 0.02 * pelvisScale, 0);
    ilium.castShadow = true;
    pGroup.add(ilium);

    // Lower Acetabular Rim Bar connecting pubic and ischiadic peduncles
    const ischium = createWaistedBoneSegment(
      new THREE.Vector3(0, 0.02 * pelvisScale, -0.15 * pelvisScale),
      new THREE.Vector3(-side * 0.08 * pelvisScale, -0.60 * pelvisScale, -0.76 * pelvisScale),
      0.038 * pelvisScale,
      new THREE.Vector3(0, -0.05 * pelvisScale, -0.05 * pelvisScale),
      boneMat
    );
    pGroup.add(ischium);

    if (isSaurischian) {
      // Saurischian propubic pelvis: forward-and-downward pubis + expanded distal pubic boot
      const pubisShaft = createWaistedBoneSegment(
        new THREE.Vector3(0, 0.02 * pelvisScale, 0.15 * pelvisScale),
        new THREE.Vector3(-side * 0.08 * pelvisScale, -0.68 * pelvisScale, 0.24 * pelvisScale),
        0.038 * pelvisScale,
        new THREE.Vector3(0, 0, 0.06 * pelvisScale),
        boneMat
      );
      const pubicBoot = createWaistedBoneSegment(
        new THREE.Vector3(-side * 0.08 * pelvisScale, -0.68 * pelvisScale, 0.28 * pelvisScale),
        new THREE.Vector3(-side * 0.08 * pelvisScale, -0.70 * pelvisScale, -0.16 * pelvisScale),
        0.048 * pelvisScale,
        new THREE.Vector3(0, -0.04 * pelvisScale, 0),
        boneMat
      );
      pGroup.add(pubisShaft, pubicBoot);
    } else {
      // Ornithischian opisthopubic pelvis: anterior prepubic blade + retroverted postpubic rod parallel to ischium
      const prepubis = createWaistedBoneSegment(
        new THREE.Vector3(0, 0.0 * pelvisScale, 0.14 * pelvisScale),
        new THREE.Vector3(0, 0.04 * pelvisScale, 0.56 * pelvisScale),
        0.036 * pelvisScale,
        new THREE.Vector3(0, -0.02 * pelvisScale, 0),
        boneMat
      );
      const postpubis = createWaistedBoneSegment(
        new THREE.Vector3(0, 0.0 * pelvisScale, 0.12 * pelvisScale),
        new THREE.Vector3(-side * 0.06 * pelvisScale, -0.52 * pelvisScale, -0.64 * pelvisScale),
        0.026 * pelvisScale,
        new THREE.Vector3(0, -0.04 * pelvisScale, 0),
        boneMat
      );
      pGroup.add(prepubis, postpubis);
    }

    group.add(pGroup);
  }

  // 2. Pectoral Girdle: Strap-like Scapula + Rounded Coracoid + Glenoid Fossa + Furcula
  for (const side of [-1, 1]) {
    const sGroup = new THREE.Group();
    sGroup.position.set(shoulderPos[0] + side * shoulderWidth * 0.58, shoulderPos[1], shoulderPos[2]);

    // Scapular blade sweeping posterodorsally over the ribcage
    const scapula = createWaistedBoneSegment(
      new THREE.Vector3(0, -0.04 * shoulderScale, 0.06 * shoulderScale),
      new THREE.Vector3(0, 0.62 * shoulderScale, -0.56 * shoulderScale),
      0.046 * shoulderScale,
      new THREE.Vector3(side * 0.06 * shoulderScale, 0.14 * shoulderScale, 0),
      boneMat
    );
    scapula.scale.set(0.48, 1.0, 1.45);
    sGroup.add(scapula);

    // Anterior Coracoid plate & Glenoid socket
    const coracoidGeo = new THREE.CylinderGeometry(
      0.11 * shoulderScale,
      0.11 * shoulderScale,
      0.035 * shoulderScale,
      12
    );
    coracoidGeo.rotateZ(Math.PI / 2);
    const coracoid = new THREE.Mesh(coracoidGeo, boneMat);
    coracoid.position.set(-side * 0.03 * shoulderScale, -0.08 * shoulderScale, 0.10 * shoulderScale);
    coracoid.rotation.y = side * 0.35;
    sGroup.add(coracoid);

    group.add(sGroup);
  }

  // Furcula (wishbone) bridging the anterior chest in saurischians
  if (isSaurischian) {
    const furculaCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-shoulderWidth * 0.46, shoulderPos[1] - 0.06 * shoulderScale, shoulderPos[2] + 0.12 * shoulderScale),
      new THREE.Vector3(0, shoulderPos[1] - 0.22 * shoulderScale, shoulderPos[2] + 0.22 * shoulderScale),
      new THREE.Vector3(shoulderWidth * 0.46, shoulderPos[1] - 0.06 * shoulderScale, shoulderPos[2] + 0.12 * shoulderScale)
    );
    const furculaGeo = new THREE.TubeGeometry(furculaCurve, 12, 0.018 * shoulderScale, 6, false);
    group.add(new THREE.Mesh(furculaGeo, boneMat));
  }

  return group;
}

/**
 * Reconstructs an articulated limb skeleton:
 * - Femur with in-turned medial femoral head (caput femoris) articulating into the pelvic acetabulum
 *   (or Humerus with deltopectoral crest)
 * - Paired Tibia (with cnemial crest & astragalus) + Fibula (or Radius + Ulna with olecranon process)
 * - Closely appressed Metatarsals II-IV + medial Hallux dewclaw I (or 5-digit sauropod/ornithischian colonnade)
 * - Multi-phalanx articulated digits + curved bony ungual cores.
 */
export function createSkeletalLimb(
  joints: LimbJoint[],
  isLeft: boolean,
  boneMat: THREE.Material,
  options: {
    toes: number;
    footLength: number;
    footWidth: number;
    clawLength: number;
    sickleClaw?: boolean;
    columnarPad?: boolean;
  }
): THREE.Group {
  const group = new THREE.Group();
  const xSign = isLeft ? 1 : -1;
  const pts = joints.map((j) => new THREE.Vector3(j.pos[0] * xSign, j.pos[1], j.pos[2]));

  // 1. Stylopodium: Femur (with medial caput femoris & fourth trochanter) or Humerus
  if (pts.length >= 2) {
    const r = Math.max(0.034, joints[0].rx * 0.27);
    const femur = createWaistedBoneSegment(
      pts[0],
      pts[1],
      r,
      new THREE.Vector3(0, 0, r * 0.45),
      boneMat
    );
    group.add(femur);

    // Medial in-turned femoral/humeral head articulating directly into the acetabulum/glenoid socket
    const caput = createWaistedBoneSegment(
      pts[0].clone().add(new THREE.Vector3(xSign * r * 0.2, -r * 0.15, 0)),
      pts[0].clone().add(new THREE.Vector3(-xSign * r * 1.45, r * 0.18, 0)),
      r * 0.78,
      new THREE.Vector3(0, r * 0.1, 0),
      boneMat
    );
    group.add(caput);
  }

  // 2. Zeugopodium: Paired Tibia + Fibula (or Radius + Ulna)
  if (pts.length >= 3) {
    const p1 = pts[1];
    const p2 = pts[2];
    const rMain = Math.max(0.026, joints[1].rx * 0.24);
    const rThin = rMain * 0.50;

    const tibia = createWaistedBoneSegment(
      p1.clone().add(new THREE.Vector3(-xSign * rMain * 0.22, 0, rMain * 0.22)),
      p2.clone().add(new THREE.Vector3(-xSign * rMain * 0.15, 0, rMain * 0.12)),
      rMain,
      new THREE.Vector3(0, 0, rMain * 0.16),
      boneMat
    );
    const fibula = createWaistedBoneSegment(
      p1.clone().add(new THREE.Vector3(xSign * rMain * 0.48, 0, -rMain * 0.28)),
      p2.clone().add(new THREE.Vector3(xSign * rMain * 0.38, 0, -rMain * 0.18)),
      rThin,
      new THREE.Vector3(0, 0, -rThin * 0.15),
      boneMat
    );
    group.add(tibia, fibula);
  }

  // 3. Metapodium: Metatarsals II-IV (+ Hallux I in theropods) or 5-metacarpal colonnade
  if (pts.length >= 4) {
    const p2 = pts[2];
    const p3 = pts[3];
    const metaCount = options.columnarPad ? Math.min(5, options.toes) : Math.min(3, options.toes);
    const rMeta = Math.max(0.015, joints[2].rx * (options.columnarPad ? 0.13 : 0.16));

    for (let m = 0; m < metaCount; m++) {
      const spread = metaCount > 1 ? m / (metaCount - 1) - 0.5 : 0;
      const offset = spread * rMeta * (options.columnarPad ? 4.2 : 3.2);
      const archZ = options.columnarPad ? Math.cos(spread * Math.PI) * rMeta * 1.4 : 0;
      const meta = createWaistedBoneSegment(
        p2.clone().add(new THREE.Vector3(offset * 0.85, 0, archZ * 0.5)),
        p3.clone().add(new THREE.Vector3(offset * 1.35, 0, archZ)),
        rMeta,
        new THREE.Vector3(0, 0, 0),
        boneMat
      );
      group.add(meta);
    }

    // Medial vestigial Hallux (Dewclaw Digit I) on the back of theropod tarsometatarsus
    if (!options.columnarPad && options.toes === 3) {
      const halluxPos = p2.clone().lerp(p3, 0.68).add(new THREE.Vector3(-xSign * rMeta * 2.1, 0, -rMeta * 1.2));
      const halluxClaw = createCurvedClawOrTooth(options.clawLength * 0.58, rMeta * 0.85, 0.45, boneMat);
      halluxClaw.position.copy(halluxPos);
      halluxClaw.rotation.x = Math.PI * 0.65;
      halluxClaw.rotation.z = xSign * 0.35;
      group.add(halluxClaw);
    }
  }

  // 4. Acropodium: Multi-phalanx Articulated Digits & Bony Ungual Cores
  const footPt = pts[pts.length - 1];
  const rToe = Math.max(0.014, options.footWidth * 0.082);

  for (let d = 0; d < options.toes; d++) {
    const spread = options.toes > 1 ? d / (options.toes - 1) - 0.5 : 0;
    const isSickle = options.sickleClaw && ((isLeft && d === 0) || (!isLeft && d === options.toes - 1));
    const digitGroup = new THREE.Group();
    digitGroup.position.set(footPt.x + spread * options.footWidth * 0.48, footPt.y, footPt.z);
    digitGroup.rotation.y = spread * (options.columnarPad ? 0.85 : 0.58);

    if (isSickle) {
      // Hyper-extended Dromaeosaurid Digit II Phalanges + Giant Sickle Ungual
      const phal1 = createWaistedBoneSegment(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, options.footLength * 0.28, options.footLength * 0.24),
        rToe * 1.1,
        new THREE.Vector3(0, 0, 0),
        boneMat
      );
      const sickleBone = createCurvedClawOrTooth(options.clawLength * 1.95, rToe * 1.38, 0.88, boneMat);
      sickleBone.rotation.x = Math.PI * 0.55;
      sickleBone.position.set(0, options.footLength * 0.28, options.footLength * 0.24);
      digitGroup.add(phal1, sickleBone);
    } else {
      const tLen = options.footLength * (Math.abs(spread) < 0.2 ? 1.08 : 0.86);
      const phalanxCount = options.columnarPad ? 2 : 3;
      const segStep = (tLen * 0.72) / phalanxCount;
      for (let p = 0; p < phalanxCount; p++) {
        const pBone = createWaistedBoneSegment(
          new THREE.Vector3(0, 0, p * segStep),
          new THREE.Vector3(0, 0, (p + 0.92) * segStep),
          rToe * (1 - p * 0.10),
          new THREE.Vector3(0, 0, 0),
          boneMat
        );
        digitGroup.add(pBone);
      }
      const ungual = createCurvedClawOrTooth(options.clawLength * 0.95, rToe * 1.10, 0.38, boneMat);
      ungual.rotation.x = Math.PI / 2.1;
      ungual.position.set(0, -0.01, tLen * 0.72);
      digitGroup.add(ungual);
    }

    group.add(digitGroup);
  }

  return group;
}

/**
 * Helper that warps an extruded 2D lateral skull or jaw geometry into a true 3D convergent skull
 * where the left and right premaxillae/dentaries curve inward along a parabolic dental arcade
 * to meet and fuse at the anterior midline symphysis (x = 0 at z = L), while flaring out
 * posteriorly to the full jugal/quadrate width!
 */
function deformSkullWallTo3DArcade(
  baseGeo: THREE.BufferGeometry,
  side: number,
  halfWidthBack: number,
  snoutTaper: number,
  L: number,
  isJaw: boolean
): THREE.BufferGeometry {
  const geo = baseGeo.clone();
  const posAttr = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    v.fromBufferAttribute(posAttr, i);
    // After rotateY(-Math.PI/2), v.z is along the anteroposterior axis [0 .. L], and v.x is wall thickness
    const zClamped = Math.max(0, Math.min(L, v.z));
    const zFrac = zClamped / L;

    // Parabolic archosaurian skull arcade: wide at quadrate/jugal (zFrac=0..0.28),
    // tapering along maxilla (0.28..0.84), and curving to fuse at x=0 at the anterior symphysis (zFrac=1.0)
    const midSnoutFactor = THREE.MathUtils.lerp(0.32, 0.68, snoutTaper);
    let widthEnvelope: number;
    if (zFrac < 0.28) {
      widthEnvelope = THREE.MathUtils.lerp(0.88, 1.0, zFrac / 0.28);
    } else if (zFrac < 0.82) {
      const u = (zFrac - 0.28) / 0.54;
      widthEnvelope = THREE.MathUtils.lerp(1.0, midSnoutFactor, u);
    } else {
      const u = Math.min(1, (zFrac - 0.82) / 0.18);
      widthEnvelope = midSnoutFactor * Math.sqrt(Math.max(0, 1 - u * u * 0.92));
    }

    const jawInset = isJaw ? 0.88 : 1.0;
    const archX = side * halfWidthBack * widthEnvelope * jawInset;
    posAttr.setXYZ(i, v.x + archX, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Reconstructs a museum-grade 3D fenestrated fossil skull tailored to the exact fossil record of each clade:
 * - True 3D parabolic convergence at the anterior premaxillary & mandibular symphysis
 * - Species-accurate External Naris, Antorbital Fenestra, Orbit (+ Sclerotic Ring), Infratemporal Fenestra,
 *   and Mandibular Fenestra
 * - Dorsal nasal-frontal-parietal skull roof, braincase, postorbital bars, and full dentition/beak.
 */
export function createSkeletalSkull(
  spec: HeadSpec,
  boneMat: THREE.Material,
  toothMat: THREE.Material,
  _darkMat: THREE.Material
): THREE.Group {
  const skullGroup = new THREE.Group();
  skullGroup.position.set(...spec.attachPos);
  skullGroup.rotation.x = spec.pitch;

  const L = spec.length;
  const W = spec.width * 0.46;
  const H = spec.height;
  const drop = spec.snoutDrop * H;
  const skullType = spec.skullType ?? 'tyrannosaur';

  // 1. Lateral Cranium Silhouette (Shape in X=z_forward, Y=y_up before rotation)
  const craniumShape = new THREE.Shape();
  craniumShape.moveTo(0.0, -0.13 * H);
  craniumShape.lineTo(0.0, 0.40 * H);

  if (skullType === 'sauropod-arch') {
    // Brachiosaurus (Giraffatitan MB.R.2180): high vaulted nasal arch dome above the orbits + low anterior premaxillary spoon
    craniumShape.quadraticCurveTo(0.24 * L, 0.48 * H, 0.46 * L, H * (0.48 + (spec.nasalBoss ?? 0.3)));
    craniumShape.quadraticCurveTo(0.68 * L, H * 0.22 - drop * 0.3, 0.96 * L, H * 0.08 - drop * 0.85);
  } else if (skullType === 'spinosaur') {
    // Spinosaurus (MSNM V4047): long low crocodile rostrum with median nasal crest, sub-narial notch, and terminal rosette
    craniumShape.quadraticCurveTo(0.26 * L, 0.44 * H, 0.44 * L, H * (0.42 + (spec.nasalBoss ?? 0.14)));
    craniumShape.quadraticCurveTo(0.72 * L, 0.24 * H - drop * 0.3, 0.97 * L, 0.14 * H - drop * 0.75);
  } else if (skullType === 'dromaeosaur') {
    // Velociraptor (IGM 100/976): concave upturned dorsal snout profile
    craniumShape.quadraticCurveTo(0.28 * L, 0.46 * H, 0.56 * L, 0.28 * H);
    craniumShape.quadraticCurveTo(0.80 * L, 0.22 * H, 0.96 * L, 0.14 * H - drop * 0.7);
  } else {
    craniumShape.quadraticCurveTo(
      0.25 * L,
      H * (0.48 + spec.browCrest * 0.65),
      0.48 * L,
      H * (0.42 + (spec.nasalBoss ?? 0))
    );
    craniumShape.quadraticCurveTo(0.76 * L, H * 0.32 - drop * 0.4, 0.96 * L, H * 0.12 - drop * 0.85);
  }

  craniumShape.quadraticCurveTo(1.0 * L, -0.06 * H - drop * 0.9, 0.92 * L, -0.13 * H - drop * 0.85);
  if (skullType === 'spinosaur') {
    // Sub-narial notch (diastema) in the Spinosaurus upper jaw margin
    craniumShape.quadraticCurveTo(0.80 * L, -0.05 * H - drop * 0.6, 0.68 * L, -0.14 * H - drop * 0.45);
    craniumShape.quadraticCurveTo(0.35 * L, -0.15 * H, 0.0, -0.13 * H);
  } else {
    craniumShape.quadraticCurveTo(0.50 * L, -0.15 * H - drop * 0.3, 0.0, -0.13 * H);
  }

  // 2. Species-Accurate Archosaurian Cranial Fenestrae (Holes)
  if (skullType === 'ankylosaur') {
    // Ankylosaurus (AMNH 5214): temporal & antorbital fenestrae are closed by dermal caputegulae; only orbit & anterior naris open!
    const orbitHole = new THREE.Path();
    orbitHole.absellipse(0.32 * L, 0.12 * H, 0.065 * L, 0.11 * H, 0, Math.PI * 2, false, 0);
    craniumShape.holes.push(orbitHole);

    const narisHole = new THREE.Path();
    narisHole.absellipse(0.84 * L, 0.04 * H - drop * 0.55, 0.055 * L, 0.06 * H, 0, Math.PI * 2, false, 0);
    craniumShape.holes.push(narisHole);
  } else if (skullType === 'ceratopsian') {
    // Triceratops: high round orbit beneath brow horn, modest antorbital fossa, Huge anterior external naris!
    const infraHole = new THREE.Path();
    infraHole.absellipse(0.11 * L, 0.04 * H, 0.045 * L, 0.09 * H, 0, Math.PI * 2, false, 0);
    craniumShape.holes.push(infraHole);

    const orbitHole = new THREE.Path();
    orbitHole.absellipse(0.28 * L, 0.18 * H, 0.062 * L, 0.12 * H, 0, Math.PI * 2, false, 0);
    craniumShape.holes.push(orbitHole);

    const narisHole = new THREE.Path();
    narisHole.absellipse(0.68 * L, 0.08 * H - drop * 0.35, 0.11 * L, 0.12 * H, 0, Math.PI * 2, false, -0.15);
    craniumShape.holes.push(narisHole);
  } else {
    // Standard 4 lateral cranial openings: Infratemporal, Orbit, Antorbital, External Naris
    const infraHole = new THREE.Path();
    infraHole.absellipse(0.11 * L, 0.12 * H, 0.052 * L, 0.17 * H, 0, Math.PI * 2, false, 0);
    craniumShape.holes.push(infraHole);

    const orbitHole = new THREE.Path();
    if (skullType === 'tyrannosaur') {
      // Keyhole-shaped orbit of Tyrannosaurus rex!
      orbitHole.absellipse(0.28 * L, 0.15 * H, 0.055 * L, 0.165 * H, 0, Math.PI * 2, false, 0);
    } else {
      orbitHole.absellipse(0.28 * L, 0.16 * H, 0.068 * L, 0.145 * H, 0, Math.PI * 2, false, 0);
    }
    craniumShape.holes.push(orbitHole);

    const antorbHole = new THREE.Path();
    if (skullType === 'sauropod-arch') {
      // Huge arched naso-antorbital opening in Brachiosaurus
      antorbHole.absellipse(0.52 * L, 0.28 * H, 0.11 * L, 0.18 * H, 0, Math.PI * 2, false, -0.25);
    } else {
      antorbHole.moveTo(0.42 * L, -0.04 * H);
      antorbHole.lineTo(0.43 * L, 0.25 * H);
      antorbHole.quadraticCurveTo(0.56 * L, 0.22 * H, 0.66 * L, 0.02 * H - drop * 0.25);
      antorbHole.lineTo(0.42 * L, -0.04 * H);
    }
    craniumShape.holes.push(antorbHole);

    const narisHole = new THREE.Path();
    if (skullType === 'spinosaur') {
      // Retracted mid-snout external naris in Spinosaurus
      narisHole.absellipse(0.68 * L, 0.12 * H - drop * 0.35, 0.048 * L, 0.045 * H, 0, Math.PI * 2, false, 0);
    } else if (skullType === 'diplodocid') {
      // High retracted dorsal naris in Diplodocus
      narisHole.absellipse(0.52 * L, 0.26 * H, 0.065 * L, 0.055 * H, 0, Math.PI * 2, false, -0.2);
    } else {
      narisHole.absellipse(0.82 * L, 0.06 * H - drop * 0.55, 0.058 * L, 0.065 * H, 0, Math.PI * 2, false, -0.15);
    }
    craniumShape.holes.push(narisHole);
  }

  const plateDepth = Math.max(0.024, W * 0.15);
  const baseCraniumGeo = new THREE.ExtrudeGeometry(craniumShape, {
    depth: plateDepth,
    bevelEnabled: true,
    bevelThickness: plateDepth * 0.35,
    bevelSize: plateDepth * 0.28,
    bevelSegments: 2,
  });
  baseCraniumGeo.rotateY(-Math.PI / 2);
  baseCraniumGeo.translate(plateDepth * 0.5, 0, 0);

  // 3. Lower Mandible Shape with Mandibular Fenestra
  const jawShape = new THREE.Shape();
  const jd = spec.jawDepth * H;
  jawShape.moveTo(-0.03 * L, -0.13 * H);
  jawShape.lineTo(0.92 * L, -0.14 * H - drop * 0.85);
  jawShape.quadraticCurveTo(
    0.95 * L,
    -0.14 * H - jd * 0.55 - drop * 0.85,
    0.86 * L,
    -0.14 * H - jd * 0.65 - drop * 0.8
  );
  jawShape.quadraticCurveTo(0.35 * L, -0.15 * H - jd, -0.03 * L, -0.14 * H - jd * 0.78);
  jawShape.closePath();

  if (skullType !== 'ankylosaur') {
    const mandHole = new THREE.Path();
    mandHole.absellipse(0.24 * L, -0.14 * H - jd * 0.48, 0.085 * L, jd * 0.22, 0, Math.PI * 2, false, 0);
    jawShape.holes.push(mandHole);
  }

  const baseJawGeo = new THREE.ExtrudeGeometry(jawShape, {
    depth: plateDepth * 0.88,
    bevelEnabled: true,
    bevelThickness: plateDepth * 0.28,
    bevelSize: plateDepth * 0.22,
    bevelSegments: 2,
  });
  baseJawGeo.rotateY(-Math.PI / 2);
  baseJawGeo.translate(plateDepth * 0.44, 0, 0);

  // Deform Left & Right Cranial and Mandibular Walls along the 3D Parabolic Arcade so they fuse at the snout tip!
  for (const side of [-1, 1]) {
    const warpedCranium = deformSkullWallTo3DArcade(baseCraniumGeo, side, W * 0.90, spec.snoutTaper, L, false);
    const sideWall = new THREE.Mesh(warpedCranium, boneMat);
    sideWall.castShadow = true;
    skullGroup.add(sideWall);

    const warpedJaw = deformSkullWallTo3DArcade(baseJawGeo, side, W * 0.86, spec.snoutTaper, L, true);
    const sideJaw = new THREE.Mesh(warpedJaw, boneMat);
    sideJaw.position.y = -0.015 * H;
    sideJaw.castShadow = true;
    skullGroup.add(sideJaw);

    // Bony Sclerotic Ring inside the orbit (preserved in Velociraptor, Stegosaurus, Sauropods)
    if (skullType === 'dromaeosaur' || skullType === 'stegosaur' || skullType === 'diplodocid') {
      const scleroticGeo = new THREE.TorusGeometry(0.055 * H, 0.012 * H, 6, 12);
      scleroticGeo.rotateY(Math.PI / 2);
      const sclerotic = new THREE.Mesh(scleroticGeo, boneMat);
      sclerotic.position.set(side * W * 0.82, 0.16 * H, 0.28 * L);
      skullGroup.add(sclerotic);
    }
  }

  // 4. 3D Dorsal Cranial Roof Bridge (Nasals, Frontals, Parietals, Braincase, and Occipital Condyle)
  const roofCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.36 * H, 0.01 * L),
    new THREE.Vector3(0, H * (0.45 + spec.browCrest * 0.45), 0.28 * L),
    new THREE.Vector3(0, H * (0.39 + (spec.nasalBoss ?? 0) * 0.85), 0.54 * L),
    new THREE.Vector3(0, H * 0.24 - drop * 0.45, 0.80 * L),
    new THREE.Vector3(0, H * 0.04 - drop * 0.85, 0.96 * L),
  ]);
  const roofGeo = new THREE.TubeGeometry(roofCurve, 20, W * 0.38, 10, false);
  roofGeo.scale(1.25, 0.26, 1.0);
  const roofMesh = new THREE.Mesh(roofGeo, boneMat);
  roofMesh.castShadow = true;
  skullGroup.add(roofMesh);

  // Transverse Nuchal / Occipital Plate & Braincase at the rear of the skull (z = 0)
  const occiputGeo = new THREE.BoxGeometry(W * 1.65, H * 0.46, plateDepth * 1.4);
  const occiput = new THREE.Mesh(occiputGeo, boneMat);
  occiput.position.set(0, 0.15 * H, 0.02 * L);
  skullGroup.add(occiput);

  // Anterior Premaxillary & Symphyseal Bridge closing the very tip of the upper and lower jaws
  const premaxTip = new THREE.Mesh(
    new THREE.CylinderGeometry(W * 0.22 * spec.snoutTaper, W * 0.26 * spec.snoutTaper, H * 0.22, 10),
    boneMat
  );
  premaxTip.position.set(0, -0.02 * H - drop * 0.85, 0.93 * L);
  skullGroup.add(premaxTip);

  const symphysisBridge = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.45 * spec.snoutTaper, jd * 0.48, L * 0.14),
    boneMat
  );
  symphysisBridge.position.set(0, -0.15 * H - jd * 0.35 - drop * 0.82, 0.86 * L);
  skullGroup.add(symphysisBridge);

  // 5. Fossil Dentition (Maxillary, Premaxillary & Dentary Teeth) or Rostral/Predentary BeakCores
  if (spec.teethCount > 0) {
    const startFrac = skullType === 'diplodocid' ? 0.68 : 0.28;
    for (let i = 0; i < spec.teethCount; i++) {
      const frac = i / Math.max(1, spec.teethCount - 1);
      const zPos = THREE.MathUtils.lerp(startFrac * L, 0.91 * L, frac);
      const zFrac = zPos / L;
      const midSnout = THREE.MathUtils.lerp(0.32, 0.68, spec.snoutTaper);
      const wEnv =
        zFrac < 0.82
          ? THREE.MathUtils.lerp(1.0, midSnout, (zFrac - 0.28) / 0.54)
          : midSnout * Math.sqrt(Math.max(0.15, 1 - Math.pow((zFrac - 0.82) / 0.18, 2)));
      const archX = W * 0.84 * wEnv;
      const tLen = spec.toothLength * (Math.sin(frac * Math.PI * 0.85 + 0.2) * 0.6 + 0.45);

      for (const side of [-1, 1]) {
        const uTooth = createCurvedClawOrTooth(tLen, tLen * 0.16, -0.18, toothMat);
        uTooth.rotation.x = Math.PI;
        uTooth.position.set(side * archX, -0.12 * H - zFrac * drop * 0.85, zPos);
        skullGroup.add(uTooth);

        const lTooth = createCurvedClawOrTooth(tLen * 0.72, tLen * 0.14, -0.15, toothMat);
        lTooth.position.set(side * archX * 0.88, -0.16 * H - zFrac * drop * 0.85, zPos);
        skullGroup.add(lTooth);
      }
    }
  }

  if (spec.hasBeak) {
    const rostralCore = createCurvedClawOrTooth(H * 0.38, W * 0.30, 0.40, boneMat);
    rostralCore.rotation.x = Math.PI * 0.72;
    rostralCore.position.set(0, -0.04 * H - drop * 0.8, 0.94 * L);
    skullGroup.add(rostralCore);
  }

  return skullGroup;
}
