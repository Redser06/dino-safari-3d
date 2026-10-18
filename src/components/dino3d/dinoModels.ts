import * as THREE from 'three';
import { Dinosaur } from '../../types/dinosaur';
import { createReptileScaleTexture, createBoneTexture } from './textureGenerator';

export interface DinoModelResult {
  rootGroup: THREE.Group;
  exteriorGroup: THREE.Group;
  skeletonGroup: THREE.Group;
  tailSegments: THREE.Object3D[];
  chestMesh: THREE.Mesh | null;
  jawMesh: THREE.Mesh | null;
  neckMesh: THREE.Object3D | null;
}

// Cached textures
let scaleTexture: THREE.CanvasTexture | null = null;
let boneTexture: THREE.CanvasTexture | null = null;

function getScaleTexture() {
  if (!scaleTexture) scaleTexture = createReptileScaleTexture();
  return scaleTexture;
}

function getBoneTexture() {
  if (!boneTexture) boneTexture = createBoneTexture();
  return boneTexture;
}

// Materials factory
export function createDinoMaterials(dino: Dinosaur) {
  const bump = getScaleTexture();
  const boneTex = getBoneTexture();

  const exteriorMat = new THREE.MeshStandardMaterial({
    color: dino.colorTheme.modelSkinColor,
    roughness: 0.72,
    metalness: 0.08,
    bumpMap: bump,
    bumpScale: 0.03,
    flatShading: false,
  });

  const underbellyMat = new THREE.MeshStandardMaterial({
    color: dino.colorTheme.modelUnderbellyColor,
    roughness: 0.8,
    metalness: 0.05,
    bumpMap: bump,
    bumpScale: 0.02,
  });

  const patternMat = new THREE.MeshStandardMaterial({
    color: dino.colorTheme.modelPatternColor,
    roughness: 0.65,
    metalness: 0.05,
  });

  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xede8d5,
    map: boneTex,
    roughness: 0.6,
    metalness: 0.05,
  });

  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xd6cbb5,
    roughness: 0.45,
    metalness: 0.1,
  });

  const toothMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1,
  });

  return { exteriorMat, underbellyMat, patternMat, boneMat, hornMat, toothMat };
}

// Helper: eye with slit pupil
function createReptileEye(radius = 0.12): THREE.Group {
  const eyeGroup = new THREE.Group();
  
  // Sclera / Gold Iris
  const irisGeo = new THREE.SphereGeometry(radius, 16, 16);
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b, // Amber Gold
    roughness: 0.2,
    metalness: 0.1,
  });
  const iris = new THREE.Mesh(irisGeo, irisMat);
  eyeGroup.add(iris);

  // Vertical slit pupil
  const pupilGeo = new THREE.BoxGeometry(radius * 0.2, radius * 1.3, radius * 0.4);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.z = radius * 0.85;
  eyeGroup.add(pupil);

  return eyeGroup;
}

// Helper: teeth row
function createTeethRow(count: number, length: number, radius: number, toothMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const toothGeo = new THREE.ConeGeometry(radius, length, 8);
  toothGeo.rotateX(Math.PI); // Point downwards

  for (let i = 0; i < count; i++) {
    const tooth = new THREE.Mesh(toothGeo, toothMat);
    tooth.position.x = (i - (count - 1) / 2) * (radius * 2.3);
    group.add(tooth);
  }
  return group;
}

// Helper: ribcage skeleton
function createRibCage(length: number, width: number, height: number, ribsCount: number, boneMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const spineGeo = new THREE.CylinderGeometry(0.08, 0.08, length, 8);
  spineGeo.rotateZ(Math.PI / 2);
  const spine = new THREE.Mesh(spineGeo, boneMat);
  group.add(spine);

  for (let i = 0; i < ribsCount; i++) {
    const zOffset = (i / (ribsCount - 1) - 0.5) * length * 0.85;
    const ribCurve = new THREE.TorusGeometry(width * 0.5, 0.04, 6, 12, Math.PI * 0.85);
    ribCurve.rotateX(Math.PI / 2);
    ribCurve.rotateZ(Math.PI * 0.075);
    
    const rib = new THREE.Mesh(ribCurve, boneMat);
    rib.position.set(0, -height * 0.15, zOffset);
    group.add(rib);
  }
  return group;
}

