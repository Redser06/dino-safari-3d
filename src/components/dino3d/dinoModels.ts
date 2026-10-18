import * as THREE from 'three';
import { Dinosaur } from '../../types/dinosaur';
import {
  getReptileSkinMaps,
  createReptileSkinAlbedo,
  getFossilBoneTextures,
} from './textureGenerator';
import {
  BodyStation,
  LimbJoint,
  HeadSpec,
  DinoMaterials,
  createLoftedBodyMesh,
  createDermalScuteRow,
  createCurvedClawOrTooth,
  createMuscularLimb,
  createSculptedHead,
  createArticulatedVertebralColumn,
  createAnatomicalRibcage,
  createSkeletalGirdles,
  createSkeletalLimb,
  createSkeletalSkull,
} from './anatomicalGeometry';

export interface DinoModelResult {
  rootGroup: THREE.Group;
  exteriorGroup: THREE.Group;
  skeletonGroup: THREE.Group;
  tailSegments: THREE.Object3D[];
  chestMesh: THREE.Mesh | null;
  jawMesh: THREE.Object3D | null;
  neckMesh: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];
}

export function createDinoMaterials(dino: Dinosaur): DinoMaterials {
  const skinMaps = getReptileSkinMaps();
  const albedoMap = createReptileSkinAlbedo(
    dino.colorTheme.modelSkinColor,
    dino.colorTheme.modelUnderbellyColor,
    dino.colorTheme.modelPatternColor
  );
  const boneMaps = getFossilBoneTextures();

  // Realistic living reptilian hide material with vertex color countershading & scale normal/roughness maps
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, // multiplied with vertex colors & albedoMap
    map: albedoMap,
    normalMap: skinMaps.normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    bumpMap: skinMaps.bumpMap,
    bumpScale: 0.055,
    roughnessMap: skinMaps.roughnessMap,
    roughness: 0.62,
    metalness: 0.04,
    clearcoat: 0.18,
    clearcoatRoughness: 0.48,
    sheen: 0.18,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color(dino.colorTheme.modelUnderbellyColor),
    vertexColors: true,
  });

  // Dorsal plates, scutes, sails, frill armor
  const detailMat = new THREE.MeshPhysicalMaterial({
    color: dino.colorTheme.modelPatternColor,
    normalMap: skinMaps.normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    bumpMap: skinMaps.bumpMap,
    bumpScale: 0.04,
    roughness: 0.58,
    metalness: 0.06,
    clearcoat: 0.22,
    clearcoatRoughness: 0.45,
  });

  // Keratin horns, claws, beaks, spikes
  const hornMat = new THREE.MeshPhysicalMaterial({
    color: 0xd8cbb2,
    bumpMap: boneMaps.bump,
    bumpScale: 0.025,
    roughness: 0.42,
    metalness: 0.08,
    clearcoat: 0.35,
    clearcoatRoughness: 0.35,
  });

  // Enamel teeth
  const toothMat = new THREE.MeshPhysicalMaterial({
    color: 0xf7f3e6,
    roughness: 0.22,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });

  // Wet fleshy oral mucosa & tongue
  const mouthMat = new THREE.MeshStandardMaterial({
    color: 0x8f3b3b,
    roughness: 0.35,
    metalness: 0.05,
  });

  // Permineralized museum fossil bone
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xebe3ce,
    map: boneMaps.albedo,
    bumpMap: boneMaps.bump,
    bumpScale: 0.025,
    roughness: 0.56,
    metalness: 0.06,
  });

  const darkCavityMat = new THREE.MeshBasicMaterial({
    color: 0x181512,
  });

  return { skinMat, detailMat, hornMat, toothMat, mouthMat, boneMat, darkCavityMat };
}

/**
 * Helper to build both the living exterior and museum skeleton from a unified anatomical blueprint.
 */
interface AnatomicalDinoBlueprint {
  stations: BodyStation[];
  headSpec: HeadSpec;
  slitPupil: boolean;
  isSaurischian: boolean;
  ribStartT: number;
  ribEndT: number;
  ribPairs: number;
  hasGastralia: boolean;
  hipPos: [number, number, number];
  shoulderPos: [number, number, number];
  pelvisWidth: number;
  pelvisScale: number;
  shoulderWidth: number;
  shoulderScale: number;
  hindLimbJoints: LimbJoint[];
  hindLimbOptions: {
    toes: number;
    footLength: number;
    footWidth: number;
    clawLength: number;
    sickleClaw?: boolean;
    columnarPad?: boolean;
  };
  foreLimbJoints: LimbJoint[];
  foreLimbOptions: {
    toes: number;
    footLength: number;
    footWidth: number;
    clawLength: number;
    columnarPad?: boolean;
  };
  scuteCount?: number;
  scuteSize?: number;
  vertebraCount?: number;
  neuralSpineScale?: number;
  dorsalRidge?: number;
  lateralKeel?: number;
  sailProfile?: (t: number) => number;
  caudalPaddleProfile?: (t: number) => number;
  ossifiedTailRods?: boolean;
  diplodocidBifidSpines?: boolean;
  tailClub?: boolean;
  tailSpikes?: boolean;
  decorateExterior?: (ext: THREE.Group, headGroup: THREE.Group, mats: DinoMaterials, dino: Dinosaur) => void;
  decorateSkeleton?: (skel: THREE.Group, skelHead: THREE.Group, mats: DinoMaterials) => void;
}

