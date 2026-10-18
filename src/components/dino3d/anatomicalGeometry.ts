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

function brightenColor(hex: number, boost = 1.28): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  hsl.s = Math.min(1.0, hsl.s * 1.12);
  hsl.l = Math.min(0.76, Math.max(0.14, hsl.l * boost));
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
 * Generates a continuous, high-resolution, organically sculpted dinosaur body mesh
 * along an anatomical spine with natural reptilian counter-shading, tiger-striping,
 * muscular shoulder/hip swells, gular throat dewlap, skin folds, and dorsal ridge.
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
  }
): THREE.Mesh {
  const slices = options?.slices ?? 96;
  const radialSegs = options?.radialSegments ?? 40;
  const dorsalRidge = options?.dorsalRidge ?? 0.055;
  const skinFolds = options?.skinFolds ?? 0.022;
  const lateralKeel = options?.lateralKeel ?? 0.0;
  const isHead = options?.isHead ?? false;

  const pts = stations.map((s) => new THREE.Vector3(...s.pos));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

  const vertexCount = (slices + 1) * (radialSegs + 1);
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  const cSkin = brightenColor(skinHex, 1.30);
  const cBelly = brightenColor(bellyHex, 1.12).lerp(cSkin, 0.25);
  const cPattern = brightenColor(patternHex, 0.72);
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

    const foldWave = Math.sin(t * Math.PI * 30) * skinFolds * (0.4 + 0.6 * Math.sin(t * Math.PI));
    // Naturalistic transverse dorsal tiger-bars / bands along tail, back, and neck
    const stripeFreq = isHead ? 7 : 22;
    const stripeRaw = Math.sin(t * Math.PI * stripeFreq + Math.sin(t * Math.PI * 5) * 0.6);
    const stripeWave = Math.pow(Math.max(0, stripeRaw), 1.8);

    // Gular throat dewlap under the neck (t in 0.72..0.96)
    const dewlapEnv = !isHead && t > 0.70 && t < 0.98 ? Math.sin(((t - 0.70) / 0.28) * Math.PI) : 0;

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const theta = u * Math.PI * 2;

      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      const isTop = cosT >= 0;
      const ry = isTop ? ryTop : ryBottom;

      const widthMod = isTop
        ? Math.pow(Math.abs(sinT), 1.0 / pinchTop) * (sinT >= 0 ? 1 : -1)
        : sinT * (1.0 + 0.09 * Math.sin(theta * 2));

      const dorsalPeak = isTop ? Math.pow(cosT, 8) * dorsalRidge : 0;
      const flankShelf = Math.pow(Math.abs(sinT), 6) * lateralKeel;
      // Lateral skin fold along lower ribcage/flank where belly meets side
      const lateralSkinFold = Math.exp(-Math.pow((cosT + 0.32) / 0.14, 2)) * 0.032 * rx;
      // Gular throat dewlap hanging beneath neck midline
      const dewlapSag = !isTop ? -Math.pow(-cosT, 5) * dewlapEnv * 0.14 * ryBottom : 0;

      const localX =
        (rx * widthMod + (sinT >= 0 ? flankShelf + lateralSkinFold : -flankShelf - lateralSkinFold)) *
        endCapFactor *
        (1 + foldWave);
      const localY = (ry * cosT + dorsalPeak + dewlapSag) * endCapFactor * (1 + foldWave * 0.5);

      const vx = pos.x + right.x * localX + upVec.x * localY;
      const vy = pos.y + right.y * localX + upVec.y * localY;
      const vz = pos.z + right.z * localX + upVec.z * localY;

      const vIdx = i * (radialSegs + 1) + j;
      positions[vIdx * 3] = vx;
      positions[vIdx * 3 + 1] = vy;
      positions[vIdx * 3 + 2] = vz;

      uvs[vIdx * 2] = t * (isHead ? 3.5 : 9.5);
      uvs[vIdx * 2 + 1] = u * (isHead ? 2.5 : 4.5);

      // Tapered tiger-stripes extending from dorsal spine down the upper flanks + countershaded belly
      const wavyBellyLine = -0.32 + 0.08 * Math.sin(t * Math.PI * 14);
      if (cosT > -0.15) {
        const heightFrac = (cosT + 0.15) / 1.15; // 0 at mid-flank, 1 at dorsal spine
        const barReach = Math.pow(heightFrac, 0.65) * stripeWave * 0.72;
        const dorsalBase = Math.pow(Math.max(0, cosT), 1.4) * 0.48;
        const mottle = Math.max(0, Math.sin(t * 42 + Math.abs(sinT) * 7)) * heightFrac * 0.18;
        const pMix = Math.min(1, Math.max(dorsalBase, barReach) + mottle);
        tempColor.copy(cSkin).lerp(cPattern, pMix);
      } else if (cosT < wavyBellyLine) {
        const bellyFactor = Math.min(1, (wavyBellyLine - cosT) / (1 + wavyBellyLine));
        const smoothBelly = bellyFactor * bellyFactor * (3 - 2 * bellyFactor);
        tempColor.copy(cSkin).lerp(cBelly, smoothBelly * 0.85);
      } else {
        tempColor.copy(cSkin);
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
 * Creates a curved, pointed keratin claw or tooth mesh.
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
      const x = Math.cos(a) * r * 0.76;
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
 * gastrocnemius calf musculature, untwisted sagittal cross-sections, and integrated feet.
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

  // Start the limb spline slightly higher & deeper inside the pelvis/shoulder along the vertical limb axis
  // so there is no sharp 90-degree kink at the hip joint!
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

  const cSkin = brightenColor(skinHex, 1.30);
  const cPattern = brightenColor(options.patternHex ?? skinHex, 0.75);
  const cInner = brightenColor(bellyHex, 1.08).lerp(cSkin, 0.45);
  const tempColor = new THREE.Color();

  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    const pos = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();

    // Untwisted anatomical frame: right is mediolateral (+X), forward is sagittal perpendicular to bone
    const right = new THREE.Vector3(1, 0, 0);
    const forward = new THREE.Vector3().crossVectors(right, tan).normalize();
    if (forward.z < 0) forward.negate();

    const scaled = t * (fullJoints.length - 1);
    const idx = Math.min(Math.floor(scaled), fullJoints.length - 2);
    const f = scaled - idx;
    const smoothF = f * f * (3 - 2 * f);

    let rx = THREE.MathUtils.lerp(fullJoints[idx].rx, fullJoints[idx + 1].rx, smoothF);
    let rz = THREE.MathUtils.lerp(fullJoints[idx].rz, fullJoints[idx + 1].rz, smoothF);

    // If columnarPad (sauropods, ceratopsians, stegosaurs, ankylosaurs), flare the bottom ankle smoothly into an elephantine foot pad!
    if (options.columnarPad && t > 0.82) {
      const padFrac = (t - 0.82) / 0.18;
      const flare = 1.0 + Math.sin(padFrac * Math.PI * 0.65) * 0.38;
      rx *= flare;
      rz *= flare * 1.08;
    }

    // Anatomical muscle bellies: thigh quadriceps/caudofemoralis (t~0.26) and calf gastrocnemius (t~0.60)
    const thighBulge = Math.exp(-Math.pow((t - 0.26) / 0.16, 2)) * 0.18;
    const calfBulge = Math.exp(-Math.pow((t - 0.58) / 0.12, 2)) * 0.15;
    const wrinkle = Math.sin(t * Math.PI * 22) * 0.018;
    const capScale = t < 0.04 ? Math.pow(t / 0.04, 0.5) : 1.0;

    // Subtle leg barring/striping on upper & middle limb
    const legStripe = Math.pow(Math.max(0, Math.sin(t * Math.PI * 10)), 2.0) * (1 - t * 0.7);

    for (let j = 0; j <= radSegs; j++) {
      const u = j / radSegs;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta); // mediolateral (+1 = +X, -1 = -X)
      const sinT = Math.sin(theta); // anteroposterior (+1 = anterior/front, -1 = posterior/back)

      // Flatten medial (inner) thigh slightly against body; round outer lateral muscle
      const lateralBias = cosT * xSign > 0 ? 1.06 : 0.82;
      // Caudofemoralis pulls posterior thigh (-sinT) backward; gastrocnemius bulges posterior calf
      const sagittalAsymmetry =
        sinT < 0 ? 1.0 + (thighBulge * 1.35 + calfBulge * 1.45) * (-sinT) : 1.0 + thighBulge * 0.55 * sinT;

      const lx = cosT * rx * lateralBias * (1 + thighBulge * 0.5 + calfBulge * 0.4) * capScale * (1 + wrinkle);
      const lz = sinT * rz * sagittalAsymmetry * capScale * (1 + wrinkle);

      const v = pos.clone().addScaledVector(right, lx).addScaledVector(forward, lz);
      // Clamp bottom of elephantine pad cleanly to ground plane
      if (options.columnarPad && t > 0.94) {
        v.y = Math.max(0.03, v.y * (1 - (t - 0.94) * 6));
      }

      const vIdx = i * (radSegs + 1) + j;
      positions[vIdx * 3] = v.x;
      positions[vIdx * 3 + 1] = v.y;
      positions[vIdx * 3 + 2] = v.z;

      uvs[vIdx * 2] = u * 3.5;
      uvs[vIdx * 2 + 1] = t * 5.5;

      const outerSide = Math.max(0, cosT * xSign);
      const haunchDorsalMix = Math.max(0, 1 - t / 0.38) * 0.42 + legStripe * outerSide * 0.38;
      const innerMix = Math.max(0, -cosT * xSign * 0.45);
      tempColor.copy(cSkin).lerp(cPattern, Math.min(0.85, haunchDorsalMix)).lerp(cInner, innerMix * (1 - haunchDorsalMix));

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

  if (options.columnarPad) {
    // Embedded blunt keratinous hoof-toes around the anterior perimeter of the flared elephantine foot
    for (let d = 0; d < options.toes; d++) {
      const angle = ((d / Math.max(1, options.toes - 1)) - 0.5) * 1.25;
      const hoof = createCurvedClawOrTooth(options.clawLength * 1.05, options.footWidth * 0.18, 0.25, clawMat);
      hoof.rotation.x = Math.PI / 2.3;
      hoof.rotation.z = -angle * 0.6;
      hoof.position.set(
        endPt.x + Math.sin(angle) * lastJ.rx * 1.22,
        0.04,
        endPt.z + Math.cos(angle) * lastJ.rz * 1.28
      );
      limbGroup.add(hoof);
    }
  } else {
    // Articulated digitigrade toes with phalangeal pads and curved talons
    for (let d = 0; d < options.toes; d++) {
      const spread = options.toes > 1 ? (d / (options.toes - 1)) - 0.5 : 0;
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
          pColors[k * 3] = cSkin.r;
          pColors[k * 3 + 1] = cSkin.g;
          pColors[k * 3 + 2] = cSkin.b;
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
          tColors[k * 3] = cSkin.r;
          tColors[k * 3 + 1] = cSkin.g;
          tColors[k * 3 + 2] = cSkin.b;
        }
        toeGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
        const toeMesh = new THREE.Mesh(toeGeo, skinMat);
        toeMesh.position.set(0, 0, tLen * 0.36);
        toeMesh.castShadow = true;
        toeGroup.add(toeMesh);

        const claw = createCurvedClawOrTooth(options.clawLength, options.footWidth * 0.15, 0.38, clawMat);
        claw.rotation.x = Math.PI / 2.1;
        claw.position.set(0, -0.02, tLen * 0.70);
        toeGroup.add(claw);
      }

      limbGroup.add(toeGroup);
    }
  }

  return limbGroup;
}