// Main model builder router
export function buildDinosaur3D(dino: Dinosaur): DinoModelResult {
  const rootGroup = new THREE.Group();
  const exteriorGroup = new THREE.Group();
  const skeletonGroup = new THREE.Group();
  rootGroup.add(exteriorGroup);
  rootGroup.add(skeletonGroup);

  const mats = createDinoMaterials(dino);
  const tailSegments: THREE.Object3D[] = [];
  let chestMesh: THREE.Mesh | null = null;
  let jawMesh: THREE.Mesh | null = null;
  let neckMesh: THREE.Object3D | null = null;

  switch (dino.id) {
    case 't-rex':
      buildTRex(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    case 'brachiosaurus':
      buildBrachiosaurus(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    case 'diplodocus':
      buildDiplodocus(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    case 'triceratops':
      buildTriceratops(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    case 'stegosaurus':
      buildStegosaurus(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    case 'velociraptor':
      buildVelociraptor(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    case 'ankylosaurus':
      buildAnkylosaurus(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    case 'spinosaurus':
      buildSpinosaurus(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
      break;
    default:
      buildTRex(exteriorGroup, skeletonGroup, mats, tailSegments, (c) => chestMesh = c, (j) => jawMesh = j, (n) => neckMesh = n);
  }

  return {
    rootGroup,
    exteriorGroup,
    skeletonGroup,
    tailSegments,
    chestMesh,
    jawMesh,
    neckMesh,
  };
}

// ==========================================
// 1. TYRANNOSAURUS REX
// ==========================================
function buildTRex(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // ---- EXTERIOR ----
  // Torso / Chest
  const chestGeo = new THREE.CapsuleGeometry(0.85, 1.4, 12, 16);
  chestGeo.rotateX(Math.PI / 4.5);
  const chest = new THREE.Mesh(chestGeo, m.exteriorMat);
  chest.position.set(0, 1.8, 0);
  chest.castShadow = true;
  ext.add(chest);
  setChest(chest);

  // Underbelly
  const bellyGeo = new THREE.CapsuleGeometry(0.75, 1.2, 8, 12);
  bellyGeo.rotateX(Math.PI / 4.5);
  const belly = new THREE.Mesh(bellyGeo, m.underbellyMat);
  belly.position.set(0, 1.65, 0.1);
  belly.scale.set(0.9, 0.9, 0.9);
  ext.add(belly);

  // Neck
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 2.3, 0.7);
  const neckGeo = new THREE.CylinderGeometry(0.45, 0.65, 0.9, 12);
  neckGeo.rotateX(Math.PI / 5);
  const neck = new THREE.Mesh(neckGeo, m.exteriorMat);
  neckGroup.add(neck);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Massive Predatory Head
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.5, 0.6);
  neckGroup.add(headGroup);

  // Upper Cranium & Snout
  const skullGeo = new THREE.BoxGeometry(0.7, 0.65, 1.3);
  const skull = new THREE.Mesh(skullGeo, m.exteriorMat);
  skull.position.set(0, 0.15, 0.2);
  headGroup.add(skull);

  // Brow ridges
  const ridgeGeo = new THREE.ConeGeometry(0.18, 0.4, 4);
  ridgeGeo.rotateZ(Math.PI / 6);
  const leftRidge = new THREE.Mesh(ridgeGeo, m.patternMat);
  leftRidge.position.set(0.32, 0.45, 0.1);
  const rightRidge = leftRidge.clone();
  rightRidge.position.x = -0.32;
  rightRidge.rotation.z = -Math.PI / 6;
  headGroup.add(leftRidge, rightRidge);

  // Eyes
  const leftEye = createReptileEye(0.09);
  leftEye.position.set(0.36, 0.25, 0.05);
  leftEye.rotation.y = Math.PI / 2;
  const rightEye = createReptileEye(0.09);
  rightEye.position.set(-0.36, 0.25, 0.05);
  rightEye.rotation.y = -Math.PI / 2;
  headGroup.add(leftEye, rightEye);

  // Upper Teeth
  const topTeeth = createTeethRow(6, 0.22, 0.04, m.toothMat);
  topTeeth.position.set(0, -0.18, 0.45);
  headGroup.add(topTeeth);

  // Lower Jaw
  const jawGeo = new THREE.BoxGeometry(0.55, 0.22, 1.1);
  const jaw = new THREE.Mesh(jawGeo, m.underbellyMat);
  jaw.position.set(0, -0.3, 0.25);
  headGroup.add(jaw);
  setJaw(jaw);

  // Muscular Hind Legs
  const buildLeg = (isLeft: boolean) => {
    const legGroup = new THREE.Group();
    const xMult = isLeft ? 1 : -1;
    legGroup.position.set(xMult * 0.9, 1.8, -0.2);

    // Thigh
    const thighGeo = new THREE.CapsuleGeometry(0.42, 0.8, 10, 10);
    const thigh = new THREE.Mesh(thighGeo, m.exteriorMat);
    thigh.position.set(0, -0.3, 0);
    thigh.rotation.x = -Math.PI / 10;
    legGroup.add(thigh);

    // Shin / Calf
    const shinGeo = new THREE.CylinderGeometry(0.22, 0.18, 0.9, 8);
    const shin = new THREE.Mesh(shinGeo, m.exteriorMat);
    shin.position.set(0, -0.9, -0.15);
    shin.rotation.x = Math.PI / 7;
    legGroup.add(shin);

    // Foot with 3 sharp claws
    const footGeo = new THREE.BoxGeometry(0.35, 0.12, 0.6);
    const foot = new THREE.Mesh(footGeo, m.exteriorMat);
    foot.position.set(0, -1.35, 0.05);
    legGroup.add(foot);

    for (let c = -1; c <= 1; c++) {
      const clawGeo = new THREE.ConeGeometry(0.05, 0.18, 5);
      clawGeo.rotateX(Math.PI / 2);
      const claw = new THREE.Mesh(clawGeo, m.patternMat);
      claw.position.set(c * 0.12, -1.35, 0.4);
      legGroup.add(claw);
    }
    return legGroup;
  };
  ext.add(buildLeg(true), buildLeg(false));

  // Iconic Tiny 2-Claw Arms
  const buildArm = (isLeft: boolean) => {
    const armGroup = new THREE.Group();
    const xMult = isLeft ? 1 : -1;
    armGroup.position.set(xMult * 0.65, 1.7, 0.65);

    const bicepGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 6);
    bicepGeo.rotateX(Math.PI / 4);
    const bicep = new THREE.Mesh(bicepGeo, m.exteriorMat);
    armGroup.add(bicep);

    const claw1 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), m.toothMat);
    claw1.position.set(0.03, -0.2, 0.18);
    claw1.rotation.x = Math.PI / 2;
    const claw2 = claw1.clone();
    claw2.position.x = -0.03;
    armGroup.add(claw1, claw2);

    return armGroup;
  };
  ext.add(buildArm(true), buildArm(false));

  // Counterbalancing Tail (Multi-segmented for sway)
  let parentSeg: THREE.Object3D = ext;
  let curPos = new THREE.Vector3(0, 1.6, -0.7);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.copy(curPos);
    const radius = 0.55 - i * 0.11;
    const length = 0.9;
    const tGeo = new THREE.CylinderGeometry(radius * 0.75, radius, length, 8);
    tGeo.rotateX(-Math.PI / 2.3);
    const tMesh = new THREE.Mesh(tGeo, m.exteriorMat);
    seg.add(tMesh);
    parentSeg.add(seg);
    tailSegs.push(seg);
    curPos = new THREE.Vector3(0, -0.1, -0.85);
    parentSeg = seg;
  }

  // ---- SKELETON ----
  const ribcage = createRibCage(1.5, 1.3, 1.4, 7, m.boneMat);
  ribcage.position.set(0, 1.8, 0);
  skel.add(ribcage);

  // Skull fossil
  const skelHead = new THREE.Group();
  skelHead.position.set(0, 2.7, 1.3);
  const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 1.1), m.boneMat);
  skelHead.add(cranium);
  // Eye socket fenestra
  const orbitGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.7, 8);
  orbitGeo.rotateZ(Math.PI / 2);
  const orbit = new THREE.Mesh(orbitGeo, new THREE.MeshBasicMaterial({ color: 0x1a1a1a }));
  orbit.position.set(0, 0.1, 0.1);
  skelHead.add(orbit);
  // Skeletal lower jaw
  const skelJaw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 1.0), m.boneMat);
  skelJaw.position.set(0, -0.3, 0.1);
  skelHead.add(skelJaw);
  skel.add(skelHead);

  // Leg bones
  const buildSkelLeg = (isLeft: boolean) => {
    const group = new THREE.Group();
    const xMult = isLeft ? 1 : -1;
    group.position.set(xMult * 0.8, 1.8, -0.2);
    // Femur
    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.8, 6), m.boneMat);
    femur.position.set(0, -0.35, 0);
    // Tibia
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.9, 6), m.boneMat);
    tibia.position.set(0, -0.95, -0.1);
    group.add(femur, tibia);
    return group;
  };
  skel.add(buildSkelLeg(true), buildSkelLeg(false));

  // Tail spine
  const tailSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.1, 3.2, 8), m.boneMat);
  tailSpine.rotateX(-Math.PI / 2.2);
  tailSpine.position.set(0, 1.2, -1.8);
  skel.add(tailSpine);
}