function assembleFromBlueprint(
  dino: Dinosaur,
  bp: AnatomicalDinoBlueprint,
  mats: DinoMaterials
): DinoModelResult {
  const rootGroup = new THREE.Group();
  const exteriorGroup = new THREE.Group();
  const skeletonGroup = new THREE.Group();
  rootGroup.add(exteriorGroup);
  rootGroup.add(skeletonGroup);

  const skinHex = dino.colorTheme.modelSkinColor;
  const bellyHex = dino.colorTheme.modelUnderbellyColor;
  const patternHex = dino.colorTheme.modelPatternColor;

  // =========================================================
  // 1. LIVING REPTILIAN EXTERIOR
  // =========================================================
  const bodyMesh = createLoftedBodyMesh(
    bp.stations,
    skinHex,
    bellyHex,
    patternHex,
    mats.skinMat,
    {
      slices: 96,
      radialSegments: 40,
      dorsalRidge: bp.dorsalRidge ?? 0.055,
      skinFolds: 0.024,
      lateralKeel: bp.lateralKeel ?? 0.0,
      shadingMode: 'body',
    }
  );
  exteriorGroup.add(bodyMesh);

  // Dorsal dermal scute row
  if ((bp.scuteCount ?? 0) > 0) {
    const scutes = createDermalScuteRow(
      bp.stations,
      mats.detailMat,
      bp.scuteCount!,
      bp.scuteSize ?? 0.08,
      0.05,
      0.92
    );
    exteriorGroup.add(scutes);
  }

  // Sculpted Reptilian Head & Hinged Mandible
  const { headGroup, jawGroup } = createSculptedHead(
    bp.headSpec,
    skinHex,
    bellyHex,
    patternHex,
    mats,
    bp.slitPupil
  );
  exteriorGroup.add(headGroup);

  // Muscular Hindlimbs (Left & Right)
  const hindLeft = createMuscularLimb(
    bp.hindLimbJoints,
    true,
    skinHex,
    bellyHex,
    mats.skinMat,
    mats.hornMat,
    { ...bp.hindLimbOptions, patternHex }
  );
  const hindRight = createMuscularLimb(
    bp.hindLimbJoints,
    false,
    skinHex,
    bellyHex,
    mats.skinMat,
    mats.hornMat,
    { ...bp.hindLimbOptions, patternHex }
  );
  exteriorGroup.add(hindLeft, hindRight);

  // Muscular Forelimbs (Left & Right)
  const foreLeft = createMuscularLimb(
    bp.foreLimbJoints,
    true,
    skinHex,
    bellyHex,
    mats.skinMat,
    mats.hornMat,
    { ...bp.foreLimbOptions, patternHex }
  );
  const foreRight = createMuscularLimb(
    bp.foreLimbJoints,
    false,
    skinHex,
    bellyHex,
    mats.skinMat,
    mats.hornMat,
    { ...bp.foreLimbOptions, patternHex }
  );
  exteriorGroup.add(foreLeft, foreRight);

  // Species-specific exterior anatomy (frills, horns, sails, plates, armor, tail clubs)
  if (bp.decorateExterior) {
    bp.decorateExterior(exteriorGroup, headGroup, mats, dino);
  }

  // =========================================================
  // 2. MUSEUM-GRADE ARTICULATED SKELETON
  // =========================================================
  const vertebralColumn = createArticulatedVertebralColumn(bp.stations, mats.boneMat, {
    vertebraCount: bp.vertebraCount ?? 44,
    neuralSpineScale: bp.neuralSpineScale ?? 1.0,
    sailProfile: bp.sailProfile,
    caudalPaddleProfile: bp.caudalPaddleProfile,
    ossifiedTailRods: bp.ossifiedTailRods,
    diplodocidBifidSpines: bp.diplodocidBifidSpines,
    tailClub: bp.tailClub,
    tailSpikes: bp.tailSpikes,
    ribStartT: bp.ribStartT,
    ribEndT: bp.ribEndT,
  });
  skeletonGroup.add(vertebralColumn);

  const ribcage = createAnatomicalRibcage(
    bp.stations,
    bp.ribStartT,
    bp.ribEndT,
    bp.ribPairs,
    mats.boneMat,
    bp.hasGastralia
  );
  skeletonGroup.add(ribcage);

  const girdles = createSkeletalGirdles(
    bp.hipPos,
    bp.shoulderPos,
    bp.pelvisWidth,
    bp.pelvisScale,
    bp.shoulderWidth,
    bp.shoulderScale,
    bp.isSaurischian,
    mats.boneMat
  );
  skeletonGroup.add(girdles);

  // Skeletal Hindlimbs & Forelimbs
  skeletonGroup.add(
    createSkeletalLimb(bp.hindLimbJoints, true, mats.boneMat, bp.hindLimbOptions),
    createSkeletalLimb(bp.hindLimbJoints, false, mats.boneMat, bp.hindLimbOptions),
    createSkeletalLimb(bp.foreLimbJoints, true, mats.boneMat, bp.foreLimbOptions),
    createSkeletalLimb(bp.foreLimbJoints, false, mats.boneMat, bp.foreLimbOptions)
  );

  // Fenestrated Fossil Skull
  const skelHead = createSkeletalSkull(
    bp.headSpec,
    mats.boneMat,
    mats.toothMat,
    mats.darkCavityMat
  );
  skeletonGroup.add(skelHead);

  if (bp.decorateSkeleton) {
    bp.decorateSkeleton(skeletonGroup, skelHead, mats);
  }

  return {
    rootGroup,
    exteriorGroup,
    skeletonGroup,
    tailSegments: [],
    chestMesh: bodyMesh,
    jawMesh: jawGroup,
    neckMesh: headGroup,
    mixer: null,
    clips: [],
  };
}

// ============================================================================
// SPECIES ANATOMICAL BLUEPRINTS (ALL 8 DINOSAURS)
// ============================================================================

export function buildDinosaur3D(dino: Dinosaur): DinoModelResult {
  const mats = createDinoMaterials(dino);

  switch (dino.id) {
    case 't-rex':
      return assembleFromBlueprint(dino, getTRexBlueprint(), mats);
    case 'brachiosaurus':
      return assembleFromBlueprint(dino, getBrachiosaurusBlueprint(), mats);
    case 'diplodocus':
      return assembleFromBlueprint(dino, getDiplodocusBlueprint(), mats);
    case 'triceratops':
      return assembleFromBlueprint(dino, getTriceratopsBlueprint(), mats);
    case 'stegosaurus':
      return assembleFromBlueprint(dino, getStegosaurusBlueprint(), mats);
    case 'iguanodon':
      return assembleFromBlueprint(dino, getIguanodonBlueprint(), mats);
    case 'ankylosaurus':
      return assembleFromBlueprint(dino, getAnkylosaurusBlueprint(), mats);
    case 'spinosaurus':
      return assembleFromBlueprint(dino, getSpinosaurusBlueprint(), mats);
    default:
      return assembleFromBlueprint(dino, getTRexBlueprint(), mats);
  }
}

// ----------------------------------------------------------------------------
// 1. TYRANNOSAURUS REX — Massive Apex Theropod
// ----------------------------------------------------------------------------
function getTRexBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    { pos: [0, 1.55, -4.2], rx: 0.04, ryTop: 0.05, ryBottom: 0.04 },
    { pos: [0, 1.62, -3.3], rx: 0.14, ryTop: 0.16, ryBottom: 0.14 },
    { pos: [0, 1.74, -2.3], rx: 0.28, ryTop: 0.30, ryBottom: 0.28 },
    { pos: [0, 1.92, -1.3], rx: 0.46, ryTop: 0.45, ryBottom: 0.44 },
    // Pelvic Hips (Sacrum)
    { pos: [0, 2.08, -0.45], rx: 0.62, ryTop: 0.56, ryBottom: 0.62, pinchTop: 1.35 },
    // Deep Barrel Thorax / Ribcage
    { pos: [0, 2.02, 0.35], rx: 0.72, ryTop: 0.58, ryBottom: 0.78, pinchTop: 1.25 },
    // Pectoral Shoulders
    { pos: [0, 2.12, 1.05], rx: 0.58, ryTop: 0.52, ryBottom: 0.62 },
    // Muscular S-Curved Bull Neck
    { pos: [0, 2.42, 1.48], rx: 0.44, ryTop: 0.44, ryBottom: 0.42 },
    { pos: [0, 2.72, 1.72], rx: 0.38, ryTop: 0.38, ryBottom: 0.34 },
  ];

  return {
    stations,
    headSpec: {
      attachPos: [0, 2.68, 1.66],
      pitch: 0.14,
      length: 1.18,
      width: 0.62,
      height: 0.58,
      snoutTaper: 0.62,
      snoutDrop: 0.07,
      browCrest: 0.12,
      jawDepth: 0.30,
      teethCount: 9,
      toothLength: 0.085,
      nasalBoss: 0.05,
      skullType: 'tyrannosaur',
    },
    slitPupil: true,
    isSaurischian: true,
    ribStartT: 0.46,
    ribEndT: 0.80,
    ribPairs: 11,
    hasGastralia: true,
    hipPos: [0, 2.05, -0.45],
    shoulderPos: [0, 1.85, 1.05],
    pelvisWidth: 0.62,
    pelvisScale: 1.02,
    shoulderWidth: 0.58,
    shoulderScale: 0.75,
    hindLimbJoints: [
      { pos: [0.36, 2.04, -0.45], rx: 0.44, rz: 0.56 }, // Deep Pelvic Haunch / Thigh
      { pos: [0.46, 1.28, 0.06], rx: 0.28, rz: 0.34 },  // Forward-angled Knee
      { pos: [0.46, 0.60, -0.34], rx: 0.17, rz: 0.20 }, // Backward-angled Ankle Hock
      { pos: [0.46, 0.10, 0.02], rx: 0.15, rz: 0.17 },  // Digitigrade Foot
    ],
    hindLimbOptions: {
      toes: 3,
      footLength: 0.56,
      footWidth: 0.40,
      clawLength: 0.15,
    },
    foreLimbJoints: [
      { pos: [0.42, 1.76, 1.06], rx: 0.13, rz: 0.15 },
      { pos: [0.46, 1.46, 1.08], rx: 0.09, rz: 0.10 },
      { pos: [0.44, 1.32, 1.32], rx: 0.07, rz: 0.08 },
    ],
    foreLimbOptions: {
      toes: 2,
      footLength: 0.18,
      footWidth: 0.12,
      clawLength: 0.10,
    },
    scuteCount: 28,
    scuteSize: 0.07,
    vertebraCount: 46,
    neuralSpineScale: 1.08,
    dorsalRidge: 0.065,
    ossifiedTailRods: true,
  };
}

