import * as THREE from 'three';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { DinoModelResult } from '../components/dino3d/dinoModels';
import assetManifest from '../data/asset-manifest.json';

export const TARGET_LENGTH = 4.4;

/**
 * Smithsonian Voyager stores this scan Z-up. A −90° turn about X lays the
 * body along the ground before we measure it. Y stays up in the scene.
 */
export const SKELETON_X_ROTATION = -Math.PI / 2;

function seatOnPedestal(root: THREE.Object3D, targetLength: number) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  // After the skeleton is turned upright, length runs along X or Z, not Y.
  const length = Math.max(size.x, size.z, 0.001);
  root.scale.multiplyScalar(targetLength / length);

  root.updateMatrixWorld(true);
  const grounded = new THREE.Box3().setFromObject(root);
  const center = grounded.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= grounded.min.y;
}

function assetFile(id: string): string {
  const asset = assetManifest.assets.find((entry) => entry.id === id);
  if (!asset) throw new Error(`Missing asset manifest entry: ${id}`);
  return `/${asset.file}`;
}

/** Load the CC0 living skin and the CC0 museum skeleton into one toggleable group. */
export async function loadTriceratops(loader: GLTFLoader): Promise<DinoModelResult> {
  const [skinGltf, skeletonGltf] = await Promise.all([
    loader.loadAsync(assetFile('triceratops-skin')),
    loader.loadAsync(assetFile('triceratops-skeleton')),
  ]);

  const rootGroup = new THREE.Group();
  rootGroup.name = 'triceratops-root';
  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'triceratops-skin';
  const skeletonGroup = new THREE.Group();
  skeletonGroup.name = 'triceratops-skeleton';
  rootGroup.add(exteriorGroup, skeletonGroup);

  seatOnPedestal(skinGltf.scene, TARGET_LENGTH);
  skeletonGltf.scene.rotation.x = SKELETON_X_ROTATION;
  seatOnPedestal(skeletonGltf.scene, TARGET_LENGTH);
  exteriorGroup.add(skinGltf.scene);
  skeletonGroup.add(skeletonGltf.scene);

  return {
    rootGroup,
    exteriorGroup,
    skeletonGroup,
    tailSegments: [],
    chestMesh: null,
    jawMesh: null,
    neckMesh: null,
    mixer: new THREE.AnimationMixer(skinGltf.scene),
    clips: skinGltf.animations,
  };
}