// ==========================================
// 2. BRACHIOSAURUS
// ==========================================
function buildBrachiosaurus(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  _setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // Immense barrel body, elevated shoulders
  const bodyGeo = new THREE.SphereGeometry(1.6, 14, 14);
  bodyGeo.scale(0.9, 1.0, 1.35);
  const body = new THREE.Mesh(bodyGeo, m.exteriorMat);
  body.position.set(0, 2.5, 0);
  ext.add(body);
  setChest(body);

  // Towering Vertical Neck
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 3.2, 1.0);
  const neckGeo = new THREE.CylinderGeometry(0.4, 0.85, 3.8, 12);
  neckGeo.rotateX(Math.PI / 12);
  const neck = new THREE.Mesh(neckGeo, m.exteriorMat);
  neck.position.set(0, 1.8, 0.4);
  neckGroup.add(neck);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Friendly browsing head at the summit
  const headGeo = new THREE.BoxGeometry(0.55, 0.5, 0.85);
  const head = new THREE.Mesh(headGeo, m.exteriorMat);
  head.position.set(0, 3.7, 0.9);
  neckGroup.add(head);

  // High crest crest dome
  const crestGeo = new THREE.SphereGeometry(0.28, 8, 8);
  const crest = new THREE.Mesh(crestGeo, m.patternMat);
  crest.position.set(0, 4.0, 0.8);
  neckGroup.add(crest);

  // Eyes
  const eyeL = createReptileEye(0.08);
  eyeL.position.set(0.3, 3.75, 0.8);
  const eyeR = createReptileEye(0.08);
  eyeR.position.set(-0.3, 3.75, 0.8);
  neckGroup.add(eyeL, eyeR);

  // Columnar pillar legs (front longer than rear)
  const buildColumnLeg = (x: number, z: number, height: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, height / 2, z);
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, height, 10), m.exteriorMat);
    leg.add(cylinder);
    return leg;
  };

  ext.add(
    buildColumnLeg(1.0, 0.9, 2.7),   // Front Left (tall)
    buildColumnLeg(-1.0, 0.9, 2.7),  // Front Right (tall)
    buildColumnLeg(0.95, -0.9, 2.0), // Rear Left
    buildColumnLeg(-0.95, -0.9, 2.0) // Rear Right
  );

  // Tail
  let curParent: THREE.Object3D = ext;
  let tPos = new THREE.Vector3(0, 2.2, -1.4);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.copy(tPos);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4 - i * 0.08, 0.5 - i * 0.08, 0.9, 8), m.exteriorMat);
    tMesh.rotation.x = -Math.PI / 3;
    seg.add(tMesh);
    curParent.add(seg);
    tailSegs.push(seg);
    tPos = new THREE.Vector3(0, -0.2, -0.7);
    curParent = seg;
  }

  // SKELETON
  const ribcage = createRibCage(2.2, 1.8, 2.0, 9, m.boneMat);
  ribcage.position.set(0, 2.5, 0);
  skel.add(ribcage);

  // Tall neck spine
  const neckSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 4.0, 8), m.boneMat);
  neckSpine.position.set(0, 5.0, 1.4);
  neckSpine.rotation.x = Math.PI / 12;
  skel.add(neckSpine);

  // Fossil skull
  const skelHead = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.75), m.boneMat);
  skelHead.position.set(0, 6.9, 1.9);
  skel.add(skelHead);

  // Leg bones
  const buildSkelLeg = (x: number, z: number, h: number) => {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, h, 6), m.boneMat);
    bone.position.set(x, h / 2, z);
    return bone;
  };
  skel.add(
    buildSkelLeg(0.9, 0.9, 2.6),
    buildSkelLeg(-0.9, 0.9, 2.6),
    buildSkelLeg(0.85, -0.9, 1.9),
    buildSkelLeg(-0.85, -0.9, 1.9)
  );
}