// ----------------------------------------------------------------------------
// 2. BRACHIOSAURUS — High-Canopy Titan Sauropod
// ----------------------------------------------------------------------------
function getBrachiosaurusBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    { pos: [0, 1.15, -3.4], rx: 0.05, ryTop: 0.06, ryBottom: 0.05 },
    { pos: [0, 1.42, -2.5], rx: 0.18, ryTop: 0.20, ryBottom: 0.18 },
    { pos: [0, 1.85, -1.6], rx: 0.38, ryTop: 0.38, ryBottom: 0.36 },
    // Lower Pelvic Hips
    { pos: [0, 2.28, -0.75], rx: 0.68, ryTop: 0.58, ryBottom: 0.64 },
    // Sloping Barrel Thorax
    { pos: [0, 2.58, 0.15], rx: 0.88, ryTop: 0.68, ryBottom: 0.86 },
    // Elevated Massive Pectoral Shoulders
    { pos: [0, 2.92, 0.95], rx: 0.78, ryTop: 0.64, ryBottom: 0.76 },
    // Towering Vertical S-Curved Neck
    { pos: [0, 3.65, 1.32], rx: 0.44, ryTop: 0.42, ryBottom: 0.46 },
    { pos: [0, 4.48, 1.56], rx: 0.34, ryTop: 0.32, ryBottom: 0.36 },
    { pos: [0, 5.25, 1.74], rx: 0.27, ryTop: 0.26, ryBottom: 0.28 },
    { pos: [0, 5.78, 1.92], rx: 0.22, ryTop: 0.22, ryBottom: 0.22 },
  ];

  return {
    stations,
    headSpec: {
      attachPos: [0, 5.78, 1.88],
      pitch: 0.22,
      length: 0.78,
      width: 0.46,
      height: 0.52,
      snoutTaper: 0.68,
      snoutDrop: 0.14,
      browCrest: 0.04,
      jawDepth: 0.24,
      teethCount: 6,
      toothLength: 0.068,
      nasalBoss: 0.32, // Iconic high-vaulted Brachiosaurus nasal arch dome!
      skullType: 'sauropod-arch',
    },
    slitPupil: false,
    isSaurischian: true,
    ribStartT: 0.34,
    ribEndT: 0.58,
    ribPairs: 12,
    hasGastralia: false,
    hipPos: [0, 2.25, -0.75],
    shoulderPos: [0, 2.75, 0.95],
    pelvisWidth: 0.72,
    pelvisScale: 1.0,
    shoulderWidth: 0.82,
    shoulderScale: 1.15,
    // Shorter Hindlimbs
    hindLimbJoints: [
      { pos: [0.58, 2.22, -0.75], rx: 0.38, rz: 0.44 },
      { pos: [0.60, 1.32, -0.70], rx: 0.28, rz: 0.32 },
      { pos: [0.58, 0.58, -0.78], rx: 0.24, rz: 0.26 },
      { pos: [0.58, 0.14, -0.72], rx: 0.26, rz: 0.28 },
    ],
    hindLimbOptions: {
      toes: 4,
      footLength: 0.42,
      footWidth: 0.36,
      clawLength: 0.12,
      columnarPad: true,
    },
    // Towering Columnar Forelimbs (longer than hindlimbs!)
    foreLimbJoints: [
      { pos: [0.66, 2.72, 0.92], rx: 0.38, rz: 0.42 },
      { pos: [0.66, 1.65, 0.96], rx: 0.27, rz: 0.30 },
      { pos: [0.64, 0.72, 0.94], rx: 0.23, rz: 0.25 },
      { pos: [0.64, 0.14, 0.98], rx: 0.26, rz: 0.28 },
    ],
    foreLimbOptions: {
      toes: 5,
      footLength: 0.42,
      footWidth: 0.36,
      clawLength: 0.11,
      columnarPad: true,
    },
    scuteCount: 24,
    scuteSize: 0.06,
    vertebraCount: 54,
    neuralSpineScale: 0.88,
  };
}