/**
 * Creates a realistic lateral reptilian eye with a sculpted scaly brow ridge above it.
 */
export function createRealisticReptileEye(
  radius: number,
  isLeft: boolean,
  slitPupil: boolean,
  detailMat: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const xSign = isLeft ? 1 : -1;

  // Glossy amber-gold eyeball recessed into the lateral orbital socket
  const irisGeo = new THREE.SphereGeometry(radius, 12, 12);
  irisGeo.scale(0.52, 0.88, 1.02);
  const irisMat = new THREE.MeshPhysicalMaterial({
    color: 0xf59e0b,
    roughness: 0.10,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });
  const iris = new THREE.Mesh(irisGeo, irisMat);
  group.add(iris);

  // Pupil on the lateral surface facing outward
  const pupilGeo = slitPupil
    ? new THREE.BoxGeometry(radius * 0.25, radius * 1.15, radius * 0.22)
    : new THREE.SphereGeometry(radius * 0.48, 8, 8);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x090909 });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.x = xSign * radius * 0.46;
  group.add(pupil);

  // Sculpted Supraorbital Scaly Brow Ridge overarching the top of the eye
  const browGeo = new THREE.CapsuleGeometry(radius * 0.38, radius * 1.45, 5, 8);
  browGeo.rotateX(Math.PI / 2);
  const brow = new THREE.Mesh(browGeo, detailMat);
  brow.position.set(xSign * radius * 0.18, radius * 0.78, 0);
  brow.rotation.z = -xSign * 0.25;
  group.add(brow);

  return group;
}