// ==========================================
// 3. DIPLODOCUS
// ==========================================
function buildDiplodocus(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  _setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // Long low horizontal body
  const bodyGeo = new THREE.CapsuleGeometry(1.2, 2.4, 12, 14);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, m.exteriorMat);
  body.position.set(0, 2.0, 0);
  ext.add(body);
  setChest(body);

  // Long Horizontal Neck extending forward
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 2.1, 1.4);
  const neckGeo = new THREE.CylinderGeometry(0.35, 0.7, 3.2, 10);
  neckGeo.rotateX(Math.PI / 3);
  const neck = new THREE.Mesh(neckGeo, m.exteriorMat);
  neck.position.set(0, 0.8, 1.3);
  neckGroup.add(neck);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Slender Head with comb teeth
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.8), m.exteriorMat);
  head.position.set(0, 1.6, 2.8);
  neckGroup.add(head);

  // Super Long Whip Tail (6 segments!)
  let curParent: THREE.Object3D = ext;
  let tPos = new THREE.Vector3(0, 1.9, -1.6);
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Group();
    seg.position.copy(tPos);
    const radius = 0.5 - i * 0.07;
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, 1.1, 8), m.exteriorMat);
    tMesh.rotation.x = -Math.PI / 2.1;
    seg.add(tMesh);
    curParent.add(seg);
    tailSegs.push(seg);
    tPos = new THREE.Vector3(0, -0.05, -1.0);
    curParent = seg;
  }

  // Four sturdy legs
  const buildLeg = (x: number, z: number) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.8, 8), m.exteriorMat);
    leg.position.set(x, 0.9, z);
    return leg;
  };
  ext.add(
    buildLeg(0.9, 1.0),
    buildLeg(-0.9, 1.0),
    buildLeg(0.85, -1.0),
    buildLeg(-0.85, -1.0)
  );

  // SKELETON
  const ribcage = createRibCage(2.6, 1.5, 1.6, 10, m.boneMat);
  ribcage.position.set(0, 2.0, 0);
  skel.add(ribcage);

  const longTailSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.15, 6.0, 8), m.boneMat);
  longTailSpine.rotateX(-Math.PI / 2.05);
  longTailSpine.position.set(0, 1.7, -4.2);
  skel.add(longTailSpine);
}