// ----------------------------------------------------------------------------
// 3. DIPLODOCUS — Whip-Tailed Suspension-Bridge Sauropod
// ----------------------------------------------------------------------------
function getDiplodocusBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    // Supersonic Whip Tail
    { pos: [0, 1.35, -5.2], rx: 0.025, ryTop: 0.03, ryBottom: 0.025 },
    { pos: [0, 1.48, -4.1], rx: 0.08, ryTop: 0.09, ryBottom: 0.08 },
    { pos: [0, 1.66, -2.9], rx: 0.18, ryTop: 0.20, ryBottom: 0.18 },
    { pos: [0, 1.88, -1.8], rx: 0.34, ryTop: 0.36, ryBottom: 0.34 },
    // High Sacral Hips
    { pos: [0, 2.12, -0.75], rx: 0.62, ryTop: 0.62, ryBottom: 0.58, pinchTop: 1.4 },
    // Deep Thorax
    { pos: [0, 2.04, 0.15], rx: 0.76, ryTop: 0.58, ryBottom: 0.74, pinchTop: 1.3 },
    // Lower Shoulders
    { pos: [0, 1.94, 0.95], rx: 0.62, ryTop: 0.52, ryBottom: 0.62 },
    // Long Sweeping Horizontal Neck
    { pos: [0, 2.08, 1.85], rx: 0.38, ryTop: 0.36, ryBottom: 0.36 },
    { pos: [0, 2.28, 2.75], rx: 0.27, ryTop: 0.26, ryBottom: 0.26 },
    { pos: [0, 2.42, 3.55], rx: 0.20, ryTop: 0.20, ryBottom: 0.19 },
  ];

  return {
    stations,
    headSpec: {
      attachPos: [0, 2.42, 3.50],
      pitch: 0.26,
      length: 0.74,
      width: 0.38,
      height: 0.34,
      snoutTaper: 0.62, // Elongated horse-like diplodocid skull
      snoutDrop: 0.18,
      browCrest: 0.03,
      jawDepth: 0.18,
      teethCount: 6,    // Anterior peg-like leaf-raking teeth
      toothLength: 0.055,
      skullType: 'diplodocid',
    },
    slitPupil: false,
    isSaurischian: true,
    ribStartT: 0.46,
    ribEndT: 0.68,
    ribPairs: 12,
    hasGastralia: false,
    hipPos: [0, 2.08, -0.75],
    shoulderPos: [0, 1.82, 0.95],
    pelvisWidth: 0.64,
    pelvisScale: 1.0,
    shoulderWidth: 0.68,
    shoulderScale: 0.92,
    hindLimbJoints: [
      { pos: [0.54, 2.02, -0.75], rx: 0.36, rz: 0.42 },
      { pos: [0.56, 1.18, -0.70], rx: 0.26, rz: 0.30 },
      { pos: [0.54, 0.52, -0.76], rx: 0.22, rz: 0.24 },
      { pos: [0.54, 0.12, -0.70], rx: 0.24, rz: 0.26 },
    ],
    hindLimbOptions: {
      toes: 4,
      footLength: 0.38,
      footWidth: 0.34,
      clawLength: 0.11,
      columnarPad: true,
    },
    foreLimbJoints: [
      { pos: [0.56, 1.78, 0.92], rx: 0.32, rz: 0.36 },
      { pos: [0.56, 1.05, 0.95], rx: 0.23, rz: 0.25 },
      { pos: [0.54, 0.48, 0.92], rx: 0.20, rz: 0.22 },
      { pos: [0.54, 0.12, 0.96], rx: 0.22, rz: 0.24 },
    ],
    foreLimbOptions: {
      toes: 5,
      footLength: 0.35,
      footWidth: 0.32,
      clawLength: 0.10,
      columnarPad: true,
    },
    scuteCount: 38,
    scuteSize: 0.085, // Prominent diplodocid dorsal dermal spines!
    vertebraCount: 58,
    neuralSpineScale: 1.15,
    dorsalRidge: 0.08,
    diplodocidBifidSpines: true,
  };
}

// ----------------------------------------------------------------------------
// 4. TRICERATOPS — Three-Horned Ceratopsian with Ornate Shield Frill
// ----------------------------------------------------------------------------
function getTriceratopsBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    { pos: [0, 1.12, -2.85], rx: 0.05, ryTop: 0.06, ryBottom: 0.05 },
    { pos: [0, 1.28, -2.15], rx: 0.18, ryTop: 0.20, ryBottom: 0.18 },
    { pos: [0, 1.54, -1.35], rx: 0.42, ryTop: 0.42, ryBottom: 0.38 },
    // Broad Arched Pelvis
    { pos: [0, 1.82, -0.55], rx: 0.74, ryTop: 0.62, ryBottom: 0.68, pinchTop: 1.15 },
    // Massive Barrel Ribcage
    { pos: [0, 1.78, 0.28], rx: 0.86, ryTop: 0.66, ryBottom: 0.78, pinchTop: 1.1 },
    // Heavy Muscular Shoulders
    { pos: [0, 1.68, 0.98], rx: 0.68, ryTop: 0.56, ryBottom: 0.64 },
    // Thick Neck Supporting Giant Skull
    { pos: [0, 1.72, 1.42], rx: 0.52, ryTop: 0.48, ryBottom: 0.46 },
  ];

  // Helper to construct the doubly-curved Parietal-Squamosal Frill & 3 Horns with basal keratin collars
  const addCeratopsianCranialArmor = (
    targetHeadGroup: THREE.Group,
    frillMat: THREE.Material,
    hornMat: THREE.Material,
    isSkeleton: boolean
  ) => {
    // 1. Doubly-Curved Saddle-Shaped Neck Frill (Sweeping back and up from skull)
    const frillGroup = new THREE.Group();
    frillGroup.position.set(0, 0.32, 0.12);
    frillGroup.rotation.x = -0.52;

    const frillRadiusX = 1.18;
    const frillRadiusY = 1.05;
    const uSegs = 28;
    const vSegs = 16;
    const fPos: number[] = [];
    const fIdx: number[] = [];

    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs; // 0 = inner base, 1 = outer scalloped margin
      for (let iu = 0; iu <= uSegs; iu++) {
        const u = (iu / uSegs - 0.5) * Math.PI * 1.18; // fan angle across top & sides
        const rX = THREE.MathUtils.lerp(0.38, frillRadiusX, v);
        const rY = THREE.MathUtils.lerp(0.22, frillRadiusY, v);

        const x = Math.sin(u) * rX;
        const y = Math.cos(u) * rY;
        const z = -Math.pow(v, 1.5) * 0.42 + Math.cos(u * 2) * 0.08 * v;
        fPos.push(x, y, z);
      }
    }

    for (let iv = 0; iv < vSegs; iv++) {
      for (let iu = 0; iu < uSegs; iu++) {
        const a = iv * (uSegs + 1) + iu;
        const b = (iv + 1) * (uSegs + 1) + iu;
        const c = (iv + 1) * (uSegs + 1) + (iu + 1);
        const d = iv * (uSegs + 1) + (iu + 1);
        fIdx.push(a, b, d, b, c, d);
        fIdx.push(a, d, b, b, d, c);
      }
    }

    const frillGeo = new THREE.BufferGeometry();
    frillGeo.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
    frillGeo.setIndex(fIdx);
    frillGeo.computeVertexNormals();
    const frillMesh = new THREE.Mesh(frillGeo, frillMat);
    frillMesh.castShadow = true;
    frillGroup.add(frillMesh);

    // Epoccipital Marginal Scutes (15 triangular bone osteoderms scalloping the frill rim)
    const scuteCount = 15;
    for (let s = 0; s < scuteCount; s++) {
      const u = (s / (scuteCount - 1) - 0.5) * Math.PI * 1.14;
      const x = Math.sin(u) * frillRadiusX * 1.01;
      const y = Math.cos(u) * frillRadiusY * 1.01;
      const z = -0.42 + Math.cos(u * 2) * 0.08;

      const epoccipital = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.18, 5), hornMat);
      epoccipital.position.set(x, y, z);
      epoccipital.rotation.z = -u;
      frillGroup.add(epoccipital);
    }

    targetHeadGroup.add(frillGroup);

    // 2. Two Long Forward-Curving Supraorbital Brow Horns + Basal Keratin Collars
    for (const side of [-1, 1]) {
      const hornLen = isSkeleton ? 1.08 : 1.22;
      const browHorn = createCurvedClawOrTooth(hornLen, 0.115, 0.36, hornMat);
      browHorn.position.set(side * 0.34, 0.42, 0.28);
      browHorn.rotation.x = Math.PI * 0.36;
      browHorn.rotation.z = -side * 0.18;
      targetHeadGroup.add(browHorn);

      if (!isSkeleton) {
        const browCollar = new THREE.Mesh(
          new THREE.TorusGeometry(0.115, 0.036, 8, 14),
          frillMat
        );
        browCollar.position.set(side * 0.34, 0.42, 0.28);
        browCollar.rotation.x = Math.PI * 0.36 + Math.PI / 2;
        browCollar.rotation.y = -side * 0.18;
        targetHeadGroup.add(browCollar);
      }

      // Jugal cheek horn (epijugal spike)
      const cheekSpike = createCurvedClawOrTooth(0.24, 0.065, 0.15, hornMat);
      cheekSpike.position.set(side * 0.46, -0.02, 0.18);
      cheekSpike.rotation.z = -side * 1.25;
      targetHeadGroup.add(cheekSpike);
    }

    // 3. Upward-Curving Nasal Horn over the Snout + Basal Keratin Collar
    const nasalHorn = createCurvedClawOrTooth(isSkeleton ? 0.36 : 0.44, 0.085, -0.28, hornMat);
    nasalHorn.position.set(0, 0.22, 0.84);
    nasalHorn.rotation.x = 0.28;
    targetHeadGroup.add(nasalHorn);

    if (!isSkeleton) {
      const nasalCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.085, 0.028, 7, 12),
        frillMat
      );
      nasalCollar.position.set(0, 0.22, 0.84);
      nasalCollar.rotation.x = Math.PI / 2 + 0.28;
      targetHeadGroup.add(nasalCollar);
    }
  };

  return {
    stations,
    headSpec: {
      attachPos: [0, 1.72, 1.38],
      pitch: 0.18,
      length: 1.15,
      width: 0.76,
      height: 0.68,
      snoutTaper: 0.38, // Narrowing into the sharp parrot-like rostral beak
      snoutDrop: 0.16,
      browCrest: 0.12,
      jawDepth: 0.28,
      teethCount: 0,    // Shearing dental batteries hidden behind beak
      toothLength: 0,
      hasBeak: true,
      skullType: 'ceratopsian',
    },
    slitPupil: false,
    isSaurischian: false,
    ribStartT: 0.45,
    ribEndT: 0.82,
    ribPairs: 11,
    hasGastralia: false,
    hipPos: [0, 1.78, -0.55],
    shoulderPos: [0, 1.54, 0.98],
    pelvisWidth: 0.72,
    pelvisScale: 1.0,
    shoulderWidth: 0.68,
    shoulderScale: 0.95,
    hindLimbJoints: [
      { pos: [0.58, 1.75, -0.55], rx: 0.38, rz: 0.44 },
      { pos: [0.60, 1.02, -0.45], rx: 0.26, rz: 0.30 },
      { pos: [0.58, 0.48, -0.58], rx: 0.20, rz: 0.22 },
      { pos: [0.58, 0.12, -0.46], rx: 0.22, rz: 0.24 },
    ],
    hindLimbOptions: {
      toes: 4,
      footLength: 0.38,
      footWidth: 0.34,
      clawLength: 0.10,
      columnarPad: true,
    },
    foreLimbJoints: [
      { pos: [0.56, 1.52, 0.96], rx: 0.34, rz: 0.38 },
      { pos: [0.62, 0.88, 0.86], rx: 0.24, rz: 0.26 },
      { pos: [0.58, 0.42, 0.96], rx: 0.19, rz: 0.21 },
      { pos: [0.58, 0.12, 1.06], rx: 0.21, rz: 0.22 },
    ],
    foreLimbOptions: {
      toes: 5,
      footLength: 0.34,
      footWidth: 0.32,
      clawLength: 0.09,
      columnarPad: true,
    },
    scuteCount: 18,
    scuteSize: 0.06,
    vertebraCount: 42,
    neuralSpineScale: 0.95,
    decorateExterior: (_ext, headGroup, mats) => {
      addCeratopsianCranialArmor(headGroup, mats.detailMat, mats.hornMat, false);
    },
    decorateSkeleton: (_skel, skelHead, mats) => {
      addCeratopsianCranialArmor(skelHead, mats.boneMat, mats.boneMat, true);
    },
  };
}