/**
 * Sculpts an anatomically contoured reptilian dinosaur head & hinged mandible
 * with supraorbital brow bosses, jugal cheekbones, flush-sunken lateral eyes, and sharp teeth.
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

  // 1. Upper Cranium & Snout Loft with distinct temporal/jugal width and narrowed maxillary rostrum
  const craniumStations: BodyStation[] = [
    { pos: [0, -0.04 * H, -0.26 * L], rx: W * 0.86, ryTop: H * 0.44, ryBottom: H * 0.32, pinchTop: 1.15 },
    { pos: [0, 0.03 * H, 0.04 * L], rx: W * 1.02, ryTop: H * 0.48, ryBottom: H * 0.24, pinchTop: 1.1 },
    { pos: [0, 0.06 * H, 0.28 * L], rx: W * 0.90, ryTop: H * (0.50 + spec.browCrest), ryBottom: H * 0.19, pinchTop: 1.2 },
    {
      pos: [0, 0.02 * H, 0.56 * L],
      rx: W * THREE.MathUtils.lerp(0.42, 0.74, spec.snoutTaper),
      ryTop: H * (0.40 + (spec.nasalBoss ?? 0)),
      ryBottom: H * 0.17,
      pinchTop: 1.28,
    },
    {
      pos: [0, -spec.snoutDrop * H * 0.45, 0.84 * L],
      rx: W * THREE.MathUtils.lerp(0.30, 0.60, spec.snoutTaper),
      ryTop: H * 0.32,
      ryBottom: H * 0.14,
      pinchTop: 1.2,
    },
    {
      pos: [0, -spec.snoutDrop * H * 0.95, 1.0 * L],
      rx: W * THREE.MathUtils.lerp(0.18, 0.36, spec.snoutTaper),
      ryTop: H * 0.18,
      ryBottom: H * 0.10,
      pinchTop: 1.1,
    },
  ];

  const upperSkullMesh = createLoftedBodyMesh(
    craniumStations,
    skinHex,
    bellyHex,
    patternHex,
    mats.skinMat,
    { slices: 40, radialSegments: 30, dorsalRidge: 0.028, skinFolds: 0.015, isHead: true }
  );
  headGroup.add(upperSkullMesh);

  // Recessed External Nostrils near Snout Tip
  for (const side of [-1, 1]) {
    const nostrilX = side * W * THREE.MathUtils.lerp(0.23, 0.42, spec.snoutTaper);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(W * 0.068, 8, 8), mats.darkCavityMat);
    nostril.scale.set(0.4, 0.7, 1.35);
    nostril.position.set(nostrilX, H * 0.08 - spec.snoutDrop * H * 0.5, L * 0.83);
    headGroup.add(nostril);
  }

  // Lateral Sunken Reptilian Eyes with Supraorbital Brow Ridges
  const eyeRadius = Math.max(0.028, Math.min(0.048, H * 0.072));
  const eyeX = W * 0.83;
  const eyeY = H * 0.14;
  const eyeZ = L * 0.28;

  const leftEye = createRealisticReptileEye(eyeRadius, true, slitPupil, mats.detailMat);
  leftEye.position.set(eyeX, eyeY, eyeZ);
  leftEye.rotation.y = 0.15;

  const rightEye = createRealisticReptileEye(eyeRadius, false, slitPupil, mats.detailMat);
  rightEye.position.set(-eyeX, eyeY, eyeZ);
  rightEye.rotation.y = -0.15;
  headGroup.add(leftEye, rightEye);

  // Upper Maxillary Teeth (tucked cleanly inside the upper lip margin)
  if (spec.teethCount > 0) {
    for (let i = 0; i < spec.teethCount; i++) {
      const frac = i / Math.max(1, spec.teethCount - 1);
      const zPos = THREE.MathUtils.lerp(0.32 * L, 0.88 * L, frac);
      const jawHalfW = W * THREE.MathUtils.lerp(0.62, THREE.MathUtils.lerp(0.18, 0.38, spec.snoutTaper), frac);
      const sizeMod = Math.sin(frac * Math.PI * 0.85 + 0.2) * 0.65 + 0.35;
      const tLen = spec.toothLength * sizeMod;

      for (const side of [-1, 1]) {
        const tooth = createCurvedClawOrTooth(tLen, tLen * 0.17, -0.2, mats.toothMat);
        tooth.rotation.x = Math.PI;
        tooth.position.set(side * jawHalfW * 0.82, -H * 0.13 - frac * spec.snoutDrop * H * 0.45, zPos);
        headGroup.add(tooth);
      }
    }
  }

  // Keratinous Beak (for Triceratops, Stegosaurus, Ankylosaurus)
  if (spec.hasBeak) {
    const beakHook = createCurvedClawOrTooth(H * 0.42, W * 0.34, 0.42, mats.hornMat);
    beakHook.rotation.x = Math.PI * 0.72;
    beakHook.position.set(0, -H * 0.04, L * 0.94);
    headGroup.add(beakHook);
  }

  // 2. Hinged Lower Mandible with powerful posterior adductor muscle jowl
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -H * 0.14, 0.04 * L);
  headGroup.add(jawGroup);

  const jawStations: BodyStation[] = [
    { pos: [0, 0, -0.12 * L], rx: W * 0.78, ryTop: H * 0.10, ryBottom: spec.jawDepth * H * 0.82, pinchTop: 0.8 },
    { pos: [0, -0.02 * H, 0.22 * L], rx: W * 0.72, ryTop: H * 0.07, ryBottom: spec.jawDepth * H * 0.88, pinchTop: 0.8 },
    {
      pos: [0, -spec.snoutDrop * H * 0.35, 0.58 * L],
      rx: W * THREE.MathUtils.lerp(0.25, 0.52, spec.snoutTaper),
      ryTop: H * 0.05,
      ryBottom: spec.jawDepth * H * 0.64,
      pinchTop: 0.85,
    },
    {
      pos: [0, -spec.snoutDrop * H * 0.75, 0.90 * L],
      rx: W * THREE.MathUtils.lerp(0.12, 0.28, spec.snoutTaper),
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
    { slices: 28, radialSegments: 24, dorsalRidge: 0, skinFolds: 0.014, isHead: true }
  );
  jawGroup.add(lowerJawMesh);

  // Narrow Recessed Tongue tucked completely inside the midline of the lower jaw
  const tongueGeo = new THREE.CapsuleGeometry(W * 0.11, L * 0.26, 4, 8);
  tongueGeo.rotateX(Math.PI / 2);
  tongueGeo.scale(1.0, 0.22, 1.0);
  const tongue = new THREE.Mesh(tongueGeo, mats.mouthMat);
  tongue.position.set(0, -H * 0.015, L * 0.28);
  jawGroup.add(tongue);

  // Lower Dentary Teeth
  if (spec.teethCount > 0) {
    const lowerCount = Math.max(2, spec.teethCount - 1);
    for (let i = 0; i < lowerCount; i++) {
      const frac = i / Math.max(1, lowerCount - 1);
      const zPos = THREE.MathUtils.lerp(0.24 * L, 0.82 * L, frac);
      const jawHalfW = W * THREE.MathUtils.lerp(0.52, THREE.MathUtils.lerp(0.14, 0.30, spec.snoutTaper), frac);
      const tLen = spec.toothLength * 0.70 * (Math.sin(frac * Math.PI * 0.8 + 0.2) * 0.65 + 0.35);

      for (const side of [-1, 1]) {
        const tooth = createCurvedClawOrTooth(tLen, tLen * 0.15, -0.18, mats.toothMat);
        tooth.position.set(side * jawHalfW * 0.76, H * 0.02 - frac * spec.snoutDrop * H * 0.45, zPos);
        jawGroup.add(tooth);
      }
    }
  }

  return { headGroup, jawGroup };
}

// ============================================================================
// MUSEUM-GRADE ARTICULATED FOSSIL SKELETON BUILDERS
// ============================================================================

function createWaistedBoneSegment(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  radius: number,
  bowOffset: THREE.Vector3,
  boneMat: THREE.Material
): THREE.Mesh {
  const mid = p0.clone().lerp(p1, 0.5).add(bowOffset);
  const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
  const slices = 14;
  const radSegs = 10;
  const positions: number[] = [];
  const indices: number[] = [];

  const worldUp = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i <= slices; i++) {
    const t = i / slices;
    const pt = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();

    const endFlare = Math.pow(Math.abs(t - 0.5) * 2, 2.2) * 0.55;
    const capTaper = t < 0.04 ? t / 0.04 : t > 0.96 ? (1 - t) / 0.04 : 1.0;
    const r = radius * (0.76 + endFlare) * (0.4 + 0.6 * Math.sqrt(capTaper));

    const right = new THREE.Vector3().crossVectors(tan, worldUp);
    if (right.lengthSq() < 0.001) right.set(1, 0, 0);
    right.normalize();
    const norm = new THREE.Vector3().crossVectors(right, tan).normalize();

    for (let j = 0; j <= radSegs; j++) {
      const a = (j / radSegs) * Math.PI * 2;
      const xScale = 1.0 + Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.25;
      const x = Math.cos(a) * r * xScale;
      const z = Math.sin(a) * r * 0.88;
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

export function createArticulatedVertebralColumn(
  stations: BodyStation[],
  boneMat: THREE.Material,
  options?: {
    vertebraCount?: number;
    neuralSpineScale?: number;
    sailProfile?: (t: number) => number;
    tailClub?: boolean;
    tailSpikes?: boolean;
  }
): THREE.Group {
  const group = new THREE.Group();
  const count = options?.vertebraCount ?? 40;
  const spineScale = options?.neuralSpineScale ?? 1.0;

  const pts = stations.map((s) => new THREE.Vector3(...s.pos));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  const totalLen = curve.getLength();
  const segLen = (totalLen / count) * 0.82;

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const { pos, tangent, rx, ryTop } = sampleStations(stations, t);

    const vGroup = new THREE.Group();
    vGroup.position.copy(pos);

    const dummy = new THREE.Object3D();
    dummy.position.copy(pos);
    dummy.lookAt(pos.clone().add(tangent));
    vGroup.quaternion.copy(dummy.quaternion);

    const centrumR = Math.max(0.028, Math.min(0.18, (rx + ryTop) * 0.16));

    const centrumGeo = new THREE.CylinderGeometry(centrumR, centrumR * 0.92, segLen, 10);
    centrumGeo.rotateX(Math.PI / 2);
    const centrum = new THREE.Mesh(centrumGeo, boneMat);
    centrum.castShadow = true;
    vGroup.add(centrum);

    if (t > 0.24 && t < 0.94) {
      const tpWidth = Math.max(0.07, rx * 0.58);
      const tpGeo = new THREE.BoxGeometry(tpWidth, centrumR * 0.35, segLen * 0.45);
      const tp = new THREE.Mesh(tpGeo, boneMat);
      tp.position.set(0, centrumR * 0.52, 0);
      vGroup.add(tp);
    }

    const sailBoost = options?.sailProfile ? options.sailProfile(t) : 0;
    const naturalSpineH = Math.max(0.045, ryTop * 0.58 * spineScale + sailBoost);
    const spineGeo = new THREE.BoxGeometry(centrumR * 0.34, naturalSpineH, segLen * 0.54);
    const nSpine = new THREE.Mesh(spineGeo, boneMat);
    nSpine.position.set(0, centrumR * 0.65 + naturalSpineH * 0.48, -segLen * 0.1);
    nSpine.rotation.x = -0.16;
    nSpine.castShadow = true;
    vGroup.add(nSpine);

    if (t > 0.06 && t < 0.42) {
      const chevH = Math.max(0.035, ryTop * 0.48);
      const chevGeo = new THREE.ConeGeometry(centrumR * 0.25, chevH, 5);
      chevGeo.rotateX(Math.PI * 0.82);
      const chevron = new THREE.Mesh(chevGeo, boneMat);
      chevron.position.set(0, -centrumR * 0.82 - chevH * 0.35, -segLen * 0.18);
      vGroup.add(chevron);
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

    const ribEnv = Math.sin(frac * Math.PI * 0.85 + 0.22);
    const ribWidth = rx * (0.90 + ribEnv * 0.12);
    const ribDepth = (ryTop * 0.35 + ryBottom * 0.85) * (0.72 + ribEnv * 0.26);
    const sweepBack = -0.16 * ribDepth;

    for (const side of [-1, 1]) {
      const ribCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(pos.x + side * rx * 0.16, pos.y + ryTop * 0.10, pos.z),
        new THREE.Vector3(pos.x + side * ribWidth * 0.76, pos.y - ribDepth * 0.18, pos.z + sweepBack * 0.4),
        new THREE.Vector3(pos.x + side * ribWidth * 0.94, pos.y - ribDepth * 0.58, pos.z + sweepBack * 0.8),
        new THREE.Vector3(pos.x + side * ribWidth * 0.48, pos.y - ribDepth * 0.92, pos.z + sweepBack),
      ]);

      const ribRadius = Math.max(0.016, Math.min(0.038, rx * 0.038));
      const ribGeo = new THREE.TubeGeometry(ribCurve, 14, ribRadius, 6, false);
      const ribMesh = new THREE.Mesh(ribGeo, boneMat);
      ribMesh.castShadow = true;
      group.add(ribMesh);
    }

    if (hasGastralia && frac > 0.12 && frac < 0.82) {
      for (const side of [-1, 1]) {
        const gasCurve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(pos.x, pos.y - ryBottom * 0.88, pos.z + 0.07),
          new THREE.Vector3(pos.x + side * rx * 0.34, pos.y - ryBottom * 0.82, pos.z),
          new THREE.Vector3(pos.x + side * rx * 0.56, pos.y - ryBottom * 0.64, pos.z - 0.07)
        );
        const gasGeo = new THREE.TubeGeometry(gasCurve, 8, Math.max(0.011, rx * 0.020), 5, false);
        group.add(new THREE.Mesh(gasGeo, boneMat));
      }
    }
  }

  return group;
}

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

  const iliumShape = new THREE.Shape();
  iliumShape.moveTo(-0.52 * pelvisScale, 0.05 * pelvisScale);
  iliumShape.quadraticCurveTo(-0.55 * pelvisScale, 0.34 * pelvisScale, 0.0, 0.38 * pelvisScale);
  iliumShape.quadraticCurveTo(0.55 * pelvisScale, 0.36 * pelvisScale, 0.48 * pelvisScale, 0.04 * pelvisScale);
  iliumShape.lineTo(0.20 * pelvisScale, 0.02 * pelvisScale);
  iliumShape.quadraticCurveTo(0.0, 0.18 * pelvisScale, -0.18 * pelvisScale, 0.02 * pelvisScale);
  iliumShape.closePath();

  const iliumGeo = new THREE.ExtrudeGeometry(iliumShape, {
    depth: 0.045 * pelvisScale,
    bevelEnabled: true,
    bevelThickness: 0.015 * pelvisScale,
    bevelSize: 0.015 * pelvisScale,
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

    const ischium = createWaistedBoneSegment(
      new THREE.Vector3(0, 0.02 * pelvisScale, -0.12 * pelvisScale),
      new THREE.Vector3(-side * 0.08 * pelvisScale, -0.58 * pelvisScale, -0.74 * pelvisScale),
      0.038 * pelvisScale,
      new THREE.Vector3(0, -0.05 * pelvisScale, -0.05 * pelvisScale),
      boneMat
    );
    pGroup.add(ischium);

    if (isSaurischian) {
      const pubisShaft = createWaistedBoneSegment(
        new THREE.Vector3(0, 0.02 * pelvisScale, 0.12 * pelvisScale),
        new THREE.Vector3(-side * 0.08 * pelvisScale, -0.68 * pelvisScale, 0.22 * pelvisScale),
        0.036 * pelvisScale,
        new THREE.Vector3(0, 0, 0.06 * pelvisScale),
        boneMat
      );
      const pubicBoot = createWaistedBoneSegment(
        new THREE.Vector3(-side * 0.08 * pelvisScale, -0.68 * pelvisScale, 0.26 * pelvisScale),
        new THREE.Vector3(-side * 0.08 * pelvisScale, -0.70 * pelvisScale, -0.12 * pelvisScale),
        0.042 * pelvisScale,
        new THREE.Vector3(0, -0.04 * pelvisScale, 0),
        boneMat
      );
      pGroup.add(pubisShaft, pubicBoot);
    } else {
      const pubis = createWaistedBoneSegment(
        new THREE.Vector3(0, 0.02 * pelvisScale, 0.14 * pelvisScale),
        new THREE.Vector3(-side * 0.06 * pelvisScale, -0.48 * pelvisScale, -0.58 * pelvisScale),
        0.034 * pelvisScale,
        new THREE.Vector3(0, -0.04 * pelvisScale, 0),
        boneMat
      );
      pGroup.add(pubis);
    }

    group.add(pGroup);
  }

  for (const side of [-1, 1]) {
    const sGroup = new THREE.Group();
    sGroup.position.set(shoulderPos[0] + side * shoulderWidth * 0.62, shoulderPos[1], shoulderPos[2]);

    const scapula = createWaistedBoneSegment(
      new THREE.Vector3(0, -0.12 * shoulderScale, 0.10 * shoulderScale),
      new THREE.Vector3(0, 0.56 * shoulderScale, -0.50 * shoulderScale),
      0.048 * shoulderScale,
      new THREE.Vector3(side * 0.06 * shoulderScale, 0.12 * shoulderScale, 0),
      boneMat
    );
    scapula.scale.set(0.55, 1.0, 1.35);
    sGroup.add(scapula);
    group.add(sGroup);
  }

  return group;
}

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
  }
): THREE.Group {
  const group = new THREE.Group();
  const xSign = isLeft ? 1 : -1;
  const pts = joints.map((j) => new THREE.Vector3(j.pos[0] * xSign, j.pos[1], j.pos[2]));

  if (pts.length >= 2) {
    const r = Math.max(0.034, joints[0].rx * 0.28);
    const femur = createWaistedBoneSegment(
      pts[0],
      pts[1],
      r,
      new THREE.Vector3(0, 0, r * 0.45),
      boneMat
    );
    group.add(femur);
  }

  if (pts.length >= 3) {
    const p1 = pts[1];
    const p2 = pts[2];
    const rMain = Math.max(0.026, joints[1].rx * 0.24);
    const rThin = rMain * 0.52;

    const tibia = createWaistedBoneSegment(
      p1.clone().add(new THREE.Vector3(-xSign * rMain * 0.25, 0, rMain * 0.2)),
      p2.clone().add(new THREE.Vector3(-xSign * rMain * 0.18, 0, rMain * 0.12)),
      rMain,
      new THREE.Vector3(0, 0, rMain * 0.15),
      boneMat
    );
    const fibula = createWaistedBoneSegment(
      p1.clone().add(new THREE.Vector3(xSign * rMain * 0.5, 0, -rMain * 0.3)),
      p2.clone().add(new THREE.Vector3(xSign * rMain * 0.4, 0, -rMain * 0.2)),
      rThin,
      new THREE.Vector3(0, 0, -rThin * 0.15),
      boneMat
    );
    group.add(tibia, fibula);
  }

  if (pts.length >= 4) {
    const p2 = pts[2];
    const p3 = pts[3];
    const rMeta = Math.max(0.016, joints[2].rx * 0.15);
    for (let m = 0; m < Math.min(3, options.toes); m++) {
      const offset = (m - 1) * rMeta * 1.7;
      const meta = createWaistedBoneSegment(
        p2.clone().add(new THREE.Vector3(offset, 0, 0)),
        p3.clone().add(new THREE.Vector3(offset * 1.25, 0, 0)),
        rMeta,
        new THREE.Vector3(0, 0, 0),
        boneMat
      );
      group.add(meta);
    }
  }

  const footPt = pts[pts.length - 1];
  const rToe = Math.max(0.015, options.footWidth * 0.085);

  for (let d = 0; d < options.toes; d++) {
    const spread = options.toes > 1 ? (d / (options.toes - 1)) - 0.5 : 0;
    const isSickle = options.sickleClaw && ((isLeft && d === 0) || (!isLeft && d === options.toes - 1));
    const digitGroup = new THREE.Group();
    digitGroup.position.set(footPt.x + spread * options.footWidth * 0.5, footPt.y, footPt.z);
    digitGroup.rotation.y = spread * 0.6;

    if (isSickle) {
      const sickleBone = createCurvedClawOrTooth(options.clawLength * 1.9, rToe * 1.35, 0.85, boneMat);
      sickleBone.rotation.x = Math.PI * 0.55;
      sickleBone.position.set(0, options.footLength * 0.32, options.footLength * 0.32);
      digitGroup.add(sickleBone);
    } else {
      const tLen = options.footLength * (Math.abs(spread) < 0.2 ? 1.08 : 0.86);
      for (let p = 0; p < 2; p++) {
        const pBone = createWaistedBoneSegment(
          new THREE.Vector3(0, 0, p * tLen * 0.36),
          new THREE.Vector3(0, 0, (p + 0.9) * tLen * 0.36),
          rToe,
          new THREE.Vector3(0, 0, 0),
          boneMat
        );
        digitGroup.add(pBone);
      }
      const ungual = createCurvedClawOrTooth(options.clawLength * 0.92, rToe * 1.08, 0.38, boneMat);
      ungual.rotation.x = Math.PI / 2.1;
      ungual.position.set(0, -0.01, tLen * 0.72);
      digitGroup.add(ungual);
    }

    group.add(digitGroup);
  }

  return group;
}

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

  const craniumShape = new THREE.Shape();
  craniumShape.moveTo(0.0, -0.14 * H);
  craniumShape.lineTo(0.0, 0.38 * H);
  craniumShape.quadraticCurveTo(0.25 * L, H * (0.48 + spec.browCrest * 0.6), 0.45 * L, H * (0.40 + (spec.nasalBoss ?? 0)));
  craniumShape.quadraticCurveTo(0.75 * L, H * 0.32 - drop * 0.4, 0.96 * L, H * 0.10 - drop * 0.85);
  craniumShape.quadraticCurveTo(1.0 * L, -0.08 * H - drop * 0.9, 0.92 * L, -0.14 * H - drop * 0.85);
  craniumShape.quadraticCurveTo(0.50 * L, -0.16 * H - drop * 0.3, 0.0, -0.14 * H);

  const infraHole = new THREE.Path();
  infraHole.absellipse(0.12 * L, 0.12 * H, 0.055 * L, 0.16 * H, 0, Math.PI * 2, false, 0);
  craniumShape.holes.push(infraHole);

  const orbitHole = new THREE.Path();
  orbitHole.absellipse(0.29 * L, 0.16 * H, 0.065 * L, 0.15 * H, 0, Math.PI * 2, false, 0);
  craniumShape.holes.push(orbitHole);

  const antorbHole = new THREE.Path();
  antorbHole.moveTo(0.43 * L, -0.04 * H);
  antorbHole.lineTo(0.44 * L, 0.24 * H);
  antorbHole.quadraticCurveTo(0.56 * L, 0.22 * H, 0.66 * L, 0.02 * H - drop * 0.25);
  antorbHole.lineTo(0.43 * L, -0.04 * H);
  craniumShape.holes.push(antorbHole);

  const narisHole = new THREE.Path();
  narisHole.absellipse(0.81 * L, 0.06 * H - drop * 0.55, 0.06 * L, 0.065 * H, 0, Math.PI * 2, false, -0.15);
  craniumShape.holes.push(narisHole);

  const plateDepth = Math.max(0.024, W * 0.14);
  const lateralCraniumGeo = new THREE.ExtrudeGeometry(craniumShape, {
    depth: plateDepth,
    bevelEnabled: true,
    bevelThickness: plateDepth * 0.35,
    bevelSize: plateDepth * 0.28,
    bevelSegments: 2,
  });
  lateralCraniumGeo.rotateY(-Math.PI / 2);

  const jawShape = new THREE.Shape();
  const jd = spec.jawDepth * H;
  jawShape.moveTo(-0.02 * L, -0.14 * H);
  jawShape.lineTo(0.92 * L, -0.15 * H - drop * 0.85);
  jawShape.quadraticCurveTo(0.95 * L, -0.15 * H - jd * 0.55 - drop * 0.85, 0.86 * L, -0.15 * H - jd * 0.65 - drop * 0.8);
  jawShape.quadraticCurveTo(0.35 * L, -0.16 * H - jd, -0.02 * L, -0.15 * H - jd * 0.75);
  jawShape.closePath();

  const mandHole = new THREE.Path();
  mandHole.absellipse(0.24 * L, -0.15 * H - jd * 0.48, 0.09 * L, jd * 0.22, 0, Math.PI * 2, false, 0);
  jawShape.holes.push(mandHole);

  const lateralJawGeo = new THREE.ExtrudeGeometry(jawShape, {
    depth: plateDepth * 0.88,
    bevelEnabled: true,
    bevelThickness: plateDepth * 0.28,
    bevelSize: plateDepth * 0.22,
    bevelSegments: 2,
  });
  lateralJawGeo.rotateY(-Math.PI / 2);

  const taperAngle = Math.atan2(W * (1 - spec.snoutTaper * 0.55), L);
  for (const side of [-1, 1]) {
    const sideWall = new THREE.Mesh(lateralCraniumGeo, boneMat);
    sideWall.position.set(side * W * 0.82, 0, 0);
    sideWall.rotation.y = -side * taperAngle * 0.65;
    sideWall.castShadow = true;
    skullGroup.add(sideWall);

    const sideJaw = new THREE.Mesh(lateralJawGeo, boneMat);
    sideJaw.position.set(side * W * 0.74, -0.02 * H, 0);
    sideJaw.rotation.y = -side * taperAngle * 0.65;
    sideJaw.castShadow = true;
    skullGroup.add(sideJaw);
  }

  const roofCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.36 * H, 0.02 * L),
    new THREE.Vector3(0, H * (0.44 + spec.browCrest * 0.45), 0.28 * L),
    new THREE.Vector3(0, H * (0.37 + (spec.nasalBoss ?? 0) * 0.8), 0.56 * L),
    new THREE.Vector3(0, 0.14 * H - drop * 0.65, 0.92 * L),
  ]);
  const roofMesh = new THREE.Mesh(
    new THREE.TubeGeometry(roofCurve, 16, W * 0.42, 8, false),
    boneMat
  );
  roofMesh.scale.set(1.0, 0.28, 1.0);
  roofMesh.castShadow = true;
  skullGroup.add(roofMesh);

  const snoutCap = new THREE.Mesh(new THREE.SphereGeometry(W * 0.32, 10, 10), boneMat);
  snoutCap.scale.set(1.0, 0.75, 1.1);
  snoutCap.position.set(0, -0.04 * H - drop * 0.85, 0.92 * L);
  skullGroup.add(snoutCap);

  if (spec.teethCount > 0) {
    for (let i = 0; i < spec.teethCount; i++) {
      const frac = i / Math.max(1, spec.teethCount - 1);
      const zPos = THREE.MathUtils.lerp(0.30 * L, 0.90 * L, frac);
      const halfW = W * THREE.MathUtils.lerp(0.74, THREE.MathUtils.lerp(0.28, 0.52, spec.snoutTaper), frac);
      const tLen = spec.toothLength * (Math.sin(frac * Math.PI * 0.85 + 0.2) * 0.7 + 0.35);

      for (const side of [-1, 1]) {
        const uTooth = createCurvedClawOrTooth(tLen, tLen * 0.18, -0.2, toothMat);
        uTooth.rotation.x = Math.PI;
        uTooth.position.set(side * halfW * 0.88, -0.14 * H - frac * drop * 0.85, zPos);
        skullGroup.add(uTooth);

        const lTooth = createCurvedClawOrTooth(tLen * 0.75, tLen * 0.16, -0.16, toothMat);
        lTooth.position.set(side * halfW * 0.80, -0.18 * H - frac * drop * 0.85, zPos);
        skullGroup.add(lTooth);
      }
    }
  }

  return skullGroup;
}