// ==========================================
// 4. TRICERATOPS
// ==========================================
function buildTriceratops(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  _setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // Heavy barrel body
  const bodyGeo = new THREE.CapsuleGeometry(1.15, 1.6, 12, 14);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, m.exteriorMat);
  body.position.set(0, 1.8, 0);
  ext.add(body);
  setChest(body);

  // Short muscular neck
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.9, 1.0);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Massive Head with Frill
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.2, 0.3);
  neckGroup.add(headGroup);

  // The Grand Armored Neck Frill / Shield
  const frillGeo = new THREE.CylinderGeometry(1.4, 0.9, 0.15, 16);
  frillGeo.rotateX(Math.PI / 3);
  const frill = new THREE.Mesh(frillGeo, m.patternMat);
  frill.position.set(0, 0.8, -0.15);
  headGroup.add(frill);

  // Central head & snout
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 1.1), m.exteriorMat);
  snout.position.set(0, 0.1, 0.55);
  headGroup.add(snout);

  // Sharp Parrot Beak
  const beakGeo = new THREE.ConeGeometry(0.25, 0.45, 6);
  beakGeo.rotateX(Math.PI / 1.7);
  const beak = new THREE.Mesh(beakGeo, m.hornMat);
  beak.position.set(0, -0.15, 1.2);
  headGroup.add(beak);

  // Two Long Brow Horns
  const hornGeo = new THREE.ConeGeometry(0.12, 1.2, 8);
  hornGeo.rotateX(Math.PI / 2.8);
  const hornLeft = new THREE.Mesh(hornGeo, m.hornMat);
  hornLeft.position.set(0.38, 0.7, 0.6);
  const hornRight = hornLeft.clone();
  hornRight.position.x = -0.38;
  headGroup.add(hornLeft, hornRight);

  // Nasal Horn
  const noseHorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 6), m.hornMat);
  noseHorn.position.set(0, 0.5, 0.95);
  noseHorn.rotation.x = Math.PI / 6;
  headGroup.add(noseHorn);

  // Eyes on sides
  const eyeL = createReptileEye(0.08);
  eyeL.position.set(0.38, 0.3, 0.4);
  const eyeR = createReptileEye(0.08);
  eyeR.position.set(-0.38, 0.3, 0.4);
  headGroup.add(eyeL, eyeR);

  // Sturdy quadruped legs
  const buildLeg = (x: number, z: number) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.4, 8), m.exteriorMat);
    leg.position.set(x, 0.7, z);
    return leg;
  };
  ext.add(
    buildLeg(0.85, 0.7),
    buildLeg(-0.85, 0.7),
    buildLeg(0.8, -0.7),
    buildLeg(-0.8, -0.7)
  );

  // Short heavy tail
  let curParent: THREE.Object3D = ext;
  let tPos = new THREE.Vector3(0, 1.6, -1.0);
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.copy(tPos);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4 - i * 0.1, 0.5 - i * 0.1, 0.8, 8), m.exteriorMat);
    tMesh.rotation.x = -Math.PI / 2.5;
    seg.add(tMesh);
    curParent.add(seg);
    tailSegs.push(seg);
    tPos = new THREE.Vector3(0, -0.2, -0.65);
    curParent = seg;
  }

  // SKELETON
  const ribcage = createRibCage(1.8, 1.5, 1.5, 8, m.boneMat);
  ribcage.position.set(0, 1.8, 0);
  skel.add(ribcage);

  // Fossil skull with bone frill
  const skelHeadGroup = new THREE.Group();
  skelHeadGroup.position.set(0, 2.1, 1.3);
  const skelFrill = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 0.85, 0.1, 12), m.boneMat);
  skelFrill.rotateX(Math.PI / 3);
  skelFrill.position.set(0, 0.8, -0.15);
  skelHeadGroup.add(skelFrill);
  const skelSnout = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 1.0), m.boneMat);
  skelSnout.position.set(0, 0.1, 0.5);
  skelHeadGroup.add(skelSnout);
  // Bone horn cores
  const skelHornL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.1, 6), m.boneMat);
  skelHornL.rotateX(Math.PI / 2.8);
  skelHornL.position.set(0.35, 0.7, 0.55);
  const skelHornR = skelHornL.clone();
  skelHornR.position.x = -0.35;
  skelHeadGroup.add(skelHornL, skelHornR);
  skel.add(skelHeadGroup);
}