// ----------------------------------------------------------------------------
// 5. STEGOSAURUS — Plated Jurassic Herbivore with Thagomizer Tail Spikes
// ----------------------------------------------------------------------------
function getStegosaurusBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    { pos: [0, 1.28, -3.2], rx: 0.05, ryTop: 0.06, ryBottom: 0.05 },
    { pos: [0, 1.52, -2.35], rx: 0.18, ryTop: 0.22, ryBottom: 0.18 },
    { pos: [0, 1.88, -1.45], rx: 0.38, ryTop: 0.42, ryBottom: 0.36 },
    // High-Arched Sacral Hips
    { pos: [0, 2.28, -0.50], rx: 0.68, ryTop: 0.68, ryBottom: 0.65, pinchTop: 1.45 },
    // Steeply Arched Dorsal Mid-Back
    { pos: [0, 2.18, 0.35], rx: 0.74, ryTop: 0.64, ryBottom: 0.72, pinchTop: 1.4 },
    // Low Anterior Shoulders
    { pos: [0, 1.68, 1.12], rx: 0.56, ryTop: 0.48, ryBottom: 0.54 },
    // Low Sweeping Neck
    { pos: [0, 1.48, 1.68], rx: 0.32, ryTop: 0.30, ryBottom: 0.30 },
    { pos: [0, 1.42, 2.08], rx: 0.22, ryTop: 0.20, ryBottom: 0.20 },
  ];

  // Sculpted Pentagonal Stegosaurus Dorsal Plate Geometry
  const createStegoPlateGeo = () => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.26, 0);
    shape.lineTo(-0.34, 0.38);
    shape.quadraticCurveTo(-0.18, 0.78, 0.0, 0.96); // Pointed dorsal apex
    shape.quadraticCurveTo(0.22, 0.74, 0.36, 0.35);
    shape.lineTo(0.26, 0);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 3,
    });
    geo.center();
    geo.rotateY(Math.PI / 2);
    return geo;
  };

  const addStegoPlatesAndThagomizer = (
    targetGroup: THREE.Group,
    plateMat: THREE.Material,
    spikeMat: THREE.Material,
    isSkeleton = false
  ) => {
    const plateGeo = createStegoPlateGeo();
    const pts = stations.map((s) => new THREE.Vector3(...s.pos));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);

    // 17 Alternating Double-Row Dorsal Plates from neck to tail ("Sophie" NHMUK PV R36730)
    const plateCount = 17;
    for (let i = 0; i < plateCount; i++) {
      const frac = i / (plateCount - 1);
      const t = THREE.MathUtils.lerp(0.15, 0.94, frac);
      const pos = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();

      const sizeScale = 0.26 + Math.pow(Math.sin(frac * Math.PI), 0.85) * 0.92;
      const side = i % 2 === 0 ? 1 : -1;

      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.scale.set(sizeScale, sizeScale, sizeScale);

      const dorsalOffset = 0.22 + Math.sin(frac * Math.PI) * 0.42;
      plate.position.set(side * 0.14, pos.y + dorsalOffset + sizeScale * 0.32, pos.z);

      plate.rotation.x = -tan.y * 0.85 - 0.12;
      plate.rotation.z = -side * 0.18;
      plate.castShadow = true;
      targetGroup.add(plate);

      // Basal Dermal Collar at skin-to-plate contact point
      if (!isSkeleton) {
        const collarGeo = new THREE.CapsuleGeometry(0.045 * sizeScale, 0.38 * sizeScale, 4, 8);
        collarGeo.rotateX(Math.PI / 2);
        const collar = new THREE.Mesh(collarGeo, spikeMat);
        collar.position.set(side * 0.12, pos.y + dorsalOffset + 0.02, pos.z);
        collar.rotation.x = -tan.y * 0.85;
        targetGroup.add(collar);
      }
    }

    // 4-Spiked Caudal Thagomizer at end of tail
    for (let pair = 0; pair < 2; pair++) {
      const t = 0.055 + pair * 0.045;
      const pos = curve.getPointAt(t);
      for (const side of [-1, 1]) {
        const spike = createCurvedClawOrTooth(0.76, 0.068, 0.14, spikeMat);
        spike.position.set(side * 0.08, pos.y + 0.04, pos.z);
        spike.rotation.z = -side * 1.08;
        spike.rotation.x = -0.38;
        targetGroup.add(spike);

        if (!isSkeleton) {
          const spikeCollar = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.022, 6, 10), plateMat);
          spikeCollar.position.set(side * 0.08, pos.y + 0.04, pos.z);
          spikeCollar.rotation.y = (side * Math.PI) / 2.2;
          targetGroup.add(spikeCollar);
        }
      }
    }
  };

  return {
    stations,
    headSpec: {
      attachPos: [0, 1.42, 2.04],
      pitch: 0.16,
      length: 0.62,
      width: 0.32,
      height: 0.28,
      snoutTaper: 0.35, // Narrow low browsing snout with keratinous beak
      snoutDrop: 0.12,
      browCrest: 0.02,
      jawDepth: 0.18,
      teethCount: 0,
      toothLength: 0,
      hasBeak: true,
      skullType: 'stegosaur',
    },
    slitPupil: false,
    isSaurischian: false,
    ribStartT: 0.42,
    ribEndT: 0.76,
    ribPairs: 12,
    hasGastralia: false,
    hipPos: [0, 2.22, -0.50],
    shoulderPos: [0, 1.54, 1.12],
    pelvisWidth: 0.68,
    pelvisScale: 1.05,
    shoulderWidth: 0.56,
    shoulderScale: 0.85,
    // Tall Pillar-Like Hindlimbs
    hindLimbJoints: [
      { pos: [0.54, 2.18, -0.50], rx: 0.38, rz: 0.44 },
      { pos: [0.56, 1.25, -0.45], rx: 0.26, rz: 0.30 },
      { pos: [0.54, 0.55, -0.55], rx: 0.21, rz: 0.23 },
      { pos: [0.54, 0.12, -0.48], rx: 0.23, rz: 0.25 },
    ],
    hindLimbOptions: {
      toes: 3,
      footLength: 0.38,
      footWidth: 0.34,
      clawLength: 0.10,
      columnarPad: true,
    },
    // Shorter Muscular Forelimbs
    foreLimbJoints: [
      { pos: [0.48, 1.48, 1.10], rx: 0.30, rz: 0.34 },
      { pos: [0.52, 0.85, 1.04], rx: 0.22, rz: 0.24 },
      { pos: [0.50, 0.42, 1.12], rx: 0.18, rz: 0.20 },
      { pos: [0.50, 0.12, 1.18], rx: 0.20, rz: 0.22 },
    ],
    foreLimbOptions: {
      toes: 5,
      footLength: 0.32,
      footWidth: 0.30,
      clawLength: 0.09,
      columnarPad: true,
    },
    vertebraCount: 44,
    neuralSpineScale: 0.92,
    decorateExterior: (ext, _headGroup, mats) => {
      addStegoPlatesAndThagomizer(ext, mats.detailMat, mats.hornMat, false);
    },
    decorateSkeleton: (skel, _skelHead, mats) => {
      addStegoPlatesAndThagomizer(skel, mats.boneMat, mats.boneMat, true);
    },
  };
}

