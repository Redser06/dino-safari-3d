import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type CameraPreset = 'full' | 'head' | 'side';

/** Fit the camera to the model's bounding box so a new mesh is fully in view. */
export function frameModel(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  preset: CameraPreset,
) {
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.5);
  const fov = (camera.fov * Math.PI) / 180;
  const fitDist = ((maxDim * 0.5) / Math.tan(fov / 2)) * 1.55;

  const target = center.clone();
  const position = new THREE.Vector3();

  if (preset === 'head') {
    target.set(center.x, box.max.y - size.y * 0.2, box.max.z - size.z * 0.08);
    position.set(
      target.x + Math.max(size.x * 0.9, 0.8),
      target.y + size.y * 0.12,
      target.z + Math.max(size.z * 0.55, 1.6),
    );
  } else if (preset === 'side') {
    position.set(center.x + fitDist * 1.2, center.y + size.y * 0.12, center.z);
  } else {
    position.set(center.x + fitDist * 0.7, center.y + fitDist * 0.42, center.z + fitDist * 0.85);
  }

  controls.target.copy(target);
  camera.position.copy(position);
  camera.near = Math.max(0.05, fitDist / 100);
  camera.far = Math.max(80, fitDist * 14);
  camera.updateProjectionMatrix();
  controls.minDistance = Math.max(0.35, fitDist * 0.18);
  controls.maxDistance = fitDist * 4.5;
  controls.update();
}