// ==========================================
// 5. STEGOSAURUS
// ==========================================
function buildStegosaurus(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  _setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // Arched body
  const bodyGeo = new THREE.CapsuleGeometry(1.1, 1.8, 12, 14);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, m.exteriorMat);
  body.position.set(0, 1.9, 0);
  ext.add(body);
  setChest(body);

  // Tiny head on low neck
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.5, 1.1);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 0.8, 8), m.exteriorMat);
  neck.rotation.x = Math.PI / 3;
  neckGroup.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.7), m.exteriorMat);
  head.position.set(0, 0.3, 0.6);
  neckGroup.add(head);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Alternating Diamond Back Plates (Double Row!)
  const plateGeo = new THREE.ConeGeometry(0.45, 0.9, 4);
  plateGeo.scale(0.2, 1.0, 1.0); // Flatten into plates

  for (let i = 0; i < 7; i++) {
    const z = 1.0 - i * 0.42;
    const isLeft = i % 2 === 0;
    const x = isLeft ? 0.32 : -0.32;
    const plate = new THREE.Mesh(plateGeo, m.patternMat);
    plate.position.set(x, 2.75 - Math.abs(i - 3) * 0.08, z);
    ext.add(plate);
  }

  // Four-Spiked Thagomizer Tail
  let curParent: THREE.Object3D = ext;
  let tPos = new THREE.Vector3(0, 1.7, -1.1);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.copy(tPos);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4 - i * 0.08, 0.5 - i * 0.08, 0.8, 8), m.exteriorMat);
    tMesh.rotation.x = -Math.PI / 2.3;
    seg.add(tMesh);

    // Add spikes to the last tail segment
    if (i === 3) {
      const spikeGeo = new THREE.ConeGeometry(0.08, 0.7, 6);
      spikeGeo.rotateZ(Math.PI / 2.5);
      const spike1 = new THREE.Mesh(spikeGeo, m.hornMat);
      spike1.position.set(0.45, 0, -0.1);
      const spike2 = spike1.clone();
      spike2.position.set(0.45, 0, 0.25);
      const spike3 = spike1.clone();
      spike3.rotation.z = -Math.PI / 2.5;
      spike3.position.set(-0.45, 0, -0.1);
      const spike4 = spike3.clone();
      spike4.position.set(-0.45, 0, 0.25);
      seg.add(spike1, spike2, spike3, spike4);
    }

    curParent.add(seg);
    tailSegs.push(seg);
    tPos = new THREE.Vector3(0, -0.1, -0.75);
    curParent = seg;
  }

  // Four legs (rear taller)
  const buildLeg = (x: number, z: number, height: number) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, height, 8), m.exteriorMat);
    leg.position.set(x, height / 2, z);
    return leg;
  };
  ext.add(
    buildLeg(0.8, 0.8, 1.2),
    buildLeg(-0.8, 0.8, 1.2),
    buildLeg(0.75, -0.8, 1.6),
    buildLeg(-0.75, -0.8, 1.6)
  );

  // SKELETON
  const ribcage = createRibCage(2.0, 1.4, 1.6, 9, m.boneMat);
  ribcage.position.set(0, 1.9, 0);
  skel.add(ribcage);

  // Fossil plate bases along spine
  for (let i = 0; i < 7; i++) {
    const z = 1.0 - i * 0.42;
    const isLeft = i % 2 === 0;
    const x = isLeft ? 0.3 : -0.3;
    const bonePlate = new THREE.Mesh(plateGeo, m.boneMat);
    bonePlate.position.set(x, 2.7 - Math.abs(i - 3) * 0.08, z);
    skel.add(bonePlate);
  }
}

// ==========================================
// 6. VELOCIRAPTOR (Classic Reptilian, No Feathers)
// ==========================================
function buildVelociraptor(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // Sleek, agile, horizontal bipedal body
  const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 10, 12);
  bodyGeo.rotateX(Math.PI / 2.5);
  const body = new THREE.Mesh(bodyGeo, m.exteriorMat);
  body.position.set(0, 1.2, 0);
  ext.add(body);
  setChest(body);

  // S-curved agile neck
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.4, 0.45);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.5, 8), m.exteriorMat);
  neck.rotation.x = Math.PI / 4;
  neckGroup.add(neck);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Sleek head & snout
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.35, 0.35);
  neckGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.65), m.exteriorMat);
  head.position.set(0, 0.05, 0.15);
  headGroup.add(head);

  // Sharp raptor eyes
  const eyeL = createReptileEye(0.06);
  eyeL.position.set(0.17, 0.1, 0.1);
  const eyeR = createReptileEye(0.06);
  eyeR.position.set(-0.17, 0.1, 0.1);
  headGroup.add(eyeL, eyeR);

  // Jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.55), m.underbellyMat);
  jaw.position.set(0, -0.15, 0.15);
  headGroup.add(jaw);
  setJaw(jaw);

  // Athletic Legs with Lethal Sickle Claws
  const buildRaptorLeg = (isLeft: boolean) => {
    const legGroup = new THREE.Group();
    const xMult = isLeft ? 1 : -1;
    legGroup.position.set(xMult * 0.38, 1.2, -0.1);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.45, 8, 8), m.exteriorMat);
    thigh.position.set(0, -0.2, 0);
    thigh.rotation.x = -Math.PI / 8;
    legGroup.add(thigh);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.55, 6), m.exteriorMat);
    shin.position.set(0, -0.6, -0.05);
    shin.rotation.x = Math.PI / 6;
    legGroup.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.3), m.exteriorMat);
    foot.position.set(0, -0.9, 0.05);
    legGroup.add(foot);

    // The Famous Curved Sickle Claw (held elevated!)
    const sickleGeo = new THREE.TorusGeometry(0.08, 0.025, 4, 8, Math.PI / 1.5);
    sickleGeo.rotateY(Math.PI / 2);
    const sickleClaw = new THREE.Mesh(sickleGeo, m.hornMat);
    sickleClaw.position.set(xMult * 0.05, -0.85, 0.15);
    legGroup.add(sickleClaw);

    return legGroup;
  };
  ext.add(buildRaptorLeg(true), buildRaptorLeg(false));

  // Three-claw grasping arms
  const buildArm = (isLeft: boolean) => {
    const arm = new THREE.Group();
    const xMult = isLeft ? 1 : -1;
    arm.position.set(xMult * 0.3, 1.2, 0.35);
    const bicep = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.3, 6), m.exteriorMat);
    bicep.rotation.x = Math.PI / 3;
    arm.add(bicep);
    return arm;
  };
  ext.add(buildArm(true), buildArm(false));

  // Long Straight Stiff Balance Tail
  let curParent: THREE.Object3D = ext;
  let tPos = new THREE.Vector3(0, 1.2, -0.45);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.copy(tPos);
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.025, 0.18 - i * 0.025, 0.65, 6), m.exteriorMat);
    tMesh.rotation.x = -Math.PI / 2.05;
    seg.add(tMesh);
    curParent.add(seg);
    tailSegs.push(seg);
    tPos = new THREE.Vector3(0, 0.02, -0.6);
    curParent = seg;
  }

  // SKELETON
  const ribcage = createRibCage(0.8, 0.6, 0.6, 6, m.boneMat);
  ribcage.position.set(0, 1.2, 0);
  skel.add(ribcage);

  const skelHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.55), m.boneMat);
  skelHead.position.set(0, 1.7, 0.8);
  skel.add(skelHead);
}