// ----------------------------------------------------------------------------
// 6. IGUANODON — Gentle ornithopod with a beak and a thumb spike
// ----------------------------------------------------------------------------
function getIguanodonBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    // Deep balancing tail, held out behind the hips
    { pos: [0, 1.32, -3.7], rx: 0.045, ryTop: 0.05, ryBottom: 0.04 },
    { pos: [0, 1.38, -2.7], rx: 0.11, ryTop: 0.13, ryBottom: 0.11 },
    { pos: [0, 1.48, -1.7], rx: 0.2, ryTop: 0.22, ryBottom: 0.2 },
    // Ornithischian hips
    { pos: [0, 1.62, -0.5], rx: 0.42, ryTop: 0.36, ryBottom: 0.42, pinchTop: 1.18 },
    // Rounded plant-eater belly
    { pos: [0, 1.58, 0.4], rx: 0.52, ryTop: 0.4, ryBottom: 0.52, pinchTop: 1.12 },
    // Shoulders a little lower than the hips
    { pos: [0, 1.5, 1.2], rx: 0.38, ryTop: 0.32, ryBottom: 0.38 },
    // Gentle neck reaching forward
    { pos: [0, 1.68, 1.72], rx: 0.24, ryTop: 0.22, ryBottom: 0.22 },
    { pos: [0, 1.9, 2.05], rx: 0.18, ryTop: 0.18, ryBottom: 0.16 },
  ];

  const addThumbSpikes = (target: THREE.Group, mat: THREE.Material) => {
    for (const side of [-1, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.36, 7), mat);
      spike.position.set(side * 0.46, 0.36, 1.7);
      spike.rotation.z = side * 0.28;
      spike.castShadow = true;
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 10), mat);
      collar.position.set(side * 0.46, 0.18, 1.7);
      collar.rotation.x = Math.PI / 2;
      target.add(spike, collar);
    }
  };

  return {
    stations,
    headSpec: {
      attachPos: [0, 1.88, 2.0],
      pitch: 0.08,
      length: 0.7,
      width: 0.36,
      height: 0.34,
      snoutTaper: 0.4,
      snoutDrop: 0.16,
      browCrest: 0.03,
      jawDepth: 0.16,
      teethCount: 0,
      toothLength: 0,
      hasBeak: true,
      skullType: 'stegosaur',
    },
    slitPupil: false,
    isSaurischian: false,
    ribStartT: 0.42,
    ribEndT: 0.78,
    ribPairs: 12,
    hasGastralia: false,
    hipPos: [0, 1.58, -0.5],
    shoulderPos: [0, 1.42, 1.18],
    pelvisWidth: 0.62,
    pelvisScale: 1.0,
    shoulderWidth: 0.52,
    shoulderScale: 0.82,
    // Longer hind legs, so it can rise up onto two feet
    hindLimbJoints: [
      { pos: [0.42, 1.56, -0.48], rx: 0.28, rz: 0.32 },
      { pos: [0.44, 0.95, -0.22], rx: 0.18, rz: 0.22 },
      { pos: [0.42, 0.42, -0.32], rx: 0.13, rz: 0.15 },
      { pos: [0.42, 0.1, -0.12], rx: 0.15, rz: 0.17 },
    ],
    hindLimbOptions: {
      toes: 3,
      footLength: 0.4,
      footWidth: 0.3,
      clawLength: 0.08,
      columnarPad: true,
    },
    // Shorter arms that can rest on the ground, with a thumb spike added above
    foreLimbJoints: [
      { pos: [0.4, 1.4, 1.16], rx: 0.18, rz: 0.2 },
      { pos: [0.44, 0.9, 1.38], rx: 0.13, rz: 0.14 },
      { pos: [0.42, 0.42, 1.58], rx: 0.11, rz: 0.12 },
      { pos: [0.42, 0.1, 1.68], rx: 0.12, rz: 0.14 },
    ],
    foreLimbOptions: {
      toes: 4,
      footLength: 0.28,
      footWidth: 0.22,
      clawLength: 0.06,
      columnarPad: true,
    },
    vertebraCount: 42,
    neuralSpineScale: 0.8,
    dorsalRidge: 0.03,
    decorateExterior: (ext, _headGroup, mats) => {
      addThumbSpikes(ext, mats.hornMat);
    },
    decorateSkeleton: (skel, _skelHead, mats) => {
      addThumbSpikes(skel, mats.boneMat);
    },
  };
}

// ----------------------------------------------------------------------------
// 7. ANKYLOSAURUS — Armored Osteoderm Carapace & Heavy Bone Tail Club
// ----------------------------------------------------------------------------
function getAnkylosaurusBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    // Stiff Tail Handle Supporting Heavy Bone Club
    { pos: [0, 0.88, -2.95], rx: 0.09, ryTop: 0.08, ryBottom: 0.08 },
    { pos: [0, 0.92, -2.15], rx: 0.16, ryTop: 0.14, ryBottom: 0.14 },
    { pos: [0, 1.02, -1.35], rx: 0.38, ryTop: 0.28, ryBottom: 0.28, pinchTop: 0.65 },
    // Wide Low-Slung Armored Pelvis & Carapace
    { pos: [0, 1.15, -0.50], rx: 1.08, ryTop: 0.48, ryBottom: 0.52, pinchTop: 0.55 },
    { pos: [0, 1.18, 0.28], rx: 1.16, ryTop: 0.52, ryBottom: 0.56, pinchTop: 0.55 },
    // Broad Armored Shoulders
    { pos: [0, 1.12, 0.98], rx: 0.88, ryTop: 0.44, ryBottom: 0.48, pinchTop: 0.6 },
    // Short Thick Armored Neck (Cervical Half-Rings)
    { pos: [0, 1.08, 1.48], rx: 0.48, ryTop: 0.34, ryBottom: 0.34, pinchTop: 0.75 },
  ];

  const addAnkyloCranialHorns = (targetHeadGroup: THREE.Group, hornMat: THREE.Material) => {
    for (const side of [-1, 1]) {
      const squamosalHorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 4), hornMat);
      squamosalHorn.position.set(side * 0.34, 0.22, 0.08);
      squamosalHorn.rotation.z = -side * 0.85;
      squamosalHorn.rotation.x = -0.45;

      const jugalHorn = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 4), hornMat);
      jugalHorn.position.set(side * 0.38, -0.06, 0.14);
      jugalHorn.rotation.z = -side * 1.35;

      targetHeadGroup.add(squamosalHorn, jugalHorn);
    }
  };

  return {
    stations,
    headSpec: {
      attachPos: [0, 1.08, 1.44],
      pitch: 0.15,
      length: 0.72,
      width: 0.68,
      height: 0.44,
      snoutTaper: 0.58, // Broad triangular armored skull
      snoutDrop: 0.14,
      browCrest: 0.08,
      jawDepth: 0.22,
      teethCount: 0,
      toothLength: 0,
      hasBeak: true,
      skullType: 'ankylosaur',
    },
    slitPupil: false,
    isSaurischian: false,
    ribStartT: 0.42,
    ribEndT: 0.82,
    ribPairs: 12,
    hasGastralia: false,
    hipPos: [0, 1.10, -0.50],
    shoulderPos: [0, 1.02, 0.98],
    pelvisWidth: 0.95,
    pelvisScale: 0.95,
    shoulderWidth: 0.82,
    shoulderScale: 0.85,
    hindLimbJoints: [
      { pos: [0.76, 1.08, -0.50], rx: 0.32, rz: 0.36 },
      { pos: [0.78, 0.64, -0.45], rx: 0.24, rz: 0.26 },
      { pos: [0.76, 0.32, -0.52], rx: 0.20, rz: 0.22 },
      { pos: [0.76, 0.10, -0.46], rx: 0.22, rz: 0.24 },
    ],
    hindLimbOptions: {
      toes: 4,
      footLength: 0.32,
      footWidth: 0.32,
      clawLength: 0.09,
      columnarPad: true,
    },
    foreLimbJoints: [
      { pos: [0.72, 0.98, 0.95], rx: 0.30, rz: 0.34 },
      { pos: [0.74, 0.58, 0.88], rx: 0.22, rz: 0.24 },
      { pos: [0.72, 0.28, 0.94], rx: 0.19, rz: 0.21 },
      { pos: [0.72, 0.10, 1.00], rx: 0.21, rz: 0.22 },
    ],
    foreLimbOptions: {
      toes: 5,
      footLength: 0.30,
      footWidth: 0.30,
      clawLength: 0.08,
      columnarPad: true,
    },
    lateralKeel: 0.14,
    tailClub: true,
    ossifiedTailRods: true,
    vertebraCount: 40,
    decorateExterior: (ext, headGroup, mats) => {
      // 1. Transverse Rows of Keeled Oval Osteoderm Armor Plates across the Carapace
      const scuteGeo = new THREE.ConeGeometry(0.11, 0.14, 6);
      scuteGeo.scale(0.85, 0.65, 1.35);

      const zRows = [-1.1, -0.75, -0.38, 0.0, 0.38, 0.74, 1.08, 1.34];
      for (const z of zRows) {
        const isNeck = z > 1.0;
        const maxW = isNeck ? 0.44 : z < -0.7 ? 0.62 : 1.04;
        const baseY = isNeck ? 1.36 : z < -0.7 ? 1.24 : 1.58;
        const cols = isNeck ? 3 : 7;

        for (let c = 0; c < cols; c++) {
          const u = (c / (cols - 1) - 0.5) * 2;
          const x = u * maxW;
          const y = baseY - u * u * (isNeck ? 0.12 : 0.34);

          const scute = new THREE.Mesh(scuteGeo, mats.detailMat);
          scute.position.set(x, y, z);
          scute.rotation.z = -u * 0.55;
          scute.castShadow = true;
          ext.add(scute);
        }

        // Projecting Lateral Flank & Shoulder Armor Spikes
        for (const side of [-1, 1]) {
          const spike = createCurvedClawOrTooth(0.32, 0.068, 0.12, mats.hornMat);
          spike.position.set(side * (maxW + 0.08), baseY - (isNeck ? 0.16 : 0.38), z);
          spike.rotation.z = -side * 1.32;
          spike.rotation.y = -side * 0.25;
          ext.add(spike);
        }
      }

      // 2. 4 Pyramidal Cranial Armor Horns
      addAnkyloCranialHorns(headGroup, mats.hornMat);

      // 3. Massive Fused Dual-Lobed Bone Tail Club at z = -2.95
      const clubGroup = new THREE.Group();
      clubGroup.position.set(0, 0.88, -2.98);
      for (const side of [-1, 1]) {
        const majorPlate = new THREE.Mesh(new THREE.SphereGeometry(0.30, 12, 12), mats.hornMat);
        majorPlate.scale.set(0.88, 0.65, 1.48);
        majorPlate.position.set(side * 0.19, 0, 0);
        majorPlate.castShadow = true;
        clubGroup.add(majorPlate);
      }
      const minorTip = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), mats.detailMat);
      minorTip.scale.set(1.15, 0.6, 1.15);
      minorTip.position.set(0, 0, -0.26);
      clubGroup.add(minorTip);
      ext.add(clubGroup);
    },
    decorateSkeleton: (skel, skelHead, mats) => {
      // Mount the 4 co-ossified cranial horns + 2 cervical half-ring bony yokes on the fossil skeleton (AMNH 5214)
      addAnkyloCranialHorns(skelHead, mats.boneMat);
      for (const z of [1.14, 1.36]) {
        const yokeGeo = new THREE.TorusGeometry(0.42, 0.04, 6, 14, Math.PI);
        const yoke = new THREE.Mesh(yokeGeo, mats.boneMat);
        yoke.position.set(0, 1.06, z);
        skel.add(yoke);
      }
    },
  };
}