// ==========================================
// 7. ANKYLOSAURUS
// ==========================================
function buildAnkylosaurus(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  _setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // Broad, flat, armored carapace
  const bodyGeo = new THREE.SphereGeometry(1.2, 12, 12);
  bodyGeo.scale(1.25, 0.65, 1.5);
  const body = new THREE.Mesh(bodyGeo, m.exteriorMat);
  body.position.set(0, 1.1, 0);
  ext.add(body);
  setChest(body);

  // Armored Osteoderm Knobs across back
  const knobGeo = new THREE.ConeGeometry(0.12, 0.18, 5);
  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const knob = new THREE.Mesh(knobGeo, m.patternMat);
      knob.position.set(col * 0.35, 1.55 - Math.abs(col) * 0.1, row * 0.45);
      ext.add(knob);
    }
  }

  // Lateral side defense spikes
  for (let z = -0.8; z <= 0.8; z += 0.4) {
    const spikeGeo = new THREE.ConeGeometry(0.1, 0.35, 5);
    spikeGeo.rotateZ(Math.PI / 2.5);
    const spikeL = new THREE.Mesh(spikeGeo, m.hornMat);
    spikeL.position.set(1.4, 1.1, z);
    const spikeR = spikeL.clone();
    spikeR.rotation.z = -Math.PI / 2.5;
    spikeR.position.x = -1.4;
    ext.add(spikeL, spikeR);
  }

  // Wide armored head with cheek horns
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 1.0, 1.1);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.45, 0.7), m.exteriorMat);
  head.position.set(0, 0.1, 0.3);
  neckGroup.add(head);

  const cheekHornL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), m.hornMat);
  cheekHornL.rotateZ(Math.PI / 3);
  cheekHornL.position.set(0.48, 0.15, 0.1);
  const cheekHornR = cheekHornL.clone();
  cheekHornR.rotation.z = -Math.PI / 3;
  cheekHornR.position.x = -0.48;
  neckGroup.add(cheekHornL, cheekHornR);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Four low squat legs
  const buildLeg = (x: number, z: number) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 8), m.exteriorMat);
    leg.position.set(x, 0.4, z);
    return leg;
  };
  ext.add(
    buildLeg(0.9, 0.7),
    buildLeg(-0.9, 0.7),
    buildLeg(0.9, -0.7),
    buildLeg(-0.9, -0.7)
  );

  // Heavy Armored Tail ending in Solid Bone Club
  let curParent: THREE.Object3D = ext;
  let tPos = new THREE.Vector3(0, 1.0, -1.1);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.copy(tPos);
    const radius = 0.35 - i * 0.06;
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius, 0.7, 8), m.exteriorMat);
    tMesh.rotation.x = -Math.PI / 2.1;
    seg.add(tMesh);

    // Giant Bone Tail Club on final segment!
    if (i === 3) {
      const clubGeo = new THREE.SphereGeometry(0.35, 10, 10);
      clubGeo.scale(1.4, 0.8, 1.2);
      const club = new THREE.Mesh(clubGeo, m.hornMat);
      club.position.set(0, 0, -0.45);
      seg.add(club);
    }

    curParent.add(seg);
    tailSegs.push(seg);
    tPos = new THREE.Vector3(0, -0.02, -0.65);
    curParent = seg;
  }

  // SKELETON
  const ribcage = createRibCage(1.8, 1.8, 1.0, 8, m.boneMat);
  ribcage.position.set(0, 1.1, 0);
  skel.add(ribcage);

  // Fossil club
  const skelClub = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), m.boneMat);
  skelClub.scale.set(1.3, 0.7, 1.1);
  skelClub.position.set(0, 0.9, -3.2);
  skel.add(skelClub);
}