// ----------------------------------------------------------------------------
// 8. SPINOSAURUS — Sail-Backed Semi-Aquatic Piscivore Giant
// ----------------------------------------------------------------------------
function getSpinosaurusBlueprint(): AnatomicalDinoBlueprint {
  const stations: BodyStation[] = [
    // Laterally Flattened Tadpole-Like Swimming Paddle Tail
    { pos: [0, 1.42, -4.4], rx: 0.03, ryTop: 0.22, ryBottom: 0.14, pinchTop: 2.2 },
    { pos: [0, 1.48, -3.4], rx: 0.09, ryTop: 0.42, ryBottom: 0.26, pinchTop: 2.0 },
    { pos: [0, 1.56, -2.3], rx: 0.20, ryTop: 0.46, ryBottom: 0.32, pinchTop: 1.7 },
    { pos: [0, 1.68, -1.3], rx: 0.38, ryTop: 0.44, ryBottom: 0.40 },
    // Pelvic Hips
    { pos: [0, 1.78, -0.45], rx: 0.56, ryTop: 0.52, ryBottom: 0.56 },
    // Elongated Barrel Thorax
    { pos: [0, 1.76, 0.38], rx: 0.64, ryTop: 0.54, ryBottom: 0.66 },
    // Muscular Shoulders
    { pos: [0, 1.82, 1.12], rx: 0.54, ryTop: 0.48, ryBottom: 0.56 },
    // Long Muscular S-Curved Neck
    { pos: [0, 2.15, 1.62], rx: 0.38, ryTop: 0.38, ryBottom: 0.36 },
    { pos: [0, 2.46, 1.92], rx: 0.30, ryTop: 0.30, ryBottom: 0.28 },
  ];

  // Sail height profile along dorsal spine t in [0.44 .. 0.84]
  const sailProfile = (t: number) => {
    if (t < 0.42 || t > 0.85) return 0;
    const u = (t - 0.42) / (0.85 - 0.42);
    // Double-peaked / M-curved dramatic Spinosaurus neural spine sail!
    const arch = Math.sin(u * Math.PI);
    const dip = 1.0 - 0.16 * Math.pow(Math.sin(u * Math.PI * 2), 2);
    return arch * dip * 1.48;
  };

  // Aquatic Paddle-Tail caudal neural spine profile along t in [0.04 .. 0.38] (Ibrahim et al. 2020, FSAC-KK 11888)
  const caudalPaddleProfile = (t: number) => {
    if (t < 0.03 || t > 0.38) return 0;
    const u = (t - 0.03) / (0.38 - 0.03);
    return Math.sin(u * Math.PI) * 0.46;
  };

  return {
    stations,
    headSpec: {
      attachPos: [0, 2.42, 1.84],
      pitch: 0.14,
      length: 1.42,     // Long narrow crocodile-like piscivore snout
      width: 0.46,
      height: 0.46,
      snoutTaper: 0.24, // Slender gharial/crocodile rostrum
      snoutDrop: 0.05,
      browCrest: 0.07,
      jawDepth: 0.20,
      teethCount: 11,   // Interlocking conical fish-catching teeth
      toothLength: 0.085,
      nasalBoss: 0.14,  // Median nasal crest between the eyes
      skullType: 'spinosaur',
    },
    slitPupil: true,
    isSaurischian: true,
    ribStartT: 0.48,
    ribEndT: 0.82,
    ribPairs: 12,
    hasGastralia: true,
    hipPos: [0, 1.75, -0.45],
    shoulderPos: [0, 1.62, 1.12],
    pelvisWidth: 0.58,
    pelvisScale: 0.95,
    shoulderWidth: 0.56,
    shoulderScale: 0.88,
    hindLimbJoints: [
      { pos: [0.46, 1.72, -0.45], rx: 0.38, rz: 0.46 },
      { pos: [0.48, 1.08, -0.08], rx: 0.25, rz: 0.30 },
      { pos: [0.46, 0.52, -0.35], rx: 0.17, rz: 0.20 },
      { pos: [0.46, 0.10, -0.05], rx: 0.16, rz: 0.18 },
    ],
    hindLimbOptions: {
      toes: 3,
      footLength: 0.54,
      footWidth: 0.40,
      clawLength: 0.16,
    },
    // Powerful Forelimbs with Giant Hooked Thumb Claws (Baryonychine-style fish hooks!)
    foreLimbJoints: [
      { pos: [0.46, 1.56, 1.12], rx: 0.22, rz: 0.26 },
      { pos: [0.50, 1.12, 0.98], rx: 0.15, rz: 0.18 },
      { pos: [0.48, 0.86, 1.32], rx: 0.12, rz: 0.14 },
    ],
    foreLimbOptions: {
      toes: 3,
      footLength: 0.34,
      footWidth: 0.22,
      clawLength: 0.22, // Giant hooked fish-gaffing manual claws!
    },
    scuteCount: 20,
    scuteSize: 0.055,
    vertebraCount: 48,
    sailProfile,
    caudalPaddleProfile,
    decorateExterior: (ext, _headGroup, mats) => {
      // Sculpted Living Dorsal Sail with Embossed Neural Spine Ridges underneath the skin!
      const sailGroup = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(-0.95, 2.05);
      shape.bezierCurveTo(-0.65, 3.35, -0.15, 3.68, 0.22, 3.45);
      shape.bezierCurveTo(0.55, 3.62, 0.92, 3.25, 1.25, 2.02);
      shape.lineTo(-0.95, 2.05);

      const sailGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.07,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.03,
        bevelSegments: 4,
      });
      sailGeo.rotateY(Math.PI / 2);
      const sailMesh = new THREE.Mesh(sailGeo, mats.detailMat);
      sailMesh.position.set(-0.035, 0, 0);
      sailMesh.castShadow = true;
      sailGroup.add(sailMesh);

      // Embossed vertical neural spine ridges visible under the sail skin
      for (let i = 0; i < 13; i++) {
        const u = i / 12;
        const z = THREE.MathUtils.lerp(-0.85, 1.15, u);
        const h = Math.sin(u * Math.PI) * 1.42;
        if (h > 0.15) {
          const ridge = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.048, h, 4, 8),
            mats.skinMat
          );
          ridge.position.set(0, 2.1 + h * 0.48, z);
          ridge.rotation.x = -0.08;
          sailGroup.add(ridge);
        }
      }

      ext.add(sailGroup);
    },
  };
}