// ==========================================
// 8. SPINOSAURUS
// ==========================================
function buildSpinosaurus(
  ext: THREE.Group,
  skel: THREE.Group,
  m: ReturnType<typeof createDinoMaterials>,
  tailSegs: THREE.Object3D[],
  setChest: (m: THREE.Mesh) => void,
  setJaw: (m: THREE.Mesh) => void,
  setNeck: (o: THREE.Object3D) => void
) {
  // Long athletic predatory torso
  const bodyGeo = new THREE.CapsuleGeometry(0.85, 1.8, 12, 14);
  bodyGeo.rotateX(Math.PI / 2.3);
  const body = new THREE.Mesh(bodyGeo, m.exteriorMat);
  body.position.set(0, 1.8, 0);
  ext.add(body);
  setChest(body);

  // Spectacular High Dorsal Sail!
  const sailShape = new THREE.Shape();
  sailShape.moveTo(-1.2, 0);
  sailShape.quadraticCurveTo(-0.6, 1.8, 0, 2.1);
  sailShape.quadraticCurveTo(0.6, 1.9, 1.1, 0);
  sailShape.closePath();

  const extrudeSettings = { depth: 0.08, bevelEnabled: false };
  const sailGeo = new THREE.ExtrudeGeometry(sailShape, extrudeSettings);
  sailGeo.rotateY(Math.PI / 2);
  const sail = new THREE.Mesh(sailGeo, m.patternMat);
  sail.position.set(-0.04, 2.4, 0);
  ext.add(sail);

  // Long Crocodile-like Snout Head
  const neckGroup = new THREE.Group();
  neckGroup.position.set(0, 2.0, 1.0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.9, 8), m.exteriorMat);
  neck.rotation.x = Math.PI / 4;
  neckGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.5, 0.65);
  neckGroup.add(headGroup);

  // Long narrow croc skull
  const crocSnout = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 1.5), m.exteriorMat);
  crocSnout.position.set(0, 0.1, 0.4);
  headGroup.add(crocSnout);

  // Interlocking fish-catching teeth
  const teeth = createTeethRow(8, 0.16, 0.03, m.toothMat);
  teeth.position.set(0, -0.15, 0.6);
  headGroup.add(teeth);

  // Croc jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 1.4), m.underbellyMat);
  jaw.position.set(0, -0.22, 0.4);
  headGroup.add(jaw);
  setJaw(jaw);

  // River hunter eyes
  const eyeL = createReptileEye(0.08);
  eyeL.position.set(0.28, 0.25, 0.15);
  const eyeR = createReptileEye(0.08);
  eyeR.position.set(-0.28, 0.25, 0.15);
  headGroup.add(eyeL, eyeR);
  ext.add(neckGroup);
  setNeck(neckGroup);

  // Muscular bipedal legs
  const buildLeg = (isLeft: boolean) => {
    const legGroup = new THREE.Group();
    const xMult = isLeft ? 1 : -1;
    legGroup.position.set(xMult * 0.85, 1.8, -0.2);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.7, 8, 8), m.exteriorMat);
    thigh.position.set(0, -0.25, 0);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.85, 6), m.exteriorMat);
    shin.position.set(0, -0.8, -0.1);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.55), m.exteriorMat);
    foot.position.set(0, -1.25, 0.05);
    legGroup.add(thigh, shin, foot);
    return legGroup;
  };
  ext.add(buildLeg(true), buildLeg(false));

  // Paddle-like tail for swimming
  let curParent: THREE.Object3D = ext;
  let tPos = new THREE.Vector3(0, 1.6, -1.0);
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.copy(tPos);
    const radius = 0.5 - i * 0.09;
    const tMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.75, radius, 0.9, 8), m.exteriorMat);
    tMesh.scale.set(0.6, 1.3, 1.0); // Flattened laterally like a paddle!
    tMesh.rotation.x = -Math.PI / 2.2;
    seg.add(tMesh);
    curParent.add(seg);
    tailSegs.push(seg);
    tPos = new THREE.Vector3(0, -0.05, -0.85);
    curParent = seg;
  }

  // SKELETON
  const ribcage = createRibCage(1.8, 1.3, 1.4, 8, m.boneMat);
  ribcage.position.set(0, 1.8, 0);
  skel.add(ribcage);

  // Neural Spine Bones along Sail
  for (let i = -5; i <= 5; i++) {
    const h = 2.0 - Math.abs(i) * 0.25;
    const spineBone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 6), m.boneMat);
    spineBone.position.set(0, 2.3 + h / 2, i * 0.22);
    skel.add(spineBone);
  }
}
